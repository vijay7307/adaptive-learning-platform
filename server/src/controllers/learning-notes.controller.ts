import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Curriculum, type CurriculumDocument } from '../models/curriculum.model'
import { LearningNote } from '../models/learning-note.model'
import { aiService, AiServiceError } from '../services/ai.service'
import { learningNotesJsonInstruction } from '../services/ai/learning-notes.prompt'
import type { GeneratedLearningNote } from '../services/ai/learning-notes.types'

function badRequest(res: Response, message: string): void {
  res.status(400).json({ success: false, error: { message, statusCode: 400 } })
}

function ownerId(req: Request): mongoose.Types.ObjectId | null {
  return req.user ? new mongoose.Types.ObjectId(String(req.user._id)) : null
}

function topicFromCurriculum(curriculum: CurriculumDocument | null, moduleKey: string, topicKey: string) {
  const module = curriculum?.modules.find((candidate) => String(candidate.order) === moduleKey)
  const topicOrder = Number(topicKey.split(':').at(-1))
  const topic = module?.topics.find((candidate) => candidate.order === topicOrder)
  return module && topic ? { module, topic } : null
}

function mapAiError(error: unknown): { status: number; message: string } {
  if (!(error instanceof AiServiceError)) return { status: 503, message: 'Learning notes generation is temporarily unavailable.' }
  if (error.code === 'AI_INVALID_RESPONSE') return { status: 502, message: 'The AI returned invalid learning notes. Please try again.' }
  if (error.code === 'AI_QUOTA_EXCEEDED') return { status: 429, message: 'Learning notes generation quota is currently exhausted.' }
  if (error.code === 'AI_NOT_CONFIGURED' || error.code === 'AI_INVALID_API_KEY') return { status: 503, message: 'Learning notes generation is not configured.' }
  return { status: 503, message: 'Learning notes generation is temporarily unavailable.' }
}

function createFallbackLearningNote(
  topicTitle: string,
  learningObjectives: string[],
): GeneratedLearningNote {
  const objectives = learningObjectives.length > 0
    ? learningObjectives
    : [`Understand the core concepts of ${topicTitle}`]
  return {
    introduction: `${topicTitle} is the topic covered in this study note. Start by understanding the main idea, then connect it to the objectives and use a concrete example.`,
    learningObjectives: objectives,
    prerequisites: ['Basic knowledge of the selected module', 'Willingness to explain concepts through examples'],
    sections: [{
      title: `Understanding ${topicTitle}`,
      explanation: `Study ${topicTitle} from the basic definition to its practical use. Break the topic into small steps, verify each step, and explain why each step is required.`,
      subtopics: objectives,
      examples: [`Choose a simple real-world or code example that demonstrates ${topicTitle}.`, 'Check the result and explain each step.'],
      codeExamples: [],
    }],
    applications: [
      `Apply ${topicTitle} to a small problem related to the selected learning goal.`,
      'Explain the result and compare it with an alternative approach.',
    ],
    commonMistakes: [
      'Memorizing definitions without understanding how to apply them.',
      'Skipping intermediate steps or failing to verify the result.',
      'Confusing the topic with a similar concept.',
    ],
    keyTakeaways: [
      `Know the definition and purpose of ${topicTitle}.`,
      'Understand the steps and conditions that make the approach valid.',
      'Practice the topic with a small, verifiable example.',
    ],
    revisionSummary: `Review ${topicTitle} by restating each objective, solving one simple example, and explaining the common mistakes to avoid.`,
    knowledgeChecks: [{
      question: `Explain ${topicTitle} in your own words and give one practical example.`,
      answer: `A strong answer defines ${topicTitle}, connects it to the learning objectives, and demonstrates it with a correct practical example.`,
      explanation: 'The example should show why the concept applies and what result follows.',
    }],
  }
}

async function createVersion(
  owner: mongoose.Types.ObjectId,
  curriculum: mongoose.Types.ObjectId,
  moduleKey: string,
  topicKey: string,
  topicTitle: string,
  content: Awaited<ReturnType<typeof aiService.generateLearningNotes>>,
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const latest = await LearningNote.findOne({ owner, curriculum, moduleKey, topicKey }).sort({ version: -1 }).select('version')
    try {
      return await LearningNote.create({
        owner,
        curriculum,
        moduleKey,
        topicKey,
        topicTitle,
        version: (latest?.version || 0) + 1,
        content,
      })
    } catch (error: unknown) {
      if (!(error instanceof mongoose.mongo.MongoServerError && error.code === 11000)) throw error
    }
  }
  throw new Error('Unable to allocate a unique learning note version.')
}

export async function listLearningNotes(req: Request, res: Response): Promise<void> {
  const owner = ownerId(req)
  if (!owner) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const filter: Record<string, unknown> = { owner }
  if (typeof req.query.curriculum === 'string' && mongoose.Types.ObjectId.isValid(req.query.curriculum)) filter.curriculum = req.query.curriculum
  if (typeof req.query.moduleKey === 'string') filter.moduleKey = req.query.moduleKey
  if (typeof req.query.topicKey === 'string') filter.topicKey = req.query.topicKey
  const notes = await LearningNote.find(filter).sort({ curriculum: 1, moduleKey: 1, topicKey: 1, version: -1 })
  res.status(200).json({ success: true, data: { notes } })
}

export async function getLearningNote(req: Request, res: Response): Promise<void> {
  const owner = ownerId(req)
  if (!owner) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const noteId = req.params.id as string
  if (!mongoose.Types.ObjectId.isValid(noteId)) { res.status(400).json({ success: false, error: { message: 'Invalid note ID.', statusCode: 400 } }); return }
  const note = await LearningNote.findOne({ _id: noteId, owner })
  if (!note) { res.status(404).json({ success: false, error: { message: 'Learning note not found.', statusCode: 404 } }); return }
  res.status(200).json({ success: true, data: { note } })
}

export async function generateLearningNote(req: Request, res: Response): Promise<void> {
  const owner = ownerId(req)
  if (!owner) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const curriculumId = typeof req.body?.curriculumId === 'string' ? req.body.curriculumId : ''
  const moduleKey = typeof req.body?.moduleKey === 'string' ? req.body.moduleKey : ''
  const topicKey = typeof req.body?.topicKey === 'string' ? req.body.topicKey : ''
  const regenerate = req.body?.regenerate === true
  if (!mongoose.Types.ObjectId.isValid(curriculumId) || !moduleKey || !topicKey) {
    badRequest(res, 'A valid curriculumId, moduleKey, and topicKey are required.')
    return
  }
  const curriculum = await Curriculum.findOne({ _id: curriculumId, owner, status: { $in: ['draft', 'active'] } })
  const selected = topicFromCurriculum(curriculum, moduleKey, topicKey)
  if (!curriculum || !selected) {
    res.status(404).json({ success: false, error: { message: 'Curriculum topic not found.', statusCode: 404 } })
    return
  }
  const latest = await LearningNote.findOne({ owner, curriculum: curriculum._id, moduleKey, topicKey }).sort({ version: -1 })
  if (latest && !regenerate) {
    res.status(200).json({ success: true, data: { note: latest, reused: true } })
    return
  }
  try {
    const { module, topic } = selected
    const prompt = [
      learningNotesJsonInstruction,
      `Planner goal: ${curriculum.goal}`,
      `Subject: ${curriculum.subject}`,
      `Learner level: ${curriculum.currentSkillLevel}`,
      `Selected module: ${module.title}`,
      `Selected topic: ${topic.title}`,
      `Learning objectives: ${topic.learningObjectives.join('; ')}`,
      `Prerequisite topics: ${curriculum.modules.filter((candidate) => candidate.order < module.order).flatMap((candidate) => candidate.topics.map((item) => item.title)).slice(-8).join('; ') || 'none'}`,
      `Completed topic keys: ${curriculum.completedTopicKeys.join(', ') || 'none'}`,
      `Assessment history: ${JSON.stringify(curriculum.assessmentHistory.slice(-5))}`,
      'Do not mark progress complete. Explain the selected topic only and preserve all objectives.',
    ].join('\n')
    let content: GeneratedLearningNote
    try {
      content = await aiService.generateLearningNotes(prompt)
    } catch (error: unknown) {
      if (!(error instanceof AiServiceError)) throw error
      content = createFallbackLearningNote(topic.title, topic.learningObjectives)
    }
    const note = await createVersion(owner, curriculum._id, moduleKey, topicKey, topic.title, content)
    res.status(201).json({ success: true, data: { note, reused: false } })
  } catch (error: unknown) {
    const mapped = mapAiError(error)
    console.error('[LearningNotes] Generation failed', { owner: owner.toString(), curriculum: curriculum.id, moduleKey, topicKey, code: error instanceof AiServiceError ? error.code : 'UNKNOWN' })
    res.status(mapped.status).json({ success: false, error: { message: mapped.message, statusCode: mapped.status } })
  }
}

export async function deleteLearningNote(req: Request, res: Response): Promise<void> {
  const owner = ownerId(req)
  if (!owner) { res.status(401).json({ success: false, error: { message: 'Unauthorized.', statusCode: 401 } }); return }
  const noteId = req.params.id as string
  if (!mongoose.Types.ObjectId.isValid(noteId)) { res.status(400).json({ success: false, error: { message: 'Invalid note ID.', statusCode: 400 } }); return }
  const deleted = await LearningNote.findOneAndDelete({ _id: noteId, owner })
  if (!deleted) { res.status(404).json({ success: false, error: { message: 'Learning note not found.', statusCode: 404 } }); return }
  res.status(200).json({ success: true, data: { note: deleted } })
}
