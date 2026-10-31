import { AiServiceError } from './ai/contracts'
import type { GeneratedCurriculum } from './ai/curriculum.types'
import type { IDailyTargetItem } from '../models/daily-target.model'

type GeneratedTopic = GeneratedCurriculum['modules'][number]['topics'][number]

const vagueTitlePattern = /(^|[-–—:])\s*(intro(?:duction)?|overview|basics?|advanced concepts?|learn everything|partial)\s*$/i

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
}

function assertSpecificTopic(topic: GeneratedTopic): void {
  const subtopics = topic.subtopics
  const description = topic.description
  const deliverable = topic.deliverable
  if (
    !isNonEmptyString(topic.title) ||
    topic.title.trim().length < 12 ||
    !isNonEmptyString(description) ||
    vagueTitlePattern.test(topic.title) ||
    !isStringArray(topic.learningObjectives) ||
    !isStringArray(subtopics) ||
    !isStringArray(topic.activities) ||
    !isNonEmptyString(deliverable) ||
    !isStringArray(topic.completionCriteria)
  ) {
    throw new AiServiceError(
      'AI_INVALID_RESPONSE',
      'AI returned a target without specific objectives, activities, or completion criteria.',
    )
  }
}

export function buildDetailedTargetItem(
  topic: GeneratedTopic,
  topicKey: string,
  duration: number,
): IDailyTargetItem {
  assertSpecificTopic(topic)
  const subtopics = topic.subtopics as string[]
  const deliverable = topic.deliverable as string
  return {
    topicKey,
    title: topic.title.trim(),
    description: (topic.description as string).trim(),
    learningObjectives: topic.learningObjectives,
    subtopics,
    activities: topic.activities,
    deliverable: deliverable.trim(),
    completionCriteria: topic.completionCriteria,
    estimatedDurationMinutes: duration,
    status: 'pending',
  }
}

export function validateRegularTargetItems(items: IDailyTargetItem[], allocatedMinutes: number): void {
  if (items.length === 0) return
  const totalMinutes = items.reduce((sum, item) => sum + item.estimatedDurationMinutes, 0)
  if (totalMinutes > allocatedMinutes) {
    throw new AiServiceError(
      'AI_INVALID_RESPONSE',
      'AI returned daily targets that exceed the allocated study time.',
    )
  }
}

export function validateExtraTargetItems(items: IDailyTargetItem[], availableMinutes: number): void {
  const totalMinutes = items.reduce((sum, item) => sum + item.estimatedDurationMinutes, 0)
  const keys = items.map((item) => item.topicKey)
  if (
    items.length === 0 ||
    items.length > 3 ||
    totalMinutes > 60 ||
    totalMinutes > availableMinutes ||
    keys.some((key, index) => !key || keys.indexOf(key) !== index) ||
    items.some((item) => item.estimatedDurationMinutes < 10 || item.estimatedDurationMinutes > 30)
  ) {
    throw new AiServiceError(
      'AI_INVALID_RESPONSE',
      'AI returned extra work outside the allowed task count or time limits.',
    )
  }
}
