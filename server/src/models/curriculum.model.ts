import mongoose, { Document, Model, Schema, Types } from 'mongoose'

export type CurrentSkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type CurriculumStatus = 'draft' | 'active' | 'completed' | 'archived'

export interface ICurriculumTopic {
  title: string
  order: number
  learningObjectives: string[]
  estimatedDurationMinutes: number
  completionCriteria: string[]
}

export interface ICurriculumModule {
  title: string
  order: number
  topics: ICurriculumTopic[]
  milestone: string
  completionCriteria: string[]
}

export interface ICurriculumMilestone {
  title: string
  description: string
  targetDate: Date
  completionCriteria: string[]
}

export interface ICurriculum {
  owner: Types.ObjectId
  goal: string
  subject: string
  currentSkillLevel: CurrentSkillLevel
  availableStudyTimeMinutesPerDay: number
  targetDurationDays: number
  deadline: Date
  modules: ICurriculumModule[]
  milestones: ICurriculumMilestone[]
  status: CurriculumStatus
  createdAt: Date
  updatedAt: Date
}

export type CurriculumDocument = Document<unknown, object, ICurriculum> & ICurriculum
export type CurriculumModel = Model<ICurriculum>

const MINUTES_PER_DAY = 1
const MAX_MINUTES_PER_DAY = 24 * 60
const MIN_TARGET_DURATION_DAYS = 1
const MAX_TARGET_DURATION_DAYS = 3650

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasAtLeastOneItem(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function hasUniquePositiveOrder(values: Array<{ order: number }>): boolean {
  const orders = values.map((value) => value.order)
  return orders.every(
    (order, index) =>
      Number.isInteger(order) && order > 0 && orders.indexOf(order) === index
  )
}

function hasUniquePositiveTopicOrders(modules: ICurriculumModule[]): boolean {
  return modules.every(
    (module) =>
      hasAtLeastOneItem(module.topics) && hasUniquePositiveOrder(module.topics)
  )
}

const curriculumTopicSchema = new Schema<ICurriculumTopic>(
  {
    title: {
      type: String,
      required: [true, 'Topic title is required'],
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Topic title cannot be empty',
      },
    },
    order: {
      type: Number,
      required: [true, 'Topic order is required'],
      min: [1, 'Topic order must be a positive integer'],
      validate: {
        validator: Number.isInteger,
        message: 'Topic order must be a positive integer',
      },
    },
    learningObjectives: {
      type: [String],
      required: [true, 'At least one learning objective is required'],
      validate: {
        validator: (value: unknown) =>
          hasAtLeastOneItem(value) &&
          (value as unknown[]).every(isNonEmptyString),
        message: 'Learning objectives must contain at least one non-empty string',
      },
    },
    estimatedDurationMinutes: {
      type: Number,
      required: [true, 'Topic estimated duration is required'],
      min: [1, 'Topic estimated duration must be at least one minute'],
      validate: {
        validator: Number.isInteger,
        message: 'Topic estimated duration must be a positive integer',
      },
    },
    completionCriteria: {
      type: [String],
      required: [true, 'Topic completion criteria is required'],
      validate: {
        validator: (value: unknown) =>
          hasAtLeastOneItem(value) &&
          (value as unknown[]).every(isNonEmptyString),
        message: 'Topic completion criteria must contain at least one non-empty string',
      },
    },
  },
  { _id: false }
)

const curriculumModuleSchema = new Schema<ICurriculumModule>(
  {
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Module title cannot be empty',
      },
    },
    order: {
      type: Number,
      required: [true, 'Module order is required'],
      min: [1, 'Module order must be a positive integer'],
      validate: {
        validator: Number.isInteger,
        message: 'Module order must be a positive integer',
      },
    },
    topics: {
      type: [curriculumTopicSchema],
      required: [true, 'At least one topic is required per module'],
      validate: {
        validator: hasAtLeastOneItem,
        message: 'Each module must contain at least one topic',
      },
    },
    milestone: {
      type: String,
      required: [true, 'Module milestone is required'],
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Module milestone cannot be empty',
      },
    },
    completionCriteria: {
      type: [String],
      required: [true, 'Module completion criteria is required'],
      validate: {
        validator: (value: unknown) =>
          hasAtLeastOneItem(value) &&
          (value as unknown[]).every(isNonEmptyString),
        message: 'Module completion criteria must contain at least one non-empty string',
      },
    },
  },
  { _id: false }
)

const curriculumMilestoneSchema = new Schema<ICurriculumMilestone>(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Milestone title cannot be empty',
      },
    },
    description: {
      type: String,
      required: [true, 'Milestone description is required'],
      trim: true,
      validate: {
        validator: isNonEmptyString,
        message: 'Milestone description cannot be empty',
      },
    },
    targetDate: {
      type: Date,
      required: [true, 'Milestone target date is required'],
      validate: {
        validator: (value: Date) => !Number.isNaN(value.getTime()),
        message: 'Milestone target date must be a valid date',
      },
    },
    completionCriteria: {
      type: [String],
      required: [true, 'Milestone completion criteria is required'],
      validate: {
        validator: (value: unknown) =>
          hasAtLeastOneItem(value) &&
          (value as unknown[]).every(isNonEmptyString),
        message: 'Milestone completion criteria must contain at least one non-empty string',
      },
    },
  },
  { _id: false }
)

const curriculumSchema = new Schema<ICurriculum, CurriculumModel>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Curriculum owner is required'],
      immutable: true,
    },
    goal: {
      type: String,
      required: [true, 'Learning goal is required'],
      trim: true,
      minlength: [2, 'Learning goal must be at least 2 characters'],
      maxlength: [200, 'Learning goal cannot exceed 200 characters'],
      validate: {
        validator: isNonEmptyString,
        message: 'Learning goal cannot be empty',
      },
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [2, 'Subject must be at least 2 characters'],
      maxlength: [120, 'Subject cannot exceed 120 characters'],
      validate: {
        validator: isNonEmptyString,
        message: 'Subject cannot be empty',
      },
    },
    currentSkillLevel: {
      type: String,
      enum: {
        values: ['beginner', 'intermediate', 'advanced'],
        message: 'Current skill level must be beginner, intermediate, or advanced',
      },
      required: [true, 'Current skill level is required'],
    },
    availableStudyTimeMinutesPerDay: {
      type: Number,
      required: [true, 'Available study time per day is required'],
      min: [MINUTES_PER_DAY, 'Available study time must be at least one minute'],
      max: [MAX_MINUTES_PER_DAY, 'Available study time cannot exceed 24 hours'],
      validate: {
        validator: Number.isInteger,
        message: 'Available study time must be a positive integer',
      },
    },
    targetDurationDays: {
      type: Number,
      required: [true, 'Target duration is required'],
      min: [MIN_TARGET_DURATION_DAYS, 'Target duration must be at least one day'],
      max: [MAX_TARGET_DURATION_DAYS, 'Target duration cannot exceed 10 years'],
      validate: {
        validator: Number.isInteger,
        message: 'Target duration must be a positive integer',
      },
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
      validate: {
        validator: (value: Date) => !Number.isNaN(value.getTime()),
        message: 'Deadline must be a valid date',
      },
    },
    modules: {
      type: [curriculumModuleSchema],
      required: [true, 'At least one curriculum module is required'],
      validate: [
        {
          validator: hasAtLeastOneItem,
          message: 'Curriculum must contain at least one module',
        },
        {
          validator: (value: unknown) =>
            hasUniquePositiveOrder(value as Array<{ order: number }>),
          message: 'Curriculum module orders must be unique positive integers',
        },
        {
          validator: (value: unknown) =>
            hasUniquePositiveTopicOrders(value as ICurriculumModule[]),
          message: 'Each module must contain uniquely ordered topics',
        },
      ],
    },
    milestones: {
      type: [curriculumMilestoneSchema],
      required: [true, 'At least one curriculum milestone is required'],
      validate: {
        validator: hasAtLeastOneItem,
        message: 'Curriculum must contain at least one milestone',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'completed', 'archived'],
        message: 'Curriculum status is invalid',
      },
      default: 'draft',
    },
  },
  {
    timestamps: true,
    strict: 'throw',
  }
)

curriculumSchema.pre('validate', function (next) {
  const now = new Date()
  const durationDeadline = new Date(now)
  durationDeadline.setDate(durationDeadline.getDate() + this.targetDurationDays)

  if (this.deadline <= now) {
    this.invalidate('deadline', 'Deadline must be in the future')
  }

  if (this.deadline > durationDeadline) {
    this.invalidate(
      'deadline',
      'Deadline cannot be later than the target duration from today'
    )
  }

  const modules = this.modules || []
  const milestones = this.milestones || []
  const moduleOrders = modules.map((module) => module.order).sort((a, b) => a - b)
  if (moduleOrders.some((order, index) => order !== index + 1)) {
    this.invalidate('modules', 'Module orders must be sequential starting at 1')
  }

  for (const module of modules) {
    const topicOrders = module.topics.map((topic) => topic.order).sort((a, b) => a - b)
    if (topicOrders.some((order, index) => order !== index + 1)) {
      this.invalidate('modules', 'Topic orders must be sequential starting at 1 within each module')
      break
    }
  }

  const milestoneDates = milestones.map((milestone) => milestone.targetDate)
  if (milestoneDates.some((date) => date < now || date > this.deadline)) {
    this.invalidate(
      'milestones',
      'Milestone target dates must be between today and the curriculum deadline'
    )
  }

  next()
})

export const Curriculum = mongoose.model<ICurriculum, CurriculumModel>(
  'Curriculum',
  curriculumSchema
)
