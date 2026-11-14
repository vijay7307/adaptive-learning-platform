import type { TestDifficulty } from '../models/test.model'
export interface GenerateTestInput { curriculumId: string; moduleKey: string; topicKey?: string; difficulty: TestDifficulty; questionCount: number; durationMinutes: number }
export function validateGenerateTestInput(input: unknown): asserts input is GenerateTestInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid test parameters.')
  const v = input as Record<string, unknown>
  if (typeof v.curriculumId !== 'string' || typeof v.moduleKey !== 'string' || !['beginner', 'intermediate', 'advanced'].includes(String(v.difficulty)) ||
    (v.topicKey !== undefined && typeof v.topicKey !== 'string') || !Number.isInteger(v.questionCount) || Number(v.questionCount) < 1 || Number(v.questionCount) > 100 ||
    !Number.isInteger(v.durationMinutes) || Number(v.durationMinutes) < 1 || Number(v.durationMinutes) > 480) throw new Error('Invalid test parameters.')
}
