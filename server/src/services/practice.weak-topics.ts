import type { LearnerPracticeEvidence, WeakTopicSummary } from './practice.types'

const MAX_EVIDENCE = 20
const WEAK_SCORE_THRESHOLD = 60

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export function recalculateWeakTopicSummary(
  topicKey: string,
  evidence: readonly LearnerPracticeEvidence[],
): WeakTopicSummary {
  const relevant = evidence
    .filter((item) => item.topicKey === topicKey)
    .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.attemptKey === item.attemptKey) === index)
    .slice(0, MAX_EVIDENCE)
  const recentAttemptCount = relevant.length
  const incorrectCount = relevant.reduce((total, item) => total + item.incorrectCount, 0)
  const averageScorePercent = recentAttemptCount === 0
    ? 0
    : round(relevant.reduce((total, item) => total + item.scorePercent, 0) / recentAttemptCount)
  const conceptCounts = new Map<string, number>()
  for (const item of relevant) {
    for (const concept of new Set(item.concepts)) {
      conceptCounts.set(concept, (conceptCounts.get(concept) || 0) + 1)
    }
  }
  const repeatedConcepts = [...conceptCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .map(([concept]) => concept)
  const lowScoreAttempts = relevant.filter((item) => item.scorePercent < WEAK_SCORE_THRESHOLD).length
  const evidenceCount = relevant.length
  const repeatedConceptCount = repeatedConcepts.length
  const isWeak = recentAttemptCount >= 2 && (lowScoreAttempts >= 2 || repeatedConceptCount > 0)
  const rawConfidence = (lowScoreAttempts * 0.25) + (repeatedConceptCount * 0.2) + (incorrectCount * 0.05)
  const latestScorePercent = relevant[0]?.scorePercent || 0
  const improvementAdjustment = latestScorePercent >= 80 ? 0.35 : averageScorePercent >= 70 ? 0.2 : 0
  const confidence = round(Math.max(0, Math.min(1, rawConfidence - improvementAdjustment)))
  return {
    topicKey,
    evidenceCount,
    recentAttemptCount,
    lowScoreAttemptCount: lowScoreAttempts,
    incorrectCount,
    repeatedConceptCount,
    averageScorePercent,
    repeatedConcepts,
    confidence,
    isWeak: isWeak && confidence > 0,
    ...(relevant[0] ? { lastObservedAt: relevant[0].observedAt } : {}),
  }
}
