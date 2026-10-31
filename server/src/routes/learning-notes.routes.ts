import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { deleteLearningNote, generateLearningNote, getLearningNote, listLearningNotes } from '../controllers/learning-notes.controller'

export const learningNotesRouter = Router()
learningNotesRouter.get('/', authenticate, listLearningNotes)
learningNotesRouter.post('/generate', authenticate, generateLearningNote)
learningNotesRouter.get('/:id', authenticate, getLearningNote)
learningNotesRouter.delete('/:id', authenticate, deleteLearningNote)
