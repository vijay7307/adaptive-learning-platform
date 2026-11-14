import test from 'node:test'
import assert from 'node:assert/strict'
import { validateGenerateTestInput } from './test.validation'

test('test generation validation enforces bounded configuration', () => {
  assert.throws(() => validateGenerateTestInput({ curriculumId: 'x', moduleKey: '1', difficulty: 'beginner', questionCount: 0, durationMinutes: 30 }))
  assert.throws(() => validateGenerateTestInput({ curriculumId: 'x', moduleKey: '1', difficulty: 'beginner', questionCount: 5, durationMinutes: 481 }))
  assert.doesNotThrow(() => validateGenerateTestInput({ curriculumId: 'x', moduleKey: '1', topicKey: '1:2', difficulty: 'advanced', questionCount: 10, durationMinutes: 60 }))
})
