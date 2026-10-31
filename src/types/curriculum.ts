export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export interface CurriculumGenerationRequest {
  goal: string
  subject: string
  currentSkillLevel: SkillLevel
  availableStudyHoursPerDay: number
  targetDurationDays: number
  deadline?: string
}

export interface CurriculumTopic {
  title: string
  order: number
  learningObjectives: string[]
  estimatedDurationMinutes: number
  completionCriteria: string[]
}

export interface CurriculumModule {
  title: string
  order: number
  topics: CurriculumTopic[]
  milestone: string
  completionCriteria: string[]
}

export interface CurriculumMilestone {
  title: string
  description: string
  targetDate: string
  completionCriteria: string[]
}

export interface Curriculum {
  _id: string
  owner: string
  goal: string
  subject: string
  currentSkillLevel: SkillLevel
  availableStudyTimeMinutesPerDay: number
  targetDurationDays: number
  deadline: string
  startDate: string
  progressPercent: number
  completedTopicKeys: string[]
  targetHistory: Array<{
    date: string
    completedTopicKeys: string[]
    missedTopicKeys: string[]
  }>
  assessmentHistory: Array<{
    date: string
    score?: number
    notes?: string
  }>
  modules: CurriculumModule[]
  milestones: CurriculumMilestone[]
  status: 'draft' | 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface CurriculumGenerationResponse {
  success: boolean
  message?: string
  data: {
    curriculum: Curriculum
  }
}

export interface CurriculumListResponse {
  success: boolean
  data: {
    curricula: Curriculum[]
    activeCount: number
    maxActive: number
  }
}

export interface DailyTargetItem {
  topicKey: string
  title: string
  estimatedDurationMinutes: number
  status: 'pending' | 'completed' | 'missed'
}

export interface DailyTarget {
  _id: string
  curriculum: string
  targetDate: string
  items: DailyTargetItem[]
  allocatedMinutes: number
}

export interface DailyTargetResponse {
  success: boolean
  data: {
    date: string
    dailyStudyTimeBudgetMinutes: number
    targets: DailyTarget[]
  }
}

export interface DailyTargetItemResponse {
  success: boolean
  data: {
    target: DailyTarget
  }
}

export interface CurriculumDetailResponse {
  success: boolean
  data: {
    curriculum: Curriculum
  }
}
