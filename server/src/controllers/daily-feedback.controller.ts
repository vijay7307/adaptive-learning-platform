import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Curriculum } from '../models/curriculum.model'
import { DailyFeedback } from '../models/daily-feedback.model'
import { DailyTarget } from '../models/daily-target.model'

const ownerId = (req: Request) => req.user ? new mongoose.Types.ObjectId(String(req.user._id)) : null
const validRating = (value: unknown) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5
const list = (value: unknown) => Array.isArray(value) && value.length <= 30 && value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 240)

export async function createDailyFeedback(req: Request, res: Response): Promise<void> {
  const owner = ownerId(req)
  if (!owner) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const body = req.body || {}
  const { curriculumId, dailyTargetId, feedbackDate, difficulty, confidence, workload } = body
  if (!mongoose.Types.ObjectId.isValid(curriculumId) || !validRating(difficulty) || !validRating(confidence) || !validRating(workload) || !list(body.completedWork || []) || !list(body.blockers || []) || !list(body.topics || [])) {
    res.status(400).json({ success: false, error: { message: 'Valid curriculum, ratings (1-5), and bounded feedback lists are required.', statusCode: 400 } }); return
  }
  const date = feedbackDate ? new Date(feedbackDate) : new Date()
  if (Number.isNaN(date.getTime())) { res.status(400).json({ success: false, error: { message: 'Invalid feedback date.', statusCode: 400 } }); return }
  const curriculum = await Curriculum.exists({ _id: curriculumId, owner })
  if (!curriculum) { res.status(404).json({ success: false, error: { message: 'Curriculum not found.', statusCode: 404 } }); return }
  let target: { _id: mongoose.Types.ObjectId } | null = null
  if (dailyTargetId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(dailyTargetId)) { res.status(400).json({ success: false, error: { message: 'Invalid daily target ID.', statusCode: 400 } }); return }
    target = await DailyTarget.findOne({ _id: dailyTargetId, owner, curriculum: curriculumId }).select('_id').lean()
    if (!target) { res.status(404).json({ success: false, error: { message: 'Daily target not found.', statusCode: 404 } }); return }
  }
  const feedback = await DailyFeedback.create({ owner, curriculum: curriculumId, dailyTarget: target?._id, feedbackDate: date, difficulty, confidence, workload, completedWork: body.completedWork || [], blockers: body.blockers || [], topics: body.topics || [] })
  res.status(201).json({ success: true, data: { feedback } })
}

export async function listDailyFeedback(req: Request, res: Response): Promise<void> {
  const owner = ownerId(req)
  if (!owner) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
  const page = Math.max(Number(req.query.page) || 1, 1)
  const filter: Record<string, unknown> = { owner }
  if (typeof req.query.curriculumId === 'string') {
    if (!mongoose.Types.ObjectId.isValid(req.query.curriculumId)) { res.status(400).json({ success: false, error: { message: 'Invalid curriculum ID.', statusCode: 400 } }); return }
    filter.curriculum = req.query.curriculumId
  }
  const [feedback, total] = await Promise.all([DailyFeedback.find(filter).sort({ feedbackDate: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit), DailyFeedback.countDocuments(filter)])
  res.json({ success: true, data: { feedback, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } })
}

export async function summarizeDailyFeedback(req: Request, res: Response): Promise<void> {
  const owner = ownerId(req)
  if (!owner) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const filter: Record<string, unknown> = { owner }
  if (typeof req.query.curriculumId === 'string') filter.curriculum = req.query.curriculumId
  const rows = await DailyFeedback.find(filter).sort({ feedbackDate: -1 }).limit(100).select('difficulty confidence workload blockers topics completedWork feedbackDate').lean()
  const average = (key: 'difficulty' | 'confidence' | 'workload') => rows.length ? Math.round((rows.reduce((sum, row) => sum + row[key], 0) / rows.length) * 100) / 100 : 0
  res.json({ success: true, data: { count: rows.length, averages: { difficulty: average('difficulty'), confidence: average('confidence'), workload: average('workload') }, recentBlockers: [...new Set(rows.flatMap((row) => row.blockers))].slice(0, 20), recentTopics: [...new Set(rows.flatMap((row) => row.topics))].slice(0, 20) } })
}
