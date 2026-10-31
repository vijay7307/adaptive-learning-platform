import { Router } from 'express'
import { healthRouter } from './health.routes'
import { authRouter } from './auth.routes'
import { curriculumRouter } from './curriculum.routes'
import { dailyTargetRouter } from './daily-target.routes'
import { learningNotesRouter } from './learning-notes.routes'

export const apiRouter = Router()

// Health check endpoint: GET /api/health
apiRouter.use(healthRouter)

// Authentication endpoints: /api/auth/*
apiRouter.use('/auth', authRouter)
apiRouter.use('/curriculums', curriculumRouter)
apiRouter.use('/daily-targets', dailyTargetRouter)
apiRouter.use('/learning-notes', learningNotesRouter)
