import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { DailyFeedback } from './daily-feedback.model'

test('daily feedback enforces bounded five-point ratings', async () => {
  const feedback = new DailyFeedback({
    owner: new mongoose.Types.ObjectId(),
    curriculum: new mongoose.Types.ObjectId(),
    feedbackDate: new Date(),
    difficulty: 6,
    confidence: 3,
    workload: 2,
    completedWork: [],
    blockers: [],
    topics: [],
  })
  await assert.rejects(() => feedback.validate(), /maximum allowed value \(5\)/)
})

test('daily feedback rejects oversized lists', async () => {
  const feedback = new DailyFeedback({
    owner: new mongoose.Types.ObjectId(),
    curriculum: new mongoose.Types.ObjectId(),
    feedbackDate: new Date(),
    difficulty: 3,
    confidence: 3,
    workload: 3,
    completedWork: Array.from({ length: 31 }, () => 'work'),
    blockers: [],
    topics: [],
  })
  await assert.rejects(() => feedback.validate(), /at most 30/)
})
