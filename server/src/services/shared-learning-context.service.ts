import mongoose from 'mongoose'
import { Curriculum } from '../models/curriculum.model'
import { DailyFeedback } from '../models/daily-feedback.model'
import { DailyTarget } from '../models/daily-target.model'
import { LearnerPracticeSignal } from '../models/learner-practice-signal.model'
import { LearningNote } from '../models/learning-note.model'

export interface SharedLearningContext {
  curriculum: { id: string; goal: string; subject: string; currentSkillLevel: string; progressPercent: number; completedTopicKeys: string[] } | null
  recentFeedback: unknown[]
  recentTargets: unknown[]
  practiceSignals: unknown[]
  recentNotes: unknown[]
}

export async function getSharedLearningContext(owner: mongoose.Types.ObjectId, curriculumId: mongoose.Types.ObjectId, limits = {}) {
  const recentLimit = Math.min(Math.max(Number((limits as { recentLimit?: number }).recentLimit || 5), 1), 20)
  const curriculum = await Curriculum.findOne({ _id: curriculumId, owner }).select('goal subject currentSkillLevel progressPercent completedTopicKeys').lean()
  if (!curriculum) return null
  const [recentFeedback, recentTargets, practiceSignals, recentNotes] = await Promise.all([
    DailyFeedback.find({ owner, curriculum: curriculumId }).sort({ feedbackDate: -1 }).limit(recentLimit).select('feedbackDate difficulty confidence workload completedWork blockers topics').lean(),
    DailyTarget.find({ owner, curriculum: curriculumId }).sort({ targetDate: -1 }).limit(recentLimit).select('targetDate localDateKey items allocatedMinutes').lean(),
    LearnerPracticeSignal.find({ owner, curriculum: curriculumId }).sort({ observedAt: -1 }).limit(recentLimit).select('topicKey scorePercent incorrectCount concepts observedAt').lean(),
    LearningNote.find({ owner, curriculum: curriculumId }).sort({ createdAt: -1 }).limit(Math.min(recentLimit, 10)).select('moduleKey topicKey topicTitle version content createdAt').lean(),
  ])
  const boundedTargets = recentTargets.map((target) => ({ ...target, items: target.items.slice(0, 30) }))
  const boundedNotes = recentNotes.map((note) => ({ ...note, content: JSON.stringify(note.content).slice(0, 6000) }))
  return { curriculum: { id: String(curriculum._id), goal: curriculum.goal, subject: curriculum.subject, currentSkillLevel: curriculum.currentSkillLevel, progressPercent: curriculum.progressPercent, completedTopicKeys: curriculum.completedTopicKeys.slice(0, 500) }, recentFeedback, recentTargets: boundedTargets, practiceSignals, recentNotes: boundedNotes }
}
