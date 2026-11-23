import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Curriculum } from '../models/curriculum.model'
import { User } from '../models/user.model'
import { aiService, AiServiceError } from '../services/ai.service'
import { curriculumJsonInstruction } from '../services/ai/curriculum.prompt'
import { generateTargetsForNewPlanner } from '../services/daily-target-generation.service'
import { testService } from '../services/test.service'

const MINUTES_PER_DAY = 15
const MAX_MINUTES_PER_DAY = 24 * 60
const MAX_DURATION_DAYS = 3650
const MAX_ACTIVE_PLANNERS = 3

export function hasActivePlannerCapacity(activeCount: number): boolean {
  return activeCount < MAX_ACTIVE_PLANNERS
}

interface CurriculumGenerationInput {
  goal: string
  subject: string
  currentSkillLevel: 'beginner' | 'intermediate' | 'advanced'
  availableStudyHoursPerDay: number
  targetDurationDays: number
  deadline?: string
}

interface PendingGeneration {
  promise: Promise<unknown>
  createdAt: number
}

const generationRequests = new Map<string, PendingGeneration>()
const plannerCapacityLocks = new Map<string, Promise<void>>()
const IDEMPOTENCY_RETENTION_MS = 15 * 60 * 1000

class PlannerCapacityError extends Error {
  constructor() {
    super('You already have 3 active learning planners. Complete or archive one before creating another.')
    this.name = 'PlannerCapacityError'
  }
}

async function withPlannerCapacityLock<T>(
  ownerId: mongoose.Types.ObjectId,
  operation: () => Promise<T>,
): Promise<T> {
  const ownerKey = ownerId.toString()
  const previous = plannerCapacityLocks.get(ownerKey) || Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  plannerCapacityLocks.set(ownerKey, current)
  await previous
  try {
    return await operation()
  } finally {
    release()
    if (plannerCapacityLocks.get(ownerKey) === current) {
      plannerCapacityLocks.delete(ownerKey)
    }
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0
}

function badRequest(res: Response, message: string): void {
  res.status(400).json({ success: false, error: { message, statusCode: 400 } })
}

function sendAiError(res: Response, error: unknown): void {
  const mapped = mapAiError(error)
  if (mapped.status === 429) {
    res.setHeader('Retry-After', '60')
  }
  res.status(mapped.status).json({
    success: false,
    error: { message: mapped.message, statusCode: mapped.status },
  })
}

export function parseGenerationInput(body: unknown): CurriculumGenerationInput | null {
  if (!body || typeof body !== 'object') return null
  const input = body as Record<string, unknown>
  const currentSkillLevel = input.currentSkillLevel

  if (
    !isNonEmptyString(input.goal) ||
    input.goal.trim().length > 200 ||
    !isNonEmptyString(input.subject) ||
    input.subject.trim().length > 120 ||
    !['beginner', 'intermediate', 'advanced'].includes(String(currentSkillLevel)) ||
    typeof input.availableStudyHoursPerDay !== 'number' ||
    !Number.isFinite(input.availableStudyHoursPerDay) ||
    input.availableStudyHoursPerDay * 60 < MINUTES_PER_DAY ||
    input.availableStudyHoursPerDay * 60 > MAX_MINUTES_PER_DAY ||
    !isPositiveInteger(input.targetDurationDays) ||
    input.targetDurationDays > MAX_DURATION_DAYS
  ) {
    return null
  }

  const minutes = input.availableStudyHoursPerDay * 60
  if (!Number.isInteger(minutes)) return null

  if (input.deadline !== undefined) {
    if (!isNonEmptyString(input.deadline)) return null
    const deadline = new Date(input.deadline)
    const latestAllowed = new Date()
    latestAllowed.setDate(latestAllowed.getDate() + input.targetDurationDays)
    if (Number.isNaN(deadline.getTime()) || deadline <= new Date() || deadline > latestAllowed) {
      return null
    }
  }

  return {
    goal: input.goal.trim(),
    subject: input.subject.trim(),
    currentSkillLevel: currentSkillLevel as CurriculumGenerationInput['currentSkillLevel'],
    availableStudyHoursPerDay: input.availableStudyHoursPerDay,
    targetDurationDays: input.targetDurationDays,
    deadline: input.deadline,
  }
}

export function getDeadlineValidationError(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const input = body as Record<string, unknown>
  if (input.deadline === undefined) return null
  if (!isNonEmptyString(input.deadline)) return 'Deadline must be a non-empty date string.'
  const deadline = new Date(input.deadline)
  if (Number.isNaN(deadline.getTime())) return 'Deadline must be a valid date.'
  if (deadline <= new Date()) return 'Deadline must be in the future.'
  if (!isPositiveInteger(input.targetDurationDays)) return null
  const latestAllowed = new Date()
  latestAllowed.setDate(latestAllowed.getDate() + input.targetDurationDays)
  if (deadline > latestAllowed) {
    return `Deadline must be within ${input.targetDurationDays} days of today, or increase targetDurationDays.`
  }
  return null
}

export function buildCurriculumOwnershipFilter(ownerId: string, curriculumId?: string): Record<string, string> {
  return curriculumId ? { _id: curriculumId, owner: ownerId } : { owner: ownerId }
}

function buildPrompt(input: CurriculumGenerationInput): string {
  return [
    curriculumJsonInstruction,
    'Generate a realistic personalized curriculum matching those requirements.',
    'Respect the requested daily study time and duration. If the requested timeline is unrealistic',
    'for the goal, recommend a longer feasible targetDurationDays and deadline, and explain the',
    'reason in a milestone description rather than promising mastery.',
    `Learning goal: ${input.goal}`,
    `Subject: ${input.subject}`,
    `Current skill level: ${input.currentSkillLevel}`,
    `Available study time per day: ${input.availableStudyHoursPerDay} hours`,
    `Requested duration: ${input.targetDurationDays} days`,
    `Requested deadline: ${input.deadline || 'not supplied'}`,
    'Include ordered modules and topics, detailed objectives, practice activities, revision sessions,',
    'assessment recommendations, milestones, and topic time estimates as dedicated response fields.',
    'Return deadline and every milestone targetDate as full ISO-8601 UTC timestamps, for example',
    `${new Date().toISOString()}. The dates must be after today (${new Date().toISOString()}) and`,
    'within the feasible generated duration. Never return relative labels such as "Day 7".',
  ].join('\n')
}

function mapAiError(error: unknown): { status: number; message: string } {
  if (!(error instanceof AiServiceError)) {
    return { status: 502, message: 'Curriculum generation is temporarily unavailable.' }
  }
  switch (error.code) {
    case 'AI_NOT_CONFIGURED':
      return { status: 503, message: 'Curriculum generation is not configured.' }
    case 'AI_INVALID_API_KEY':
      return { status: 503, message: 'Curriculum generation is temporarily unavailable.' }
    case 'AI_QUOTA_EXCEEDED':
      return { status: 429, message: 'Curriculum generation quota is currently exhausted.' }
    case 'AI_TIMEOUT':
    case 'AI_UNAVAILABLE':
      return { status: 503, message: 'Curriculum generation is temporarily unavailable.' }
    case 'AI_INVALID_RESPONSE':
      return { status: 502, message: 'The AI returned an unusable curriculum. Please try again.' }
  }
}

async function generateAndSave(
  input: CurriculumGenerationInput,
  owner: mongoose.Types.ObjectId,
): Promise<unknown> {
  const generated = await aiService.generateCurriculum(buildPrompt(input))
  const requestedMinutes = input.availableStudyHoursPerDay * 60
  if (
    generated.availableStudyTimeMinutesPerDay > requestedMinutes ||
    generated.targetDurationDays < input.targetDurationDays ||
    new Date(generated.deadline) <= new Date()
  ) {
    throw new AiServiceError(
      'AI_INVALID_RESPONSE',
      'The AI returned a curriculum that does not respect the requested constraints.',
    )
  }
  const curriculum = new Curriculum({
    owner,
    goal: generated.goal,
    subject: generated.subject,
    currentSkillLevel: generated.currentSkillLevel,
    availableStudyTimeMinutesPerDay: generated.availableStudyTimeMinutesPerDay,
    targetDurationDays: generated.targetDurationDays,
    deadline: new Date(generated.deadline),
    startDate: new Date(),
    progressPercent: 0,
    completedTopicKeys: [],
    targetHistory: [],
    assessmentHistory: [],
    modules: generated.modules.map((module, index) =>
      index === 0
        ? {
            ...module,
            completionCriteria: [
              ...module.completionCriteria,
              `Practice activities: ${generated.practiceActivities.join('; ')}`,
              `Revision sessions: ${generated.revisionSessions.join('; ')}`,
              `Assessment recommendations: ${generated.assessmentRecommendations.join('; ')}`,
            ],
          }
        : module,
    ),
    milestones: generated.milestones.map((milestone) => ({
      ...milestone,
      targetDate: new Date(milestone.targetDate),
    })),
    status: 'draft',
  })
  const saved = await curriculum.save()
  void generateTargetsForNewPlanner(owner, saved).catch((error: unknown) => {
    console.error('[DailyTargets] New planner target generation failed', {
      curriculumId: saved._id.toString(),
      error: error instanceof Error ? error.message : 'unknown error',
    })
  })
  return saved
}

export async function generateCurriculum(req: Request, res: Response): Promise<void> {
  const deadlineError = getDeadlineValidationError(req.body)
  if (deadlineError) {
    badRequest(res, deadlineError)
    return
  }
  const input = parseGenerationInput(req.body)
  if (!input) {
    badRequest(res, 'Invalid curriculum inputs. Check goal, subject, skill level, study hours, duration, and deadline.')
    return
  }
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }

  const ownerId = new mongoose.Types.ObjectId(String(req.user._id))
  const idempotencyKey = req.header('Idempotency-Key')?.trim()
  const key = idempotencyKey ? `${ownerId.toString()}:${idempotencyKey}` : undefined
  if (key) {
    const existing = generationRequests.get(key)
    if (existing && Date.now() - existing.createdAt < IDEMPOTENCY_RETENTION_MS) {
      try {
        const curriculum = await existing.promise
        res.status(200).json({ success: true, data: { curriculum }, idempotent: true })
      } catch (error: unknown) {
        sendAiError(res, error)
      }
      return
    }
    generationRequests.delete(key)
  }

  const promise = withPlannerCapacityLock(ownerId, async () => {
    const activePlannerCount = await Curriculum.countDocuments({
      owner: ownerId,
      status: { $in: ['draft', 'active'] },
    })
    if (!hasActivePlannerCapacity(activePlannerCount)) {
      throw new PlannerCapacityError()
    }
    return generateAndSave(input, ownerId)
  })
  if (key) generationRequests.set(key, { promise, createdAt: Date.now() })

  try {
    const curriculum = await promise
    res.status(201).json({ success: true, message: 'Curriculum generated successfully.', data: { curriculum } })
  } catch (error: unknown) {
    if (key) generationRequests.delete(key)
    if (error instanceof PlannerCapacityError) {
      res.status(409).json({
        success: false,
        error: { message: error.message, statusCode: 409 },
      })
      return
    }
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(422).json({
        success: false,
        error: { message: 'Generated curriculum failed schema validation.', statusCode: 422 },
      })
      return
    }
    if (error instanceof AiServiceError) {
      sendAiError(res, error)
      return
    }
    res.status(500).json({
      success: false,
      error: { message: 'Unable to save the generated curriculum.', statusCode: 500 },
    })
  }
}

export async function listOrGetCurriculums(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }

  const requestedId = typeof req.query.id === 'string' ? req.query.id : undefined
  try {
    if (!requestedId) {
      const ownerId = new mongoose.Types.ObjectId(String(req.user._id))
      const curricula = await Curriculum.find({ owner: ownerId }).sort({ createdAt: -1 })
      const activeCount = curricula.filter((curriculum) =>
        curriculum.status === 'draft' || curriculum.status === 'active',
      ).length
      res.status(200).json({ success: true, data: { curricula, activeCount, maxActive: MAX_ACTIVE_PLANNERS } })
      return
    }

    if (!mongoose.Types.ObjectId.isValid(requestedId)) {
      res.status(404).json({ success: false, error: { message: 'Curriculum not found.', statusCode: 404 } })
      return
    }
    const ownerId = new mongoose.Types.ObjectId(String(req.user._id))
    const curriculum = await Curriculum.findOne({ _id: requestedId, owner: ownerId })
    if (!curriculum) {
      res.status(404).json({ success: false, error: { message: 'Curriculum not found.', statusCode: 404 } })
      return
    }
    res.status(200).json({ success: true, data: { curriculum } })
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: { message: 'Unable to retrieve curricula.', statusCode: 500 },
    })
  }
}

export async function updateCurriculumStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const requestedId = typeof req.params.id === 'string' ? req.params.id : ''
  const status = req.body?.status
  if (
    !mongoose.Types.ObjectId.isValid(requestedId) ||
    typeof status !== 'string' ||
    !['draft', 'active', 'completed', 'archived'].includes(status)
  ) {
    badRequest(res, 'A valid curriculum ID and status are required.')
    return
  }
  const curriculum = await Curriculum.findOneAndUpdate(
    { _id: requestedId, owner: new mongoose.Types.ObjectId(String(req.user._id)) },
    { $set: { status } },
    { new: true, runValidators: true },
  )
  if (!curriculum) {
    res.status(404).json({ success: false, error: { message: 'Curriculum not found.', statusCode: 404 } })
    return
  }
  res.status(200).json({ success: true, data: { curriculum } })
}

export async function updateCurriculumProgress(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const requestedId = typeof req.params.id === 'string' ? req.params.id : ''
  const completedTopicKeys = req.body?.completedTopicKeys
  if (
    !mongoose.Types.ObjectId.isValid(requestedId) ||
    !Array.isArray(completedTopicKeys) ||
    !completedTopicKeys.every((key: unknown) => typeof key === 'string')
  ) {
    badRequest(res, 'A valid curriculum ID and completed topic list are required.')
    return
  }
  const curriculum = await Curriculum.findOne({
    _id: requestedId,
    owner: new mongoose.Types.ObjectId(String(req.user._id)),
  })
  if (!curriculum) {
    res.status(404).json({ success: false, error: { message: 'Curriculum not found.', statusCode: 404 } })
    return
  }
  const previousCompletedTopicKeys = [...curriculum.completedTopicKeys]
  const totalTopics = curriculum.modules.reduce((total, module) => total + module.topics.length, 0)
  curriculum.completedTopicKeys = [...new Set(completedTopicKeys)]
  curriculum.progressPercent = totalTopics === 0
    ? 0
    : Math.min(100, Math.round((curriculum.completedTopicKeys.length / totalTopics) * 100))
  await curriculum.save()
  try {
    await testService.generateForCompletedMilestones(
      new mongoose.Types.ObjectId(String(req.user._id)),
      curriculum,
      previousCompletedTopicKeys,
    )
  } catch (error) {
    console.error('[Tests] Milestone test generation failed', {
      owner: String(req.user._id),
      curriculumId: String(curriculum._id),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
  res.status(200).json({ success: true, data: { curriculum } })
}

export const MAX_ACTIVE_PLANNERS_LIMIT = MAX_ACTIVE_PLANNERS

export async function updateDailyStudyBudget(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const minutes = req.body?.dailyStudyTimeBudgetMinutes
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 24 * 60) {
    badRequest(res, 'Daily study budget must be a whole number between 15 and 1440 minutes.')
    return
  }
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { dailyStudyTimeBudgetMinutes: minutes } },
    { new: true, runValidators: true, select: 'dailyStudyTimeBudgetMinutes' },
  )
  if (!user) {
    res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } })
    return
  }
  res.status(200).json({ success: true, data: { dailyStudyTimeBudgetMinutes: user.dailyStudyTimeBudgetMinutes } })
}
