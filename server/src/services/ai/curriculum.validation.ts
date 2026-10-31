import { AiServiceError } from './contracts'
import type { GeneratedCurriculum } from './curriculum.types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
}

function isValidDate(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false
  return !Number.isNaN(Date.parse(value))
}

export function validateGeneratedCurriculum(value: unknown): GeneratedCurriculum {
  if (!isRecord(value)) {
    throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned an invalid curriculum structure.')
  }

  const skillLevels = ['beginner', 'intermediate', 'advanced'] as const
  if (
    !isNonEmptyString(value.goal) ||
    !isNonEmptyString(value.subject) ||
    !skillLevels.includes(value.currentSkillLevel as (typeof skillLevels)[number]) ||
    !isPositiveInteger(value.availableStudyTimeMinutesPerDay) ||
    !isPositiveInteger(value.targetDurationDays) ||
    !isValidDate(value.deadline) ||
    new Date(value.deadline) <= new Date() ||
    !isStringArray(value.practiceActivities) ||
    !isStringArray(value.revisionSessions) ||
    !isStringArray(value.assessmentRecommendations) ||
    !Array.isArray(value.modules) ||
    value.modules.length === 0 ||
    !Array.isArray(value.milestones) ||
    value.milestones.length === 0
  ) {
    throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned an invalid curriculum structure.')
  }

  const modules = value.modules.map((module) => {
    if (
      !isRecord(module) ||
      !isNonEmptyString(module.title) ||
      !isPositiveInteger(module.order) ||
      !isNonEmptyString(module.milestone) ||
      !isStringArray(module.completionCriteria) ||
      !Array.isArray(module.topics) ||
      module.topics.length === 0
    ) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned invalid curriculum modules.')
    }

    const topics = module.topics.map((topic) => {
      if (
        !isRecord(topic) ||
        !isNonEmptyString(topic.title) ||
        !isPositiveInteger(topic.order) ||
        !isStringArray(topic.learningObjectives) ||
        !isPositiveInteger(topic.estimatedDurationMinutes) ||
        !isStringArray(topic.completionCriteria)
      ) {
        throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned invalid curriculum topics.')
      }
      return {
        title: topic.title,
        order: topic.order,
        learningObjectives: topic.learningObjectives,
        estimatedDurationMinutes: topic.estimatedDurationMinutes,
        completionCriteria: topic.completionCriteria,
      }
    })

    return {
      title: module.title,
      order: module.order,
      topics,
      milestone: module.milestone,
      completionCriteria: module.completionCriteria,
    }
  })

  const milestones = value.milestones.map((milestone) => {
    if (
      !isRecord(milestone) ||
      !isNonEmptyString(milestone.title) ||
      !isNonEmptyString(milestone.description) ||
      !isValidDate(milestone.targetDate) ||
      new Date(milestone.targetDate) <= new Date() ||
      !isStringArray(milestone.completionCriteria)
    ) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned invalid curriculum milestones.')
    }
    return {
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.targetDate,
      completionCriteria: milestone.completionCriteria,
    }
  })

  return {
    goal: value.goal,
    subject: value.subject,
    currentSkillLevel: value.currentSkillLevel as GeneratedCurriculum['currentSkillLevel'],
    availableStudyTimeMinutesPerDay: value.availableStudyTimeMinutesPerDay,
    targetDurationDays: value.targetDurationDays,
    deadline: value.deadline,
    practiceActivities: value.practiceActivities,
    revisionSessions: value.revisionSessions,
    assessmentRecommendations: value.assessmentRecommendations,
    modules,
    milestones,
  }
}
