import mongoose, { Document, Schema, Types } from 'mongoose'

export type TestDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type TestQuestionType = 'mcq' | 'descriptive'

export interface ITestQuestion {
  questionKey: string
  type: TestQuestionType
  prompt: string
  options?: { key: string; text: string }[]
  correctAnswer?: string
  rubric?: string[]
  points: number
  topicKey: string
}
export interface ITest {
  testKey: string
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  moduleKey: string
  topicKey?: string
  source?: 'manual' | 'milestone'
  milestoneKey?: string
  difficulty: TestDifficulty
  durationMinutes: number
  scheduledAt?: Date
  questions: ITestQuestion[]
  createdAt: Date
  updatedAt: Date
}
export type TestDocument = Document<unknown, object, ITest> & ITest

const questionSchema = new Schema<ITestQuestion>({
  questionKey: { type: String, required: true, trim: true, immutable: true },
  type: { type: String, enum: ['mcq', 'descriptive'], required: true, immutable: true },
  prompt: { type: String, required: true, trim: true, immutable: true },
  options: { type: [{ key: { type: String, required: true }, text: { type: String, required: true } }], immutable: true },
  correctAnswer: { type: String, trim: true, immutable: true, select: false },
  rubric: { type: [String], immutable: true, select: false },
  points: { type: Number, min: 1, required: true, immutable: true },
  topicKey: { type: String, required: true, trim: true, immutable: true },
}, { _id: false, strict: 'throw' })

const schema = new Schema<ITest>({
  testKey: { type: String, required: true, unique: true, immutable: true, trim: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
  moduleKey: { type: String, required: true, trim: true, immutable: true },
  topicKey: { type: String, trim: true, immutable: true },
  source: { type: String, enum: ['manual', 'milestone'], default: 'manual', immutable: true },
  milestoneKey: { type: String, trim: true, immutable: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true, immutable: true },
  durationMinutes: { type: Number, min: 1, max: 480, required: true, immutable: true },
  scheduledAt: { type: Date, immutable: true },
  questions: { type: [questionSchema], required: true, immutable: true },
}, { timestamps: true, strict: 'throw' })

schema.pre('validate', function (next) {
  if (!this.questions?.length || this.questions.length > 100) this.invalidate('questions', 'Tests must contain 1 to 100 questions.')
  const keys = this.questions?.map((q) => q.questionKey) ?? []
  if (new Set(keys).size !== keys.length) this.invalidate('questions', 'Question keys must be unique.')
  for (const q of this.questions ?? []) {
    if (q.type === 'mcq' && (!q.options || q.options.length < 2 || !q.correctAnswer ||
      !q.options.some((option) => option.key === q.correctAnswer))) this.invalidate('questions', 'MCQs require valid options and an answer.')
    if (q.type === 'descriptive' && q.options) this.invalidate('questions', 'Descriptive questions cannot have options.')
  }
  next()
})
schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function (next) { next(new Error('Tests are immutable.')) })
schema.index({ owner: 1, curriculum: 1, createdAt: -1 })
schema.index({ owner: 1, moduleKey: 1, topicKey: 1 })
schema.index({ owner: 1, curriculum: 1, milestoneKey: 1 }, { unique: true, sparse: true })

export const Test = mongoose.model<ITest>('Test', schema)
