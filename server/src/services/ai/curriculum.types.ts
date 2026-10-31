export interface GeneratedCurriculum {
  goal: string
  subject: string
  currentSkillLevel: 'beginner' | 'intermediate' | 'advanced'
  availableStudyTimeMinutesPerDay: number
  targetDurationDays: number
  deadline: string
  practiceActivities: string[]
  revisionSessions: string[]
  assessmentRecommendations: string[]
  modules: Array<{
    title: string
    order: number
    topics: Array<{
      title: string
      order: number
      description?: string
      learningObjectives: string[]
      subtopics?: string[]
      activities?: string[]
      deliverable?: string
      estimatedDurationMinutes: number
      completionCriteria: string[]
    }>
    milestone: string
    completionCriteria: string[]
  }>
  milestones: Array<{
    title: string
    description: string
    targetDate: string
    completionCriteria: string[]
  }>
}
