import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export type DailyTargetStatus = 'pending' | 'completed' | 'missed'

export interface IDailyTargetItem {
  topicKey: string
  title: string
  estimatedDurationMinutes: number
  status: DailyTargetStatus
}

export interface IDailyTarget {
  owner: Types.ObjectId
  curriculum: Types.ObjectId
  targetDate: Date
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
    items: { type: [dailyTargetItemSchema], required: true, default: [] },
    allocatedMinutes: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
)

dailyTargetSchema.index({ owner: 1, curriculum: 1, targetDate: 1 }, { unique: true })
dailyTargetSchema.index({ owner: 1, targetDate: 1 })

export const DailyTarget = mongoose.model<IDailyTarget, DailyTargetModel>('DailyTarget', dailyTargetSchema)
