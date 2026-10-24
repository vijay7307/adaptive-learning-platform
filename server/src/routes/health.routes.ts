import { Router, Request, Response } from 'express'
import { getDbStatus } from '../config/database'
import { config } from '../config/env'

export const healthRouter = Router()

healthRouter.get('/health', (_req: Request, res: Response) => {
  const dbStatus = getDbStatus()
  const isHealthy = dbStatus.isConnected

  const responsePayload = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    services: {
      server: {
        status: 'online',
      },
      database: {
        status: dbStatus.state,
        connected: dbStatus.isConnected,
        name: dbStatus.name,
      },
    },
  }

  // 200 if healthy, 503 if database connection is down
  res.status(isHealthy ? 200 : 503).json(responsePayload)
})
