import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toPublicAttempt, toPublicPracticeSet } from './practice.dto'
import { assertAttemptMutable, assertAttemptTransition } from './practice.lifecycle'
import { calculateAttemptScore, classifyScore, scoreMcqAnswer } from './practice.scoring'
import type { LearnerPracticeEvidence, PracticeAttempt, PracticeSet } from './practice.types'
import { recalculateWeakTopicSummary } from './practice.weak-topics'
import { validateEvaluationResult, validateGeneratedPracticeSet } from './practice.validation'
import { createFallbackEvaluation } from './practice.service'

const validQuestion = {
  questionKey: 'q1',
  type: 'mcq',
  prompt: 'Which type represents text?',
  learningObjectives: ['Identify text types.'],
  difficulty: 'beginner',
  points: 2,
  options: [{ key: 'a', text: 'string' }, { key: 'b', text: 'number' }],
  correctAnswer: 'a',
  evaluationRubric: ['Select the string type.'],
  referenceSolution: 'string',
  evaluationCriteria: ['The selected option is correct.'],
} as const

test('validates generated questions and rejects duplicate keys', () => {
  const generated = validateGeneratedPracticeSet({ difficulty: 'beginner', questions: [validQuestion] })
  assert.equal(generated.questions[0].correctAnswer, 'a')
  assert.throws(() => validateGeneratedPracticeSet({ difficulty: 'beginner', questions: [validQuestion, validQuestion] }))
})

test('validates bounded partial-credit evaluation responses', () => {
  const result = validateEvaluationResult({
    questionKey: 'q1',
    score: 1,
    maxScore: 2,
    correctness: 'partially_correct',
    feedback: 'The core idea is present but incomplete.',
    mistakes: ['Missing one distinction.'],
    suggestedRevisionTopics: ['Text types'],
  }, 2)
  assert.equal(result.score, 1)
  assert.throws(() => validateEvaluationResult({ ...result, score: 3 }, 2))
})

test('allows fully correct evaluations with empty mistakes and revision topics', () => {
  const result = validateEvaluationResult({
    questionKey: 'q1',
    score: 2,
    maxScore: 2,
    correctness: 'correct',
    feedback: 'Complete and correct.',
    mistakes: [],
    suggestedRevisionTopics: [],
  }, 2)
  assert.deepEqual(result.mistakes, [])
  assert.deepEqual(result.suggestedRevisionTopics, [])
})

test('fallback evaluation awards full marks for a complete answer', () => {
  const question = {
    questionKey: 'q-fallback',
    type: 'short-answer' as const,
    prompt: 'Explain text types and give an example.',
    learningObjectives: ['Identify text types', 'Use string examples'],
    difficulty: 'beginner' as const,
    points: 10,
    evaluationRubric: ['Defines string values', 'Provides a correct example'],
    evaluationCriteria: ['Accuracy', 'Completeness', 'Application'],
  }
  const result = createFallbackEvaluation(question, 'A string is a text value. For example, the variable name should contain text such as "Ada".')
  assert.equal(result.score, 10)
  assert.equal(result.correctness, 'correct')
  assert.deepEqual(result.mistakes, [])
})

test('fallback evaluation recognizes an exact coding reference solution', () => {
  const question = {
    questionKey: 'q-code',
    type: 'coding' as const,
    prompt: 'Return the sum of two numbers.',
    learningObjectives: ['Use addition'],
    difficulty: 'beginner' as const,
    points: 10,
    evaluationRubric: ['Adds both numbers'],
    referenceSolution: 'function add(a, b) { return a + b; }',
    evaluationCriteria: ['Accuracy', 'Output'],
  }
  const result = createFallbackEvaluation(question, 'function add(a, b) { return a + b; }')
  assert.equal(result.score, 10)
  assert.equal(result.correctness, 'correct')
})

test('fallback evaluation gives random text no credit', () => {
  const question = {
    questionKey: 'q-random',
    type: 'short-answer' as const,
    prompt: 'Explain text types and give an example.',
    learningObjectives: ['Identify text types', 'Use string examples'],
    difficulty: 'beginner' as const,
    points: 10,
    evaluationRubric: ['Defines string values', 'Provides a correct example'],
    evaluationCriteria: ['Accuracy', 'Completeness', 'Application'],
  }
  const result = createFallbackEvaluation(question, 'random text that does not answer the question')
  assert.equal(result.score, 0)
  assert.equal(result.correctness, 'incorrect')
})

test('fallback evaluation gives repeated garbage no credit', () => {
  const question = {
    questionKey: 'q-garbage',
    type: 'practical' as const,
    prompt: 'Explain how to sort an array.',
    learningObjectives: ['Understand sorting'],
    difficulty: 'beginner' as const,
    points: 10,
    evaluationRubric: ['Uses a sorting step'],
    evaluationCriteria: ['Accuracy', 'Process'],
  }
  const result = createFallbackEvaluation(question, 'blah blah blah blah blah')
  assert.equal(result.score, 0)
  assert.equal(result.correctness, 'incorrect')
})

test('requires classification to match every score boundary', () => {
  assert.equal(classifyScore(0, 4), 'incorrect')
  assert.equal(classifyScore(2.99, 4), 'partially_correct')
  assert.equal(classifyScore(3, 4), 'mostly_correct')
  assert.equal(classifyScore(4, 4), 'correct')
  for (const [score, correctness] of [[0, 'incorrect'], [2.99, 'partially_correct'], [3, 'mostly_correct'], [4, 'correct']] as const) {
    assert.doesNotThrow(() => validateEvaluationResult({
      questionKey: 'q1',
      score,
      maxScore: 4,
      correctness,
      feedback: 'Feedback.',
      mistakes: [],
      suggestedRevisionTopics: [],
    }, 4))
  }
  assert.throws(() => validateEvaluationResult({
    questionKey: 'q1', score: 0, maxScore: 4, correctness: 'correct',
    feedback: 'Feedback.', mistakes: [], suggestedRevisionTopics: [],
  }, 4))
})

test('rejects duplicate MCQ option keys while accepting unique keys', () => {
  assert.doesNotThrow(() => validateGeneratedPracticeSet({ difficulty: 'beginner', questions: [validQuestion] }))
  assert.throws(() => validateGeneratedPracticeSet({
    difficulty: 'beginner',
    questions: [{ ...validQuestion, options: [{ key: 'a', text: 'string' }, { key: 'a', text: 'number' }] }],
  }))
})

test('excludes correct answers, rubrics, and solutions from public practice sets', () => {
  const question = validateGeneratedPracticeSet({ difficulty: 'beginner', questions: [validQuestion] }).questions[0]
  const set: PracticeSet = {
    setKey: 'set-1',
    owner: 'user-1',
    curriculum: 'curriculum-1',
    moduleKey: '1',
    topicKey: '1:1',
    topicTitle: 'Types',
    difficulty: 'beginner',
    questions: [question],
    createdAt: new Date().toISOString(),
  }
  const safe = toPublicPracticeSet(set)
  assert.equal('correctAnswer' in safe.questions[0], false)
  assert.equal('evaluationRubric' in safe.questions[0], false)
  assert.equal('referenceSolution' in safe.questions[0], false)
})

test('scores MCQs and calculates backend totals with partial credit', () => {
  const question = validateGeneratedPracticeSet({ difficulty: 'beginner', questions: [validQuestion] }).questions[0]
  const correct = scoreMcqAnswer(question, 'a')
  const set: PracticeSet = { setKey: 'set-1', owner: 'u', curriculum: 'c', moduleKey: '1', topicKey: '1:1', topicTitle: 'Types', difficulty: 'beginner', questions: [question], createdAt: '' }
  const totals = calculateAttemptScore(set, [correct])
  assert.deepEqual(totals, { totalPoints: 2, earnedPoints: 2, scorePercent: 100 })
})

test('rejects duplicate, missing, extra, and inflated evaluation results', () => {
  const question = validateGeneratedPracticeSet({ difficulty: 'beginner', questions: [validQuestion] }).questions[0]
  const set: PracticeSet = { setKey: 'set-1', owner: 'u', curriculum: 'c', moduleKey: '1', topicKey: '1:1', topicTitle: 'Types', difficulty: 'beginner', questions: [question], createdAt: '' }
  const result = scoreMcqAnswer(question, 'a')
  assert.throws(() => calculateAttemptScore(set, [result, result]))
  assert.throws(() => calculateAttemptScore(set, []))
  assert.throws(() => calculateAttemptScore(set, [{ ...result, questionKey: 'q2' }]))
  assert.throws(() => calculateAttemptScore(set, [{ ...result, score: 3, maxScore: 2 }]))
})

test('serializes only approved attempt fields', () => {
  const attempt = {
    attemptKey: 'attempt-1',
    owner: 'user-1',
    curriculum: 'curriculum-1',
    practiceSet: 'set-1',
    status: 'evaluated',
    answers: [{ questionKey: 'q1', answer: 'a' }],
    questionResults: [{
      questionKey: 'q1', submittedAnswer: 'a', score: 2, maxScore: 2, correctness: 'correct' as const,
      feedback: 'Correct.', mistakes: [], suggestedRevisionTopics: [], correctAnswer: 'a',
    }],
    totalPoints: 2,
    earnedPoints: 2,
    scorePercent: 100,
    startedAt: '2026-11-01T00:00:00.000Z',
    internalProviderMetadata: { provider: 'secret' },
  } as PracticeAttempt & { internalProviderMetadata: unknown }
  const serialized = toPublicAttempt(attempt)
  assert.equal('internalProviderMetadata' in serialized, false)
  assert.equal(serialized.questionResults[0].correctAnswer, 'a')
})

test('enforces explicit attempt lifecycle and immutable historical attempts', () => {
  assert.doesNotThrow(() => assertAttemptTransition('in_progress', 'submitted'))
  assert.throws(() => assertAttemptTransition('evaluated', 'submitted'))
  assert.throws(() => assertAttemptMutable('evaluated'))
})

test('requires repeated evidence before classifying a topic as weak', () => {
  const oneWrong: LearnerPracticeEvidence[] = [{
    attemptKey: 'a1', topicKey: '1:1', scorePercent: 0, incorrectCount: 1, concepts: ['types'], observedAt: '2026-11-01T00:00:00.000Z',
  }]
  assert.equal(recalculateWeakTopicSummary('1:1', oneWrong).isWeak, false)
  const repeated = [...oneWrong, {
    attemptKey: 'a2', topicKey: '1:1', scorePercent: 40, incorrectCount: 1, concepts: ['types'], observedAt: '2026-11-01T01:00:00.000Z',
  }]
  const summary = recalculateWeakTopicSummary('1:1', repeated)
  assert.equal(summary.isWeak, true)
  assert.equal(summary.repeatedConcepts[0], 'types')
  assert.equal(summary.evidenceCount, 2)
  assert.equal(summary.lowScoreAttemptCount, 2)
  assert.equal(summary.incorrectCount, 2)
  assert.equal(summary.repeatedConceptCount, 1)
})

test('does not count multiple mistakes from one attempt as repeated evidence', () => {
  const summary = recalculateWeakTopicSummary('1:1', [{
    attemptKey: 'a1',
    topicKey: '1:1',
    scorePercent: 20,
    incorrectCount: 4,
    concepts: ['types', 'narrowing', 'interfaces'],
    observedAt: '2026-11-01T00:00:00.000Z',
  }])
  assert.equal(summary.evidenceCount, 1)
  assert.equal(summary.recentAttemptCount, 1)
  assert.equal(summary.incorrectCount, 4)
  assert.equal(summary.repeatedConceptCount, 0)
  assert.equal(summary.isWeak, false)
})

test('deduplicates evidence records by attempt key and keeps the newest record', () => {
  const summary = recalculateWeakTopicSummary('1:1', [
    { attemptKey: 'a1', topicKey: '1:1', scorePercent: 20, incorrectCount: 3, concepts: ['types'], observedAt: '2026-11-01T00:00:00.000Z' },
    { attemptKey: 'a1', topicKey: '1:1', scorePercent: 80, incorrectCount: 0, concepts: ['types'], observedAt: '2026-11-01T02:00:00.000Z' },
  ])
  assert.equal(summary.evidenceCount, 1)
  assert.equal(summary.recentAttemptCount, 1)
  assert.equal(summary.incorrectCount, 0)
  assert.equal(summary.averageScorePercent, 80)
})

test('deduplicates concepts within one attempt but repeats concepts across distinct attempts', () => {
  const oneAttempt = recalculateWeakTopicSummary('1:1', [{
    attemptKey: 'a1',
    topicKey: '1:1',
    scorePercent: 40,
    incorrectCount: 2,
    concepts: ['types', 'types'],
    observedAt: '2026-11-01T00:00:00.000Z',
  }])
  assert.equal(oneAttempt.repeatedConceptCount, 0)
  assert.deepEqual(oneAttempt.repeatedConcepts, [])

  const twoAttempts = recalculateWeakTopicSummary('1:1', [
    { attemptKey: 'a1', topicKey: '1:1', scorePercent: 40, incorrectCount: 1, concepts: ['types', 'types'], observedAt: '2026-11-01T00:00:00.000Z' },
    { attemptKey: 'a2', topicKey: '1:1', scorePercent: 40, incorrectCount: 1, concepts: ['types'], observedAt: '2026-11-01T01:00:00.000Z' },
  ])
  assert.equal(twoAttempts.repeatedConceptCount, 1)
  assert.deepEqual(twoAttempts.repeatedConcepts, ['types'])
})

test('reduces current confidence after improved performance without deleting evidence', () => {
  const evidence: LearnerPracticeEvidence[] = [
    { attemptKey: 'a1', topicKey: '1:1', scorePercent: 30, incorrectCount: 2, concepts: ['types'], observedAt: '2026-11-01T00:00:00.000Z' },
    { attemptKey: 'a2', topicKey: '1:1', scorePercent: 40, incorrectCount: 1, concepts: ['types'], observedAt: '2026-11-01T01:00:00.000Z' },
  ]
  const before = recalculateWeakTopicSummary('1:1', evidence)
  const afterEvidence = [...evidence, { attemptKey: 'a3', topicKey: '1:1', scorePercent: 100, incorrectCount: 0, concepts: [], observedAt: '2026-11-01T02:00:00.000Z' }]
  const after = recalculateWeakTopicSummary('1:1', afterEvidence)
  assert.equal(after.evidenceCount >= before.evidenceCount, true)
  assert.equal(after.confidence < before.confidence, true)
  assert.equal(after.evidenceCount, 3)
  assert.equal(after.recentAttemptCount, 3)
})
