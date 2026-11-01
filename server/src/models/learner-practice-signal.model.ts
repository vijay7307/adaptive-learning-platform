import mongoose, { Document, Schema, Types } from 'mongoose'

export interface ILearnerPracticeSignal {
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  topicKey: string
  attemptKey: string
  scorePercent: number
  incorrectCount: number
  concepts: string[]
  observedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type LearnerPracticeSignalDocument = Document<unknown, object, ILearnerPracticeSignal> & ILearnerPracticeSignal

const learnerPracticeSignalSchema = new Schema<ILearnerPracticeSignal>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
  topicKey: { type: String, required: true, trim: true, immutable: true },
  attemptKey: { type: String, required: true, trim: true, immutable: true },
  scorePercent: { type: Number, required: true, min: 0, max: 100, immutable: true },
  incorrectCount: { type: Number, required: true, min: 0, validate: Number.isInteger, immutable: true },
  concepts: {
    type: [String],
    default: [],
    immutable: true,
    set: (values: string[]) => [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))],
  },
  observedAt: { type: Date, required: true, immutable: true },
}, { timestamps: true, strict: 'throw' })

learnerPracticeSignalSchema.index({ owner: 1, curriculum: 1, topicKey: 1, attemptKey: 1 }, { unique: true })
learnerPracticeSignalSchema.index({ owner: 1, curriculum: 1, topicKey: 1, observedAt: -1 })

export const LearnerPracticeSignal = mongoose.model<ILearnerPracticeSignal>('LearnerPracticeSignal', learnerPracticeSignalSchema)
