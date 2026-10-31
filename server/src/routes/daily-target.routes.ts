import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { listDailyTargets, updateDailyTargetItem } from '../controllers/daily-target.controller'

export const dailyTargetRouter = Router()

dailyTargetRouter.get('/', authenticate, listDailyTargets)
dailyTargetRouter.patch('/:id/items/:itemKey', authenticate, updateDailyTargetItem)
