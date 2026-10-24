import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config/env'
import { apiRouter } from './routes'
import { notFoundHandler } from './middleware/notFoundHandler'
import { errorHandler } from './middleware/errorHandler'

export function createApp(): Express {
  const app = express()

  // Security headers
  app.use(helmet())

  // CORS configured for the frontend client origin
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // API routes
  app.use('/api', apiRouter)

  // 404 handler for undefined routes
  app.use(notFoundHandler)

  // Global error handler
  app.use(errorHandler)

  return app
}
