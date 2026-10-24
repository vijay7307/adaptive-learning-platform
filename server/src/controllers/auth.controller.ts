import { Request, Response, NextFunction } from 'express'
import { User } from '../models/user.model'
import { signAccessToken } from '../utils/jwt'
import { config } from '../config/env'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password } = req.body

    // 1. Validate required fields presence
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Name is required and must be a valid string.',
          statusCode: 400,
        },
      })
      return
    }

    const trimmedName = name.trim()
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Name must be between 2 and 60 characters.',
          statusCode: 400,
        },
      })
      return
    }

    // 2. Validate email
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Email is required.',
          statusCode: 400,
        },
      })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a valid email address.',
          statusCode: 400,
        },
      })
      return
    }

    // 3. Validate password
    if (!password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Password is required.',
          statusCode: 400,
        },
      })
      return
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 8 characters in length.',
          statusCode: 400,
        },
      })
      return
    }

    if (password.length > 128) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Password cannot exceed 128 characters.',
          statusCode: 400,
        },
      })
      return
    }

    // 4. Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email address already exists.',
          statusCode: 409,
        },
      })
      return
    }

    // 5. Hash password and persist user
    const passwordHash = await User.hashPassword(password)
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
    })

    // 6. Generate access token
    const token = signAccessToken(user._id.toString())

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
        tokenType: 'Bearer',
        expiresIn: config.jwtExpiresIn,
      },
    })
  } catch (error: unknown) {
    // Handle MongoDB duplicate key error race condition gracefully
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    ) {
      res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email address already exists.',
          statusCode: 409,
        },
      })
      return
    }
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body

    // 1. Validate input presence
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          message: 'Both email and password are required.',
          statusCode: 400,
        },
      })
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    // 2. Query user with explicitly selected passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash')

    // 3. Constant-time comparison & generic auth error to prevent email enumeration
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          statusCode: 401,
        },
      })
      return
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          statusCode: 401,
        },
      })
      return
    }

    // 4. Generate access token
    const token = signAccessToken(user._id.toString())

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
        tokenType: 'Bearer',
        expiresIn: config.jwtExpiresIn,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = req.user

  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Unauthorized.',
        statusCode: 401,
      },
    })
    return
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  })
}
