import mongoose, { Document, Schema, Types } from 'mongoose'

export type FeedbackRating = 1 | 2 | 3 | 4 | 5

export interface IDailyFeedback {
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  dailyTarget?: Types.ObjectId
  feedbackDate: Date
  difficulty: FeedbackRating
  confidence: FeedbackRating
  workload: FeedbackRating
  completedWork: string[]
  blockers: string[]
  topics: string[]
  createdAt: Date
  updatedAt: Date
}

export type DailyFeedbackDocument = Document<unknown, object, IDailyFeedback> & IDailyFeedback

const boundedStringArray = {
  type: [String],
  default: [],
  validate: {
    validator: (values: unknown[]) => values.length <= 30 && values.every((value) => typeof value === 'string' && value.trim().length <= 240),
    message: 'Lists must contain at most 30 entries of 240 characters or fewer.',
  },
}

const dailyFeedbackSchema = new Schema<IDailyFeedback>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
  dailyTarget: { type: Schema.Types.ObjectId, ref: 'DailyTarget', immutable: true },
  feedbackDate: { type: Date, required: true, immutable: true },
  difficulty: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  confidence: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  workload: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  completedWork: boundedStringArray,
  blockers: boundedStringArray,
  topics: boundedStringArray,
}, { timestamps: true, strict: 'throw' })

dailyFeedbackSchema.index({ owner: 1, curriculum: 1, feedbackDate: -1 })
dailyFeedbackSchema.index({ owner: 1, createdAt: -1 })
dailyFeedbackSchema.index({ owner: 1, dailyTarget: 1 })

export const DailyFeedback = mongoose.model<IDailyFeedback>('DailyFeedback', dailyFeedbackSchema)
