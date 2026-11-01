import type {
  PracticeAttempt,
  PracticeQuestion,
  PracticeQuestionResult,
  PracticeSet,
  PublicPracticeQuestion,
  PublicPracticeSet,
} from './practice.types'

export interface PublicPracticeAttempt {
  attemptKey: string
  owner: string
  curriculum: string
  practiceSet: string
  status: PracticeAttempt['status']
  answers: Array<{ questionKey: string; answer: string }>
  questionResults: PracticeQuestionResult[]
  totalPoints: number
  earnedPoints: number
  scorePercent: number
  startedAt: string
  submittedAt?: string
  evaluatedAt?: string
}

export function toPublicPracticeQuestion(question: PracticeQuestion): PublicPracticeQuestion {
  return {
    questionKey: question.questionKey,
    type: question.type,
    prompt: question.prompt,
    learningObjectives: [...question.learningObjectives],
    difficulty: question.difficulty,
    points: question.points,
    ...(question.options ? { options: question.options.map((option) => ({ ...option })) } : {}),
  }
}

export function toPublicPracticeSet(set: PracticeSet): PublicPracticeSet {
  return {
    setKey: set.setKey,
    owner: set.owner,
    curriculum: set.curriculum,
    moduleKey: set.moduleKey,
    topicKey: set.topicKey,
    topicTitle: set.topicTitle,
    ...(set.sourceLearningNote ? { sourceLearningNote: set.sourceLearningNote } : {}),
    ...(set.sourceLearningNoteVersion ? { sourceLearningNoteVersion: set.sourceLearningNoteVersion } : {}),
    difficulty: set.difficulty,
    questions: set.questions.map(toPublicPracticeQuestion),
    createdAt: set.createdAt,
  }
}

export function toAuthenticatedEvaluationResult(result: PracticeQuestionResult): PracticeQuestionResult {
  return {
    questionKey: result.questionKey,
    submittedAnswer: result.submittedAnswer,
    score: result.score,
    maxScore: result.maxScore,
    correctness: result.correctness,
    feedback: result.feedback,
    mistakes: [...result.mistakes],
    ...(result.correctedSolution ? { correctedSolution: result.correctedSolution } : {}),
    suggestedRevisionTopics: [...result.suggestedRevisionTopics],
    ...(result.correctAnswer ? { correctAnswer: result.correctAnswer } : {}),
  }
}

export function toPublicAttempt(attempt: PracticeAttempt): PublicPracticeAttempt {
  return {
    attemptKey: attempt.attemptKey,
    owner: attempt.owner,
    curriculum: attempt.curriculum,
    practiceSet: attempt.practiceSet,
    status: attempt.status,
    answers: attempt.answers.map((answer) => ({ ...answer })),
    questionResults: attempt.status === 'evaluated'
      ? attempt.questionResults.map(toAuthenticatedEvaluationResult)
      : [],
    totalPoints: attempt.totalPoints,
    earnedPoints: attempt.earnedPoints,
    scorePercent: attempt.scorePercent,
    startedAt: attempt.startedAt,
    ...(attempt.submittedAt ? { submittedAt: attempt.submittedAt } : {}),
    ...(attempt.evaluatedAt ? { evaluatedAt: attempt.evaluatedAt } : {}),
  }
}
