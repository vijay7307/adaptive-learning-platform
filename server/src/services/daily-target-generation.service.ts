import mongoose from 'mongoose'
import { Curriculum, type CurriculumDocument } from '../models/curriculum.model'
import { DailyTarget } from '../models/daily-target.model'
import { DailyTargetGenerationJob } from '../models/daily-target-generation-job.model'
import { User } from '../models/user.model'
import { aiService, AiServiceError } from './ai.service'
import { curriculumJsonInstruction } from './ai/curriculum.prompt'
import {
  getLocalDateKey,
  getUserTimezone,
  isAfterLocalFiveAm,
  localDateKeyToStorageDate,
} from './timezone.service'
import { allocateDailyStudyMinutes, buildTopicKey, normalizeTargetDurations } from './daily-target.utils'
import {
  buildDetailedTargetItem,
  validateRegularTargetItems,
} from './daily-target-quality.service'

const JOB_LEASE_MS = 5 * 60 * 1000
const MAX_JOB_ATTEMPTS = 3

function getIncompleteTopics(curriculum: CurriculumDocument) {
  const completed = new Set(curriculum.completedTopicKeys)
  return curriculum.modules
    .slice()
    .sort((left, right) => left.order - right.order)
    .flatMap((module) => module.topics
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((topic) => ({
        topicKey: buildTopicKey(module.order, topic.order),
        title: topic.title,
        estimatedDurationMinutes: topic.estimatedDurationMinutes,
      })))
    .filter((topic) => !completed.has(topic.topicKey))
}

async function generateItems(curriculum: CurriculumDocument, allocatedMinutes: number, localDateKey: string) {
  const incompleteTopics = getIncompleteTopics(curriculum)
  if (incompleteTopics.length === 0) return []
  const context = [
    curriculumJsonInstruction,
    'Generate a focused daily learning target set as a JSON curriculum object.',
    'Use the supplied planner context and return valid structured curriculum JSON.',
    `Local target date: ${localDateKey}`,
    `Goal: ${curriculum.goal}`,
    `Subject: ${curriculum.subject}`,
    `Completed topics: ${curriculum.completedTopicKeys.join(', ') || 'none'}`,
    `Target history: ${JSON.stringify(curriculum.targetHistory.slice(-7))}`,
    `Assessment history: ${JSON.stringify(curriculum.assessmentHistory.slice(-5))}`,
    `Available shared minutes for this planner: ${allocatedMinutes}`,
    `Unfinished topics: ${JSON.stringify(getIncompleteTopics(curriculum))}`,
    'Prioritize missed and unfinished topics. Return only specific, measurable daily tasks.',
    'Every topic must include subtopics, actionable activities, a concrete deliverable, and completionCriteria.',
  ].join('\n')
  const generated = await aiService.generateCurriculum(context)
  const items = generated.modules.flatMap((module) => module.topics
    .map((topic) => {
      const topicKey = buildTopicKey(module.order, topic.order)
      const source = incompleteTopics.find((candidate) => candidate.topicKey === topicKey)
      return source
        ? buildDetailedTargetItem(topic, topicKey, topic.estimatedDurationMinutes)
        : null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null))
  const normalizedItems = normalizeTargetDurations(items, allocatedMinutes)
  validateRegularTargetItems(normalizedItems, allocatedMinutes)
  return normalizedItems
}

async function createRegularTarget(
  owner: mongoose.Types.ObjectId,
  curriculum: CurriculumDocument,
  localDateKey: string,
  allocatedMinutes: number,
) {
  const targetDate = localDateKeyToStorageDate(localDateKey)
  const items = await generateItems(curriculum, allocatedMinutes, localDateKey)
  try {
    return await DailyTarget.findOneAndUpdate(
      { owner, curriculum: curriculum._id, localDateKey },
      {
        $setOnInsert: {
          owner,
          curriculum: curriculum._id,
          targetDate,
          localDateKey,
          kind: 'regular',
          items,
          allocatedMinutes,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
  } catch (error: unknown) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return DailyTarget.findOne({ owner, curriculum: curriculum._id, localDateKey })
    }
    throw error
  }
}

export async function generateRegularTargetsForUser(
  owner: mongoose.Types.ObjectId,
  localDateKey: string,
): Promise<void> {
  const [user, curricula] = await Promise.all([
    User.findById(owner).select('dailyStudyTimeBudgetMinutes'),
    Curriculum.find({ owner, status: { $in: ['draft', 'active'] } }).sort({ createdAt: 1 }),
  ])
  if (!user) throw new Error('User not found')
  const allocations = allocateDailyStudyMinutes(curricula, user.dailyStudyTimeBudgetMinutes || 180)
  for (const curriculum of curricula) {
    const allocatedMinutes = allocations.get(String(curriculum._id)) || 0
    const existing = await DailyTarget.findOne({ owner, curriculum: curriculum._id, localDateKey })
    if (!existing) {
      await createRegularTarget(owner, curriculum, localDateKey, allocatedMinutes)
    } else if (existing.allocatedMinutes !== allocatedMinutes ||
      existing.items.reduce((sum, item) => sum + item.estimatedDurationMinutes, 0) > allocatedMinutes) {
      existing.items = normalizeTargetDurations(existing.items, allocatedMinutes)
      existing.allocatedMinutes = allocatedMinutes
      await existing.save()
    }
  }
}

export async function ensureGenerationJob(user: { _id: mongoose.Types.ObjectId; timezone?: string }, now = new Date()) {
  const timezone = getUserTimezone(user.timezone)
  if (!isAfterLocalFiveAm(now, timezone)) return null
  const localDateKey = getLocalDateKey(now, timezone)
  return DailyTargetGenerationJob.findOneAndUpdate(
    { owner: user._id, localDateKey },
    { $setOnInsert: { owner: user._id, localDateKey, status: 'pending', attempts: 0, nextAttemptAt: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

export async function claimGenerationJob(now = new Date()) {
  const staleBefore = new Date(now.getTime() - JOB_LEASE_MS)
  return DailyTargetGenerationJob.findOneAndUpdate(
    {
      $and: [
        {
          $or: [
            { status: 'pending', nextAttemptAt: { $lte: now } },
            { status: 'processing', lockedUntil: { $lte: now } },
            { status: 'failed', attempts: { $lt: MAX_JOB_ATTEMPTS }, nextAttemptAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { lockedUntil: { $exists: false } },
            { lockedUntil: { $lte: now } },
            { updatedAt: { $lte: staleBefore } },
          ],
        },
      ],
    },
    {
      $set: { status: 'processing', lockedUntil: new Date(now.getTime() + JOB_LEASE_MS) },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { nextAttemptAt: 1 } },
  )
}

export async function processGenerationJob(job: { _id: mongoose.Types.ObjectId; owner: mongoose.Types.ObjectId; localDateKey: string; attempts: number }) {
  try {
    await generateRegularTargetsForUser(job.owner, job.localDateKey)
    await DailyTargetGenerationJob.updateOne(
      { _id: job._id },
      { $set: { status: 'completed', completedAt: new Date(), lockedUntil: null, lastError: null } },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Target generation failed.'
    const retryable = error instanceof AiServiceError &&
      ['AI_TIMEOUT', 'AI_UNAVAILABLE', 'AI_QUOTA_EXCEEDED'].includes(error.code)
    await DailyTargetGenerationJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: retryable && job.attempts < MAX_JOB_ATTEMPTS ? 'pending' : 'failed',
          nextAttemptAt: new Date(Date.now() + Math.min(60_000, 2 ** job.attempts * 1_000)),
          lockedUntil: null,
          lastError: message.slice(0, 500),
        },
      },
    )
    throw error
  }
}

export async function recoverAndProcessJobs(now = new Date(), batchSize = 10) {
  const users = await User.find({}).select('_id timezone').limit(100)
  await Promise.all(users.map((user) => ensureGenerationJob(user, now)))
  for (let index = 0; index < batchSize; index += 1) {
    const job = await claimGenerationJob(now)
    if (!job) break
    try {
      await processGenerationJob(job)
    } catch {
      console.error('[DailyTargets] Persistent generation job failed', { jobId: job._id.toString() })
    }
  }
}

export async function generateTargetsForNewPlanner(owner: mongoose.Types.ObjectId, curriculum: CurriculumDocument, now = new Date()) {
  const user = await User.findById(owner).select('_id timezone dailyStudyTimeBudgetMinutes')
  if (!user || !isAfterLocalFiveAm(now, getUserTimezone(user.timezone))) return
  const localDateKey = getLocalDateKey(now, getUserTimezone(user.timezone))
  const existing = await DailyTarget.exists({ owner, curriculum: curriculum._id, localDateKey })
  if (!existing) {
    const budget = user.dailyStudyTimeBudgetMinutes || 180
    await createRegularTarget(owner, curriculum, localDateKey, Math.min(budget, curriculum.availableStudyTimeMinutesPerDay))
  }
}
