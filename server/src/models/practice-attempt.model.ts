import mongoose, { Document, Schema, Types } from 'mongoose'
import type { CorrectnessClassification, PracticeAttemptStatus } from '../services/practice.types'

export interface IPracticeAnswer {
  questionKey: string
  answer: string
}

export interface IPracticeQuestionResult {
  questionKey: string
  submittedAnswer: string
  score: number
  maxScore: number
  correctness: CorrectnessClassification
  feedback: string
  mistakes: string[]
  correctedSolution?: string
  suggestedRevisionTopics: string[]
  correctAnswer?: string
}

export interface IPracticeAttempt {
  attemptKey: string
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  practiceSet: Types.ObjectId
  status: PracticeAttemptStatus
  answers: IPracticeAnswer[]
  questionResults: IPracticeQuestionResult[]
  totalPoints: number
  earnedPoints: number
  scorePercent: number
  startedAt: Date
  submittedAt?: Date
  evaluatedAt?: Date
  evaluationClaimedAt?: Date
  evaluationClaimToken?: string
  createdAt: Date
  updatedAt: Date
}

export type PracticeAttemptDocument = Document<unknown, object, IPracticeAttempt> & IPracticeAttempt

const answerSchema = new Schema<IPracticeAnswer>({
  questionKey: { type: String, required: true, trim: true },
  answer: { type: String, required: true },
}, { _id: false, strict: 'throw' })

const resultSchema = new Schema<IPracticeQuestionResult>({
  questionKey: { type: String, required: true, trim: true },
  submittedAnswer: { type: String, required: true },
  score: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, required: true, min: 1 },
  correctness: { type: String, enum: ['incorrect', 'partially_correct', 'mostly_correct', 'correct'], required: true },
  feedback: { type: String, required: true, trim: true },
  mistakes: { type: [String], default: [] },
  correctedSolution: { type: String, trim: true },
  suggestedRevisionTopics: { type: [String], default: [] },
  correctAnswer: { type: String, trim: true },
}, { _id: false, strict: 'throw' })

const practiceAttemptSchema = new Schema<IPracticeAttempt>({
  attemptKey: { type: String, required: true, trim: true, immutable: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
  practiceSet: { type: Schema.Types.ObjectId, ref: 'PracticeSet', required: true, immutable: true },
  status: { type: String, enum: ['in_progress', 'submitted', 'evaluating', 'evaluated', 'failed'], required: true, default: 'in_progress' },
  answers: { type: [answerSchema], default: [] },
  questionResults: { type: [resultSchema], default: [] },
  totalPoints: { type: Number, required: true, min: 0 },
  earnedPoints: { type: Number, required: true, min: 0 },
  scorePercent: { type: Number, required: true, min: 0, max: 100 },
  startedAt: { type: Date, required: true, immutable: true },
  submittedAt: { type: Date },
  evaluatedAt: { type: Date },
  evaluationClaimedAt: { type: Date },
  evaluationClaimToken: { type: String, select: false },
}, {
  timestamps: true,
  strict: 'throw',
})

practiceAttemptSchema.pre('validate', function (next) {
  const answerKeys = (this.answers || []).map((answer) => answer.questionKey)
  const resultKeys = (this.questionResults || []).map((result) => result.questionKey)
  if (new Set(answerKeys).size !== answerKeys.length) this.invalidate('answers', 'Answer question keys must be unique.')
  if (new Set(resultKeys).size !== resultKeys.length) this.invalidate('questionResults', 'Result question keys must be unique.')
  if (this.totalPoints <= 0) this.invalidate('totalPoints', 'Total points must be greater than zero.')
  if (this.earnedPoints < 0 || this.earnedPoints > this.totalPoints) this.invalidate('earnedPoints', 'Earned points must be within total points.')
  if (this.totalPoints > 0) {
    const expected = Math.round((this.earnedPoints / this.totalPoints) * 10000) / 100
    if (this.scorePercent !== expected) this.invalidate('scorePercent', 'Score percentage must match earned and total points.')
  }
  for (const result of this.questionResults || []) {
    if (result.score > result.maxScore) this.invalidate('questionResults', 'Question score cannot exceed its maximum.')
  }
  if (this.status === 'in_progress') {
    if (this.questionResults.length > 0) this.invalidate('questionResults', 'In-progress attempts cannot contain evaluation results.')
    if (this.submittedAt) this.invalidate('submittedAt', 'In-progress attempts cannot contain submittedAt.')
    if (this.evaluatedAt) this.invalidate('evaluatedAt', 'In-progress attempts cannot contain evaluatedAt.')
  }
  if (this.status === 'submitted') {
    if (!this.submittedAt) this.invalidate('submittedAt', 'Submitted attempts require submittedAt.')
    if (this.evaluatedAt) this.invalidate('evaluatedAt', 'Submitted attempts cannot contain evaluatedAt.')
    if (this.questionResults.length > 0) this.invalidate('questionResults', 'Submitted attempts cannot contain evaluation results.')
  }
  if (this.status === 'evaluating') {
    if (!this.submittedAt) this.invalidate('submittedAt', 'Evaluating attempts require submittedAt.')
    if (this.evaluatedAt) this.invalidate('evaluatedAt', 'Evaluating attempts cannot contain evaluatedAt.')
  }
  if (this.status === 'evaluated') {
    if (!this.submittedAt) this.invalidate('submittedAt', 'Evaluated attempts require submittedAt.')
    if (!this.evaluatedAt) this.invalidate('evaluatedAt', 'Evaluated attempts require evaluatedAt.')
    if (this.questionResults.length === 0) this.invalidate('questionResults', 'Evaluated attempts require evaluation results.')
  }
  if (this.status === 'failed') {
    if (!this.submittedAt) this.invalidate('submittedAt', 'Failed attempts require submittedAt.')
    if (this.evaluatedAt) this.invalidate('evaluatedAt', 'Failed attempts cannot contain evaluatedAt.')
  }
  next()
})

practiceAttemptSchema.pre('save', async function () {
  if (this.isNew) return
  const persisted = await mongoose.model<IPracticeAttempt>('PracticeAttempt')
    .findById(this._id)
    .select('status')
    .lean<{ status: PracticeAttemptStatus }>()
  const persistedStatus = persisted?.status
  if (persistedStatus === 'evaluated' && this.isModified()) {
    throw new Error('Evaluated practice attempts are immutable; create a new attempt.')
  }
  if (persistedStatus === 'submitted' &&
    (this.isModified('answers') || this.isModified('questionResults') ||
      this.isModified('totalPoints') || this.isModified('earnedPoints') || this.isModified('scorePercent'))) {
    throw new Error('Submitted attempt answers and scores are immutable.')
  }
})

practiceAttemptSchema.index({ owner: 1, attemptKey: 1 }, { unique: true })
practiceAttemptSchema.index({ owner: 1, curriculum: 1, createdAt: -1 })
practiceAttemptSchema.index({ owner: 1, practiceSet: 1, createdAt: -1 })
practiceAttemptSchema.index({ owner: 1, status: 1, createdAt: -1 })
practiceAttemptSchema.index({ status: 1, evaluationClaimedAt: 1 })

export const PracticeAttempt = mongoose.model<IPracticeAttempt>('PracticeAttempt', practiceAttemptSchema)
