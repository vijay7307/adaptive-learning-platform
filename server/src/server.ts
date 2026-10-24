import { createApp } from './app'
import { config, validateAuthConfig } from './config/env'
import { connectDB, disconnectDB } from './config/database'
import { Server } from 'http'

let server: Server | null = null

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

  // Connect to database before accepting requests
  try {
    await connectDB()
  } catch (error) {
    console.error('❌ Server startup failed: Unable to connect to MongoDB.')
    console.error('👉 Please check your MONGODB_URI in server/.env and verify MongoDB is running.')
    process.exit(1)
  }

  const app = createApp()

  server = app.listen(config.port, () => {
    console.log(`✅ Server successfully listening on port ${config.port}`)
    console.log(`🩺 Health check available at: http://localhost:${config.port}/api/health`)
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
