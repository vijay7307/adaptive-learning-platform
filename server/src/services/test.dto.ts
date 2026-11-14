import type { ITest, ITestQuestion } from '../models/test.model'
import type { ITestAttempt } from '../models/test-attempt.model'
export function toTestDto(test: ITest) {
  return { testKey: test.testKey, curriculum: String(test.curriculum), moduleKey: test.moduleKey, topicKey: test.topicKey, difficulty: test.difficulty, durationMinutes: test.durationMinutes, questions: test.questions.map(({ correctAnswer, rubric, ...q }: ITestQuestion) => q), createdAt: test.createdAt.toISOString() }
}
export function toAttemptDto(attempt: ITestAttempt) {
  return { attemptKey: attempt.attemptKey, test: String(attempt.test), status: attempt.status, answers: attempt.answers, results: attempt.results, score: attempt.score, maxScore: attempt.maxScore, startedAt: attempt.startedAt.toISOString(), submittedAt: attempt.submittedAt?.toISOString(), evaluatedAt: attempt.evaluatedAt?.toISOString() }
}
