import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export type DailyTargetStatus = 'pending' | 'completed' | 'missed'
export type DailyTargetKind = 'regular'

export interface IDailyTargetItem {
  topicKey: string
  title: string
  description?: string
  learningObjectives?: string[]
  subtopics?: string[]
  activities?: string[]
  deliverable?: string
  completionCriteria?: string[]
  estimatedDurationMinutes: number
  status: DailyTargetStatus
}

export interface IDailyTarget {
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  targetDate: Date
  localDateKey: string
  kind: DailyTargetKind
  items: IDailyTargetItem[]
  allocatedMinutes: number
  createdAt: Date
  updatedAt: Date
}

export type DailyTargetDocument = Document<unknown, object, IDailyTarget> & IDailyTarget
export type DailyTargetModel = Model<IDailyTarget>

const dailyTargetItemSchema = new Schema<IDailyTargetItem>(
  {
    topicKey: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    learningObjectives: { type: [String], default: undefined },
    subtopics: { type: [String], default: undefined },
    activities: { type: [String], default: undefined },
    deliverable: { type: String, trim: true },
    completionCriteria: { type: [String], default: undefined },
    estimatedDurationMinutes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'completed', 'missed'], default: 'pending' },
  },
  { _id: false },
)

const dailyTargetSchema = new Schema<IDailyTarget, DailyTargetModel>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    curriculum: { type: Schema.Types.ObjectId, ref: 'Curriculum', required: true, immutable: true },
    targetDate: { type: Date, required: true, immutable: true },
    localDateKey: { type: String, required: true, immutable: true },
    kind: { type: String, enum: ['regular'], required: true, default: 'regular', immutable: true },
    items: { type: [dailyTargetItemSchema], required: true, default: [] },
    allocatedMinutes: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
)

dailyTargetSchema.index({ owner: 1, curriculum: 1, targetDate: 1 }, { unique: true })
dailyTargetSchema.index({ owner: 1, curriculum: 1, localDateKey: 1 }, { unique: true })
dailyTargetSchema.index({ owner: 1, localDateKey: 1 })

export const DailyTarget = mongoose.model<IDailyTarget, DailyTargetModel>('DailyTarget', dailyTargetSchema)
