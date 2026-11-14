import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, PenLine, RefreshCw } from 'lucide-react'
import { ApiError } from '../services/api'
import { practiceService } from '../services/practice.service'
import type { PracticeAttempt, PracticeSet } from '../types/workspace'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'

const message = (error: unknown) => error instanceof ApiError || error instanceof Error ? error.message : 'Unable to load practice.'

export function PracticePage() {
  const [sets, setSets] = useState<PracticeSet[]>([])
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [selected, setSelected] = useState<PracticeSet | null>(null)
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [setResponse, attemptResponse] = await Promise.all([practiceService.listSets(), practiceService.listAttempts()])
      setSets(setResponse.data?.practiceSets || [])
      setAttempts(attemptResponse.data?.attempts || [])
    } catch (e) { setError(message(e)) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function start(set: PracticeSet) {
    setSaving(true); setError(null)
    try { const response = await practiceService.start(set._id || set.setKey); setSelected(set); setAttempt(response.data.attempt); setAnswers({}) }
    catch (e) { setError(message(e)) } finally { setSaving(false) }
  }
  async function submit() {
    if (!attempt) return
    setSaving(true); setError(null)
    try { const response = await practiceService.submit(attempt.attemptKey, Object.entries(answers).map(([questionKey, answer]) => ({ questionKey, answer }))); setAttempt(response.data.attempt); void load() }
    catch (e) { setError(message(e)) } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} />Loading practice sets…</div>
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Practice</h1><p className="mt-1 text-sm text-slate-500">Work through your generated question sets and review evaluated attempts.</p></div>
      {error && <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span><button onClick={() => void load()}><RefreshCw size={16} /></button></div>}
      {attempt && selected ? (
        <Card><CardHeader title={selected.topicTitle} subtitle={`${selected.questions.length} questions · ${selected.difficulty}`} action={<button className="text-sm text-indigo-600" onClick={() => { setAttempt(null); setSelected(null) }}>Back</button>} /><CardBody className="space-y-5">
          {selected.questions.map((question, index) => <div key={question.questionKey} className="space-y-2"><p className="text-sm font-semibold text-slate-700">{index + 1}. {question.prompt} <span className="text-xs font-normal text-slate-400">({question.points} pts)</span></p>{question.type === 'mcq' && question.options?.map(option => <label key={option.key} className="flex gap-2 text-sm text-slate-600"><input type="radio" name={question.questionKey} value={option.key} checked={answers[question.questionKey] === option.key} onChange={e => setAnswers({ ...answers, [question.questionKey]: e.target.value })} />{option.text}</label>)}{question.type !== 'mcq' && <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm" rows={3} value={answers[question.questionKey] || ''} onChange={e => setAnswers({ ...answers, [question.questionKey]: e.target.value })} placeholder="Write your answer…" />}</div>)}
          <button disabled={saving} onClick={() => void submit()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Submitting…' : 'Submit attempt'}</button>
          {attempt.status === 'evaluated' && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="mr-2 inline" size={16} />Score: {attempt.scorePercent ?? 0}%</div>}
        </CardBody></Card>
      ) : <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader title="Available sets" /><CardBody className="space-y-3">{sets.length ? sets.map(set => <div key={set.setKey} className="flex items-center justify-between rounded-lg border border-slate-100 p-3"><div><p className="text-sm font-semibold text-slate-700">{set.topicTitle}</p><p className="mt-1 text-xs text-slate-500">{set.questions.length} questions <Badge variant="info">{set.difficulty}</Badge></p></div><button disabled={saving} onClick={() => void start(set)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white">Start</button></div>) : <EmptyState icon={PenLine} title="No practice sets yet" description="Generate a curriculum or learning note to unlock practice." />}</CardBody></Card><Card><CardHeader title="Attempt history" /><CardBody className="space-y-3">{attempts.length ? attempts.map(item => <div key={item.attemptKey} className="flex justify-between border-b border-slate-100 pb-3 text-sm"><span>{new Date(item.startedAt).toLocaleDateString()} · {item.status}</span><span className="font-semibold">{item.scorePercent == null ? '—' : `${item.scorePercent}%`}</span></div>) : <EmptyState icon={CheckCircle2} title="No attempts yet" description="Your submitted practice will appear here." />}</CardBody></Card></div>}
    </div>
  )
}
