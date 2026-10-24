import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { verifyAccessToken } from '../utils/jwt'
import { User, UserDocument } from '../models/user.model'

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. Authorization header must be in Bearer <token> format.',
        statusCode: 401,
      },
    })
    return
  }

  const token = authHeader.substring(7).trim()

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication token is missing.',
        statusCode: 401,
      },
    })
    return
  }

  try {
    const payload = verifyAccessToken(token)
    const user = await User.findById(payload.sub)

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User account not found or has been deleted.',
          statusCode: 401,
        },
      })
      return
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Access token has expired. Please log in again.',
          statusCode: 401,
        },
      })
      return
    }

    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or malformed access token.',
        statusCode: 401,
      },
    })
  }
}
