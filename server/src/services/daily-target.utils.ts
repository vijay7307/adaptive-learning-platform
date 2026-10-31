import type { CurriculumDocument } from '../models/curriculum.model'

export const EXTRA_WORK_RESERVE_MINUTES = 60

export function buildTopicKey(moduleOrder: number, topicOrder: number): string {
  return `${moduleOrder}:${topicOrder}`
}

export function allocateDailyStudyMinutes(curricula: CurriculumDocument[], budget: number): Map<string, number> {
  const allocations = new Map<string, number>()
  if (curricula.length === 0) return allocations
  const totalRequested = curricula.reduce((sum, curriculum) => sum + curriculum.availableStudyTimeMinutesPerDay, 0)
  let remaining = budget
  curricula.forEach((curriculum, index) => {
    const proportional = index === curricula.length - 1
      ? remaining
      : Math.max(15, Math.floor((budget * curriculum.availableStudyTimeMinutesPerDay) / totalRequested))
    const allocation = Math.min(proportional, remaining)
    allocations.set(String(curriculum._id), allocation)
    remaining -= allocation
  })
  return allocations
}
