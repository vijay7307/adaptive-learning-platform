import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Curriculum, type CurriculumDocument } from '../models/curriculum.model'
import { DailyTarget, type DailyTargetStatus } from '../models/daily-target.model'
import { ExtraWorkGeneration } from '../models/extra-work-generation.model'
import { DailyTargetGenerationJob } from '../models/daily-target-generation-job.model'
import { User } from '../models/user.model'
import { aiService } from '../services/ai.service'
import { AiServiceError } from '../services/ai/contracts'
import { allocateDailyStudyMinutes, buildTopicKey, EXTRA_WORK_RESERVE_MINUTES, normalizeTargetDurations } from '../services/daily-target.utils'
import { getLocalDateKey, getUserTimezone, localDateKeyToStorageDate } from '../services/timezone.service'
import {
  buildDetailedTargetItem,
  validateExtraTargetItems,
} from '../services/daily-target-quality.service'
import { testService } from '../services/test.service'

function requestedDate(value: string | undefined, timezone: string): string {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return getLocalDateKey(date, timezone)
}

export { allocateDailyStudyMinutes, buildTopicKey } from '../services/daily-target.utils'

function getIncompleteTopics(curriculum: CurriculumDocument) {
  const completed = new Set(curriculum.completedTopicKeys)
  return curriculum.modules
    .sort((left, right) => left.order - right.order)
    .flatMap((module) =>
      module.topics
        .sort((left, right) => left.order - right.order)
        .map((topic) => ({
          topicKey: buildTopicKey(module.order, topic.order),
          title: topic.title,
          estimatedDurationMinutes: topic.estimatedDurationMinutes,
        })),
    )
    .filter((topic) => !completed.has(topic.topicKey))
}


async function createTarget(
  owner: mongoose.Types.ObjectId,
  curriculum: CurriculumDocument,
  targetDate: Date,
  localDateKey: string,
  allocatedMinutes: number,
) {
  const items = []
  let remaining = allocatedMinutes
  for (const topic of getIncompleteTopics(curriculum)) {
    if (remaining <= 0) break
    const duration = Math.min(topic.estimatedDurationMinutes, remaining)
    items.push({ ...topic, estimatedDurationMinutes: duration, status: 'pending' as const })
    remaining -= duration
  }
  try {
    return await DailyTarget.findOneAndUpdate(
      { owner, curriculum: curriculum._id, localDateKey },
      { $setOnInsert: { owner, curriculum: curriculum._id, targetDate, localDateKey, kind: 'regular', items, allocatedMinutes } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
  } catch (error: unknown) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return DailyTarget.findOne({ owner, curriculum: curriculum._id, localDateKey })
    }
    throw error
  }
}

export async function listDailyTargets(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const owner = new mongoose.Types.ObjectId(String(req.user._id))
  const user = await User.findById(owner).select('dailyStudyTimeBudgetMinutes timezone')
  if (!user) {
    res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } })
    return
  }
  const localDateKey = requestedDate(typeof req.query.date === 'string' ? req.query.date : undefined, getUserTimezone(user.timezone))
  if (!localDateKey) {
    res.status(400).json({ success: false, error: { message: 'Invalid target date.', statusCode: 400 } })
    return
  }
  const [curricula, existingTargets, extraWork, generationJob] = await Promise.all([
    Curriculum.find({ owner, status: { $in: ['draft', 'active'] } }).sort({ createdAt: 1 }),
    DailyTarget.find({ owner, localDateKey, kind: 'regular' }),
    ExtraWorkGeneration.findOne({ owner, localDateKey }),
    DailyTargetGenerationJob.findOne({ owner, localDateKey }).select('status attempts lastError completedAt'),
  ])
  const targetMap = new Map(existingTargets.map((target) => [String(target.curriculum), target]))
  const allocations = allocateDailyStudyMinutes(curricula, user?.dailyStudyTimeBudgetMinutes || 180)
  const targets = await Promise.all(curricula.map(async (curriculum) => {
    const allocatedMinutes = allocations.get(String(curriculum._id)) || 0
    const existing = targetMap.get(String(curriculum._id))
    if (!existing) {
      return createTarget(owner, curriculum, localDateKeyToStorageDate(localDateKey), localDateKey, allocatedMinutes)
    }
    const totalMinutes = existing.items.reduce((sum, item) => sum + item.estimatedDurationMinutes, 0)
    if (existing.allocatedMinutes !== allocatedMinutes || totalMinutes > allocatedMinutes) {
      existing.items = normalizeTargetDurations(existing.items, allocatedMinutes)
      existing.allocatedMinutes = allocatedMinutes
      await existing.save()
    }
    return existing
  }))
  const generationJobExists = await DailyTargetGenerationJob.exists({ owner, localDateKey })
  if (!generationJobExists && targets.length === curricula.length) {
    try {
      await DailyTargetGenerationJob.create({
        owner,
        localDateKey,
        status: 'completed',
        attempts: 1,
        nextAttemptAt: new Date(),
        completedAt: new Date(),
      })
    } catch (error: unknown) {
      if (!(error instanceof mongoose.mongo.MongoServerError && error.code === 11000)) {
        throw error
      }
    }
  }
  const resolvedGenerationJob = await DailyTargetGenerationJob.findOne({ owner, localDateKey })
  res.status(200).json({
    success: true,
    data: {
      date: localDateKey,
      localDateKey,
      generationStatus: resolvedGenerationJob?.status || generationJob?.status || 'pending',
      generationJob: resolvedGenerationJob || generationJob || null,
      dailyStudyTimeBudgetMinutes: user?.dailyStudyTimeBudgetMinutes || 180,
      targets: targets.filter(Boolean),
      extraWork: extraWork || null,
    },
  })
}

async function regularTargetsCompleted(owner: mongoose.Types.ObjectId, localDateKey: string): Promise<boolean> {
  const [curricula, generationJob] = await Promise.all([
    Curriculum.find({ owner, status: { $in: ['draft', 'active'] } }).select('_id'),
    DailyTargetGenerationJob.exists({ owner, localDateKey, status: 'completed' }),
  ])
  if (curricula.length === 0) return false
  if (!generationJob) return false
  const targets = await DailyTarget.find({
    owner,
    localDateKey,
    kind: 'regular',
    curriculum: { $in: curricula.map((curriculum) => curriculum._id) },
  })
  if (targets.length !== curricula.length) return false
  return targets.every((target) => target.items.every((item) => item.status === 'completed'))
}

function isAllowedStatusTransition(current: DailyTargetStatus, next: DailyTargetStatus): boolean {
  return (
    (current === 'pending' && (next === 'completed' || next === 'missed')) ||
    ((current === 'completed' || current === 'missed') && next === 'pending')
  )
}

function mapExtraGenerationError(error: unknown): { status: number; message: string } {
  if (!(error instanceof AiServiceError)) {
    return { status: 503, message: 'Extra work generation is temporarily unavailable.' }
  }
  if (error.code === 'AI_INVALID_RESPONSE') {
    return { status: 502, message: 'The AI returned invalid extra-work tasks. Please try again.' }
  }
  if (error.code === 'AI_QUOTA_EXCEEDED') {
    return { status: 429, message: 'Extra work generation quota is currently exhausted.' }
  }
  if (error.code === 'AI_NOT_CONFIGURED' || error.code === 'AI_INVALID_API_KEY') {
    return { status: 503, message: 'Extra work generation is not currently configured.' }
  }
  return { status: 503, message: 'Extra work generation is temporarily unavailable.' }
}

export async function getExtraWorkStatus(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const owner = new mongoose.Types.ObjectId(String(req.user._id))
  const user = await User.findById(owner).select('timezone')
  if (!user) {
    res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } })
    return
  }
  const localDateKey = getLocalDateKey(new Date(), getUserTimezone(user.timezone))
  const [usage, regularComplete] = await Promise.all([
    ExtraWorkGeneration.findOne({ owner, localDateKey }),
    regularTargetsCompleted(owner, localDateKey),
  ])
  res.status(200).json({
    success: true,
    data: { localDateKey, regularTargetsCompleted: regularComplete, available: regularComplete && (!usage || usage.status === 'failed'), generation: usage || null },
  })
}

export async function generateExtraWork(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const curriculumId = typeof req.body?.curriculumId === 'string' ? req.body.curriculumId : ''
  if (!mongoose.Types.ObjectId.isValid(curriculumId)) {
    res.status(400).json({ success: false, error: { message: 'A valid curriculumId is required.', statusCode: 400 } })
    return
  }
  const owner = new mongoose.Types.ObjectId(String(req.user._id))
  const user = await User.findById(owner).select('timezone')
  const curriculum = await Curriculum.findOne({ _id: curriculumId, owner, status: { $in: ['draft', 'active'] } })
  if (!user || !curriculum) {
    res.status(404).json({ success: false, error: { message: 'Active curriculum not found.', statusCode: 404 } })
    return
  }
  const localDateKey = getLocalDateKey(new Date(), getUserTimezone(user.timezone))
  if (!(await regularTargetsCompleted(owner, localDateKey))) {
    res.status(409).json({ success: false, error: { message: 'Complete all regular targets across your active planners first.', statusCode: 409 } })
    return
  }
  const [budgetUser, regularTargets] = await Promise.all([
    User.findById(owner).select('dailyStudyTimeBudgetMinutes'),
    DailyTarget.find({ owner, localDateKey, kind: 'regular' }).select('items.estimatedDurationMinutes'),
  ])
  const regularMinutes = regularTargets.reduce(
    (sum, target) => sum + target.items.reduce((itemSum, item) => itemSum + item.estimatedDurationMinutes, 0),
    0,
  )
  const remainingMinutes = Math.min(
    EXTRA_WORK_RESERVE_MINUTES,
    Math.max(0, (budgetUser?.dailyStudyTimeBudgetMinutes || 180) - regularMinutes + EXTRA_WORK_RESERVE_MINUTES),
  )
  if (remainingMinutes === 0) {
    res.status(409).json({ success: false, error: { message: 'No shared study-time budget remains for extra work today.', statusCode: 409 } })
    return
  }
  const existingUsage = await ExtraWorkGeneration.findOne({ owner, localDateKey })
  if (existingUsage?.status === 'completed' || existingUsage?.status === 'processing') {
    res.status(409).json({
      success: false,
      error: {
        message: existingUsage.status === 'completed'
          ? 'Extra work has already been generated today.'
          : 'Extra work generation is already processing.',
        statusCode: 409,
      },
    })
    return
  }
  let reservation
  try {
    reservation = await ExtraWorkGeneration.findOneAndUpdate(
      {
        owner,
        localDateKey,
        $or: [{ status: 'failed' }, { status: { $exists: false } }],
      },
      { $set: { curriculum: curriculum._id, status: 'processing', items: [], error: null } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  } catch (error: unknown) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      reservation = await ExtraWorkGeneration.findOne({ owner, localDateKey })
    } else {
      throw error
    }
  }
  if (!reservation || reservation.status !== 'processing') {
    res.status(409).json({ success: false, error: { message: 'Extra work generation is already processing.', statusCode: 409 } })
    return
  }
  try {
    const generated = await aiService.generateCurriculum([
      'Generate extra practice tasks as a concise structured curriculum JSON.',
      'Return exactly 1 to 3 focused practice topics total, not a complete module or new curriculum.',
      'Each topic must take 10 to 30 minutes and the combined duration must not exceed 60 minutes.',
      'Each topic must include a specific title, learningObjectives, subtopics, activities, deliverable, and completionCriteria.',
      `Goal: ${curriculum.goal}`, `Subject: ${curriculum.subject}`,
      `Completed topics: ${curriculum.completedTopicKeys.join(', ') || 'none'}`,
      `Recent target history: ${JSON.stringify(curriculum.targetHistory.slice(-7))}`,
      'Create additional practice for the selected planner without changing regular targets.',
    ].join('\n'))
    const items = generated.modules.flatMap((module) => module.topics.map((topic) =>
      buildDetailedTargetItem(topic, `extra:${module.order}:${topic.order}`, topic.estimatedDurationMinutes),
    ))
    validateExtraTargetItems(items, remainingMinutes)
    const completed = await ExtraWorkGeneration.findOneAndUpdate(
      { _id: reservation._id, status: 'processing' },
      { $set: { status: 'completed', items, error: null } },
      { new: true },
    )
    res.status(201).json({ success: true, data: { generation: completed } })
  } catch (error: unknown) {
    await ExtraWorkGeneration.deleteOne({ _id: reservation._id, status: 'processing' })
    const mapped = mapExtraGenerationError(error)
    console.error('[DailyTargets] Extra work generation failed', {
      owner: owner.toString(),
      localDateKey,
      code: error instanceof AiServiceError ? error.code : 'UNKNOWN',
    })
    res.status(mapped.status).json({ success: false, error: { message: mapped.message, statusCode: mapped.status } })
  }
}

export async function updateDailyTargetItem(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }

  const targetId = typeof req.params.id === 'string' ? req.params.id : ''
  const itemKey = typeof req.params.itemKey === 'string' ? req.params.itemKey : ''
  const status = req.body?.status
  if (
    !mongoose.Types.ObjectId.isValid(targetId) ||
    typeof status !== 'string' ||
    !['pending', 'completed', 'missed'].includes(status)
  ) {
    res.status(400).json({ success: false, error: { message: 'Invalid target item update.', statusCode: 400 } })
    return
  }
  const owner = new mongoose.Types.ObjectId(String(req.user._id))
  const target = await DailyTarget.findOne({ _id: targetId, owner })
  if (!target) {
    res.status(404).json({ success: false, error: { message: 'Daily target not found.', statusCode: 404 } })
    return
  }
  const item = target.items.find((candidate) => candidate.topicKey === itemKey)
  if (!item) {
    res.status(404).json({ success: false, error: { message: 'Daily target item not found.', statusCode: 404 } })
    return
  }
  const nextStatus = status as DailyTargetStatus
  if (!isAllowedStatusTransition(item.status, nextStatus)) {
    res.status(400).json({ success: false, error: { message: `Cannot change a ${item.status} target to ${nextStatus}.`, statusCode: 400 } })
    return
  }
  item.status = nextStatus
  await target.save()

  const curriculum = await Curriculum.findOne({ _id: target.curriculum, owner })
  if (curriculum) {
    const previousCompletedTopicKeys = [...curriculum.completedTopicKeys]
    const historyDate = target.targetDate
    let history = curriculum.targetHistory.find(
      (entry) => entry.date.getTime() === historyDate.getTime(),
    )
    if (!history) {
      history = { date: historyDate, completedTopicKeys: [], missedTopicKeys: [] }
      curriculum.targetHistory.push(history)
    }
    history.completedTopicKeys = history.completedTopicKeys.filter((key) => key !== itemKey)
    history.missedTopicKeys = history.missedTopicKeys.filter((key) => key !== itemKey)
    if (nextStatus === 'completed' && !curriculum.completedTopicKeys.includes(itemKey)) {
      curriculum.completedTopicKeys.push(itemKey)
      const totalTopics = curriculum.modules.reduce((total, module) => total + module.topics.length, 0)
      curriculum.progressPercent = totalTopics === 0
        ? 0
        : Math.min(100, Math.round((curriculum.completedTopicKeys.length / totalTopics) * 100))
    }
    if (nextStatus !== 'completed') {
      curriculum.completedTopicKeys = curriculum.completedTopicKeys.filter((key) => key !== itemKey)
      const totalTopics = curriculum.modules.reduce((total, module) => total + module.topics.length, 0)
      curriculum.progressPercent = totalTopics === 0
        ? 0
        : Math.min(100, Math.round((curriculum.completedTopicKeys.length / totalTopics) * 100))
    }
    if (nextStatus === 'completed') history.completedTopicKeys.push(itemKey)
    if (nextStatus === 'missed') history.missedTopicKeys.push(itemKey)
    await curriculum.save()
    try {
      await testService.generateForCompletedMilestones(owner, curriculum, previousCompletedTopicKeys)
    } catch (error) {
      console.error('[Tests] Milestone test generation failed', {
        owner: owner.toString(),
        curriculumId: String(curriculum._id),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  res.status(200).json({ success: true, data: { target } })
}

export async function updateExtraWorkItem(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const generationId = typeof req.params.id === 'string' ? req.params.id : ''
  const itemKey = typeof req.params.itemKey === 'string' ? req.params.itemKey : ''
  const status = req.body?.status
  if (
    !mongoose.Types.ObjectId.isValid(generationId) ||
    typeof status !== 'string' ||
    !['pending', 'completed', 'missed'].includes(status)
  ) {
    res.status(400).json({ success: false, error: { message: 'Invalid extra-work item update.', statusCode: 400 } })
    return
  }
  const owner = new mongoose.Types.ObjectId(String(req.user._id))
  const generation = await ExtraWorkGeneration.findOne({ _id: generationId, owner, status: 'completed' })
  if (!generation) {
    res.status(404).json({ success: false, error: { message: 'Extra work generation not found.', statusCode: 404 } })
    return
  }
  const item = generation.items.find((candidate) => candidate.topicKey === itemKey)
  if (!item) {
    res.status(404).json({ success: false, error: { message: 'Extra-work item not found.', statusCode: 404 } })
    return
  }
  const nextStatus = status as DailyTargetStatus
  if (!isAllowedStatusTransition(item.status, nextStatus)) {
    res.status(400).json({ success: false, error: { message: `Cannot change a ${item.status} extra task to ${nextStatus}.`, statusCode: 400 } })
    return
  }
  item.status = nextStatus
  await generation.save()
  res.status(200).json({ success: true, data: { generation } })
}
