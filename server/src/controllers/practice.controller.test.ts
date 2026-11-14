import assert from 'node:assert/strict'
import { test } from 'node:test'
import mongoose from 'mongoose'
import { createPracticeController } from './practice.controller'

function response() {
  const result: { statusCode?: number; body?: unknown } = {}
  const res = {
    status(code: number) { result.statusCode = code; return res },
    json(body: unknown) { result.body = body; return res },
    headersSent: false,
  }
  return { res, result }
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    user: { _id: new mongoose.Types.ObjectId() },
    body: {},
    query: {},
    params: {},
    ...overrides,
  } as never
}

test('practice generation controller validates input and delegates authenticated owner', async () => {
  const owner = new mongoose.Types.ObjectId()
  let receivedOwner = ''
  const service = {
    generatePracticeSet: async (id: mongoose.Types.ObjectId) => {
      receivedOwner = String(id)
      return { setKey: 'set-1' }
    },
  } as never
  const controller = createPracticeController(service)
  const { res, result } = response()
  await controller.generatePracticeSet(request({
    user: { _id: owner },
    body: { curriculumId: 'curriculum', moduleKey: '1', topicKey: '1:1', difficulty: 'beginner', questionCount: 2 },
  }), res as never)
  assert.equal(result.statusCode, 201)
  assert.equal(receivedOwner, String(owner))
})

test('practice submission rejects malformed answers before calling the service', async () => {
  let called = false
  const service = { submitAttempt: async () => { called = true; return {} } } as never
  const controller = createPracticeController(service)
  const { res, result } = response()
  await controller.submitAttempt(request({ body: { answers: 'not-an-array' } }), res as never)
  assert.equal(result.statusCode, 400)
  assert.equal(called, false)
})

test('practice results expose only the evaluated result payload from the service', async () => {
  const evaluated = { status: 'evaluated', questionResults: [{ questionKey: 'q1', score: 1 }] }
  const service = { getAttemptResults: async () => evaluated } as never
  const controller = createPracticeController(service)
  const { res, result } = response()
  await controller.getAttemptResults(request({ params: { attemptKey: 'attempt-1' } }), res as never)
  assert.equal(result.statusCode, 200)
  assert.deepEqual((result.body as { data: { results: unknown } }).data.results, evaluated.questionResults)
})
