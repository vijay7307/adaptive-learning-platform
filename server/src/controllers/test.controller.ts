import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { testService } from '../services/test.service'
function owner(req: Request) { return req.user?._id ? new mongoose.Types.ObjectId(String(req.user._id)) : null }
function fail(res: Response, error: unknown) { const e = error as any; res.status(e?.statusCode ?? 500).json({ success: false, error: { message: e?.statusCode ? e.message : 'Test request failed.', statusCode: e?.statusCode ?? 500 } }) }
export const testController = {
  generate: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.status(201).json({ success: true, data: { test: await testService.generate(id, req.body) } }) } catch (e) { fail(res, e) } },
  list: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { tests: await testService.list(id, typeof req.query.curriculumId === 'string' ? req.query.curriculumId : undefined) } }) } catch (e) { fail(res, e) } },
  get: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { test: await testService.get(id, String(req.params.testKey)) } }) } catch (e) { fail(res, e) } },
  start: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.status(201).json({ success: true, data: { attempt: await testService.start(id, String(req.params.testKey)) } }) } catch (e) { fail(res, e) } },
  progress: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { attempt: await testService.saveProgress(id, String(req.params.attemptKey), req.body?.answers) } }) } catch (e) { fail(res, e) } },
  submit: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { attempt: await testService.submit(id, String(req.params.attemptKey), req.body?.answers) } }) } catch (e) { fail(res, e) } },
  evaluate: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { attempt: await testService.evaluate(id, String(req.params.attemptKey)) } }) } catch (e) { fail(res, e) } },
  history: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { attempts: await testService.history(id) } }) } catch (e) { fail(res, e) } },
  weakTopics: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { weakTopics: await testService.weakTopics(id) } }) } catch (e) { fail(res, e) } },
  result: async (req: Request, res: Response) => { const id = owner(req); if (!id) { res.sendStatus(401); return } try { res.json({ success: true, data: { result: await testService.result(id, String(req.params.attemptKey)) } }) } catch (e) { fail(res, e) } },
}
