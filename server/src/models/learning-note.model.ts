import mongoose, { Document, Schema, Types } from 'mongoose'
import type { GeneratedLearningNote } from '../services/ai/learning-notes.types'

export interface ILearningNote {
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  moduleKey: string
  topicKey: string
  topicTitle: string
  version: number
  content: GeneratedLearningNote
  createdAt: Date
  updatedAt: Date
}

export type LearningNoteDocument = Document<unknown, object, ILearningNote> & ILearningNote

const codeExampleSchema = new Schema({ language: String, code: String, explanation: String, expectedOutput: String }, { _id: false })
const sectionSchema = new Schema({
  title: String,
  explanation: String,
  subtopics: [String],
  examples: [String],
  codeExamples: [codeExampleSchema],
}, { _id: false })
const knowledgeCheckSchema = new Schema({
  question: String,
  answer: String,
  explanation: String,
}, { _id: false })
const contentSchema = new Schema({
  introduction: String,
  learningObjectives: [String],
  prerequisites: [String],
  sections: [sectionSchema],
  applications: [String],
  commonMistakes: [String],
  keyTakeaways: [String],
  revisionSummary: String,
  knowledgeChecks: [knowledgeCheckSchema],
}, { _id: false })

const schema = new Schema<ILearningNote>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
  moduleKey: { type: String, required: true, immutable: true, trim: true },
  topicKey: { type: String, required: true, immutable: true, trim: true },
  topicTitle: { type: String, required: true, immutable: true, trim: true },
  version: { type: Number, required: true, immutable: true, min: 1 },
  content: { type: contentSchema, required: true },
}, { timestamps: true })

schema.index({ owner: 1, curriculum: 1, moduleKey: 1, topicKey: 1, version: 1 }, { unique: true })
schema.index({ owner: 1, curriculum: 1, moduleKey: 1, topicKey: 1, version: -1 })

export const LearningNote = mongoose.model<ILearningNote>('LearningNote', schema)
