import test from 'node:test'
import assert from 'node:assert/strict'
import { validateGenerateTestInput } from './test.validation'
import { getNewlyCompletedModules } from './test.service'

test('test generation validation enforces bounded configuration', () => {
  assert.throws(() => validateGenerateTestInput({ curriculumId: 'x', moduleKey: '1', difficulty: 'beginner', questionCount: 0, durationMinutes: 30 }))
  assert.throws(() => validateGenerateTestInput({ curriculumId: 'x', moduleKey: '1', difficulty: 'beginner', questionCount: 5, durationMinutes: 481 }))
  assert.doesNotThrow(() => validateGenerateTestInput({ curriculumId: 'x', moduleKey: '1', topicKey: '1:2', difficulty: 'advanced', questionCount: 10, durationMinutes: 60 }))
})

test('detects a module only when it becomes newly complete', () => {
  const curriculum = {
    modules: [{
      order: 1,
      topics: [{ order: 1 }, { order: 2 }],
    }],
    completedTopicKeys: ['1:1', '1:2'],
  }
  assert.equal(getNewlyCompletedModules(curriculum as never, []).length, 1)
  assert.equal(getNewlyCompletedModules(curriculum as never, ['1:1', '1:2']).length, 0)
})
