import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AiServiceError } from './ai/contracts'
import {
  buildDetailedTargetItem,
  validateExtraTargetItems,
  validateRegularTargetItems,
} from './daily-target-quality.service'

const topic = {
  title: 'TypeScript union type narrowing',
  order: 1,
  description: 'Practice narrowing discriminated unions with switch statements.',
  learningObjectives: ['Explain discriminated unions'],
  subtopics: ['literal members', 'switch narrowing'],
  activities: ['Write three union types and narrow them with a switch'],
  deliverable: 'A typed example file with three passing cases',
  estimatedDurationMinutes: 20,
  completionCriteria: ['All three cases compile without unsafe casts'],
}

test('builds a detailed regular target item', () => {
  const item = buildDetailedTargetItem(topic, '1:1', 20)
  assert.equal(item.title, topic.title)
  assert.deepEqual(item.activities, topic.activities)
  assert.equal(item.status, 'pending')
})

test('rejects vague regular target titles', () => {
  assert.throws(
    () => buildDetailedTargetItem({ ...topic, title: 'TypeScript basics – Intro' }, '1:1', 20),
    (error: unknown) => error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})

test('rejects regular targets that exceed the allocated time', () => {
  const item = buildDetailedTargetItem(topic, '1:1', 40)
  assert.throws(
    () => validateRegularTargetItems([item], 30),
    (error: unknown) => error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})

test('enforces extra task count, duration, and total budget', () => {
  const items = [1, 2, 3].map((order) =>
    buildDetailedTargetItem({ ...topic, order, title: `${topic.title} exercise ${order}` }, `extra:1:${order}`, 20),
  )
  validateExtraTargetItems(items, 60)
  assert.throws(
    () => validateExtraTargetItems([...items, items[0]], 60),
    (error: unknown) => error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})

test('rejects duplicate extra task keys', () => {
  const items = [
    buildDetailedTargetItem(topic, 'extra:1:1', 20),
    buildDetailedTargetItem({ ...topic, title: 'TypeScript union type narrowing exercise' }, 'extra:1:1', 20),
  ]
  assert.throws(
    () => validateExtraTargetItems(items, 60),
    (error: unknown) => error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})
