import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildCurriculumOwnershipFilter,
  getDeadlineValidationError,
  hasActivePlannerCapacity,
  parseGenerationInput,
} from './curriculum.controller'

const validInput = {
  goal: 'Learn TypeScript',
  subject: 'TypeScript',
  currentSkillLevel: 'beginner',
  availableStudyHoursPerDay: 1,
  targetDurationDays: 30,
}

test('rejects invalid curriculum inputs', () => {
  assert.equal(parseGenerationInput({ ...validInput, targetDurationDays: 0 }), null)
  assert.equal(parseGenerationInput({ ...validInput, availableStudyHoursPerDay: 25 }), null)
  assert.equal(parseGenerationInput({ ...validInput, currentSkillLevel: 'expert' }), null)
  assert.equal(
    parseGenerationInput({
      ...validInput,
      deadline: '2020-01-01T00:00:00.000Z',
    }),
    null,
  )
})

test('accepts valid curriculum inputs and normalizes text', () => {
  const parsed = parseGenerationInput({
    ...validInput,
    goal: '  Learn TypeScript  ',
    subject: ' TypeScript ',
  })
  assert.equal(parsed?.goal, 'Learn TypeScript')
  assert.equal(parsed?.subject, 'TypeScript')
})

test('explains an inconsistent deadline', () => {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + validInput.targetDurationDays + 1)
  assert.match(
    getDeadlineValidationError({
      ...validInput,
      deadline: deadline.toISOString(),
    }) || '',
    /within 30 days/,
  )
})

test('scopes list and retrieval filters to the authenticated owner', () => {
  assert.deepEqual(buildCurriculumOwnershipFilter('owner-a'), { owner: 'owner-a' })
  assert.deepEqual(buildCurriculumOwnershipFilter('owner-a', 'curriculum-1'), {
    _id: 'curriculum-1',
    owner: 'owner-a',
  })
  assert.notDeepEqual(
    buildCurriculumOwnershipFilter('owner-a', 'curriculum-1'),
    { _id: 'curriculum-1' },
  )
})

test('allows only three active planners and allows capacity after completion or archive', () => {
  assert.equal(hasActivePlannerCapacity(0), true)
  assert.equal(hasActivePlannerCapacity(1), true)
  assert.equal(hasActivePlannerCapacity(2), true)
  assert.equal(hasActivePlannerCapacity(3), false)
})
