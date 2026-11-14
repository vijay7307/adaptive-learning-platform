export type PracticeQuestionType = 'mcq' | 'short-answer' | 'coding' | 'practical'
export type PracticeStatus = 'in_progress' | 'submitted' | 'evaluating' | 'evaluated' | 'failed'

export interface PracticeQuestion {
  questionKey: string
  prompt: string
  type: PracticeQuestionType
  points: number
  options?: Array<{ key: string; text: string }>
}

export interface PracticeSet {
  _id?: string
  setKey: string
  topicTitle: string
  topicKey: string
  difficulty: string
  questions: PracticeQuestion[]
  createdAt?: string
}

export interface PracticeAttempt {
  attemptKey: string
  practiceSet?: string
  status: PracticeStatus
  answers?: Array<{ questionKey: string; answer: string }>
  scorePercent?: number
  earnedPoints?: number
  totalPoints?: number
  questionResults?: Array<{ questionKey: string; feedback: string; score: number; maxScore: number }>
  startedAt: string
  submittedAt?: string
}

export interface FeedbackEntry {
  curriculumId?: string
  _id?: string
  feedbackDate?: string
  difficulty: number
  confidence: number
  workload: number
  completedWork: string[]
  blockers: string[]
  topics: string[]
  createdAt?: string
}

export interface TestDefinition {
  testKey: string
  title: string
  description?: string
  durationMinutes?: number
  questionCount?: number
  questions?: PracticeQuestion[]
}

export interface TestAttempt {
  attemptKey: string
  testKey?: string
  status?: string
  scorePercent?: number
  startedAt: string
  submittedAt?: string
}
