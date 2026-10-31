import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import {
  generateCurriculum,
  listOrGetCurriculums,
  updateCurriculumProgress,
  updateCurriculumStatus,
  updateDailyStudyBudget,
} from '../controllers/curriculum.controller'

export const curriculumRouter = Router()

curriculumRouter.post('/generate', authenticate, generateCurriculum)
curriculumRouter.get('/', authenticate, listOrGetCurriculums)
curriculumRouter.patch('/daily-budget', authenticate, updateDailyStudyBudget)
curriculumRouter.patch('/:id/status', authenticate, updateCurriculumStatus)
curriculumRouter.patch('/:id/progress', authenticate, updateCurriculumProgress)
