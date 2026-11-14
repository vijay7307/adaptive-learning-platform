import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import { Curriculum } from '../models/curriculum.model'
import { Test } from '../models/test.model'
import { TestAttempt } from '../models/test-attempt.model'
import { aiService } from './ai.service'
import { toAttemptDto, toTestDto } from './test.dto'
import { validateGenerateTestInput, type GenerateTestInput } from './test.validation'

export class TestServiceError extends Error {
  constructor(public readonly statusCode: number, message: string) { super(message) }
}
const oid = (value: string, field: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new TestServiceError(400, `A valid ${field} is required.`)
  return new mongoose.Types.ObjectId(value)
}
type Owner = mongoose.Types.ObjectId

export class TestService {
  async generate(owner: Owner, raw: GenerateTestInput) {
    try { validateGenerateTestInput(raw) } catch (e) { throw new TestServiceError(400, (e as Error).message) }
    const curriculum = await Curriculum.findOne({ _id: oid(raw.curriculumId, 'curriculumId'), owner })
    if (!curriculum) throw new TestServiceError(404, 'Curriculum not found.')
    const module = curriculum.modules.find((m) => String(m.order) === raw.moduleKey)
    if (!module || (raw.topicKey && !module.topics.some((t) => `${raw.moduleKey}:${t.order}` === raw.topicKey))) throw new TestServiceError(400, 'Module or topic is not part of this curriculum.')
    const prompt = `Generate a test as JSON using the existing practice-set schema. Return exactly ${raw.questionCount} questions, only mcq or short-answer, each worth 1 point. Subject: ${curriculum.subject}; module: ${module.title}; topic: ${raw.topicKey ?? 'all'}; difficulty: ${raw.difficulty}. Do not include code questions.`
    const generated = await aiService.generatePracticeSet(prompt)
    if (generated.questions.length !== raw.questionCount) throw new TestServiceError(502, 'AI returned an unexpected question count.')
    const questions = generated.questions.map((q, index) => {
      if (q.type !== 'mcq' && q.type !== 'short-answer') throw new TestServiceError(502, 'AI returned an unsupported test question.')
      return {
        questionKey: q.questionKey || `q-${index + 1}`, type: q.type === 'short-answer' ? 'descriptive' as const : 'mcq' as const,
        prompt: q.prompt, options: q.options, correctAnswer: q.correctAnswer,
        rubric: q.evaluationRubric, points: q.points, topicKey: raw.topicKey ?? `${raw.moduleKey}:all`,
      }
    })
    const test = await Test.create({ testKey: randomUUID(), owner, curriculum: curriculum._id, moduleKey: raw.moduleKey, topicKey: raw.topicKey, difficulty: raw.difficulty, durationMinutes: raw.durationMinutes, questions })
    return toTestDto(test)
  }

  async list(owner: Owner, curriculumId?: string) {
    const filter: Record<string, unknown> = { owner }
    if (curriculumId) filter.curriculum = oid(curriculumId, 'curriculumId')
    return (await Test.find(filter).sort({ createdAt: -1 }).lean()).map(toTestDto)
  }
  async get(owner: Owner, testKey: string) {
    const test = await Test.findOne({ owner, testKey }).lean()
    if (!test) throw new TestServiceError(404, 'Test not found.')
    return toTestDto(test)
  }
  async start(owner: Owner, testKey: string) {
    const test = await Test.findOne({ owner, testKey }).lean()
    if (!test) throw new TestServiceError(404, 'Test not found.')
    const existing = await TestAttempt.findOne({ owner, test: test._id, status: { $in: ['in_progress', 'interrupted'] } }).sort({ updatedAt: -1 })
    if (existing) { existing.status = 'in_progress'; await existing.save(); return toAttemptDto(existing) }
    const attempt = await TestAttempt.create({ attemptKey: randomUUID(), owner, test: test._id, answers: [], results: [], score: 0, maxScore: test.questions.reduce((sum, q) => sum + q.points, 0), startedAt: new Date() })
    return toAttemptDto(attempt)
  }
  async saveProgress(owner: Owner, attemptKey: string, answers: unknown) {
    if (!Array.isArray(answers)) throw new TestServiceError(400, 'Answers must be an array.')
    const attempt = await TestAttempt.findOne({ owner, attemptKey })
    if (!attempt) throw new TestServiceError(404, 'Attempt not found.')
    if (attempt.status === 'submitted' || attempt.status === 'evaluated') throw new TestServiceError(409, 'Submitted attempts cannot be changed.')
    attempt.answers = answers.map((a) => {
      if (!a || typeof a !== 'object' || typeof (a as any).questionKey !== 'string' || typeof (a as any).answer !== 'string' || (a as any).answer.length > 20000) throw new TestServiceError(400, 'Invalid answer.')
      return { questionKey: (a as any).questionKey, answer: (a as any).answer }
    })
    attempt.status = 'in_progress'; await attempt.save(); return toAttemptDto(attempt)
  }
  async submit(owner: Owner, attemptKey: string, answers: unknown) {
    await this.saveProgress(owner, attemptKey, answers)
    const attempt = await TestAttempt.findOne({ owner, attemptKey })
    if (!attempt) throw new TestServiceError(404, 'Attempt not found.')
    attempt.status = 'submitted'; attempt.submittedAt = new Date(); await attempt.save(); return toAttemptDto(attempt)
  }
  async evaluate(owner: Owner, attemptKey: string) {
    const attempt = await TestAttempt.findOne({ owner, attemptKey })
    if (!attempt) throw new TestServiceError(404, 'Attempt not found.')
    if (attempt.status === 'evaluated') return toAttemptDto(attempt)
    if (attempt.status !== 'submitted') throw new TestServiceError(409, 'Only submitted attempts can be evaluated.')
    const test = await Test.findById(attempt.test).select('+questions.correctAnswer +questions.rubric')
    if (!test) throw new TestServiceError(404, 'Test not found.')
    const answers = new Map(attempt.answers.map((a) => [a.questionKey, a.answer]))
    const results = []
    for (const q of test.questions) {
      const answer = answers.get(q.questionKey) ?? ''
      let score = 0; let feedback = ''
      if (q.type === 'mcq') { score = answer === q.correctAnswer ? q.points : 0; feedback = score ? 'Correct.' : 'Incorrect.' }
      else if (answer.trim()) {
        const evaluation = await aiService.evaluatePracticeAnswer(`Evaluate this descriptive answer against the rubric. Question: ${q.prompt}; Rubric: ${(q.rubric ?? []).join('; ')}; Answer: ${answer}`, q.points)
        score = Math.max(0, Math.min(q.points, evaluation.score)); feedback = evaluation.feedback
      }
      results.push({ questionKey: q.questionKey, score, maxScore: q.points, feedback, correctness: score === q.points ? 'correct' as const : score > 0 ? 'partial' as const : 'incorrect' as const })
    }
    attempt.results = results; attempt.score = results.reduce((s, r) => s + r.score, 0); attempt.evaluatedAt = new Date(); attempt.status = 'evaluated'
    await attempt.save(); return toAttemptDto(attempt)
  }
  async history(owner: Owner) { return (await TestAttempt.find({ owner }).sort({ createdAt: -1 }).lean()).map(toAttemptDto) }
  async weakTopics(owner: Owner) {
    const attempts = await TestAttempt.find({ owner, status: 'evaluated' }).lean()
    const counts = new Map<string, { wrong: number; total: number }>()
    for (const attempt of attempts) {
      const test = await Test.findById(attempt.test).select('questions.topicKey').lean()
      for (const result of attempt.results) {
        const topic = test?.questions.find((q) => q.questionKey === result.questionKey)?.topicKey
        if (!topic) continue
        const current = counts.get(topic) ?? { wrong: 0, total: 0 }
        current.total += 1
        if (result.score < result.maxScore) current.wrong += 1
        counts.set(topic, current)
      }
    }
    return [...counts.entries()].filter(([, value]) => value.wrong > 0)
      .map(([topicKey, value]) => ({ topicKey, attempts: value.total, incorrect: value.wrong, accuracyPercent: Math.round(((value.total - value.wrong) / value.total) * 100) }))
      .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
  }
  async result(owner: Owner, attemptKey: string) {
    const attempt = await TestAttempt.findOne({ owner, attemptKey }).lean()
    if (!attempt) throw new TestServiceError(404, 'Attempt not found.')
    return toAttemptDto(attempt)
  }
}
export const testService = new TestService()
