import type { PracticeAttemptStatus } from './practice.types'

const transitions: Record<PracticeAttemptStatus, readonly PracticeAttemptStatus[]> = {
  in_progress: ['submitted'],
  submitted: ['evaluating'],
  evaluating: ['evaluated', 'failed'],
  evaluated: [],
  failed: ['evaluating'],
}

export function canTransitionAttempt(from: PracticeAttemptStatus, to: PracticeAttemptStatus): boolean {
  return transitions[from].includes(to)
}

export function assertAttemptTransition(from: PracticeAttemptStatus, to: PracticeAttemptStatus): void {
  if (!canTransitionAttempt(from, to)) {
    throw new Error(`Invalid practice attempt transition: ${from} -> ${to}.`)
  }
}

export function assertAttemptMutable(status: PracticeAttemptStatus): void {
  if (status !== 'in_progress') {
    throw new Error('Historical or submitted practice attempts are immutable.')
  }
}
