import { Router } from 'express'
import { register, login, getMe } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'

export const authRouter = Router()

// Public authentication routes
authRouter.post('/register', register)
authRouter.post('/login', login)

// Protected authentication routes
authRouter.get('/me', authenticate, getMe)
