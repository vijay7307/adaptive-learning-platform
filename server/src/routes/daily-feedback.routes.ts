import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { createDailyFeedback, listDailyFeedback, summarizeDailyFeedback } from '../controllers/daily-feedback.controller'

export const dailyFeedbackRouter = Router()
dailyFeedbackRouter.use(authenticate)
dailyFeedbackRouter.post('/', createDailyFeedback)
dailyFeedbackRouter.get('/', listDailyFeedback)
dailyFeedbackRouter.get('/summary', summarizeDailyFeedback)
