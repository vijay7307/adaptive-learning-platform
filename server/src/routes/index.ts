import { Router } from 'express'
import { healthRouter } from './health.routes'
import { authRouter } from './auth.routes'

export const apiRouter = Router()

// Health check endpoint: GET /api/health
apiRouter.use(healthRouter)

// Authentication endpoints: /api/auth/*
apiRouter.use('/auth', authRouter)
