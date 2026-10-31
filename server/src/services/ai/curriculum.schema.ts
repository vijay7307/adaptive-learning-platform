import { Type, type Schema } from '@google/genai'

export const curriculumResponseSchema: Schema = {
  type: Type.OBJECT,
  required: [
    'goal', 'subject', 'currentSkillLevel', 'availableStudyTimeMinutesPerDay',
    'targetDurationDays', 'deadline', 'practiceActivities', 'revisionSessions',
    'assessmentRecommendations', 'modules', 'milestones',
  ],
  properties: {
    goal: { type: Type.STRING },
    subject: { type: Type.STRING },
    currentSkillLevel: { type: Type.STRING, enum: ['beginner', 'intermediate', 'advanced'] },
    availableStudyTimeMinutesPerDay: { type: Type.INTEGER },
    targetDurationDays: { type: Type.INTEGER },
    deadline: { type: Type.STRING },
    practiceActivities: { type: Type.ARRAY, items: { type: Type.STRING } },
    revisionSessions: { type: Type.ARRAY, items: { type: Type.STRING } },
    assessmentRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['title', 'order', 'topics', 'milestone', 'completionCriteria'],
        properties: {
          title: { type: Type.STRING },
          order: { type: Type.INTEGER },
          milestone: { type: Type.STRING },
          completionCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
          topics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ['title', 'order', 'learningObjectives', 'estimatedDurationMinutes', 'completionCriteria'],
              properties: {
                title: { type: Type.STRING },
                order: { type: Type.INTEGER },
                learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                estimatedDurationMinutes: { type: Type.INTEGER },
                completionCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
        },
      },
    },
    milestones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['title', 'description', 'targetDate', 'completionCriteria'],
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          targetDate: { type: Type.STRING },
          completionCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  },
}
