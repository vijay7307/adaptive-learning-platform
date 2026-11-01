import mongoose, { Document, Schema, Types } from 'mongoose'
import type { PracticeDifficulty, PracticeQuestionType } from '../services/practice.types'

export interface IPracticeOption {
  key: string
  text: string
}

export interface IPracticeQuestion {
  questionKey: string
  type: PracticeQuestionType
  prompt: string
  learningObjectives: string[]
  difficulty: PracticeDifficulty
  points: number
  options?: IPracticeOption[]
  correctAnswer?: string
  evaluationRubric: string[]
  referenceSolution?: string
  evaluationCriteria: string[]
}

export interface IPracticeSet {
  setKey: string
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  moduleKey: string
  topicKey: string
  topicTitle: string
  sourceLearningNote?: Types.ObjectId
  sourceLearningNoteVersion?: number
  difficulty: PracticeDifficulty
  questions: IPracticeQuestion[]
  createdAt: Date
  updatedAt: Date
}

export type PracticeSetDocument = Document<unknown, object, IPracticeSet> & IPracticeSet

const optionSchema = new Schema<IPracticeOption>({
  key: { type: String, required: true, trim: true },
  text: { type: String, required: true, trim: true },
}, { _id: false })

const questionSchema = new Schema<IPracticeQuestion>({
  questionKey: { type: String, required: true, trim: true, immutable: true },
  type: { type: String, enum: ['mcq', 'short-answer', 'coding', 'practical'], required: true, immutable: true },
  prompt: { type: String, required: true, trim: true, immutable: true },
  learningObjectives: { type: [String], required: true, immutable: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true, immutable: true },
  points: { type: Number, required: true, min: 1, immutable: true },
  options: { type: [optionSchema], immutable: true },
  correctAnswer: { type: String, trim: true, immutable: true },
  evaluationRubric: { type: [String], required: true, immutable: true },
  referenceSolution: { type: String, trim: true, immutable: true },
  evaluationCriteria: { type: [String], required: true, immutable: true },
}, { _id: false, strict: 'throw' })

function stripPrivateQuestionFields(_doc: unknown, ret: Record<string, unknown>): void {
  const questions = ret.questions
  if (!Array.isArray(questions)) return
  for (const question of questions) {
    if (question && typeof question === 'object') {
      delete (question as Record<string, unknown>).correctAnswer
      delete (question as Record<string, unknown>).evaluationRubric
      delete (question as Record<string, unknown>).referenceSolution
    }
  }
}

const practiceSetSchema = new Schema<IPracticeSet>({
  setKey: { type: String, required: true, trim: true, immutable: true, unique: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
  moduleKey: { type: String, required: true, trim: true, immutable: true },
  topicKey: { type: String, required: true, trim: true, immutable: true },
  topicTitle: { type: String, required: true, trim: true, immutable: true },
  sourceLearningNote: { type: Schema.Types.ObjectId, ref: 'LearningNote', immutable: true },
  sourceLearningNoteVersion: { type: Number, min: 1, immutable: true },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true, immutable: true },
  questions: { type: [questionSchema], required: true, immutable: true },
}, {
  timestamps: true,
  strict: 'throw',
  toJSON: { transform: stripPrivateQuestionFields },
  toObject: { transform: stripPrivateQuestionFields },
})

practiceSetSchema.pre('validate', function (next) {
  const questions = this.questions || []
  if (questions.length < 1 || questions.length > 10) {
    this.invalidate('questions', 'Practice sets must contain between 1 and 10 questions.')
  }
  const questionKeys = questions.map((question) => question.questionKey)
  if (new Set(questionKeys).size !== questionKeys.length) {
    this.invalidate('questions', 'Question keys must be unique within a practice set.')
  }
  for (const question of questions) {
    if (question.type === 'mcq') {
      const options = question.options || []
      const optionKeys = options.map((option) => option.key)
      if (options.length < 2 || options.length > 6) {
        this.invalidate('questions', 'MCQ questions must contain between 2 and 6 options.')
      }
      if (new Set(optionKeys).size !== optionKeys.length) {
        this.invalidate('questions', 'MCQ option keys must be unique within a question.')
      }
      if (!question.correctAnswer || optionKeys.filter((key) => key === question.correctAnswer).length !== 1) {
        this.invalidate('questions', 'MCQ correctAnswer must match exactly one option key.')
      }
    } else if (question.options !== undefined || question.correctAnswer !== undefined) {
      this.invalidate('questions', 'Only MCQ questions may contain options or correctAnswer.')
    }
    if (question.type === 'coding' && !question.referenceSolution?.trim()) {
      this.invalidate('questions', 'Coding questions require a reference solution.')
    }
    if (question.type !== 'coding' && question.referenceSolution !== undefined) {
      this.invalidate('questions', 'Only coding questions may contain a reference solution.')
    }
  }
  if (questions.filter((question) => question.type === 'coding').length > 3) {
    this.invalidate('questions', 'Practice sets may contain at most three coding questions.')
  }
  if (this.sourceLearningNoteVersion !== undefined && !this.sourceLearningNote) {
    this.invalidate('sourceLearningNoteVersion', 'A learning note reference is required when a note version is provided.')
  }
  if (this.sourceLearningNote && this.sourceLearningNoteVersion === undefined) {
    this.invalidate('sourceLearningNoteVersion', 'A learning note version is required when a note reference is provided.')
  }
  next()
})

practiceSetSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  next(new Error('Practice sets are immutable after creation; use a new set for regeneration.'))
})

practiceSetSchema.index({ owner: 1, curriculum: 1, topicKey: 1, createdAt: -1 })
practiceSetSchema.index({ owner: 1, createdAt: -1 })

export const PracticeSet = mongoose.model<IPracticeSet>('PracticeSet', practiceSetSchema)
