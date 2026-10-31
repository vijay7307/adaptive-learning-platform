import { recoverAndProcessJobs } from './daily-target-generation.service'

const POLL_INTERVAL_MS = 60_000
let timer: ReturnType<typeof setInterval> | undefined
let running = false

export async function runDailyTargetScheduler(): Promise<void> {
  if (running) return
  running = true
  try {
    await recoverAndProcessJobs(new Date(), 10)
  } finally {
    running = false
  }
}

export function startDailyTargetScheduler(): void {
  if (timer) return
  void runDailyTargetScheduler()
  timer = setInterval(() => {
    void runDailyTargetScheduler()
  }, POLL_INTERVAL_MS)
}

export function stopDailyTargetScheduler(): void {
  if (!timer) return
  clearInterval(timer)
  timer = undefined
}
