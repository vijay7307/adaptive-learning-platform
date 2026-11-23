import type { TestDifficulty } from '../models/test.model'
export interface GenerateTestInput {
  curriculumId: string
  moduleKey: string
  topicKey?: string
  difficulty: TestDifficulty
  questionCount: number
  durationMinutes: number
  source?: 'manual' | 'milestone'
  milestoneKey?: string
  scheduledAt?: Date
}
export function validateGenerateTestInput(input: unknown): asserts input is GenerateTestInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid test parameters.')
  const v = input as Record<string, unknown>
  if (typeof v.curriculumId !== 'string' || typeof v.moduleKey !== 'string' || !['beginner', 'intermediate', 'advanced'].includes(String(v.difficulty)) ||
    (v.topicKey !== undefined && typeof v.topicKey !== 'string') || !Number.isInteger(v.questionCount) || Number(v.questionCount) < 1 || Number(v.questionCount) > 100 ||
    !Number.isInteger(v.durationMinutes) || Number(v.durationMinutes) < 1 || Number(v.durationMinutes) > 480 ||
    (v.source !== undefined && v.source !== 'manual' && v.source !== 'milestone') ||
    (v.milestoneKey !== undefined && (typeof v.milestoneKey !== 'string' || v.milestoneKey.trim().length === 0)) ||
    (v.scheduledAt !== undefined && (!(v.scheduledAt instanceof Date) || Number.isNaN(v.scheduledAt.getTime())))) {
    throw new Error('Invalid test parameters.')
  }
}
