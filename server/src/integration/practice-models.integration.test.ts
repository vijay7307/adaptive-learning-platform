import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import mongoose from 'mongoose'

process.env.MONGODB_URI = process.env.INTEGRATION_MONGODB_URI || 'mongodb://127.0.0.1:27018/adaptive_learning_practice_models'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'practice-models-integration-secret'
process.env.NODE_ENV = 'test'

let connectDB: typeof import('../config/database').connectDB
let disconnectDB: typeof import('../config/database').disconnectDB
let User: typeof import('../models/user.model').User
let Curriculum: typeof import('../models/curriculum.model').Curriculum
let PracticeSet: typeof import('../models/practice-set.model').PracticeSet
let PracticeAttempt: typeof import('../models/practice-attempt.model').PracticeAttempt
let LearnerPracticeSignal: typeof import('../models/learner-practice-signal.model').LearnerPracticeSignal

function futureDate(days: number): Date {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

function curriculumPayload(owner: mongoose.Types.ObjectId) {
  return {
    owner,
    goal: 'Practice models',
    subject: 'TypeScript',
    currentSkillLevel: 'beginner' as const,
    availableStudyTimeMinutesPerDay: 60,
    targetDurationDays: 30,
    deadline: futureDate(30),
    modules: [{
      title: 'Types',
      order: 1,
      milestone: 'Learn types',
      completionCriteria: ['Explain types'],
      topics: [{
        title: 'Basic types',
        order: 1,
        learningObjectives: ['Use types'],
        estimatedDurationMinutes: 30,
        completionCriteria: ['Write typed code'],
      }],
    }],
    milestones: [{
      title: 'Types complete',
      description: 'Finish types',
      targetDate: futureDate(15),
      completionCriteria: ['Pass review'],
    }],
    status: 'active' as const,
  }
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    questionKey: 'q1',
    type: 'mcq' as const,
    prompt: 'Which is text?',
    learningObjectives: ['Identify strings'],
    difficulty: 'beginner' as const,
    points: 2,
    options: [{ key: 'a', text: 'string' }, { key: 'b', text: 'number' }],
    correctAnswer: 'a',
    evaluationRubric: ['Select string'],
    evaluationCriteria: ['Correct option'],
    ...overrides,
  }
}

function practiceSetPayload(owner: mongoose.Types.ObjectId, curriculum: mongoose.Types.ObjectId) {
  return {
    setKey: `set-${owner.toString()}`,
    owner,
    curriculum,
    moduleKey: '1',
    topicKey: '1:1',
    topicTitle: 'Basic types',
    difficulty: 'beginner' as const,
    questions: [question()],
  }
}

before(async () => {
  ({ connectDB, disconnectDB } = await import('../config/database'))
  ;({ User } = await import('../models/user.model'))
  ;({ Curriculum } = await import('../models/curriculum.model'))
  ;({ PracticeSet } = await import('../models/practice-set.model'))
  ;({ PracticeAttempt } = await import('../models/practice-attempt.model'))
  ;({ LearnerPracticeSignal } = await import('../models/learner-practice-signal.model'))
  await connectDB()
  await Promise.all([
    PracticeAttempt.deleteMany({}),
    PracticeSet.deleteMany({}),
    LearnerPracticeSignal.deleteMany({}),
    Curriculum.deleteMany({}),
    User.deleteMany({}),
  ])
  await Promise.all([
    PracticeSet.syncIndexes(),
    PracticeAttempt.syncIndexes(),
    LearnerPracticeSignal.syncIndexes(),
  ])
})

after(async () => {
  await Promise.all([
    PracticeAttempt.deleteMany({}),
    PracticeSet.deleteMany({}),
    LearnerPracticeSignal.deleteMany({}),
    Curriculum.deleteMany({}),
    User.deleteMany({}),
  ])
  await disconnectDB()
})

test('creates all Practice models with ObjectId references and timestamps', async () => {
  const user = await User.create({ name: 'Practice User', email: 'practice-models@example.com', passwordHash: 'not-used' })
  const curriculum = await Curriculum.create(curriculumPayload(user._id))
  const set = await PracticeSet.create(practiceSetPayload(user._id, curriculum._id))
  const attempt = await PracticeAttempt.create({
    attemptKey: 'attempt-1',
    owner: user._id,
    curriculum: curriculum._id,
    practiceSet: set._id,
    totalPoints: 2,
    earnedPoints: 0,
    scorePercent: 0,
    startedAt: new Date(),
  })
  const signal = await LearnerPracticeSignal.create({
    owner: user._id,
    curriculum: curriculum._id,
    topicKey: '1:1',
    attemptKey: attempt.attemptKey,
    scorePercent: 0,
    incorrectCount: 1,
    concepts: ['strings'],
    observedAt: new Date(),
  })
  assert.equal(set.owner instanceof mongoose.Types.ObjectId, true)
  assert.equal(set.setKey, `set-${user.id}`)
  assert.equal(attempt.practiceSet instanceof mongoose.Types.ObjectId, true)
  assert.equal(signal.curriculum instanceof mongoose.Types.ObjectId, true)
  assert.ok(set.createdAt)
  assert.ok(attempt.updatedAt)
  assert.ok(signal.createdAt)
})

test('rejects required fields, invalid enums, invalid MCQ answers, duplicate keys, and duplicate options', async () => {
  const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
  const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), questions: [question({ correctAnswer: 'z' })] }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), difficulty: 'expert' }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), questions: [question({ options: [{ key: 'a', text: 'one' }, { key: 'a', text: 'two' }] })] }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), questions: [question(), question({ questionKey: 'q1' })] }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), setKey: 'empty-questions', questions: [] }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), setKey: 'too-many', questions: Array.from({ length: 11 }, (_, index) => question({ questionKey: `q${index}` })) }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), setKey: 'few-options', questions: [question({ options: [{ key: 'a', text: 'one' }] })] }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), setKey: 'coding-without-solution', questions: [question({ type: 'coding', options: undefined, correctAnswer: undefined })] }))
  await assert.rejects(() => PracticeSet.create({
    ...practiceSetPayload(user._id, curriculum._id),
    setKey: 'too-many-coding',
    questions: Array.from({ length: 4 }, (_, index) => question({ questionKey: `c${index}`, type: 'coding', options: undefined, correctAnswer: undefined, referenceSolution: 'solution' })),
  }))
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), setKey: 'version-without-note', sourceLearningNoteVersion: 1 }))
  await assert.rejects(() => PracticeAttempt.create({ attemptKey: 'missing-fields' }))
  await assert.rejects(() => LearnerPracticeSignal.create({ owner: user._id, curriculum: curriculum._id, topicKey: '1:1', attemptKey: 'invalid-score', scorePercent: 101, incorrectCount: 0, observedAt: new Date() }))
})

test('enforces unique attempt keys and learner signals', async () => {
  const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
  const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
  const set = await PracticeSet.findOne({ owner: user._id }).orFail()
  await PracticeAttempt.create({ attemptKey: 'duplicate-key', owner: user._id, curriculum: curriculum._id, practiceSet: set._id, totalPoints: 2, earnedPoints: 0, scorePercent: 0, startedAt: new Date() })
  await assert.rejects(() => PracticeAttempt.create({ attemptKey: 'duplicate-key', owner: user._id, curriculum: curriculum._id, practiceSet: set._id, totalPoints: 2, earnedPoints: 0, scorePercent: 0, startedAt: new Date() }), (error: unknown) => error instanceof mongoose.mongo.MongoServerError && error.code === 11000)
  const signal = { owner: user._id, curriculum: curriculum._id, topicKey: '1:1', attemptKey: 'signal-attempt', scorePercent: 50, incorrectCount: 1, concepts: [], observedAt: new Date() }
  await LearnerPracticeSignal.create(signal)
  await assert.rejects(() => LearnerPracticeSignal.create(signal), (error: unknown) => error instanceof mongoose.mongo.MongoServerError && error.code === 11000)
})

test('requires a learning-note version when a note reference is stored', async () => {
  const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
  const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
  await assert.rejects(() => PracticeSet.create({ ...practiceSetPayload(user._id, curriculum._id), setKey: 'note-without-version', sourceLearningNote: new mongoose.Types.ObjectId() }))
})

test('hides private PracticeSet fields in default serialization', async () => {
  const set = await PracticeSet.findOne({}).orFail()
  const json = set.toJSON() as Record<string, unknown>
  const firstQuestion = (json.questions as Array<Record<string, unknown>>)[0]
  assert.equal('correctAnswer' in firstQuestion, false)
  assert.equal('evaluationRubric' in firstQuestion, false)
  assert.equal('referenceSolution' in firstQuestion, false)
})

test('validates attempt scores, percentages, duplicate answers, and result keys', async () => {
  const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
  const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
  const set = await PracticeSet.findOne({ owner: user._id }).orFail()
  const base = { attemptKey: 'validation-attempt', owner: user._id, curriculum: curriculum._id, practiceSet: set._id, totalPoints: 2, startedAt: new Date() }
  await assert.rejects(() => PracticeAttempt.create({ ...base, earnedPoints: 3, scorePercent: 150 }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, earnedPoints: 1, scorePercent: 10 }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, answers: [{ questionKey: 'q1', answer: 'a' }, { questionKey: 'q1', answer: 'b' }], earnedPoints: 0, scorePercent: 0 }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, questionResults: [{ questionKey: 'q1', submittedAnswer: 'a', score: 3, maxScore: 2, correctness: 'correct', feedback: 'x' }], earnedPoints: 0, scorePercent: 0 }))
})

test('enforces status-dependent timestamps and evaluation state', async () => {
  const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
  const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
  const set = await PracticeSet.findOne({ owner: user._id }).orFail()
  const base = { owner: user._id, curriculum: curriculum._id, practiceSet: set._id, totalPoints: 2, earnedPoints: 0, scorePercent: 0, startedAt: new Date() }
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'submitted-without-time', status: 'submitted' }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'evaluated-without-time', status: 'evaluated' }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'in-progress-with-results', questionResults: [{ questionKey: 'q1', submittedAnswer: 'a', score: 0, maxScore: 2, correctness: 'incorrect', feedback: 'No', mistakes: [], suggestedRevisionTopics: [] }] }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'in-progress-with-time', submittedAt: new Date() }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'in-progress-with-evaluation-time', evaluatedAt: new Date() }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'submitted-with-results', status: 'submitted', submittedAt: new Date(), questionResults: [{ questionKey: 'q1', submittedAnswer: 'a', score: 0, maxScore: 2, correctness: 'incorrect', feedback: 'No', mistakes: [], suggestedRevisionTopics: [] }] }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'submitted-with-evaluation-time', status: 'submitted', submittedAt: new Date(), evaluatedAt: new Date() }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'evaluating-without-submission', status: 'evaluating' }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'evaluating-with-evaluation-time', status: 'evaluating', submittedAt: new Date(), evaluatedAt: new Date() }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'evaluated-without-results', status: 'evaluated', submittedAt: new Date(), evaluatedAt: new Date() }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'failed-without-submission', status: 'failed' }))
  await assert.rejects(() => PracticeAttempt.create({ ...base, attemptKey: 'failed-with-evaluation-time', status: 'failed', submittedAt: new Date(), evaluatedAt: new Date() }))
  await assert.doesNotReject(() => PracticeAttempt.create({ ...base, attemptKey: 'valid-submitted', status: 'submitted', submittedAt: new Date() }))
  await assert.doesNotReject(() => PracticeAttempt.create({ ...base, attemptKey: 'valid-evaluating', status: 'evaluating', submittedAt: new Date() }))
  await assert.doesNotReject(() => PracticeAttempt.create({ ...base, attemptKey: 'valid-failed', status: 'failed', submittedAt: new Date(), answers: [{ questionKey: 'q1', answer: 'a' }] }))
  await assert.doesNotReject(() => PracticeAttempt.create({
    ...base,
    attemptKey: 'valid-evaluated',
    status: 'evaluated',
    submittedAt: new Date(),
    evaluatedAt: new Date(),
    questionResults: [{ questionKey: 'q1', submittedAnswer: 'a', score: 0, maxScore: 2, correctness: 'incorrect', feedback: 'No', mistakes: [], suggestedRevisionTopics: [] }],
  }))
})

test('blocks document mutation using persisted status while preserving submitted-to-evaluating transition', async () => {
  const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
  const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
  const set = await PracticeSet.findOne({ owner: user._id }).orFail()
  const attempt = await PracticeAttempt.create({ attemptKey: 'immutable-attempt', owner: user._id, curriculum: curriculum._id, practiceSet: set._id, status: 'submitted', totalPoints: 2, earnedPoints: 0, scorePercent: 0, startedAt: new Date(), submittedAt: new Date() })
  attempt.answers = [{ questionKey: 'q1', answer: 'changed' }]
  await assert.rejects(() => attempt.save(), /Submitted attempt answers and scores are immutable/)
  const evaluating = await PracticeAttempt.create({ attemptKey: 'evaluating-transition', owner: user._id, curriculum: curriculum._id, practiceSet: set._id, status: 'submitted', totalPoints: 2, earnedPoints: 0, scorePercent: 0, startedAt: new Date(), submittedAt: new Date() })
  evaluating.status = 'evaluating'
  await assert.doesNotReject(() => evaluating.save())
  const evaluated = await PracticeAttempt.create({
    attemptKey: 'evaluated-immutable',
    owner: user._id,
    curriculum: curriculum._id,
    practiceSet: set._id,
    status: 'evaluated',
    totalPoints: 2,
    earnedPoints: 0,
    scorePercent: 0,
    startedAt: new Date(),
    submittedAt: new Date(),
    evaluatedAt: new Date(),
    questionResults: [{ questionKey: 'q1', submittedAnswer: 'a', score: 0, maxScore: 2, correctness: 'incorrect', feedback: 'No', mistakes: [], suggestedRevisionTopics: [] }],
  })

  test('prevents an expired evaluator from overwriting a reclaimed evaluation lease', async () => {
    const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
    const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
    const set = await PracticeSet.findOne({ owner: user._id }).orFail()
    const attempt = await PracticeAttempt.create({
      attemptKey: 'lease-token-attempt',
      owner: user._id,
      curriculum: curriculum._id,
      practiceSet: set._id,
      status: 'submitted',
      answers: [{ questionKey: 'q1', answer: 'a' }],
      totalPoints: 2,
      earnedPoints: 0,
      scorePercent: 0,
      startedAt: new Date(),
      submittedAt: new Date(),
    })
    const expiredAt = new Date(Date.now() - 10 * 60 * 1000)
    await PracticeAttempt.updateOne(
      { _id: attempt._id, status: 'submitted' },
      { $set: { status: 'evaluating', evaluationClaimedAt: expiredAt, evaluationClaimToken: 'claim-a' } },
    )
    const reclaimed = await PracticeAttempt.findOneAndUpdate(
      { _id: attempt._id, status: 'evaluating', evaluationClaimedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } },
      { $set: { evaluationClaimedAt: new Date(), evaluationClaimToken: 'claim-b' } },
      { new: true },
    ).select('+evaluationClaimToken')
    assert.equal(reclaimed?.evaluationClaimToken, 'claim-b')

    const staleCompletion = await PracticeAttempt.findOneAndUpdate(
      { _id: attempt._id, status: 'evaluating', evaluationClaimToken: 'claim-a' },
      { $set: { status: 'evaluated' } },
      { new: true },
    )
    const staleFailure = await PracticeAttempt.updateOne(
      { _id: attempt._id, status: 'evaluating', evaluationClaimToken: 'claim-a' },
      { $set: { status: 'failed' } },
    )
    assert.equal(staleCompletion, null)
    assert.equal(staleFailure.matchedCount, 0)

    const completed = await PracticeAttempt.findOneAndUpdate(
      { _id: attempt._id, status: 'evaluating', evaluationClaimToken: 'claim-b' },
      {
        $set: {
          status: 'evaluated',
          evaluatedAt: new Date(),
          questionResults: [{
            questionKey: 'q1',
            submittedAnswer: 'a',
            score: 2,
            maxScore: 2,
            correctness: 'correct',
            feedback: 'Correct.',
            mistakes: [],
            suggestedRevisionTopics: [],
          }],
          earnedPoints: 2,
          scorePercent: 100,
        },
        $unset: { evaluationClaimedAt: 1, evaluationClaimToken: 1 },
      },
      { new: true },
    )
    assert.equal(completed?.status, 'evaluated')
    assert.equal(completed?.evaluationClaimToken, undefined)
  })
  evaluated.answers = [{ questionKey: 'q1', answer: 'changed' }]
  await assert.rejects(() => evaluated.save(), /Evaluated practice attempts are immutable/)
  const evaluatedToFailed = await PracticeAttempt.findOne({ attemptKey: 'evaluated-immutable' }).orFail()
  evaluatedToFailed.status = 'failed'
  evaluatedToFailed.evaluatedAt = undefined
  evaluatedToFailed.answers = [{ questionKey: 'q1', answer: 'changed' }]
  await assert.rejects(() => evaluatedToFailed.save(), /Evaluated practice attempts are immutable/)
})

test('normalizes and deduplicates learner signal concepts', async () => {
  const user = await User.findOne({ email: 'practice-models@example.com' }).orFail()
  const curriculum = await Curriculum.findOne({ owner: user._id }).orFail()
  const signal = await LearnerPracticeSignal.create({ owner: user._id, curriculum: curriculum._id, topicKey: '1:1', attemptKey: 'normalized-signal', scorePercent: 50, incorrectCount: 1, concepts: [' Types ', 'types', 'Narrowing'], observedAt: new Date() })
  assert.deepEqual(signal.concepts, ['types', 'narrowing'])
})

test('defines required owner, topic, and time indexes', () => {
  const attemptIndexes = PracticeAttempt.schema.indexes()
  const signalIndexes = LearnerPracticeSignal.schema.indexes()
  const setIndexes = PracticeSet.schema.indexes()
  assert.ok(attemptIndexes.some(([fields, options]) => fields.owner === 1 && fields.attemptKey === 1 && options?.unique === true))
  assert.ok(signalIndexes.some(([fields, options]) => fields.owner === 1 && fields.curriculum === 1 && fields.topicKey === 1 && fields.attemptKey === 1 && options?.unique === true))
  assert.ok(signalIndexes.some(([fields]) => fields.topicKey === 1 && fields.observedAt === -1))
  assert.ok(setIndexes.some(([fields]) => fields.owner === 1 && fields.curriculum === 1 && fields.topicKey === 1 && fields.createdAt === -1))
})
