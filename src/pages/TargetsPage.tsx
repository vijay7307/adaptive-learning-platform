import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, Target } from 'lucide-react'
import { ApiError } from '../services/api'
import { curriculumService } from '../services/curriculum.service'
import { dailyTargetService } from '../services/daily-target.service'
import type { Curriculum, DailyTarget, DailyTargetResponse } from '../types/curriculum'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Unable to load daily targets.'
}

export function TargetsPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [targetResponse, setTargetResponse] = useState<DailyTargetResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadTargets() {
    setLoading(true)
    setError(null)
    try {
      const [plans, targets] = await Promise.all([curriculumService.list(), dailyTargetService.list()])
      setCurricula(plans.data.curricula)
      setTargetResponse(targets)
    } catch (requestError: unknown) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTargets()
  }, [])

  const curriculumMap = useMemo(
    () => new Map(curricula.map((curriculum) => [curriculum._id, curriculum])),
    [curricula],
  )
  const targets = targetResponse?.data.targets || []
  const totalItems = targets.reduce((sum, target) => sum + target.items.length, 0)
  const completedItems = targets.reduce(
    (sum, target) => sum + target.items.filter((item) => item.status === 'completed').length,
    0,
  )

  async function updateItem(target: DailyTarget, topicKey: string, status: 'completed' | 'missed') {
    try {
      const response = await dailyTargetService.updateItem(target._id, topicKey, status)
      setTargetResponse((current) => current && {
        ...current,
        data: {
          ...current.data,
          targets: current.data.targets.map((candidate) =>
            candidate._id === target._id ? response.data.target : candidate,
          ),
        },
      })
    } catch (requestError: unknown) {
      setError(errorMessage(requestError))
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-md sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white/10 p-3"><Target size={26} /></div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Daily Targets</h1>
            <p className="mt-2 text-sm text-indigo-100">One shared study budget, organized across every active planner.</p>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />{error}</div>}
      {loading ? (
        <Card><CardBody className="flex min-h-48 items-center justify-center"><LoaderCircle size={24} className="animate-spin text-indigo-500" /></CardBody></Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Today at a glance" subtitle={`${targetResponse?.data.dailyStudyTimeBudgetMinutes || 0} minutes shared across active planners`} />
            <CardBody>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Overall progress</span>
                <span className="font-semibold text-slate-800">{completedItems}/{totalItems} tasks</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${totalItems ? (completedItems / totalItems) * 100 : 0}%` }} />
              </div>
            </CardBody>
          </Card>

          {targets.length === 0 ? (
            <Card><CardBody className="py-12 text-center text-sm text-slate-500">No active planners have targets for today.</CardBody></Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {targets.map((target: DailyTarget) => {
                const curriculum = curriculumMap.get(target.curriculum)
                const done = target.items.filter((item) => item.status === 'completed').length
                return (
                  <Card key={target._id}>
                    <CardHeader
                      title={curriculum?.goal || 'Learning planner'}
                      subtitle={`${curriculum?.subject || 'Subject'} · ${done}/${target.items.length} complete`}
                      action={<Badge variant="info">{formatMinutes(target.allocatedMinutes)}</Badge>}
                    />
                    <CardBody className="space-y-3">
                      {target.items.length === 0 ? (
                        <p className="text-sm text-slate-500">No unfinished topics remain for this planner.</p>
                      ) : target.items.map((item) => (
                        <div key={item.topicKey} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                          <CheckCircle2 size={18} className={item.status === 'completed' ? 'text-emerald-500' : 'text-slate-300'} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.title}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12} />{formatMinutes(item.estimatedDurationMinutes)}</p>
                          </div>
                          {item.status === 'pending' && (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => void updateItem(target, item.topicKey, 'missed')} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Missed</button>
                              <button type="button" onClick={() => void updateItem(target, item.topicKey, 'completed')} className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700">Complete</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
