import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { getSharedLearningContext } from '../services/shared-learning-context.service'

export async function getContext(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const curriculumId = req.params.curriculumId as string
  if (!mongoose.Types.ObjectId.isValid(curriculumId)) { res.status(400).json({ success: false, error: { message: 'Invalid curriculum ID.', statusCode: 400 } }); return }
  const context = await getSharedLearningContext(new mongoose.Types.ObjectId(String(req.user._id)), new mongoose.Types.ObjectId(curriculumId))
  if (!context) { res.status(404).json({ success: false, error: { message: 'Curriculum not found.', statusCode: 404 } }); return }
  res.json({ success: true, data: { context } })
}
