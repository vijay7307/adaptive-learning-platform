import mongoose from 'mongoose'
import { User } from '../models/user.model'

export interface SettingsPatch {
  name?: string
  timezone?: string
  dailyStudyTimeBudgetMinutes?: number
  learningPreferences?: {
    preferredSessionMinutes?: number
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  }
  notifications?: { email?: boolean; dailyReminders?: boolean }
  theme?: 'light' | 'dark' | 'system'
}

export function validateSettingsPatch(input: unknown): { value?: SettingsPatch; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Settings must be an object.' }
  const body = input as Record<string, unknown>
  const allowed = ['name', 'timezone', 'dailyStudyTimeBudgetMinutes', 'learningPreferences', 'notifications', 'theme']
  if (Object.keys(body).some((key) => !allowed.includes(key))) return { error: 'Unsupported settings field.' }
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 60)) return { error: 'Name must be between 2 and 60 characters.' }
  if (body.timezone !== undefined) {
    if (typeof body.timezone !== 'string') return { error: 'Timezone must be a valid IANA timezone.' }
    try { new Intl.DateTimeFormat('en-US', { timeZone: body.timezone }).format() } catch { return { error: 'Timezone must be a valid IANA timezone.' } }
  }
  if (body.dailyStudyTimeBudgetMinutes !== undefined && (!Number.isInteger(body.dailyStudyTimeBudgetMinutes) || Number(body.dailyStudyTimeBudgetMinutes) < 15 || Number(body.dailyStudyTimeBudgetMinutes) > 1440)) return { error: 'Daily study budget must be between 15 and 1440 minutes.' }
  if (body.theme !== undefined && !['light', 'dark', 'system'].includes(String(body.theme))) return { error: 'Theme must be light, dark, or system.' }
  for (const [key, values] of [['learningPreferences', body.learningPreferences], ['notifications', body.notifications]] as const) {
    if (values !== undefined && (!values || typeof values !== 'object' || Array.isArray(values))) return { error: `${key} must be an object.` }
  }
  const preferences = body.learningPreferences as Record<string, unknown> | undefined
  if (preferences) {
    if (preferences.preferredSessionMinutes !== undefined && (!Number.isInteger(preferences.preferredSessionMinutes) || Number(preferences.preferredSessionMinutes) < 5 || Number(preferences.preferredSessionMinutes) > 240)) return { error: 'Preferred session must be between 5 and 240 minutes.' }
    if (preferences.difficulty !== undefined && !['beginner', 'intermediate', 'advanced'].includes(String(preferences.difficulty))) return { error: 'Invalid learning difficulty.' }
  }
  const notifications = body.notifications as Record<string, unknown> | undefined
  if (notifications && Object.values(notifications).some((value) => typeof value !== 'boolean')) return { error: 'Notification preferences must be boolean.' }
  return { value: body as SettingsPatch }
}

export async function updateSettings(owner: mongoose.Types.ObjectId, patch: SettingsPatch) {
  const updates: Record<string, unknown> = {}
  if (patch.name !== undefined) updates.name = patch.name.trim()
  for (const key of ['timezone', 'dailyStudyTimeBudgetMinutes', 'theme'] as const) if (patch[key] !== undefined) updates[key] = patch[key]
  if (patch.learningPreferences) for (const [key, value] of Object.entries(patch.learningPreferences)) updates[`learningPreferences.${key}`] = value
  if (patch.notifications) for (const [key, value] of Object.entries(patch.notifications)) updates[`notifications.${key}`] = value
  return User.findOneAndUpdate({ _id: owner }, { $set: updates }, { new: true, runValidators: true }).select('-passwordHash')
}
