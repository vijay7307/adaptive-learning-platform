import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, Target } from 'lucide-react'
import { ApiError } from '../services/api'
import { curriculumService } from '../services/curriculum.service'
import { dailyTargetService } from '../services/daily-target.service'
import type { Curriculum, DailyTarget, DailyTargetItem, DailyTargetResponse } from '../types/curriculum'
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

interface TaskCardProps {
  item: DailyTargetItem
  accent?: boolean
  onStatusChange: (status: 'pending' | 'completed' | 'missed') => void
}

function TaskCard({ item, accent = false, onStatusChange }: TaskCardProps) {
  const borderClass = accent
    ? 'border-indigo-100 bg-indigo-50/40'
    : 'border-slate-100'
  return (
    <div className={`rounded-lg border p-3 ${borderClass}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label={item.status === 'completed' ? `Undo completion for ${item.title}` : `Complete ${item.title}`}
          onClick={() => onStatusChange(item.status === 'completed' ? 'pending' : 'completed')}
          className="mt-0.5 text-indigo-600"
        >
          <CheckCircle2 size={18} className={item.status === 'completed' ? 'fill-indigo-600 text-indigo-600' : 'text-slate-300'} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.title}</p>
          {item.description && <p className="mt-1 text-xs text-slate-500">{item.description}</p>}
          {item.learningObjectives?.length ? <p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Objectives:</span> {item.learningObjectives.join(' ')}</p> : null}
          {item.subtopics?.length ? <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Subtopics:</span> {item.subtopics.join(', ')}</p> : null}
          {item.activities?.length ? <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Exercises:</span> {item.activities.join(' ')}</p> : null}
          {item.deliverable && <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Deliverable:</span> {item.deliverable}</p>}
          {item.completionCriteria?.length ? <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Complete when:</span> {item.completionCriteria.join(' ')}</p> : null}
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12} />{formatMinutes(item.estimatedDurationMinutes)}</p>
        </div>
        {item.status === 'pending' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => onStatusChange('missed')} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Missed</button>
            <button type="button" onClick={() => onStatusChange('completed')} className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700">Complete</button>
          </div>
        )}
        {item.status === 'completed' && (
          <button type="button" onClick={() => onStatusChange('pending')} className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50">Undo completion</button>
        )}
        {item.status === 'missed' && (
          <button type="button" onClick={() => onStatusChange('pending')} className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50">Mark pending</button>
        )}
      </div>
    </div>
  )
}

export function TargetsPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [targetResponse, setTargetResponse] = useState<DailyTargetResponse | null>(null)
  const [extraStatus, setExtraStatus] = useState<Awaited<ReturnType<typeof dailyTargetService.extraStatus>> | null>(null)
  const [selectedPlanner, setSelectedPlanner] = useState('')
  const [extraLoading, setExtraLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadTargets() {
    setLoading(true)
    setError(null)
    try {
      const [plans, targets, extra] = await Promise.all([
        curriculumService.list(),
        dailyTargetService.list(),
        dailyTargetService.extraStatus(),
      ])
      setCurricula(plans.data.curricula)
      setTargetResponse(targets)
      setExtraStatus(extra)
      const activeCurricula = plans.data.curricula.filter(
        (curriculum) => curriculum.status === 'draft' || curriculum.status === 'active',
      )
      setSelectedPlanner((current) =>
        activeCurricula.some((curriculum) => curriculum._id === current)
          ? current
          : activeCurricula[0]?._id || '',
      )
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
  const extraWork = targetResponse?.data.extraWork
  const activeCurricula = curricula.filter(
    (curriculum) => curriculum.status === 'draft' || curriculum.status === 'active',
  )
  const extraTotal = extraWork?.items.length || 0
  const extraCompleted = extraWork?.items.filter((item) => item.status === 'completed').length || 0
  const extraMinutes = extraWork?.items.reduce((sum, item) => sum + item.estimatedDurationMinutes, 0) || 0

  async function updateItem(target: DailyTarget, topicKey: string, status: 'pending' | 'completed' | 'missed') {
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
      const latestExtraStatus = await dailyTargetService.extraStatus()
      setExtraStatus(latestExtraStatus)
    } catch (requestError: unknown) {
      setError(errorMessage(requestError))
    }

  }

  async function generateExtraWork() {
    if (!selectedPlanner) return
    setExtraLoading(true)
    setError(null)
    try {
      const response = await dailyTargetService.generateExtra(selectedPlanner)
      setTargetResponse((current) => current && {
        ...current,
        data: { ...current.data, extraWork: response.data.generation },
      })
      setExtraStatus((current) => current && {
        ...current,
        data: { ...current.data, available: false, generation: response.data.generation },
      })
    } catch (requestError: unknown) {
      setError(errorMessage(requestError))
    } finally {
      setExtraLoading(false)
    }

  }

  async function updateExtraItem(itemKey: string, status: 'pending' | 'completed' | 'missed') {
    if (!extraWork) return
    try {
      const response = await dailyTargetService.updateExtraItem(extraWork._id, itemKey, status)
      setTargetResponse((current) => current && {
        ...current,
        data: { ...current.data, extraWork: response.data.generation },
      })
      setExtraStatus((current) => current && {
        ...current,
        data: { ...current.data, generation: response.data.generation },
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
            <CardHeader
              title="Today at a glance"
              subtitle={`${targetResponse?.data.localDateKey || 'Today'} · ${targetResponse?.data.dailyStudyTimeBudgetMinutes || 0} minutes shared across active planners`}
              action={<Badge variant={targetResponse?.data.generationStatus === 'failed' ? 'danger' : targetResponse?.data.generationStatus === 'completed' ? 'success' : 'info'}>{targetResponse?.data.generationStatus || 'pending'}</Badge>}
            />
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

          <Card>
            <CardHeader title="Want more work today?" subtitle="Extra work is available once every regular target across your active planners is complete." />
            <CardBody className="space-y-4">
              <div className="text-sm text-slate-600">
                Regular targets: <span className="font-semibold text-slate-800">{extraStatus?.data.regularTargetsCompleted ? 'Completed' : 'Not completed'}</span>
                {extraStatus?.data.generation?.status === 'completed' && <span className="ml-3 text-emerald-600">Extra work generated today</span>}
                {extraStatus?.data.generation?.status === 'processing' && <span className="ml-3 text-indigo-600">Extra work is processing</span>}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedPlanner}
                  onChange={(event) => setSelectedPlanner(event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  disabled={extraLoading || !extraStatus?.data.available}
                >
                  {activeCurricula.length === 0 && <option value="">No active planners available</option>}
                  {activeCurricula.map((curriculum) => <option key={curriculum._id} value={curriculum._id}>{curriculum.goal}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => void generateExtraWork()}
                  disabled={extraLoading || !extraStatus?.data.available || !selectedPlanner}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {extraLoading ? 'Generating...' : 'Generate Extra Work'}
                </button>
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
                        <TaskCard
                          key={item.topicKey}
                          item={item}
                          onStatusChange={(status) => void updateItem(target, item.topicKey, status)}
                        />
                      ))}
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          )}
          {extraWork?.status === 'completed' && (
            <Card>
              <CardHeader
                title="Extra work"
                subtitle={`${extraCompleted}/${extraTotal} complete · ${formatMinutes(extraMinutes)}`}
                action={<Badge variant="info">{extraTotal ? `${Math.round((extraCompleted / extraTotal) * 100)}% complete` : 'No tasks'}</Badge>}
              />
              <CardBody className="space-y-3">
                {extraWork.items.map((item) => (
                  <TaskCard
                    key={item.topicKey}
                    item={item}
                    accent
                    onStatusChange={(status) => void updateExtraItem(item.topicKey, status)}
                  />
                ))}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
