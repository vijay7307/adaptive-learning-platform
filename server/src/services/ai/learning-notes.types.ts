export interface GeneratedLearningNote {
  introduction: string
  learningObjectives: string[]
  prerequisites: string[]
  sections: Array<{
    title: string
    explanation: string
    subtopics: string[]
    examples: string[]
    codeExamples: Array<{
      language: string
      code: string
      explanation: string
      expectedOutput?: string
    }>
  }>
  applications: string[]
  commonMistakes: string[]
  keyTakeaways: string[]
  revisionSummary: string
  knowledgeChecks: Array<{
    question: string
    answer: string
    explanation: string
  }>
}
