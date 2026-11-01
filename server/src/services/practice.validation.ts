import { AiServiceError } from './ai/contracts'
import type {
  CorrectnessClassification,
  PracticeDifficulty,
  PracticeQuestion,
  PracticeEvaluationResult,
  PracticeQuestionType,
  PracticeSet,
} from './practice.types'
import { classifyScore } from './practice.scoring'

function invalid(message: string): never {
  throw new AiServiceError('AI_INVALID_RESPONSE', message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isText)
}

function isOptionalTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText)
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0
}

function isQuestionType(value: unknown): value is PracticeQuestionType {
  return value === 'mcq' || value === 'short-answer' || value === 'coding' || value === 'practical'
}

function isDifficulty(value: unknown): value is PracticeDifficulty {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced'
}

function isClassification(value: unknown): value is CorrectnessClassification {
  return value === 'incorrect' || value === 'partially_correct' || value === 'mostly_correct' || value === 'correct'
}

function validateQuestion(value: unknown, index: number): PracticeQuestion {
  if (!isRecord(value) || !isText(value.questionKey) || !isQuestionType(value.type) ||
    !isText(value.prompt) || !isTextArray(value.learningObjectives) ||
    !isDifficulty(value.difficulty) || !isPositiveInteger(value.points) ||
    !isTextArray(value.evaluationRubric) || !isTextArray(value.evaluationCriteria)
  ) {
    invalid(`Practice question ${index + 1} is invalid.`)
  }

  const options = value.options
  if (value.type === 'mcq') {
    if (!Array.isArray(options) || options.length < 2 || options.length > 6 ||
      !options.every((option) => isRecord(option) && isText(option.key) && isText(option.text)) ||
      new Set(options.map((option) => option.key)).size !== options.length ||
      !isText(value.correctAnswer) || !options.some((option) => option.key === value.correctAnswer)
    ) {
      invalid(`MCQ question ${index + 1} must contain valid options and a matching correct answer.`)
    }
  } else if (options !== undefined || value.correctAnswer !== undefined) {
    invalid(`Non-MCQ question ${index + 1} cannot contain MCQ answer fields.`)
  }

  if (value.type === 'coding' && !isText(value.referenceSolution)) {
    invalid(`Coding question ${index + 1} must contain a reference solution.`)
  }

  const referenceSolution = isText(value.referenceSolution) ? value.referenceSolution : undefined
  return {
    questionKey: value.questionKey,
    type: value.type,
    prompt: value.prompt,
    learningObjectives: value.learningObjectives,
    difficulty: value.difficulty,
    points: value.points,
    ...(options ? { options: options.map((option) => ({ key: option.key, text: option.text })) } : {}),
    ...(value.correctAnswer ? { correctAnswer: value.correctAnswer } : {}),
    evaluationRubric: value.evaluationRubric,
    ...(referenceSolution ? { referenceSolution } : {}),
    evaluationCriteria: value.evaluationCriteria,
  }
}

export function validateGeneratedPracticeSet(value: unknown): Omit<PracticeSet, 'setKey' | 'owner' | 'curriculum' | 'moduleKey' | 'topicKey' | 'topicTitle' | 'createdAt'> {
  if (!isRecord(value) || !isDifficulty(value.difficulty) ||
    !Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 10
  ) {
    invalid('AI returned an invalid practice set.')
  }

  const questions = value.questions.map(validateQuestion)
  const keys = questions.map((question) => question.questionKey)
  if (new Set(keys).size !== keys.length) invalid('Practice question keys must be unique.')

  const questionTypes = new Set(questions.map((question) => question.type))
  if (questionTypes.has('coding') && questions.filter((question) => question.type === 'coding').length > 3) {
    invalid('A practice set cannot contain more than three coding questions.')
  }

  return { difficulty: value.difficulty, questions }
}

export function validateEvaluationResult(value: unknown, maxScore: number): PracticeEvaluationResult {
  if (!isRecord(value) || !isText(value.questionKey) || !Number.isFinite(value.score) ||
    !Number.isFinite(value.maxScore) || maxScore <= 0 || value.maxScore !== maxScore ||
    (value.score as number) < 0 || (value.score as number) > maxScore ||
    !isClassification(value.correctness) || !isText(value.feedback) ||
    !isOptionalTextArray(value.mistakes) || !isOptionalTextArray(value.suggestedRevisionTopics) ||
    (value.correctedSolution !== undefined && !isText(value.correctedSolution))
  ) {
    invalid('AI returned an invalid practice evaluation.')
  }
  if (value.correctness !== classifyScore(value.score as number, maxScore)) {
    invalid('AI evaluation classification does not match the score.')
  }

  return {
    questionKey: value.questionKey,
    score: value.score as number,
    maxScore: value.maxScore as number,
    correctness: value.correctness,
    feedback: value.feedback,
    mistakes: value.mistakes,
    ...(value.correctedSolution ? { correctedSolution: value.correctedSolution } : {}),
    suggestedRevisionTopics: value.suggestedRevisionTopics,
  }
}
