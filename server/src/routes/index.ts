import { Router } from 'express'
import { healthRouter } from './health.routes'
import { authRouter } from './auth.routes'
import { curriculumRouter } from './curriculum.routes'
import { dailyTargetRouter } from './daily-target.routes'
import { learningNotesRouter } from './learning-notes.routes'
import { settingsRouter } from './settings.routes'
import { dailyFeedbackRouter } from './daily-feedback.routes'
import { sharedLearningContextRouter } from './shared-learning-context.routes'
import { practiceRouter } from './practice.routes'
import { testRouter } from './test.routes'

export const apiRouter = Router()

// Health check endpoint: GET /api/health
apiRouter.use(healthRouter)

// Authentication endpoints: /api/auth/*
apiRouter.use('/auth', authRouter)
apiRouter.use('/curriculums', curriculumRouter)
apiRouter.use('/daily-targets', dailyTargetRouter)
apiRouter.use('/learning-notes', learningNotesRouter)
apiRouter.use('/settings', settingsRouter)
apiRouter.use('/daily-feedback', dailyFeedbackRouter)
apiRouter.use('/shared-learning-context', sharedLearningContextRouter)
apiRouter.use('/practice', practiceRouter)
apiRouter.use('/tests', testRouter)
