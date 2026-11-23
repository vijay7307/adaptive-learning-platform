import { Type, type Schema } from '@google/genai'

export const practiceSetResponseSchema: Schema = {
  type: Type.OBJECT,
  required: ['difficulty', 'questions'],
  properties: {
    difficulty: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['questionKey', 'type', 'prompt', 'learningObjectives', 'difficulty', 'points', 'evaluationRubric', 'evaluationCriteria'],
        properties: {
          questionKey: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['mcq', 'short-answer', 'coding', 'practical'] },
          prompt: { type: Type.STRING },
          learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          difficulty: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] },
          points: { type: Type.INTEGER },
          options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, text: { type: Type.STRING } } } },
          correctAnswer: { type: Type.STRING },
          evaluationRubric: { type: Type.ARRAY, items: { type: Type.STRING } },
          referenceSolution: { type: Type.STRING },
          evaluationCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  },
}

export const practiceEvaluationResponseSchema: Schema = {
  type: Type.OBJECT,
  required: ['questionKey', 'score', 'maxScore', 'correctness', 'feedback', 'mistakes', 'suggestedRevisionTopics'],
  properties: {
    questionKey: { type: Type.STRING },
    score: { type: Type.NUMBER },
    maxScore: { type: Type.NUMBER },
    correctness: { type: Type.STRING, enum: ['incorrect', 'partially_correct', 'mostly_correct', 'correct'] },
    feedback: { type: Type.STRING },
    mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedRevisionTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctedSolution: { type: Type.STRING },
  },
}
