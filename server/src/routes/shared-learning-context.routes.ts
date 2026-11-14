import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { getContext } from '../controllers/shared-learning-context.controller'

export const sharedLearningContextRouter = Router()
sharedLearningContextRouter.get('/:curriculumId', authenticate, getContext)
