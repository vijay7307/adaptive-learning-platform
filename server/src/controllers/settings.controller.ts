import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/user.model'
import { updateSettings, validateSettingsPatch } from '../services/settings.service'

function owner(req: Request): mongoose.Types.ObjectId | null {
  return req.user ? new mongoose.Types.ObjectId(String(req.user._id)) : null
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  const id = owner(req)
  if (!id) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const user = await User.findById(id).select('-passwordHash')
  if (!user) { res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } }); return }
  res.json({ success: true, data: { settings: user } })
}

export async function patchSettings(req: Request, res: Response): Promise<void> {
  const id = owner(req)
  if (!id) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const parsed = validateSettingsPatch(req.body)
  if (parsed.error) { res.status(400).json({ success: false, error: { message: parsed.error, statusCode: 400 } }); return }
  const user = await updateSettings(id, parsed.value || {})
  if (!user) { res.status(404).json({ success: false, error: { message: 'User not found.', statusCode: 404 } }); return }
  res.json({ success: true, data: { settings: user } })
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const id = owner(req)
  if (!id) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    res.status(400).json({ success: false, error: { message: 'Current password and a new password of 8 to 128 characters are required.', statusCode: 400 } }); return
  }
  const user = await User.findById(id).select('+passwordHash')
  if (!user || !(await user.comparePassword(currentPassword))) {
    res.status(400).json({ success: false, error: { message: 'Current password is incorrect.', statusCode: 400 } }); return
  }
  user.passwordHash = await User.hashPassword(newPassword)
  await user.save()
  res.json({ success: true, data: { message: 'Password changed successfully.' } })
}
