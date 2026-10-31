import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Curriculum, type CurriculumDocument } from '../models/curriculum.model'
import { DailyTarget, type DailyTargetStatus } from '../models/daily-target.model'
import { User } from '../models/user.model'

function dayStart(value: string | undefined): Date {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date('invalid')
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function buildTopicKey(moduleOrder: number, topicOrder: number): string {
  return `${moduleOrder}:${topicOrder}`
}

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

export function allocateDailyStudyMinutes(curricula: CurriculumDocument[], budget: number): Map<string, number> {
  const allocations = new Map<string, number>()
  if (curricula.length === 0) return allocations
  const totalRequested = curricula.reduce((sum, curriculum) => sum + curriculum.availableStudyTimeMinutesPerDay, 0)
  let remaining = budget
  curricula.forEach((curriculum, index) => {
    const proportional = index === curricula.length - 1
      ? remaining
      : Math.max(15, Math.floor((budget * curriculum.availableStudyTimeMinutesPerDay) / totalRequested))
    const allocation = Math.min(proportional, remaining)
    allocations.set(String(curriculum._id), allocation)
    remaining -= allocation
  })
  return allocations
}

async function createTarget(
  owner: mongoose.Types.ObjectId,
  curriculum: CurriculumDocument,
  targetDate: Date,
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
      { owner, curriculum: curriculum._id, targetDate },
      { $setOnInsert: { owner, curriculum: curriculum._id, targetDate, items, allocatedMinutes } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
  } catch (error: unknown) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      return DailyTarget.findOne({ owner, curriculum: curriculum._id, targetDate })
    }
    throw error
  }
}

export async function listDailyTargets(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
    return
  }
  const targetDate = dayStart(typeof req.query.date === 'string' ? req.query.date : undefined)
  if (Number.isNaN(targetDate.getTime())) {
    res.status(400).json({ success: false, error: { message: 'Invalid target date.', statusCode: 400 } })
    return
  }
  const owner = new mongoose.Types.ObjectId(String(req.user._id))
  const [user, curricula, existingTargets] = await Promise.all([
    User.findById(owner).select('dailyStudyTimeBudgetMinutes'),
    Curriculum.find({ owner, status: { $in: ['draft', 'active'] } }).sort({ createdAt: 1 }),
    DailyTarget.find({ owner, targetDate }),
  ])
  const targetMap = new Map(existingTargets.map((target) => [String(target.curriculum), target]))
  const allocations = allocateDailyStudyMinutes(curricula, user?.dailyStudyTimeBudgetMinutes || 180)
  const targets = await Promise.all(curricula.map(async (curriculum) =>
    targetMap.get(String(curriculum._id)) ||
    createTarget(owner, curriculum, targetDate, allocations.get(String(curriculum._id)) || 0),
  ))
  res.status(200).json({
    success: true,
    data: {
      date: targetDate,
      dailyStudyTimeBudgetMinutes: user?.dailyStudyTimeBudgetMinutes || 180,
      targets: targets.filter(Boolean),
    },
  })
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
  item.status = status as DailyTargetStatus
  await target.save()

  const curriculum = await Curriculum.findOne({ _id: target.curriculum, owner })
  if (curriculum) {
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
    if (status === 'completed' && !curriculum.completedTopicKeys.includes(itemKey)) {
      curriculum.completedTopicKeys.push(itemKey)
      const totalTopics = curriculum.modules.reduce((total, module) => total + module.topics.length, 0)
      curriculum.progressPercent = totalTopics === 0
        ? 0
        : Math.min(100, Math.round((curriculum.completedTopicKeys.length / totalTopics) * 100))
    }
    if (status === 'completed') history.completedTopicKeys.push(itemKey)
    if (status === 'missed') history.missedTopicKeys.push(itemKey)
    await curriculum.save()
  }
  res.status(200).json({ success: true, data: { target } })
}
