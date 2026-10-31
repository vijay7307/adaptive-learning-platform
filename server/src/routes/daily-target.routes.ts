import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import {
  generateExtraWork,
  getExtraWorkStatus,
  listDailyTargets,
  updateExtraWorkItem,
  updateDailyTargetItem,
} from '../controllers/daily-target.controller'

export const dailyTargetRouter = Router()

dailyTargetRouter.get('/', authenticate, listDailyTargets)
dailyTargetRouter.get('/extra/status', authenticate, getExtraWorkStatus)
dailyTargetRouter.post('/extra', authenticate, generateExtraWork)
dailyTargetRouter.patch('/extra/:id/items/:itemKey', authenticate, updateExtraWorkItem)
dailyTargetRouter.patch('/:id/items/:itemKey', authenticate, updateDailyTargetItem)
