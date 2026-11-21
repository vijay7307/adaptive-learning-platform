import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ApiError } from '../services/api'
import { curriculumService } from '../services/curriculum.service'
import { dailyTargetService } from '../services/daily-target.service'
import { practiceService } from '../services/practice.service'
import { testsService } from '../services/tests.service'
import type { Curriculum } from '../types/curriculum'
import type { PracticeAttempt, TestAttempt } from '../types/workspace'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'

interface ActivityPoint {
  date: string
  label: string
  completedTargets: number
  practiceAttempts: number
  tests: number
}

const errorText = (error: unknown) =>
  error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Unable to load your progress analytics.'

function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function allTopics(curriculum: Curriculum) {
  return curriculum.modules.flatMap((module) =>
    module.topics.map((topic) => ({
      key: `${module.order}:${topic.order}`,
      title: topic.title,
      module: module.title,
      duration: topic.estimatedDurationMinutes,
    })),
  )
}

export function AnalyticsPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([])
  const [targetResponse, setTargetResponse] = useState<Awaited<ReturnType<typeof dailyTargetService.list>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [plans, targets, practice, tests] = await Promise.all([
        curriculumService.list(),
        dailyTargetService.list(),
        practiceService.listAttempts(),
        testsService.attempts(),
      ])
      setCurricula(plans.data.curricula)
      setTargetResponse(targets)
      setAttempts(practice.data.attempts || [])
      setTestAttempts(tests.data.attempts || [])
    } catch (requestError: unknown) {
      setError(errorText(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const activeCurricula = useMemo(
    () => curricula.filter((curriculum) => curriculum.status !== 'archived'),
    [curricula],
  )
  const topicSummary = useMemo(
    () => activeCurricula.flatMap(allTopics),
    [activeCurricula],
  )
  const completedTopicCount = activeCurricula.reduce(
    (sum, curriculum) => sum + curriculum.completedTopicKeys.length,
    0,
  )
  const evaluatedPractice = attempts.filter(
    (attempt) => attempt.status === 'evaluated' && typeof attempt.scorePercent === 'number',
  )
  const evaluatedTests = testAttempts.filter((attempt) => typeof attempt.scorePercent === 'number')
  const practiceAccuracy = evaluatedPractice.length
    ? Math.round(evaluatedPractice.reduce((sum, attempt) => sum + (attempt.scorePercent || 0), 0) / evaluatedPractice.length)
    : 0
  const testAverage = evaluatedTests.length
    ? Math.round(evaluatedTests.reduce((sum, attempt) => sum + (attempt.scorePercent || 0), 0) / evaluatedTests.length)
    : 0
  const progress = activeCurricula.length
    ? Math.round(activeCurricula.reduce((sum, curriculum) => sum + curriculum.progressPercent, 0) / activeCurricula.length)
    : 0
  const completedTargets = targetResponse?.data.targets
    .flatMap((target) => target.items)
    .filter((item) => item.status === 'completed').length || 0
  const targetMinutes = targetResponse?.data.targets
    .flatMap((target) => target.items)
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + item.estimatedDurationMinutes, 0) || 0

  const activity = useMemo<ActivityPoint[]>(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - index))
      const key = dayKey(date)
      const completedForDay = activeCurricula.reduce(
        (sum, curriculum) => sum + curriculum.targetHistory
          .filter((entry) => dayKey(new Date(entry.date)) === key)
          .reduce((count, entry) => count + entry.completedTopicKeys.length, 0),
        0,
      )
      return {
        date: key,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        completedTargets: completedForDay,
        practiceAttempts: attempts.filter((attempt) => dayKey(new Date(attempt.startedAt)) === key).length,
        tests: testAttempts.filter((attempt) => dayKey(new Date(attempt.startedAt)) === key).length,
      }
    })
  }, [activeCurricula, attempts, testAttempts])

  const recentScores = [...evaluatedPractice, ...evaluatedTests]
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
    .slice(0, 5)

  if (loading) {
    return <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} />Loading your analytics…</div>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-md sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white/10 p-3"><BarChart3 size={26} /></div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Progress Analytics</h1>
            <p className="mt-2 text-sm text-indigo-100">Understand your learning momentum, mastery, and assessment performance.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span><AlertCircle className="mr-2 inline" size={16} />{error}</span>
          <button type="button" aria-label="Retry loading analytics" onClick={() => void load()}><RefreshCw size={16} /></button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall progress" value={`${progress}%`} subtext={`${completedTopicCount} of ${topicSummary.length} topics complete`} icon={TrendingUp} />
        <StatCard label="Practice accuracy" value={`${practiceAccuracy}%`} subtext={`${evaluatedPractice.length} evaluated attempts`} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard label="Test average" value={evaluatedTests.length ? `${testAverage}%` : '—'} subtext={`${evaluatedTests.length} completed tests`} icon={Target} iconColor="text-sky-600" iconBg="bg-sky-50" />
        <StatCard label="Today’s study budget" value={formatMinutes(targetMinutes)} subtext={`${completedTargets} target${completedTargets === 1 ? '' : 's'} completed`} icon={Clock3} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>

      <Card>
        <CardHeader title="Learning activity" subtitle="Completed targets and assessments over the last seven days" />
        <CardBody>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={activity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="completedTargets" name="Completed targets" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="practiceAttempts" name="Practice attempts" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tests" name="Tests" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Curriculum mastery" subtitle="Progress across your learning plans" />
          <CardBody className="space-y-4">
            {activeCurricula.length ? activeCurricula.map((curriculum) => (
              <div key={curriculum._id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700"><BookOpen size={16} className="shrink-0 text-indigo-500" />{curriculum.subject}</span>
                  <span className="font-semibold text-slate-800">{curriculum.progressPercent}%</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{curriculum.goal}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${curriculum.progressPercent}%` }} /></div>
              </div>
            )) : <p className="text-sm text-slate-500">Create a learning plan to start tracking mastery.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent assessment scores" subtitle="Your latest evaluated practice and tests" />
          <CardBody>
            {recentScores.length ? (
              <div className="space-y-3">
                {recentScores.map((attempt) => (
                  <div key={attempt.attemptKey} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                    <div><p className="text-sm font-medium text-slate-700">{'testKey' in attempt ? 'Test assessment' : 'Practice attempt'}</p><p className="mt-1 text-xs text-slate-500">{new Date(attempt.startedAt).toLocaleDateString()}</p></div>
                    <span className="text-lg font-bold text-indigo-600">{attempt.scorePercent}%</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">Complete a practice attempt or test to see scores here.</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
