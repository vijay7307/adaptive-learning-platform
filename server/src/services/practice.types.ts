export type PracticeQuestionType = 'mcq' | 'short-answer' | 'coding' | 'practical'
export type PracticeDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type CorrectnessClassification = 'incorrect' | 'partially_correct' | 'mostly_correct' | 'correct'
export type PracticeAttemptStatus = 'in_progress' | 'submitted' | 'evaluating' | 'evaluated' | 'failed'

export interface PracticeOption {
  key: string
  text: string
}

export interface PracticeQuestion {
  questionKey: string
  type: PracticeQuestionType
  prompt: string
  learningObjectives: string[]
  difficulty: PracticeDifficulty
  points: number
  options?: PracticeOption[]
  correctAnswer?: string
  evaluationRubric: string[]
  referenceSolution?: string
  evaluationCriteria: string[]
}

export interface PublicPracticeQuestion {
  questionKey: string
  type: PracticeQuestionType
  prompt: string
  learningObjectives: string[]
  difficulty: PracticeDifficulty
  points: number
  options?: PracticeOption[]
}

export interface PracticeSet {
  setKey: string
  owner: string
  curriculum: string
  moduleKey: string
  topicKey: string
  topicTitle: string
  sourceLearningNote?: string
  sourceLearningNoteVersion?: number
  difficulty: PracticeDifficulty
  questions: PracticeQuestion[]
  createdAt: string
}

export interface PublicPracticeSet extends Omit<PracticeSet, 'questions'> {
  questions: PublicPracticeQuestion[]
}

export interface PracticeAnswer {
  questionKey: string
  answer: string
}

export interface PracticeQuestionResult {
  questionKey: string
  submittedAnswer: string
  score: number
  maxScore: number
  correctness: CorrectnessClassification
  feedback: string
  mistakes: string[]
  correctedSolution?: string
  suggestedRevisionTopics: string[]
  correctAnswer?: string
}

export interface PracticeAttempt {
  attemptKey: string
  owner: string
  curriculum: string
  practiceSet: string
  status: PracticeAttemptStatus
  answers: PracticeAnswer[]
  questionResults: PracticeQuestionResult[]
  totalPoints: number
  earnedPoints: number
  scorePercent: number
  startedAt: string
  submittedAt?: string
  evaluatedAt?: string
  evaluationClaimedAt?: string
}

export interface PracticeEvaluationResult {
  questionKey: string
  score: number
  maxScore: number
  correctness: CorrectnessClassification
  feedback: string
  mistakes: string[]
  correctedSolution?: string
  suggestedRevisionTopics: string[]
  correctAnswer?: string
}

export interface LearnerPracticeEvidence {
  attemptKey: string
  topicKey: string
  scorePercent: number
  incorrectCount: number
  concepts: string[]
  observedAt: string
}

export interface WeakTopicSummary {
  topicKey: string
  evidenceCount: number
  recentAttemptCount: number
  lowScoreAttemptCount: number
  incorrectCount: number
  repeatedConceptCount: number
  averageScorePercent: number
  repeatedConcepts: string[]
  confidence: number
  isWeak: boolean
  lastObservedAt?: string
}
