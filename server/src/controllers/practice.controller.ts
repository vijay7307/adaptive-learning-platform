import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { AiServiceError } from '../services/ai/contracts'
import {
  PracticeServiceError,
  practiceService,
  type CreateAttemptInput,
  type GeneratePracticeSetInput,
  type SubmitAttemptInput,
} from '../services/practice.service'

type PracticeControllerService = Pick<
  typeof practiceService,
  'generatePracticeSet' | 'listPracticeSets' | 'getPracticeSet' |
  'createAttempt' | 'listAttempts' | 'getAttempt' | 'submitAttempt' | 'evaluateAttempt' |
  'getAttemptResults' | 'getWeakTopics'
>

function ownerId(req: Request): mongoose.Types.ObjectId | null {
  if (!req.user?._id) return null
  const value = String(req.user._id)
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof PracticeServiceError) {
    res.status(error.statusCode).json({ success: false, error: { message: error.message, statusCode: error.statusCode } })
    return
  }
  if (error instanceof AiServiceError) {
    const status = error.code === 'AI_INVALID_RESPONSE' ? 502
      : error.code === 'AI_QUOTA_EXCEEDED' ? 429
        : error.code === 'AI_NOT_CONFIGURED' || error.code === 'AI_INVALID_API_KEY' ? 503 : 503
    res.status(status).json({ success: false, error: { message: 'Practice generation or evaluation is temporarily unavailable.', statusCode: status } })
    return
  }
  console.error('[Practice] Request failed', error)
  res.status(500).json({ success: false, error: { message: 'Practice request failed.', statusCode: 500 } })
}

function unauthorized(res: Response): boolean {
  if (res.headersSent) return true
  res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } })
  return true
}

function bodyString(body: unknown, key: string): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

function paramString(req: Request, key: string): string {
  const value = req.params[key]
  return typeof value === 'string' ? value : ''
}

function parseGenerateInput(body: unknown): GeneratePracticeSetInput | null {
  if (!body || typeof body !== 'object') return null
  const value = body as Record<string, unknown>
  if (typeof value.curriculumId !== 'string' || typeof value.moduleKey !== 'string' ||
    typeof value.topicKey !== 'string' || typeof value.difficulty !== 'string' ||
    !Number.isInteger(value.questionCount)) return null
  return {
    curriculumId: value.curriculumId,
    moduleKey: value.moduleKey,
    topicKey: value.topicKey,
    difficulty: value.difficulty as GeneratePracticeSetInput['difficulty'],
    questionCount: value.questionCount as number,
    ...(typeof value.learningNoteId === 'string' ? { learningNoteId: value.learningNoteId } : {}),
    ...(typeof value.learningNoteVersion === 'number' ? { learningNoteVersion: value.learningNoteVersion } : {}),
    ...(Array.isArray(value.questionTypes) ? { questionTypes: value.questionTypes as GeneratePracticeSetInput['questionTypes'] } : {}),
  }
}

function parseSubmitInput(body: unknown): SubmitAttemptInput | null {
  if (!body || typeof body !== 'object' || !Array.isArray((body as Record<string, unknown>).answers)) return null
  return { answers: (body as Record<string, unknown>).answers as SubmitAttemptInput['answers'] }
}

export function createPracticeController(service: PracticeControllerService = practiceService) {
  const withOwner = (req: Request, res: Response): mongoose.Types.ObjectId | null => ownerId(req) || (unauthorized(res), null)

  return {
    generatePracticeSet: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      const input = parseGenerateInput(req.body)
      if (!input) { res.status(400).json({ success: false, error: { message: 'Invalid practice set parameters.', statusCode: 400 } }); return }
      try {
        const practiceSet = await service.generatePracticeSet(owner, input)
        res.status(201).json({ success: true, data: { practiceSet } })
      } catch (error) { sendError(res, error) }
    },

    listPracticeSets: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      const curriculumId = typeof req.query.curriculumId === 'string'
        ? req.query.curriculumId
        : typeof req.query.curriculum === 'string' ? req.query.curriculum : undefined
      try {
        const practiceSets = await service.listPracticeSets(owner, curriculumId)
        res.status(200).json({ success: true, data: { practiceSets } })
      } catch (error) { sendError(res, error) }
    },

    getPracticeSet: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      try {
        const practiceSet = await service.getPracticeSet(owner, paramString(req, 'id'))
        res.status(200).json({ success: true, data: { practiceSet } })
      } catch (error) { sendError(res, error) }
    },

    createAttempt: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      const practiceSetId = bodyString(req.body, 'practiceSetId') || bodyString(req.body, 'practiceSet')
      if (!practiceSetId) { res.status(400).json({ success: false, error: { message: 'A practiceSetId is required.', statusCode: 400 } }); return }
      try {
        const attempt = await service.createAttempt(owner, { practiceSetId } satisfies CreateAttemptInput)
        res.status(201).json({ success: true, data: { attempt } })
      } catch (error) { sendError(res, error) }
    },

    listAttempts: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      const curriculumId = typeof req.query.curriculumId === 'string'
        ? req.query.curriculumId
        : typeof req.query.curriculum === 'string' ? req.query.curriculum : undefined
      try {
        const attempts = await service.listAttempts(owner, curriculumId)
        res.status(200).json({ success: true, data: { attempts } })
      } catch (error) { sendError(res, error) }
    },

    getAttempt: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      try {
        const attempt = await service.getAttempt(owner, paramString(req, 'attemptKey'))
        res.status(200).json({ success: true, data: { attempt } })
      } catch (error) { sendError(res, error) }
    },

    submitAttempt: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      const input = parseSubmitInput(req.body)
      if (!input) { res.status(400).json({ success: false, error: { message: 'Answers are required.', statusCode: 400 } }); return }
      try {
        const attempt = await service.submitAttempt(owner, paramString(req, 'attemptKey'), input)
        res.status(200).json({ success: true, data: { attempt } })
      } catch (error) { sendError(res, error) }
    },

    evaluateAttempt: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      try {
        const attempt = await service.evaluateAttempt(owner, paramString(req, 'attemptKey'))
        res.status(200).json({ success: true, data: { attempt } })
      } catch (error) { sendError(res, error) }
    },

    getAttemptResults: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      try {
        const results = await service.getAttemptResults(owner, paramString(req, 'attemptKey'))
        res.status(200).json({ success: true, data: { attempt: results, results: results.questionResults } })
      } catch (error) { sendError(res, error) }
    },

    getWeakTopics: async (req: Request, res: Response): Promise<void> => {
      const owner = withOwner(req, res)
      if (!owner) return
      const curriculumId = typeof req.query.curriculumId === 'string'
        ? req.query.curriculumId
        : typeof req.query.curriculum === 'string' ? req.query.curriculum : undefined
      try {
        const weakTopics = await service.getWeakTopics(owner, curriculumId)
        res.status(200).json({ success: true, data: { weakTopics } })
      } catch (error) { sendError(res, error) }
    },
  }
}

const controller = createPracticeController()
export const {
  generatePracticeSet,
  listPracticeSets,
  getPracticeSet,
  createAttempt,
  listAttempts,
  getAttempt,
  submitAttempt,
  evaluateAttempt,
  getAttemptResults,
  getWeakTopics,
} = controller
