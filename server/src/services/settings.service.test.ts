import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSettingsPatch } from './settings.service'

test('settings validation accepts supported profile and preference fields', () => {
  const result = validateSettingsPatch({
    name: 'Learner',
    timezone: 'Asia/Kolkata',
    dailyStudyTimeBudgetMinutes: 120,
    theme: 'dark',
    notifications: { email: false, dailyReminders: true },
  })
  assert.equal(result.error, undefined)
  assert.equal(result.value?.dailyStudyTimeBudgetMinutes, 120)
})

test('settings validation rejects unsafe or out-of-range fields', () => {
  assert.equal(validateSettingsPatch({ passwordHash: 'nope' }).error, 'Unsupported settings field.')
  assert.match(validateSettingsPatch({ dailyStudyTimeBudgetMinutes: 2 }).error || '', /between 15 and 1440/)
  assert.match(validateSettingsPatch({ theme: 'neon' }).error || '', /Theme/)
})
