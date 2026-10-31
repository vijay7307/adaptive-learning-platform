import { AiServiceError } from './contracts'
import type { GeneratedLearningNote } from './learning-notes.types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isText)
}

export function validateGeneratedLearningNotes(value: unknown): GeneratedLearningNote {
  if (!isRecord(value) ||
    !isText(value.introduction) ||
    !isTextArray(value.learningObjectives) ||
    !isTextArray(value.prerequisites) ||
    !Array.isArray(value.sections) ||
    value.sections.length === 0 ||
    !isTextArray(value.applications) ||
    !isTextArray(value.commonMistakes) ||
    !isTextArray(value.keyTakeaways) ||
    !isText(value.revisionSummary) ||
    !Array.isArray(value.knowledgeChecks) ||
    value.knowledgeChecks.length === 0
  ) {
    throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned invalid learning notes.')
  }

  const sections = value.sections.map((section) => {
    if (!isRecord(section) || !isText(section.title) || !isText(section.explanation) ||
      !isTextArray(section.subtopics) || !isTextArray(section.examples) ||
      !Array.isArray(section.codeExamples)
    ) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned invalid learning note sections.')
    }
    const codeExamples = section.codeExamples.map((example) => {
      if (!isRecord(example) || !isText(example.language) || !isText(example.code) ||
        !isText(example.explanation) ||
        (example.expectedOutput !== undefined && !isText(example.expectedOutput))
      ) {
        throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned invalid learning note code examples.')
      }
      return {
        language: example.language,
        code: example.code,
        explanation: example.explanation,
        ...(example.expectedOutput ? { expectedOutput: example.expectedOutput } : {}),
      }
    })
    return {
      title: section.title,
      explanation: section.explanation,
      subtopics: section.subtopics,
      examples: section.examples,
      codeExamples,
    }
  })

  const knowledgeChecks = value.knowledgeChecks.map((check) => {
    if (!isRecord(check) || !isText(check.question) || !isText(check.answer) || !isText(check.explanation)) {
      throw new AiServiceError('AI_INVALID_RESPONSE', 'AI returned invalid knowledge checks.')
    }
    return { question: check.question, answer: check.answer, explanation: check.explanation }
  })

  return {
    introduction: value.introduction,
    learningObjectives: value.learningObjectives,
    prerequisites: value.prerequisites,
    sections,
    applications: value.applications,
    commonMistakes: value.commonMistakes,
    keyTakeaways: value.keyTakeaways,
    revisionSummary: value.revisionSummary,
    knowledgeChecks,
  }
}
