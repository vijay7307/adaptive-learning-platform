import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

process.env.MONGODB_URI = process.env.INTEGRATION_MONGODB_URI || 'mongodb://127.0.0.1:27018/adaptive_learning_scheduled_integration'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'scheduled-targets-integration-secret'
process.env.NODE_ENV = 'test'

let createApp: typeof import('../app').createApp
let connectDB: typeof import('../config/database').connectDB
let disconnectDB: typeof import('../config/database').disconnectDB
let Curriculum: typeof import('../models/curriculum.model').Curriculum
let DailyTarget: typeof import('../models/daily-target.model').DailyTarget
let DailyTargetGenerationJob: typeof import('../models/daily-target-generation-job.model').DailyTargetGenerationJob
let ExtraWorkGeneration: typeof import('../models/extra-work-generation.model').ExtraWorkGeneration
let LearningNote: typeof import('../models/learning-note.model').LearningNote
let User: typeof import('../models/user.model').User
let signAccessToken: typeof import('../utils/jwt').signAccessToken
let aiService: typeof import('../services/ai.service').aiService
let ensureGenerationJob: typeof import('../services/daily-target-generation.service').ensureGenerationJob
let recoverAndProcessJobs: typeof import('../services/daily-target-generation.service').recoverAndProcessJobs
let getLocalDateKey: typeof import('../services/timezone.service').getLocalDateKey
let localDateKeyToStorageDate: typeof import('../services/timezone.service').localDateKeyToStorageDate

let app: ReturnType<typeof createApp>
let server: ReturnType<typeof app.listen>
let baseUrl = ''
let user: { id: string; token: string }

function futureDate(days: number): Date {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

function curriculumPayload(owner: string, goal: string) {
  return {
    owner,
    goal,
    subject: goal,
    currentSkillLevel: 'beginner' as const,
    availableStudyTimeMinutesPerDay: 60,
    targetDurationDays: 30,
    deadline: futureDate(30),
    startDate: new Date(),
    progressPercent: 0,
    completedTopicKeys: [],
    targetHistory: [],
    assessmentHistory: [],
    modules: [{
      title: 'Foundations',
      order: 1,
      milestone: 'Complete foundations',
      completionCriteria: ['Finish'],
      topics: [
        { title: 'Topic one', order: 1, description: 'Practice the first topic.', learningObjectives: ['Learn'], estimatedDurationMinutes: 30, completionCriteria: ['Explain'] },
        { title: 'Topic two', order: 2, description: 'Practice the second topic.', learningObjectives: ['Apply'], estimatedDurationMinutes: 30, completionCriteria: ['Use'] },
      ],
    }],
    milestones: [{
      title: 'Foundation',
      description: 'Finish',
      targetDate: futureDate(15),
      completionCriteria: ['Pass'],
    }],
    status: 'active' as const,
  }
}

function generatedCurriculum() {
  return {
    goal: 'Generated daily work',
    subject: 'Generated subject',
    currentSkillLevel: 'beginner' as const,
    availableStudyTimeMinutesPerDay: 30,
    targetDurationDays: 30,
    deadline: futureDate(30).toISOString(),
    practiceActivities: ['Practice'],
    revisionSessions: ['Review'],
    assessmentRecommendations: ['Assess'],
    modules: [{
      title: 'Generated module',
      order: 1,
      milestone: 'Generated milestone',
      completionCriteria: ['Finish'],
      topics: [{
        title: 'Generated topic',
        order: 1,
        description: 'Complete one focused exercise on the selected topic.',
        subtopics: ['focused concept'],
        activities: ['Complete one focused exercise'],
        deliverable: 'Submit one completed example',
        learningObjectives: ['Learn'],
        estimatedDurationMinutes: 20,
        completionCriteria: ['Explain'],
      }],
    }],
    milestones: [{
      title: 'Generated milestone',
      description: 'Finish',
      targetDate: futureDate(15).toISOString(),
      completionCriteria: ['Pass'],
    }],
  }

}

function generatedLearningNotes() {
  return {
    introduction: 'A focused explanation.',
    learningObjectives: ['Explain the selected concept.'],
    prerequisites: ['Variables'],
    sections: [{
      title: 'Core idea',
      explanation: 'A practical explanation.',
      subtopics: ['Syntax'],
      examples: ['Build one example.'],
      codeExamples: [],
    }],
    applications: ['Use the concept in a project.'],
    commonMistakes: ['Skipping validation.'],
    keyTakeaways: ['Practice the core pattern.'],
    revisionSummary: 'Review the core pattern.',
    knowledgeChecks: [{ question: 'What is the core pattern?', answer: 'A reusable pattern.', explanation: 'It is used consistently.' }],
  }
}

async function request(path: string, token = user.token, options: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
}

before(async () => {
  ({ createApp } = await import('../app'));
  ({ connectDB, disconnectDB } = await import('../config/database'));
  ({ Curriculum } = await import('../models/curriculum.model'));
  ({ DailyTarget } = await import('../models/daily-target.model'));
  ({ DailyTargetGenerationJob } = await import('../models/daily-target-generation-job.model'));
  ({ ExtraWorkGeneration } = await import('../models/extra-work-generation.model'));
  ({ LearningNote } = await import('../models/learning-note.model'));
  ({ User } = await import('../models/user.model'));
  ({ signAccessToken } = await import('../utils/jwt'));
  ({ aiService } = await import('../services/ai.service'));
  ({ ensureGenerationJob, recoverAndProcessJobs } = await import('../services/daily-target-generation.service'));
  ({ getLocalDateKey, localDateKeyToStorageDate } = await import('../services/timezone.service'));
  await connectDB()
  await Promise.all([
    DailyTargetGenerationJob.deleteMany({}),
    ExtraWorkGeneration.deleteMany({}),
    LearningNote.deleteMany({}),
    DailyTarget.deleteMany({}),
    Curriculum.deleteMany({}),
    User.deleteMany({}),
  ])
  await Promise.all([
    DailyTargetGenerationJob.syncIndexes(),
    ExtraWorkGeneration.syncIndexes(),
    DailyTarget.syncIndexes(),
    Curriculum.syncIndexes(),
    User.syncIndexes(),
  ])
  const created = await User.create({
    name: 'Scheduled User',
    email: 'scheduled@example.com',
    passwordHash: 'not-used',
    timezone: 'Asia/Kolkata',
    dailyStudyTimeBudgetMinutes: 120,
  })
  user = { id: created.id, token: signAccessToken(created.id) }
  aiService.generateCurriculum = async () => generatedCurriculum()
  app = createApp()
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Integration server did not start')
  baseUrl = `http://127.0.0.1:${address.port}/api`
})

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await Promise.all([
    DailyTargetGenerationJob.deleteMany({}),
    ExtraWorkGeneration.deleteMany({}),
    LearningNote.deleteMany({}),
    DailyTarget.deleteMany({}),
    Curriculum.deleteMany({}),
    User.deleteMany({}),
  ])
  await disconnectDB()
})

test('uses each user timezone and recovers jobs after 5 AM without exact-time polling', async () => {
  const ist = await User.findById(user.id)
  assert.ok(ist)
  const atSixThirtyIst = new Date('2026-11-01T01:00:00.000Z')
  assert.equal(getLocalDateKey(atSixThirtyIst, 'Asia/Kolkata'), '2026-11-01')
  const job = await ensureGenerationJob(ist, atSixThirtyIst)
  assert.equal(job?.localDateKey, '2026-11-01')

  await DailyTargetGenerationJob.updateOne(
    { _id: job?._id },
    { $set: { status: 'processing', lockedUntil: new Date(atSixThirtyIst.getTime() - 1_000) } },
  )
  await recoverAndProcessJobs(atSixThirtyIst, 10)
  const recovered = await DailyTargetGenerationJob.findById(job?._id)
  assert.equal(recovered?.status, 'completed')

  const eastern = await User.create({
    name: 'Eastern User',
    email: 'eastern@example.com',
    passwordHash: 'not-used',
    timezone: 'America/New_York',
  })
  const easternAtFive = new Date('2026-11-01T10:00:00.000Z')
  assert.equal(getLocalDateKey(easternAtFive, 'America/New_York'), '2026-11-01')
  const easternJob = await ensureGenerationJob(eastern, easternAtFive)
  assert.equal(easternJob?.localDateKey, '2026-11-01')
})

test('generates separate regular targets for multiple planners idempotently', async () => {
  const planners = await Curriculum.create([
    curriculumPayload(user.id, 'Planner one'),
    curriculumPayload(user.id, 'Planner two'),
  ])
  const now = new Date('2026-11-02T01:00:00.000Z')
  const localDateKey = getLocalDateKey(now, 'Asia/Kolkata')
  await ensureGenerationJob(await User.findById(user.id).orFail(), now)
  await recoverAndProcessJobs(now, 10)
  const targets = await DailyTarget.find({ owner: user.id, localDateKey })
  assert.equal(targets.length, planners.length)
  assert.equal(new Set(targets.map((target) => String(target.curriculum))).size, planners.length)
  assert.ok(targets.every((target) => {
    const item = target.items[0]
    return Boolean(
      item?.description &&
      item.learningObjectives?.length &&
      item.subtopics?.length &&
      item.activities?.length &&
      item.deliverable &&
      item.completionCriteria?.length,
    )
  }))
  await recoverAndProcessJobs(now, 10)
  assert.equal(await DailyTarget.countDocuments({ owner: user.id, localDateKey }), planners.length)
})

test('extra work requires all regular targets and allows only one successful generation', async () => {
  const planner = await Curriculum.findOne({ owner: user.id }).orFail()
  const localDateKey = getLocalDateKey(new Date(), 'Asia/Kolkata')
  await DailyTargetGenerationJob.findOneAndUpdate(
    { owner: user.id, localDateKey },
    { $set: { status: 'completed', attempts: 1, completedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  await DailyTarget.deleteMany({ owner: user.id, localDateKey })
  await DailyTarget.create({
    owner: user.id,
    curriculum: planner._id,
    targetDate: localDateKeyToStorageDate(localDateKey),
    localDateKey,
    kind: 'regular',
    allocatedMinutes: 60,
    items: [{ topicKey: '1:1', title: 'Regular task', estimatedDurationMinutes: 30, status: 'pending' }],
  })
  const blocked = await request('/daily-targets/extra', user.token, {
    method: 'POST',
    body: JSON.stringify({ curriculumId: planner.id }),
  })
  assert.equal(blocked.status, 409)

  await DailyTarget.updateMany({ owner: user.id, localDateKey }, { $set: { 'items.0.status': 'completed' } })
  const otherPlanner = await Curriculum.findOne({ owner: user.id, _id: { $ne: planner._id } }).orFail()
  await DailyTarget.create({
    owner: user.id,
    curriculum: otherPlanner._id,
    targetDate: localDateKeyToStorageDate(localDateKey),
    localDateKey,
    kind: 'regular',
    allocatedMinutes: 60,
    items: [{ topicKey: '1:1', title: 'Regular task', estimatedDurationMinutes: 30, status: 'completed' }],
  })
  const responses = await Promise.all([
    request('/daily-targets/extra', user.token, { method: 'POST', body: JSON.stringify({ curriculumId: planner.id }) }),
    request('/daily-targets/extra', user.token, { method: 'POST', body: JSON.stringify({ curriculumId: otherPlanner.id }) }),
  ])
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409])
  assert.equal(await ExtraWorkGeneration.countDocuments({ owner: user.id, localDateKey, status: 'completed' }), 1)
  const generation = await ExtraWorkGeneration.findOne({ owner: user.id, localDateKey, status: 'completed' }).orFail()
  const extraItem = generation.items[0]
  const itemUpdate = await request(`/daily-targets/extra/${generation.id}/items/${encodeURIComponent(extraItem.topicKey)}`, user.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  })
  assert.equal(itemUpdate.status, 200)
  assert.equal((await ExtraWorkGeneration.findById(generation.id).orFail()).items[0].status, 'completed')
  const regularCount = await DailyTarget.countDocuments({ owner: user.id, localDateKey, kind: 'regular' })
  assert.equal(regularCount, 2)
  const listed = await request('/daily-targets')
  const listedBody = await listed.json() as { data: { targets: Array<{ kind: string }>; extraWork: { status: string } } }
  assert.ok(listedBody.data.targets.every((target) => target.kind === 'regular'))
  assert.equal(listedBody.data.extraWork.status, 'completed')
})

test('failed extra generation releases the daily allowance for retry', async () => {
  const planner = await Curriculum.findOne({ owner: user.id }).orFail()
  const localDateKey = getLocalDateKey(new Date(), 'Asia/Kolkata')
  await ExtraWorkGeneration.deleteMany({ owner: user.id, localDateKey })
  const original = aiService.generateCurriculum
  let calls = 0
  aiService.generateCurriculum = async () => {
    calls += 1
    if (calls === 1) throw new Error('temporary provider failure')
    return generatedCurriculum()
  }
  try {
    const first = await request('/daily-targets/extra', user.token, {
      method: 'POST',
      body: JSON.stringify({ curriculumId: planner.id }),
    })
    assert.equal(first.status, 503)
    assert.equal(await ExtraWorkGeneration.countDocuments({ owner: user.id, localDateKey }), 0)
    const second = await request('/daily-targets/extra', user.token, {
      method: 'POST',
      body: JSON.stringify({ curriculumId: planner.id }),
    })
    assert.equal(second.status, 201)
  } finally {
    aiService.generateCurriculum = original
  }
})

test('the successful extra-work allowance is available again on the next local date', async () => {
  const planner = await Curriculum.findOne({ owner: user.id }).orFail()
  const today = getLocalDateKey(new Date(), 'Asia/Kolkata')
  const tomorrowDate = localDateKeyToStorageDate(today)
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const tomorrow = tomorrowDate.toISOString().slice(0, 10)
  await ExtraWorkGeneration.create({
    owner: user.id,
    localDateKey: tomorrow,
    curriculum: planner._id,
    status: 'completed',
    items: [],
  })
  assert.equal(await ExtraWorkGeneration.countDocuments({ owner: user.id, status: 'completed' }), 2)
})

test('supports undoing regular and extra completion without restoring the daily allowance', async () => {
  const planner = await Curriculum.findOne({ owner: user.id }).orFail()
  const localDateKey = getLocalDateKey(new Date(), 'Asia/Kolkata')
  const target = await DailyTarget.findOne({ owner: user.id, curriculum: planner._id, localDateKey }).orFail()
  const generation = await ExtraWorkGeneration.findOne({ owner: user.id, localDateKey, status: 'completed' }).orFail()
  const regularItem = target.items[0]
  const extraItem = generation.items[0]
  extraItem.status = 'completed'
  await generation.save()

  const invalid = await request(`/daily-targets/${target.id}/items/${encodeURIComponent(regularItem.topicKey)}`, user.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'missed' }),
  })

  assert.equal(invalid.status, 400)

  const undoRegular = await request(`/daily-targets/${target.id}/items/${encodeURIComponent(regularItem.topicKey)}`, user.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'pending' }),
  })
  assert.equal(undoRegular.status, 200)
  const statusAfterUndo = await request('/daily-targets/extra/status')
  const statusBody = await statusAfterUndo.json() as { data: { regularTargetsCompleted: boolean; available: boolean } }
  assert.equal(statusBody.data.regularTargetsCompleted, false)
  assert.equal(statusBody.data.available, false)

  const undoExtra = await request(`/daily-targets/extra/${generation.id}/items/${encodeURIComponent(extraItem.topicKey)}`, user.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'pending' }),
  })
  assert.equal(undoExtra.status, 200)
  assert.equal((await ExtraWorkGeneration.findById(generation.id).orFail()).items[0].status, 'pending')
})

test('creates concurrent note versions, retrieves history, and preserves progress', async () => {
  const planner = await Curriculum.findOne({ owner: user.id }).orFail()
  const topic = planner.modules[0].topics[0]
  const originalProgress = planner.progressPercent
  const originalCompleted = [...planner.completedTopicKeys]
  const original = aiService.generateLearningNotes
  aiService.generateLearningNotes = async () => generatedLearningNotes()
  try {
    const responses = await Promise.all([
      request('/learning-notes/generate', user.token, { method: 'POST', body: JSON.stringify({ curriculumId: planner.id, moduleKey: '1', topicKey: `1:${topic.order}` }) }),
      request('/learning-notes/generate', user.token, { method: 'POST', body: JSON.stringify({ curriculumId: planner.id, moduleKey: '1', topicKey: `1:${topic.order}`, regenerate: true }) }),
    ])
    assert.ok(responses.every((response) => response.status === 201))
    const notes = await LearningNote.find({ owner: user.id, curriculum: planner._id, moduleKey: '1', topicKey: `1:${topic.order}` }).sort({ version: 1 })
    assert.equal(notes.length, 2)
    assert.deepEqual(notes.map((note) => note.version), [1, 2])
    const history = await request(`/learning-notes?curriculum=${planner.id}`, user.token)
    assert.equal(history.status, 200)
    const historyBody = await history.json() as { data: { notes: Array<{ version: number }> } }
    assert.deepEqual(historyBody.data.notes.map((note) => note.version).sort(), [1, 2])
    const after = await Curriculum.findById(planner._id).orFail()
    assert.equal(after.progressPercent, originalProgress)
    assert.deepEqual(after.completedTopicKeys, originalCompleted)
  } finally {
    aiService.generateLearningNotes = original
  }
})
