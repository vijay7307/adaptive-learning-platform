const DEFAULT_TIMEZONE = 'Asia/Kolkata'

export function isValidTimezone(timezone: unknown): timezone is string {
  if (typeof timezone !== 'string' || !timezone.trim()) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export function getUserTimezone(timezone: unknown): string {
  return isValidTimezone(timezone) ? timezone : DEFAULT_TIMEZONE
}

export function getLocalDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getUserTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function getLocalHour(date: Date, timezone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: getUserTimezone(timezone),
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).find((part) => part.type === 'hour')?.value
  return Number(hour || 0)
}

export function isAfterLocalFiveAm(date: Date, timezone: string): boolean {
  return getLocalHour(date, timezone) >= 5
}

export function localDateKeyToStorageDate(localDateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDateKey)
  if (!match) return new Date('invalid')
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

export function getPreviousLocalDateKey(localDateKey: string): string {
  const date = localDateKeyToStorageDate(localDateKey)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export { DEFAULT_TIMEZONE }
