// ─── Types ───────────────────────────────────────────────────────────────────

export interface LearningPath {
  id: string
  title: string
  subject: string
  totalWeeks: number
  completedWeeks: number
  progressPercent: number
  nextMilestone: string
  targetDate: string
  color: string
}

export interface DailyTarget {
  id: string
  title: string
  type: 'reading' | 'practice' | 'revision' | 'test'
  estimatedMinutes: number
  completed: boolean
  topic: string
}

export interface AssessmentScore {
  subject: string
  score: number
  total: number
  date: string
  change: number // positive = improved
}

export interface WeakTopic {
  id: string
  topic: string
  subject: string
  masteryPercent: number
  recommendedAction: string
}

export interface UpcomingTest {
  id: string
  title: string
  subject: string
  date: string
  duration: string
  totalMarks: number
  syllabus: string[]
}

export interface WeeklyProgressPoint {
  day: string
  hoursStudied: number
  targetHours: number
  questionsAttempted: number
}

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  totalDaysStudied: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const mockUser = {
  name: 'Arjun Sharma',
  avatar: 'AS',
  goal: 'UPSC Civil Services 2026',
  joinedDate: 'March 2025',
}

export const mockLearningPath: LearningPath = {
  id: 'lp-1',
  title: 'UPSC Civil Services – Complete Preparation',
  subject: 'General Studies + CSAT',
  totalWeeks: 52,
  completedWeeks: 18,
  progressPercent: 35,
  nextMilestone: 'History – Modern India (Week 19)',
  targetDate: 'May 2026',
  color: 'indigo',
}

export const mockDailyTargets: DailyTarget[] = [
  {
    id: 't1',
    title: 'Read: Indian National Movement – Chapter 4',
    type: 'reading',
    estimatedMinutes: 45,
    completed: true,
    topic: 'Modern History',
  },
  {
    id: 't2',
    title: 'Solve 30 MCQs on Polity – Fundamental Rights',
    type: 'practice',
    estimatedMinutes: 30,
    completed: true,
    topic: 'Indian Polity',
  },
  {
    id: 't3',
    title: 'Revise Geography: Climate Zones map',
    type: 'revision',
    estimatedMinutes: 20,
    completed: false,
    topic: 'Physical Geography',
  },
  {
    id: 't4',
    title: 'Write answer: Economic Reforms of 1991',
    type: 'practice',
    estimatedMinutes: 40,
    completed: false,
    topic: 'Indian Economy',
  },
  {
    id: 't5',
    title: 'Read: Current Affairs – October 2025',
    type: 'reading',
    estimatedMinutes: 25,
    completed: false,
    topic: 'Current Affairs',
  },
]

export const mockAssessmentScores: AssessmentScore[] = [
  { subject: 'Indian Polity', score: 74, total: 100, date: '23 Oct', change: +8 },
  { subject: 'Modern History', score: 68, total: 100, date: '21 Oct', change: +3 },
  { subject: 'Geography', score: 55, total: 100, date: '19 Oct', change: -2 },
  { subject: 'Indian Economy', score: 61, total: 100, date: '17 Oct', change: +12 },
  { subject: 'Environment', score: 49, total: 100, date: '15 Oct', change: +5 },
]

export const mockWeakTopics: WeakTopic[] = [
  {
    id: 'wt1',
    topic: 'Climate & Monsoon Patterns',
    subject: 'Geography',
    masteryPercent: 32,
    recommendedAction: 'Re-read Chapter 6, attempt 20 MCQs',
  },
  {
    id: 'wt2',
    topic: 'Environmental Acts & Policies',
    subject: 'Environment',
    masteryPercent: 38,
    recommendedAction: 'Review AI notes, solve previous year questions',
  },
  {
    id: 'wt3',
    topic: 'Five-Year Plans & NITI Aayog',
    subject: 'Indian Economy',
    masteryPercent: 42,
    recommendedAction: 'Focus on post-2015 policy changes',
  },
  {
    id: 'wt4',
    topic: 'Ancient Indian Architecture',
    subject: 'Art & Culture',
    masteryPercent: 28,
    recommendedAction: 'Study visual aids and temple styles',
  },
]

export const mockUpcomingTest: UpcomingTest = {
  id: 'test-1',
  title: 'General Studies – Full Mock Test 4',
  subject: 'GS Paper I',
  date: '27 Oct 2025',
  duration: '2 hours',
  totalMarks: 200,
  syllabus: ['Modern History', 'Indian Polity', 'Geography Basics', 'Current Affairs Oct-2025'],
}

export const mockWeeklyProgress: WeeklyProgressPoint[] = [
  { day: 'Mon', hoursStudied: 4.5, targetHours: 5, questionsAttempted: 42 },
  { day: 'Tue', hoursStudied: 5.0, targetHours: 5, questionsAttempted: 55 },
  { day: 'Wed', hoursStudied: 3.5, targetHours: 5, questionsAttempted: 30 },
  { day: 'Thu', hoursStudied: 5.5, targetHours: 5, questionsAttempted: 60 },
  { day: 'Fri', hoursStudied: 4.0, targetHours: 5, questionsAttempted: 48 },
  { day: 'Sat', hoursStudied: 6.0, targetHours: 6, questionsAttempted: 75 },
  { day: 'Sun', hoursStudied: 2.5, targetHours: 3, questionsAttempted: 20 },
]

export const mockStreak: StreakInfo = {
  currentStreak: 14,
  longestStreak: 23,
  totalDaysStudied: 87,
}

export const mockSubjectProgress = [
  { subject: 'History', mastery: 62, color: '#6366f1' },
  { subject: 'Polity', mastery: 74, color: '#0ea5e9' },
  { subject: 'Geography', mastery: 45, color: '#10b981' },
  { subject: 'Economy', mastery: 58, color: '#f59e0b' },
  { subject: 'Environment', mastery: 40, color: '#ef4444' },
  { subject: 'Art & Culture', mastery: 35, color: '#8b5cf6' },
  { subject: 'Science & Tech', mastery: 52, color: '#06b6d4' },
]
