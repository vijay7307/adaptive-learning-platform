import mongoose, { Document, Schema, Types } from 'mongoose'

export type DailyTargetGenerationJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface IDailyTargetGenerationJob {
  owner: Types.ObjectId
  localDateKey: string
  status: DailyTargetGenerationJobStatus
  attempts: number
  nextAttemptAt: Date
  lockedUntil?: Date
  lastError?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type DailyTargetGenerationJobDocument = Document<unknown, object, IDailyTargetGenerationJob> & IDailyTargetGenerationJob

const schema = new Schema<IDailyTargetGenerationJob>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    localDateKey: { type: String, required: true, immutable: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], required: true, default: 'pending' },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    nextAttemptAt: { type: Date, required: true, default: Date.now },
    lockedUntil: Date,
    lastError: { type: String, maxlength: 500 },
    completedAt: Date,
  },
  { timestamps: true },
)

schema.index({ owner: 1, localDateKey: 1 }, { unique: true })
schema.index({ status: 1, nextAttemptAt: 1, lockedUntil: 1 })

export const DailyTargetGenerationJob = mongoose.model<IDailyTargetGenerationJob>(
  'DailyTargetGenerationJob',
  schema,
)
