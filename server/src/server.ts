import { createApp } from './app'
import { config, validateAuthConfig } from './config/env'
import { connectDB, disconnectDB } from './config/database'
import { Server } from 'http'
import { createServer as createNetServer } from 'node:net'
import { startDailyTargetScheduler, stopDailyTargetScheduler } from './services/daily-target.scheduler'

let server: Server | null = null

async function assertPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = createNetServer()
    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`PORT_IN_USE:${port}`))
        return
      }
      reject(error)
    })
    probe.listen(port, () => {
      probe.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  })
}

async function startServer(): Promise<void> {
  console.log('='.repeat(50))
  console.log('🚀 Starting Adaptive Learning API Server')
  console.log(`🌍 Environment: ${config.nodeEnv}`)
  console.log(`🔌 Port: ${config.port}`)
  console.log(`🌐 Allowed Client Origin: ${config.clientUrl}`)
  console.log('='.repeat(50))

  // Validate critical auth configuration before starting
  try {
    validateAuthConfig()
  } catch (error) {
    console.error('❌ Server startup failed: Invalid authentication configuration.')
    console.error('👉 Please configure JWT_SECRET in server/.env.')
    process.exit(1)
  }

  try {
    await assertPortAvailable(config.port)
  } catch (error) {
    if (error instanceof Error && error.message === `PORT_IN_USE:${config.port}`) {
      console.error(`❌ Port ${config.port} is already in use.`)
      console.error(`Stop the existing server on port ${config.port}, then restart with "npm run dev".`)
      process.exit(1)
    }
    console.error('[Server] Unable to check whether the HTTP port is available:', error)
    process.exit(1)
  }

  // Connect to database before accepting requests
  try {
    await connectDB()
  } catch (error) {
    console.error('❌ Server startup failed: Unable to connect to MongoDB.')
    console.error('👉 Please check your MONGODB_URI in server/.env and verify MongoDB is running.')
    process.exit(1)
  }

  const app = createApp()

  server = app.listen(config.port)
  server.once('listening', () => {
    console.log(`✅ Server successfully listening on port ${config.port}`)
    console.log(`🩺 Health check available at: http://localhost:${config.port}/api/health`)
    startDailyTargetScheduler()
  })
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${config.port} is already in use.`)
      console.error(`Stop the existing server on port ${config.port}, then restart with "npm run dev".`)
      stopDailyTargetScheduler()
      void disconnectDB().finally(() => process.exit(1))
      return
    }
    console.error('[Server] HTTP server error:', error)
    void disconnectDB().finally(() => process.exit(1))
  })
}

// Graceful shutdown handler
async function handleShutdown(signal: string, exitCode = 0): Promise<void> {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`)

  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => {
        console.log('[Server] HTTP server closed.')
        resolve()
      })
    })
  }
  stopDailyTargetScheduler()

  try {
    await disconnectDB()
  } catch (err) {
    console.error('[Server] Error while disconnecting database:', err)
  }

  console.log('[Server] Graceful shutdown completed.')
  process.exit(exitCode)
}

process.on('SIGINT', () => void handleShutdown('SIGINT', 0))
process.on('SIGTERM', () => void handleShutdown('SIGTERM', 0))

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Server] ❌ Unhandled Promise Rejection:', reason)
  void handleShutdown('unhandledRejection', 1)
})

process.on('uncaughtException', (error: Error) => {
  console.error('[Server] ❌ Uncaught Exception:', error)
  void handleShutdown('uncaughtException', 1)
})

void startServer()
