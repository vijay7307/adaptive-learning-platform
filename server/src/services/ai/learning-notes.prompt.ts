export const learningNotesJsonInstruction = [
  'Return exactly one JSON object and no markdown or explanatory prose outside JSON.',
  'Required fields: introduction:string, learningObjectives:string[], prerequisites:string[], sections:array,',
  'applications:string[], commonMistakes:string[], keyTakeaways:string[], revisionSummary:string, knowledgeChecks:array.',
  'Each section requires title, explanation, subtopics:string[], examples:string[], codeExamples:array.',
  'Each codeExample requires language, code, explanation, and optional expectedOutput.',
  'Each knowledgeCheck requires question, answer, and explanation. Answers must be correct and directly answer the question.',
  'Use beginner-friendly explanations, follow the supplied objectives, and avoid unrelated advanced topics.',
  'Include runnable code only when relevant; otherwise return an empty codeExamples array for a section.',
].join(' ')
