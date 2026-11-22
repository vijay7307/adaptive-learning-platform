import mongoose, { Document, Schema, Types } from 'mongoose'

export type TestAttemptStatus = 'in_progress' | 'submitted' | 'evaluated' | 'interrupted'
export interface ITestAnswer { questionKey: string; answer: string }
export interface ITestResult {
  questionKey: string
  score: number
  maxScore: number
  feedback?: string
  mistakes?: string[]
  correctedSolution?: string
  suggestedRevisionTopics?: string[]
  correctness: 'correct' | 'partial' | 'incorrect'
}
export interface ITestAttempt {
  attemptKey: string
  owner: Types.ObjectId
  test: Types.ObjectId
  status: TestAttemptStatus
  answers: ITestAnswer[]
  results: ITestResult[]
  score: number
  maxScore: number
  startedAt: Date
  submittedAt?: Date
  evaluatedAt?: Date
  updatedAt: Date
}
export type TestAttemptDocument = Document<unknown, object, ITestAttempt> & ITestAttempt
const answerSchema = new Schema<ITestAnswer>({ questionKey: { type: String, required: true }, answer: { type: String, maxlength: 20000, required: true } }, { _id: false, strict: 'throw' })
const resultSchema = new Schema<ITestResult>({
  questionKey: { type: String, required: true },
  score: { type: Number, min: 0, required: true },
  maxScore: { type: Number, min: 1, required: true },
  feedback: String,
  mistakes: { type: [String], default: undefined },
  correctedSolution: String,
  suggestedRevisionTopics: { type: [String], default: undefined },
  correctness: { type: String, enum: ['correct', 'partial', 'incorrect'], required: true },
}, { _id: false, strict: 'throw' })
const schema = new Schema<ITestAttempt>({
  attemptKey: { type: String, required: true, unique: true, immutable: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  test: { type: Schema.Types.ObjectId, ref: 'Test', required: true, immutable: true },
  status: { type: String, enum: ['in_progress', 'submitted', 'evaluated', 'interrupted'], default: 'in_progress', required: true },
  answers: { type: [answerSchema], required: true },
  results: { type: [resultSchema], default: [] },
  score: { type: Number, min: 0, default: 0 },
  maxScore: { type: Number, min: 0, required: true, immutable: true },
  startedAt: { type: Date, required: true, immutable: true },
  submittedAt: Date, evaluatedAt: Date,
}, { timestamps: true, strict: 'throw' })
schema.index({ owner: 1, test: 1, createdAt: -1 })
schema.index({ owner: 1, status: 1, updatedAt: -1 })
schema.pre('save', function (next) {
  if (this.status === 'evaluated' && (!this.evaluatedAt || !this.submittedAt || !this.results.length)) return next(new Error('Evaluated attempts require results and timestamps.'))
  if (this.score > this.maxScore) return next(new Error('Score cannot exceed maxScore.'))
  next()
})
export const TestAttempt = mongoose.model<ITestAttempt>('TestAttempt', schema)
