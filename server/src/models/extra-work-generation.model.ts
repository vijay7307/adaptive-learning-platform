import mongoose, { Document, Schema, Types } from 'mongoose'
import type { IDailyTargetItem } from './daily-target.model'

export type ExtraWorkGenerationStatus = 'processing' | 'completed' | 'failed'

export interface IExtraWorkGeneration {
  owner: Types.ObjectId
  localDateKey: string
  curriculum: Types.ObjectId
  status: ExtraWorkGenerationStatus
  items: IDailyTargetItem[]
  error?: string
  createdAt: Date
  updatedAt: Date
}

export type ExtraWorkGenerationDocument = Document<unknown, object, IExtraWorkGeneration> & IExtraWorkGeneration

const itemSchema = new Schema<IDailyTargetItem>(
  {
    topicKey: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, trim: true },
    learningObjectives: { type: [String], default: undefined },
    subtopics: { type: [String], default: undefined },
    activities: { type: [String], default: undefined },
    deliverable: { type: String, trim: true },
    completionCriteria: { type: [String], default: undefined },
    estimatedDurationMinutes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'completed', 'missed'], required: true, default: 'pending' },
  },
  { _id: false },
)

const schema = new Schema<IExtraWorkGeneration>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    localDateKey: { type: String, required: true, immutable: true },
    curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
    status: { type: String, enum: ['processing', 'completed', 'failed'], required: true },
    items: { type: [itemSchema], default: [] },
    error: { type: String, maxlength: 500 },
  },
  { timestamps: true },
)

schema.index({ owner: 1, localDateKey: 1 }, { unique: true })
schema.index({ owner: 1, localDateKey: 1, status: 1 })

export const ExtraWorkGeneration = mongoose.model<IExtraWorkGeneration>('ExtraWorkGeneration', schema)
