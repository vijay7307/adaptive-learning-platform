import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import {
  createAttempt,
  evaluateAttempt,
  generatePracticeSet,
  getAttempt,
  getAttemptResults,
  getPracticeSet,
  getWeakTopics,
  listAttempts,
  listPracticeSets,
  submitAttempt,
} from '../controllers/practice.controller'

export const practiceRouter = Router()

practiceRouter.use(authenticate)
practiceRouter.get('/weak-topics', getWeakTopics)
practiceRouter.get('/sets', listPracticeSets)
practiceRouter.post('/sets/generate', generatePracticeSet)
practiceRouter.get('/sets/:id', getPracticeSet)
practiceRouter.post('/attempts', createAttempt)
practiceRouter.get('/attempts', listAttempts)
practiceRouter.get('/attempts/:attemptKey/results', getAttemptResults)
practiceRouter.post('/attempts/:attemptKey/evaluate', evaluateAttempt)
practiceRouter.post('/attempts/:attemptKey/submit', submitAttempt)
practiceRouter.get('/attempts/:attemptKey', getAttempt)
