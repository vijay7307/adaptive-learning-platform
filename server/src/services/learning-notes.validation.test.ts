import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AiServiceError } from './ai/contracts'
import { validateGeneratedLearningNotes } from './ai/learning-notes.validation'

const valid = {
  introduction: 'A focused explanation.',
  learningObjectives: ['Explain the concept.'],
  prerequisites: ['Variables'],
  sections: [{
    title: 'Core idea',
    explanation: 'A clear explanation.',
    subtopics: ['Syntax'],
    examples: ['A practical example.'],
    codeExamples: [{ language: 'typescript', code: 'const value = 1', explanation: 'Declares a value.', expectedOutput: '1' }],
  }],
  applications: ['Use it in an application.'],
  commonMistakes: ['Forgetting the type.'],
  keyTakeaways: ['Use explicit types when useful.'],
  revisionSummary: 'Review the core idea.',
  knowledgeChecks: [{ question: 'What is it?', answer: 'A concept.', explanation: 'This is the direct answer.' }],
}

test('validates structured learning notes and knowledge-check answers', () => {
  assert.deepEqual(validateGeneratedLearningNotes(valid), valid)
})

test('rejects malformed learning notes', () => {
  assert.throws(
    () => validateGeneratedLearningNotes({ ...valid, knowledgeChecks: [{ question: 'Incomplete' }] }),
    (error: unknown) => error instanceof AiServiceError && error.code === 'AI_INVALID_RESPONSE',
  )
})
