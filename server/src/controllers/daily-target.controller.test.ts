import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allocateDailyStudyMinutes, buildTopicKey } from './daily-target.controller'

function curriculum(id: string, minutes: number): any {
  return {
    _id: id,
    availableStudyTimeMinutesPerDay: minutes,
  }
}

test('builds stable planner-specific topic keys', () => {
  assert.equal(buildTopicKey(2, 4), '2:4')
})

test('distributes one shared daily budget across planners', () => {
  const allocations = allocateDailyStudyMinutes(
    [curriculum('a', 60), curriculum('b', 60), curriculum('c', 60)],
    180,
  )
  assert.deepEqual([...allocations.values()], [60, 60, 60])
  assert.equal([...allocations.values()].reduce((sum, value) => sum + value, 0), 180)
})

test('caps allocations at the shared budget', () => {
  const allocations = allocateDailyStudyMinutes(
    [curriculum('a', 120), curriculum('b', 120)],
    180,
  )
  assert.equal([...allocations.values()].reduce((sum, value) => sum + value, 0), 180)
})

test('caps a one-hour planner allocation at one hour despite a larger shared budget', () => {
  const allocations = allocateDailyStudyMinutes(
    [curriculum('a', 60)],
    180,
  )
  assert.equal(allocations.get('a'), 60)
})

test('caps a one-hour planner together with another planner by both planner requests and shared budget', () => {
  const allocations = allocateDailyStudyMinutes(
    [curriculum('a', 60), curriculum('b', 120)],
    180,
  )
  assert.equal(allocations.get('a'), 60)
  assert.equal(allocations.get('b'), 120)
  assert.equal([...allocations.values()].reduce((sum, value) => sum + value, 0), 180)
})

test('does not allocate time to completed or archived planners at the query boundary', () => {
  const active = [curriculum('active', 60)]
  assert.deepEqual([...allocateDailyStudyMinutes(active, 60).keys()], ['active'])
})
