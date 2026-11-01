import type {
  PracticeAnswer,
  PracticeQuestion,
  PracticeQuestionResult,
  PracticeSet,
  CorrectnessClassification,
} from './practice.types'

export function classifyScore(score: number, maxScore: number): CorrectnessClassification {
  if (score <= 0) return 'incorrect'
  const ratio = score / maxScore
  if (ratio >= 1) return 'correct'
  if (ratio >= 0.75) return 'mostly_correct'
  return 'partially_correct'
}

export function scoreMcqAnswer(question: PracticeQuestion, answer: string): PracticeQuestionResult {
  if (question.type !== 'mcq' || !question.correctAnswer) {
    throw new Error('Only MCQ questions can use deterministic MCQ scoring.')
  }
  const score = answer.trim() === question.correctAnswer ? question.points : 0
  return {
    questionKey: question.questionKey,
    submittedAnswer: answer,
    score,
    maxScore: question.points,
    correctness: classifyScore(score, question.points),
    feedback: score > 0 ? 'Correct answer.' : 'The selected option does not match the correct answer.',
    mistakes: score > 0 ? [] : ['Selected the wrong option.'],
    suggestedRevisionTopics: score > 0 ? [] : [...question.learningObjectives],
    correctAnswer: question.correctAnswer,
  }
}

export function calculateAttemptScore(
  practiceSet: PracticeSet,
  results: PracticeQuestionResult[],
): { totalPoints: number; earnedPoints: number; scorePercent: number } {
  if (results.length !== practiceSet.questions.length) {
    throw new Error('Exactly one evaluation result is required for every practice question.')
  }
  const resultKeys = new Set(results.map((result) => result.questionKey))
  if (resultKeys.size !== results.length ||
    practiceSet.questions.some((question) => !resultKeys.has(question.questionKey))) {
    throw new Error('Every practice question must have exactly one evaluation result.')
  }
  const totalPoints = practiceSet.questions.reduce((total, question) => total + question.points, 0)
  const earnedPoints = results.reduce((total, result) => {
    const question = practiceSet.questions.find((item) => item.questionKey === result.questionKey)
    if (!question || result.maxScore !== question.points || result.score < 0 || result.score > result.maxScore) {
      throw new Error('Evaluation result does not match the practice question.')
    }
    return total + result.score
  }, 0)
  if (earnedPoints > totalPoints) {
    throw new Error('Earned points cannot exceed total points.')
  }
  return {
    totalPoints,
    earnedPoints,
    scorePercent: totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 10000) / 100,
  }
}

export function answersByQuestionKey(answers: PracticeAnswer[], practiceSet: PracticeSet): Map<string, PracticeAnswer> {
  const questions = new Set(practiceSet.questions.map((question) => question.questionKey))
  const result = new Map<string, PracticeAnswer>()
  for (const answer of answers) {
    if (!questions.has(answer.questionKey)) throw new Error('Answer does not belong to this practice set.')
    if (result.has(answer.questionKey)) throw new Error('Duplicate answers are not allowed.')
    result.set(answer.questionKey, answer)
  }
  if (result.size !== practiceSet.questions.length) throw new Error('An answer is required for every practice question.')
  return result
}
