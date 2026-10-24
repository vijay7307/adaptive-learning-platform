import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Locate .env in server directory regardless of current working directory
const potentialEnvPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '.env'),
]

for (const envPath of potentialEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

export interface Config {
  port: number
  nodeEnv: string
  mongodbUri: string
  clientUrl: string
  jwtSecret: string
  jwtExpiresIn: string
}

export const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI?.trim() || '',
  clientUrl: process.env.CLIENT_URL?.trim() || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET?.trim() || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',
}

export function validateAuthConfig(): void {
  if (!config.jwtSecret) {
    const errorMsg =
      'JWT_SECRET is not configured. Please set a secure JWT_SECRET in server/.env before using authentication services.'
    console.error(`[Config] ❌ ${errorMsg}`)
    throw new Error(errorMsg)
  }
}
