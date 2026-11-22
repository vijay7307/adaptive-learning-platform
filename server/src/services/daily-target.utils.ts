import type { CurriculumDocument } from '../models/curriculum.model'

export const EXTRA_WORK_RESERVE_MINUTES = 60

export function buildTopicKey(moduleOrder: number, topicOrder: number): string {
  return `${moduleOrder}:${topicOrder}`
}

export function allocateDailyStudyMinutes(curricula: CurriculumDocument[], budget: number): Map<string, number> {
  const allocations = new Map<string, number>()
  if (curricula.length === 0) return allocations
  const normalizedBudget = Math.max(0, Math.floor(budget))
  let remaining = normalizedBudget

  curricula.forEach((curriculum) => {
    if (remaining <= 0) {
      allocations.set(String(curriculum._id), 0)
      return
    }
    const requestedMinutes = Math.max(0, Math.floor(curriculum.availableStudyTimeMinutesPerDay))
    const allocation = Math.min(requestedMinutes, remaining)
    allocations.set(String(curriculum._id), allocation)
    remaining -= allocation
  })
  return allocations
}

export function normalizeTargetDurations<T extends { estimatedDurationMinutes: number }>(
  items: T[],
  allocatedMinutes: number,
): T[] {
  const limit = Math.max(0, Math.floor(allocatedMinutes))
  if (limit === 0) return items.map((item) => ({ ...item, estimatedDurationMinutes: 0 }))
  if (items.length === 0) return items

  const currentTotal = items.reduce((sum, item) => sum + Math.max(0, item.estimatedDurationMinutes), 0)
  if (currentTotal <= limit && items.every((item) => item.estimatedDurationMinutes <= limit)) {
    return items
  }

  const base = Math.floor(limit / items.length)
  let remainder = limit - base * items.length
  return items.map((item) => {
    const duration = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    return { ...item, estimatedDurationMinutes: duration }
  })
}
