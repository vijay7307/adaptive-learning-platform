import {
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Flame,
  Clock,
  CalendarDays,
  AlertTriangle,
  ArrowRight,
  Trophy,
  BookOpen,
  Target,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardBody } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { useAuth } from '../context/AuthContext'
import {
  mockUser,
  mockLearningPath,
  mockDailyTargets,
  mockAssessmentScores,
  mockWeakTopics,
  mockUpcomingTest,
  mockWeeklyProgress,
  mockStreak,
  mockSubjectProgress,
} from '../data/mockData'

// ─── Helpers ─────────────────────────────────────────────────────────────────


function getTargetTypeBadgeVariant(type: string) {
  switch (type) {
    case 'reading':
      return 'info' as const
    case 'practice':
      return 'indigo' as const
    case 'revision':
      return 'warning' as const
    case 'test':
      return 'danger' as const
    default:
      return 'default' as const
  }
}

function getMasteryColor(pct: number) {
  if (pct >= 70) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function WelcomeBanner() {
  const { user } = useAuth()
  const now = new Date()
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const completedToday = mockDailyTargets.filter((t) => t.completed).length
  const totalToday = mockDailyTargets.length
  const displayName = user?.name || mockUser.name

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-md">
      <div className="relative z-10">
        <p className="text-sm font-medium text-indigo-200">{greeting}, 👋</p>
        <h2 className="mt-1 text-2xl font-bold">{displayName}</h2>
        <p className="mt-1 text-sm text-indigo-200">Goal: {mockUser.goal}</p>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-amber-300" />
            <span className="text-sm">
              <span className="font-bold">{mockStreak.currentStreak}</span>-day streak
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-emerald-300" />
            <span className="text-sm">
              <span className="font-bold">{completedToday}/{totalToday}</span> tasks done today
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-yellow-300" />
            <span className="text-sm">
              <span className="font-bold">{mockStreak.totalDaysStudied}</span> days studied
            </span>
          </div>
        </div>
      </div>
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-10 -right-4 h-32 w-32 rounded-full bg-white/5" />
    </div>
  )
}

function CurrentLearningPath() {
  const lp = mockLearningPath
  const weeksLeft = lp.totalWeeks - lp.completedWeeks

  return (
    <Card>
      <CardHeader
        title="Current Learning Path"
        subtitle="Your AI-generated curriculum"
        action={
          <Link
            to="/planner"
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            View plan <ArrowRight size={12} />
          </Link>
        }
      />
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">{lp.title}</p>
            <p className="text-xs text-slate-500">{lp.subject}</p>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar value={lp.progressPercent} color="indigo" showLabel label="Overall Progress" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-lg font-bold text-indigo-600">{lp.completedWeeks}</p>
            <p className="text-xs text-slate-500">Weeks done</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-lg font-bold text-slate-700">{weeksLeft}</p>
            <p className="text-xs text-slate-500">Weeks left</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-lg font-bold text-emerald-600">{lp.targetDate}</p>
            <p className="text-xs text-slate-500">Target</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5">
          <CalendarDays size={15} className="text-indigo-500" />
          <p className="text-xs text-indigo-700">
            <span className="font-semibold">Next:</span> {lp.nextMilestone}
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

function TodaysTargets() {
  const completed = mockDailyTargets.filter((t) => t.completed).length
  const total = mockDailyTargets.length
  const pct = Math.round((completed / total) * 100)

  return (
    <Card>
      <CardHeader
        title="Today's Targets"
        subtitle={`${completed} of ${total} completed (${pct}%)`}
        action={
          <Link
            to="/targets"
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            All targets <ArrowRight size={12} />
          </Link>
        }
      />
      <CardBody className="space-y-3">
        {mockDailyTargets.map((target) => (
          <div
            key={target.id}
            className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
              target.completed
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {target.completed ? (
                <CheckCircle2 size={18} className="text-emerald-500" />
              ) : (
                <Circle size={18} className="text-slate-300" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p
                className={`text-sm font-medium ${
                  target.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}
              >
                {target.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={getTargetTypeBadgeVariant(target.type)}>
                  {target.type}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={11} />
                  {target.estimatedMinutes} min
                </span>
                <span className="text-xs text-slate-400">{target.topic}</span>
              </div>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

function RecentScores() {
  return (
    <Card>
      <CardHeader
        title="Recent Assessment Scores"
        subtitle="Last 5 topic tests"
        action={
          <Link
            to="/analytics"
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            Analytics <ArrowRight size={12} />
          </Link>
        }
      />
      <CardBody className="space-y-3">
        {mockAssessmentScores.map((score) => (
          <div key={score.subject} className="flex items-center gap-3">
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-slate-700">{score.subject}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">
                    {score.score}
                    <span className="text-xs font-normal text-slate-400">/{score.total}</span>
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold ${
                      score.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {score.change >= 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {Math.abs(score.change)}
                  </span>
                </div>
              </div>
              <ProgressBar
                value={score.score}
                max={score.total}
                color={score.score >= 70 ? 'green' : score.score >= 50 ? 'amber' : 'red'}
                size="sm"
              />
              <p className="mt-0.5 text-xs text-slate-400">{score.date}</p>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

function WeakTopics() {
  return (
    <Card>
      <CardHeader
        title="Weak Topics"
        subtitle="Focus areas needing improvement"
        action={
          <Badge variant="warning">
            {mockWeakTopics.length} topics
          </Badge>
        }
      />
      <CardBody className="space-y-4">
        {mockWeakTopics.map((topic) => (
          <div key={topic.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">{topic.topic}</p>
                <p className="text-xs text-slate-500">{topic.subject}</p>
              </div>
              <Badge
                variant={
                  topic.masteryPercent >= 50
                    ? 'warning'
                    : 'danger'
                }
              >
                {topic.masteryPercent}% mastery
              </Badge>
            </div>
            <ProgressBar
              value={topic.masteryPercent}
              color={getMasteryColor(topic.masteryPercent) as 'green' | 'amber' | 'red'}
              size="sm"
            />
            <div className="mt-1.5 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs text-slate-500">{topic.recommendedAction}</p>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

function UpcomingTest() {
  const test = mockUpcomingTest
  return (
    <Card>
      <CardHeader title="Upcoming Test" subtitle="Next scheduled assessment" />
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Trophy size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{test.title}</p>
            <p className="text-xs text-slate-500">{test.subject}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 p-2.5 text-center">
            <CalendarDays size={14} className="mx-auto text-slate-400" />
            <p className="mt-1 text-xs font-semibold text-slate-700">{test.date}</p>
            <p className="text-xs text-slate-400">Date</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 text-center">
            <Clock size={14} className="mx-auto text-slate-400" />
            <p className="mt-1 text-xs font-semibold text-slate-700">{test.duration}</p>
            <p className="text-xs text-slate-400">Duration</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5 text-center">
            <Trophy size={14} className="mx-auto text-slate-400" />
            <p className="mt-1 text-xs font-semibold text-slate-700">{test.totalMarks}</p>
            <p className="text-xs text-slate-400">Marks</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Syllabus
          </p>
          <div className="flex flex-wrap gap-1.5">
            {test.syllabus.map((s) => (
              <Badge key={s} variant="default">
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <Link
          to="/tests"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Start Preparation <ArrowRight size={14} />
        </Link>
      </CardBody>
    </Card>
  )
}

function WeeklyChart() {
  return (
    <Card>
      <CardHeader title="This Week's Study Hours" subtitle="Daily study time vs target" />
      <CardBody>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mockWeeklyProgress} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="targetHours" fill="#e0e7ff" radius={[4, 4, 0, 0]} name="Target" />
            <Bar dataKey="hoursStudied" fill="#6366f1" radius={[4, 4, 0, 0]} name="Studied" />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}

function SubjectMastery() {
  return (
    <Card>
      <CardHeader title="Subject Mastery Overview" subtitle="Across all subjects" />
      <CardBody className="space-y-3">
        {mockSubjectProgress.map((s) => (
          <div key={s.subject}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-600">{s.subject}</span>
              <span className="font-semibold text-slate-800">{s.mastery}%</span>
            </div>
            <ProgressBar
              value={s.mastery}
              color={s.mastery >= 70 ? 'green' : s.mastery >= 50 ? 'amber' : 'red'}
              size="sm"
            />
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const completedTargets = mockDailyTargets.filter((t) => t.completed).length

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome + top stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <WelcomeBanner />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <StatCard
            label="Study Streak"
            value={`${mockStreak.currentStreak} days`}
            subtext={`Best: ${mockStreak.longestStreak} days`}
            icon={Flame}
            iconColor="text-orange-600"
            iconBg="bg-orange-50"
            trend={{ value: 12, label: 'vs last month' }}
          />
          <StatCard
            label="Targets Done"
            value={`${completedTargets}/${mockDailyTargets.length}`}
            subtext="Today's progress"
            icon={Target}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
        </div>
      </div>

      {/* Learning path + weekly chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CurrentLearningPath />
        <WeeklyChart />
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <TodaysTargets />
          <RecentScores />
        </div>
        <div className="space-y-4">
          <UpcomingTest />
          <WeakTopics />
        </div>
      </div>

      {/* Subject mastery */}
      <SubjectMastery />
    </div>
  )
}
