import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { changePassword, getSettings, patchSettings } from '../controllers/settings.controller'

export const settingsRouter = Router()
settingsRouter.use(authenticate)
settingsRouter.get('/', getSettings)
settingsRouter.patch('/', patchSettings)
settingsRouter.post('/password', changePassword)
