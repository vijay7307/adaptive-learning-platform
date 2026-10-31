import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

process.env.MONGODB_URI = process.env.INTEGRATION_MONGODB_URI || 'mongodb://127.0.0.1:27018/adaptive_learning_integration'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret'
process.env.NODE_ENV = 'test'

let createApp: typeof import('../app').createApp
let connectDB: typeof import('../config/database').connectDB
let disconnectDB: typeof import('../config/database').disconnectDB
let Curriculum: typeof import('../models/curriculum.model').Curriculum
let DailyTarget: typeof import('../models/daily-target.model').DailyTarget
let User: typeof import('../models/user.model').User
let signAccessToken: typeof import('../utils/jwt').signAccessToken
let aiService: typeof import('../services/ai.service').aiService

let app: ReturnType<typeof createApp>
let server: ReturnType<typeof app.listen>
let baseUrl = ''
let userA: { id: string; token: string }
let userB: { id: string; token: string }

function futureDate(days: number): Date {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

function curriculumPayload(owner: string, goal: string, status: 'draft' | 'active' | 'completed' | 'archived' = 'active') {
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
      completionCriteria: ['Finish the module'],
      topics: [
        {
          title: 'Topic one',
          order: 1,
          learningObjectives: ['Understand the topic'],
          estimatedDurationMinutes: 45,
          completionCriteria: ['Explain the topic'],
        },
        {
          title: 'Topic two',
          order: 2,
          learningObjectives: ['Apply the topic'],
          estimatedDurationMinutes: 45,
          completionCriteria: ['Use the topic'],
        },
      ],
    }],
    milestones: [{
      title: 'Foundation complete',
      description: 'Finish the foundation',
      targetDate: futureDate(15),
      completionCriteria: ['Pass a review'],
    }],
    status,
  }
}

async function request(path: string, token: string, options: RequestInit = {}) {
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
  ({ User } = await import('../models/user.model'));
  ({ signAccessToken } = await import('../utils/jwt'));
  ({ aiService } = await import('../services/ai.service'));
  app = createApp()
  await connectDB()
  await Promise.all([User.deleteMany({}), Curriculum.deleteMany({}), DailyTarget.deleteMany({})])
  await Promise.all([Curriculum.syncIndexes(), DailyTarget.syncIndexes(), User.syncIndexes()])
  const [createdA, createdB] = await Promise.all([
    User.create({ name: 'Integration A', email: 'integration-a@example.com', passwordHash: 'not-used' }),
    User.create({ name: 'Integration B', email: 'integration-b@example.com', passwordHash: 'not-used' }),
  ])
  userA = { id: createdA.id, token: signAccessToken(createdA.id) }
  userB = { id: createdB.id, token: signAccessToken(createdB.id) }
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Integration server did not start')
  baseUrl = `http://127.0.0.1:${address.port}/api`
})

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await Promise.all([DailyTarget.deleteMany({}), Curriculum.deleteMany({}), User.deleteMany({})])
  await disconnectDB()
})

test('enforces three active planners under concurrent generation requests', async () => {
  await Curriculum.create([
    curriculumPayload(userA.id, 'Planner one'),
    curriculumPayload(userA.id, 'Planner two'),
  ])
  const originalGenerate = aiService.generateCurriculum
  aiService.generateCurriculum = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    return {
      goal: 'Generated planner',
      subject: 'Generated subject',
      currentSkillLevel: 'beginner',
      availableStudyTimeMinutesPerDay: 60,
      targetDurationDays: 30,
      deadline: futureDate(30).toISOString(),
      practiceActivities: ['Practice'],
      revisionSessions: ['Review'],
      assessmentRecommendations: ['Assess'],
      modules: [{
        title: 'Module',
        order: 1,
        milestone: 'Milestone',
        completionCriteria: ['Complete'],
        topics: [{
          title: 'Topic',
          order: 1,
          learningObjectives: ['Learn'],
          estimatedDurationMinutes: 30,
          completionCriteria: ['Explain'],
        }],
      }],
      milestones: [{
        title: 'Milestone',
        description: 'Complete',
        targetDate: futureDate(15).toISOString(),
        completionCriteria: ['Pass'],
      }],
    }
  }
  try {
    const responses = await Promise.all([
      request('/curriculums/generate', userA.token, {
        method: 'POST',
        headers: { 'Idempotency-Key': 'concurrent-a' },
        body: JSON.stringify({
          goal: 'Third planner', subject: 'Third planner', currentSkillLevel: 'beginner',
          availableStudyHoursPerDay: 1, targetDurationDays: 30,
        }),
      }),
      request('/curriculums/generate', userA.token, {
        method: 'POST',
        headers: { 'Idempotency-Key': 'concurrent-b' },
        body: JSON.stringify({
          goal: 'Fourth planner', subject: 'Fourth planner', currentSkillLevel: 'beginner',
          availableStudyHoursPerDay: 1, targetDurationDays: 30,
        }),
      }),
    ])
    const statuses = responses.map((response) => response.status).sort()
    assert.deepEqual(statuses, [201, 409])
    assert.equal(await Curriculum.countDocuments({ owner: userA.id, status: { $in: ['draft', 'active'] } }), 3)
  } finally {
    aiService.generateCurriculum = originalGenerate
  }
})

test('completed and archived planners free slots and remain independent', async () => {
  await Curriculum.deleteMany({ owner: userA.id })
  const planners = await Curriculum.create([
    curriculumPayload(userA.id, 'Active one'),
    curriculumPayload(userA.id, 'Active two'),
    curriculumPayload(userA.id, 'Completed', 'completed'),
    curriculumPayload(userA.id, 'Archived', 'archived'),
  ])
  const active = planners.filter((planner) => planner.status === 'active')
  assert.equal(active.length, 2)
  const response = await request('/curriculums', userA.token)
  assert.equal(response.status, 200)
  const body = await response.json() as { data: { activeCount: number } }
  assert.equal(body.data.activeCount, 2)
})

test('prevents cross-user curriculum and daily-target access', async () => {
  const planner = await Curriculum.create(curriculumPayload(userA.id, 'Private planner'))
  const detail = await request(`/curriculums/?id=${planner.id}`, userB.token)
  assert.equal(detail.status, 404)
  const progress = await request(`/curriculums/${planner.id}/progress`, userB.token, {
    method: 'PATCH',
    body: JSON.stringify({ completedTopicKeys: ['1:1'] }),
  })
  assert.equal(progress.status, 404)

  const targets = await request('/daily-targets', userA.token)
  assert.equal(targets.status, 200)
  const targetBody = await targets.json() as { data: { targets: Array<{ _id: string }> } }
  const targetId = targetBody.data.targets[0]._id
  const targetUpdate = await request(`/daily-targets/${targetId}/items/1%3A1`, userB.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  })
  assert.equal(targetUpdate.status, 404)
})

test('deduplicates concurrent target generation and preserves statuses', async () => {
  await DailyTarget.deleteMany({ owner: userA.id })
  const [first, second] = await Promise.all([
    request('/daily-targets?date=2026-11-01T23:30:00-05:00', userA.token),
    request('/daily-targets?date=2026-11-02T04:30:00Z', userA.token),
  ])
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(await DailyTarget.countDocuments({ owner: userA.id }), await Curriculum.countDocuments({ owner: userA.id, status: { $in: ['draft', 'active'] } }))
  const firstBody = await first.json() as { data: { targets: Array<{ _id: string; targetDate: string; items: Array<{ topicKey: string }> }> } }
  const target = firstBody.data.targets[0]
  assert.equal(new Date(target.targetDate).toISOString(), '2026-11-02T00:00:00.000Z')

  const completedUpdate = await request(`/daily-targets/${target._id}/items/${encodeURIComponent(target.items[0].topicKey)}`, userA.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  })
  assert.equal(completedUpdate.status, 200)
  const missedUpdate = await request(`/daily-targets/${target._id}/items/${encodeURIComponent(target.items[1].topicKey)}`, userA.token, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'missed' }),
  })
  assert.equal(missedUpdate.status, 200)
  const repeat = await request('/daily-targets?date=2026-11-02T12:00:00Z', userA.token)
  const repeatBody = await repeat.json() as { data: { targets: Array<{ items: Array<{ status: string }> }> } }
  assert.deepEqual(repeatBody.data.targets[0].items.map((item) => item.status), ['completed', 'missed'])
})

test('allocates no more than the shared budget and keeps planner progress independent', async () => {
  await User.findByIdAndUpdate(userA.id, { dailyStudyTimeBudgetMinutes: 75 })
  await Curriculum.deleteMany({ owner: userA.id })
  await DailyTarget.deleteMany({ owner: userA.id })
  const [plannerA, plannerB] = await Curriculum.create([
    curriculumPayload(userA.id, 'Independent A'),
    curriculumPayload(userA.id, 'Independent B'),
  ])
  const response = await request('/daily-targets?date=2026-11-03T00:00:00Z', userA.token)
  const body = await response.json() as { data: { dailyStudyTimeBudgetMinutes: number; targets: Array<{ curriculum: string; allocatedMinutes: number }> } }
  assert.equal(body.data.targets.reduce((sum, target) => sum + target.allocatedMinutes, 0) <= body.data.dailyStudyTimeBudgetMinutes, true)
  const progress = await request(`/curriculums/${plannerA.id}/progress`, userA.token, {
    method: 'PATCH',
    body: JSON.stringify({ completedTopicKeys: ['1:1'] }),
  })
  assert.equal(progress.status, 200)
  const untouched = await Curriculum.findById(plannerB.id)
  assert.equal(untouched?.progressPercent, 0)
  assert.deepEqual(untouched?.completedTopicKeys, [])
})

test('creates and enforces the daily-target unique index', async () => {
  const indexes = await DailyTarget.collection.indexes()
  const uniqueIndex = indexes.find((index) =>
    index.unique && index.key?.owner === 1 && index.key?.curriculum === 1 && index.key?.targetDate === 1,
  )
  assert.ok(uniqueIndex)
  const curriculum = await Curriculum.findOne({ owner: userA.id })
  assert.ok(curriculum)
  const targetDate = new Date('2026-11-04T00:00:00.000Z')
  await DailyTarget.create({
    owner: userA.id,
    curriculum: curriculum?._id,
    targetDate,
    items: [],
    allocatedMinutes: 0,
  })
  await assert.rejects(
    () => DailyTarget.create({
      owner: userA.id,
      curriculum: curriculum?._id,
      targetDate,
      items: [],
      allocatedMinutes: 0,
    }),
    (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000,
  )
})
