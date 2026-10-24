import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken'
import { config, validateAuthConfig } from '../config/env'

export interface TokenPayload extends JwtPayload {
  sub: string
}

export function signAccessToken(userId: string): string {
  validateAuthConfig()

  const signOptions: SignOptions = {
    subject: userId,
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  }

  return jwt.sign({}, config.jwtSecret, signOptions)
}

export function verifyAccessToken(token: string): TokenPayload {
  validateAuthConfig()

  const decoded = jwt.verify(token, config.jwtSecret)
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Invalid token payload')
  }

  return decoded as TokenPayload
}
