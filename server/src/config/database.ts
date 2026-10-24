import mongoose from 'mongoose'
import { config } from './env'

export interface DatabaseStatus {
  state: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown'
  readyState: number
  isConnected: boolean
  host: string | null
  name: string | null
}

const readyStateMap: Record<number, DatabaseStatus['state']> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
}

// Register connection listeners
mongoose.connection.on('connected', () => {
  console.log(`[Database] MongoDB connection established: ${mongoose.connection.host}/${mongoose.connection.name}`)
})

mongoose.connection.on('error', (err) => {
  console.error('[Database] MongoDB connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection lost')
})

export async function connectDB(): Promise<typeof mongoose> {
  if (!config.mongodbUri) {
    const errorMsg =
      'MongoDB connection failed: MONGODB_URI is not set. Please set MONGODB_URI in your server/.env file.'
    console.error(`[Database] ❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }

  try {
    console.log('[Database] Connecting to MongoDB...')
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout fast if DB is unreachable
    })
    return conn
  } catch (error) {
    console.error('[Database] ❌ Fatal error while connecting to MongoDB:', error)
    throw error
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
    console.log('[Database] MongoDB connection closed.')
  }
}

export function getDbStatus(): DatabaseStatus {
  const readyState = mongoose.connection.readyState
  const state = readyStateMap[readyState] || 'unknown'
  const isConnected = readyState === 1

  return {
    state,
    readyState,
    isConnected,
    host: isConnected ? mongoose.connection.host : null,
    name: isConnected ? mongoose.connection.name : null,
  }
}
