import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { testController } from '../controllers/test.controller'
export const testRouter = Router()
testRouter.use(authenticate)
testRouter.post('/generate', testController.generate)
testRouter.get('/', testController.list)
testRouter.get('/history', testController.history)
testRouter.get('/weak-topics', testController.weakTopics)
testRouter.get('/attempts/:attemptKey', testController.result)
testRouter.patch('/attempts/:attemptKey', testController.progress)
testRouter.post('/attempts/:attemptKey/submit', testController.submit)
testRouter.post('/attempts/:attemptKey/evaluate', testController.evaluate)
testRouter.get('/:testKey', testController.get)
testRouter.post('/:testKey/attempts', testController.start)
