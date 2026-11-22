import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileUp, LoaderCircle, PenLine, RefreshCw } from 'lucide-react'
import { ApiError } from '../services/api'
import { curriculumService } from '../services/curriculum.service'
import { dailyTargetService } from '../services/daily-target.service'
import { practiceService } from '../services/practice.service'
import type { PracticeAttempt, PracticeSet } from '../types/workspace'
import type { DailyTargetResponse } from '../types/curriculum'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'

const message = (error: unknown) => error instanceof ApiError || error instanceof Error ? error.message : 'Unable to load practice.'

export function PracticePage() {
  const [sets, setSets] = useState<PracticeSet[]>([])
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([])
  const [targets, setTargets] = useState<DailyTargetResponse | null>(null)
  const [selected, setSelected] = useState<PracticeSet | null>(null)
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [uploadingQuestionKey, setUploadingQuestionKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dailyGenerationStarted = useRef(false)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [setResponse, attemptResponse, curriculumResponse, targetResponse] = await Promise.all([
        practiceService.listSets(),
        practiceService.listAttempts(),
        curriculumService.list(),
        dailyTargetService.list(),
      ])
      const loadedSets = setResponse.data?.practiceSets || []
      const loadedTargets = targetResponse.data.targets
      const extraItems = targetResponse.data.extraWork?.items || []
      const dailyItems = [
        ...loadedTargets.flatMap((target) => target.items.map((item) => ({ ...item, curriculum: target.curriculum }))),
        ...extraItems.map((item) => ({ ...item, curriculum: targetResponse.data.extraWork?.curriculum || '' })),
      ].filter((item) => item.curriculum)
      const todayKey = targetResponse.data.localDateKey
      const todaySets = loadedSets.filter((set) =>
        set.createdAt ? set.createdAt.slice(0, 10) === todayKey : set.scheduledAt?.slice(0, 10) === todayKey)
      setSets(todaySets)
      setAttempts(attemptResponse.data?.attempts || [])
      setTargets(targetResponse)
      if (!dailyGenerationStarted.current) {
        dailyGenerationStarted.current = true
        const missing = dailyItems.filter((item) =>
          !loadedSets.some((set) =>
            set.curriculum === item.curriculum &&
            set.topicKey === item.topicKey &&
            set.createdAt &&
            set.createdAt.slice(0, 10) === todayKey))
        for (const item of missing) {
          const curriculum = curriculumResponse.data.curricula.find((value) => value._id === item.curriculum)
          if (!curriculum) continue
          const moduleKey = item.topicKey.split(':')[0]
          try {
            const response = await practiceService.generate({
              curriculumId: item.curriculum,
              moduleKey,
              topicKey: item.topicKey,
              difficulty: curriculum.currentSkillLevel,
              questionCount: item.estimatedDurationMinutes >= 60 ? 3 : item.estimatedDurationMinutes >= 30 ? 2 : 1,
            })
            loadedSets.unshift(response.data.practiceSet)
          } catch (generationError) {
            dailyGenerationStarted.current = false
            setError(message(generationError))
          }
        }
        setSets(loadedSets.filter((set) =>
          set.createdAt ? set.createdAt.slice(0, 10) === todayKey : set.scheduledAt?.slice(0, 10) === todayKey))
      }
    } catch (e) { setError(message(e)) } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function generateTodayPractice() {
    if (!targets) return
    const [curriculumResponse, firstTarget] = await Promise.all([
      curriculumService.list(),
      Promise.resolve(targets.data.targets.flatMap((target) =>
        target.items.map((item) => ({ item, curriculum: target.curriculum })))[0]),
    ])
    const extra = targets.data.extraWork?.items[0]
      ? { item: targets.data.extraWork.items[0], curriculum: targets.data.extraWork.curriculum }
      : null
    const selectedTarget = firstTarget || extra
    if (!selectedTarget) return
    const curriculum = curriculumResponse.data.curricula.find((value) => value._id === selectedTarget.curriculum)
    if (!curriculum) {
      setError('The daily target belongs to an unavailable curriculum.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const response = await practiceService.generate({
        curriculumId: selectedTarget.curriculum,
        moduleKey: selectedTarget.item.topicKey.split(':')[0],
        topicKey: selectedTarget.item.topicKey,
        difficulty: curriculum.currentSkillLevel,
        questionCount: selectedTarget.item.estimatedDurationMinutes >= 60 ? 3 : selectedTarget.item.estimatedDurationMinutes >= 30 ? 2 : 1,
      })
      setSets((current) => [response.data.practiceSet, ...current])
    } catch (generationError) {
      setError(generationError instanceof ApiError || generationError instanceof Error
        ? generationError.message
        : 'Practice request failed.')
    } finally {
      setGenerating(false)
    }
  }

  async function start(set: PracticeSet) {
    setSaving(true); setError(null)
    try {
      const response = await practiceService.start(set._id || set.setKey)
      setSelected(set)
      setAttempt(response.data.attempt)
      setAnswers(Object.fromEntries((response.data.attempt.answers || []).map((answer) => [answer.questionKey, answer.answer])))
    }
    catch (e) { setError(message(e)) } finally { setSaving(false) }
  }
  async function submit() {
    if (!attempt) return
    setSaving(true); setError(null)
    try { const response = await practiceService.submit(attempt.attemptKey, Object.entries(answers).map(([questionKey, answer]) => ({ questionKey, answer }))); setAttempt(response.data.attempt); void load() }
    catch (e) { setError(message(e)) } finally { setSaving(false) }
  }

  async function evaluate() {
    if (!attempt) return
    setEvaluating(true); setError(null)
    try {
      const response = await practiceService.evaluate(attempt.attemptKey)
      setAttempt(response.data.attempt)
      void load()
    } catch (e) { setError(message(e)) } finally { setEvaluating(false) }
  }

  async function uploadSolution(questionKey: string, file: File | undefined) {
    if (!file) return
    if (file.size > 20000) { setError('Solution files must be 20 KB or smaller.'); return }
    setUploadingQuestionKey(questionKey)
    setError(null)
    try {
      const text = await file.text()
      if (!text.trim()) { setError('The selected solution file is empty.'); return }
      setAnswers((current) => ({ ...current, [questionKey]: text }))
    } catch { setError('Unable to read the selected solution file.') }
    finally { setUploadingQuestionKey(null) }
  }

  if (loading) return <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} />Loading practice sets…</div>
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Practice &amp; Solutions</h1><p className="mt-1 text-sm text-slate-500">A short practice set is prepared automatically for each topic in today&apos;s targets. Upload or write your solution, then let AI review it and explain your mistakes.</p></div>
      {error && <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span className="flex items-center gap-2"><AlertCircle size={16} />{error}</span><button onClick={() => void load()}><RefreshCw size={16} /></button></div>}
      {attempt && selected ? (
        <Card><CardHeader title={selected.topicTitle} subtitle={`${selected.questions.length} questions · ${selected.difficulty}`} action={<button className="text-sm text-indigo-600" onClick={() => { setAttempt(null); setSelected(null) }}>Back</button>} /><CardBody className="space-y-5">
          {selected.questions.map((question, index) => <div key={question.questionKey} className="space-y-2"><p className="text-sm font-semibold text-slate-700">{index + 1}. {question.prompt} <span className="text-xs font-normal text-slate-400">({question.points} pts)</span></p>{question.type === 'mcq' && question.options?.map(option => <label key={option.key} className="flex gap-2 text-sm text-slate-600"><input type="radio" name={question.questionKey} value={option.key} checked={answers[question.questionKey] === option.key} disabled={attempt.status !== 'in_progress'} onChange={e => setAnswers({ ...answers, [question.questionKey]: e.target.value })} />{option.text}</label>)}{question.type !== 'mcq' && <><textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50 disabled:text-slate-500" rows={4} value={answers[question.questionKey] || ''} disabled={attempt.status !== 'in_progress'} onChange={e => setAnswers({ ...answers, [question.questionKey]: e.target.value })} placeholder="Write or upload your solution…" />{attempt.status === 'in_progress' && <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-indigo-600"><FileUp size={15} />{uploadingQuestionKey === question.questionKey ? 'Reading solution…' : 'Upload solution file'}<input type="file" accept=".txt,.md,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.rb,.php,.sql,.json" className="hidden" disabled={uploadingQuestionKey !== null} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void uploadSolution(question.questionKey, file) }} /></label>}</>}</div>)}
          {attempt.status === 'in_progress' && <div className="flex flex-wrap items-center gap-3"><button disabled={saving || selected.questions.some((question) => !answers[question.questionKey]?.trim())} onClick={() => void submit()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Submitting…' : 'Submit solution'}</button>{selected.questions.some((question) => !answers[question.questionKey]?.trim()) && <span className="text-xs text-slate-500">Write or upload a solution for every question before submitting.</span>}</div>}
          {attempt.status === 'submitted' && <button disabled={evaluating} onClick={() => void evaluate()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{evaluating ? 'Reviewing…' : 'Review solution and get marks'}</button>}
          {attempt.status === 'evaluating' && <div className="flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700"><LoaderCircle className="animate-spin" size={16} />AI is reviewing the submitted solution…</div>}
          {attempt.status === 'failed' && <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>AI evaluation could not finish. The submitted answers are saved.</span><button disabled={evaluating} onClick={() => void evaluate()} className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{evaluating ? 'Retrying…' : 'Retry review'}</button></div>}
          {attempt.status === 'evaluated' && <div className="space-y-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><div><CheckCircle2 className="mr-2 inline" size={16} />Score: {attempt.scorePercent ?? 0}%</div>{attempt.questionResults?.map((result) => <div key={result.questionKey} className="rounded border border-emerald-100 bg-white p-3 text-slate-700"><p className="font-medium">{result.score}/{result.maxScore} — {result.feedback}</p>{result.mistakes?.length ? <p className="mt-1 text-xs text-red-600">Mistakes: {result.mistakes.join('; ')}</p> : null}{result.correctedSolution && <p className="mt-1 text-xs text-indigo-700">Suggested solution: {result.correctedSolution}</p>}</div>)}</div>}
        </CardBody></Card>
      ) : <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader title="Today's practice" subtitle="Short 1–3 question sessions based on today's available time" /><CardBody className="space-y-3">{(() => { const items = [...(targets?.data.targets.flatMap((target) => target.items.map((item) => ({ ...item, curriculum: target.curriculum })) || []) || []), ...(targets?.data.extraWork?.items.map((item) => ({ ...item, curriculum: targets.data.extraWork?.curriculum || '' })) || [])]; return items.length ? items.map((item) => <div key={`${item.curriculum}-${item.topicKey}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3"><div><p className="text-sm font-semibold text-slate-700">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.estimatedDurationMinutes} minutes</p></div><span className="text-xs text-emerald-600">Prepared below</span></div>) : <EmptyState icon={PenLine} title="No practice targets today" description="Today's targets will appear here when generated." /> })()}</CardBody></Card><Card><CardHeader title="Available sets" /><CardBody className="space-y-3">{sets.length ? sets.map(set => <div key={set.setKey} className="flex items-center justify-between rounded-lg border border-slate-100 p-3"><div><p className="text-sm font-semibold text-slate-700">{set.topicTitle}</p><p className="mt-1 text-xs text-slate-500">{set.questions.length} questions <Badge variant="info">{set.difficulty}</Badge></p></div><button disabled={saving} onClick={() => void start(set)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white">Start &amp; solve</button></div>) : <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center"><PenLine className="mb-3 text-indigo-400" size={24} /><p className="text-sm font-semibold text-slate-700">No practice set for today yet</p><p className="mt-1 text-xs text-slate-500">Generate a question set from today's target, then solve and upload a solution.</p><button type="button" disabled={generating || !targets} onClick={() => void generateTodayPractice()} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{generating ? 'Generating practice…' : 'Generate today’s practice'}</button></div>}</CardBody></Card><Card><CardHeader title="Attempt history" /><CardBody className="space-y-3">{(() => { const evaluatedAttempts = attempts.filter((item) => item.status === 'evaluated'); return evaluatedAttempts.length ? evaluatedAttempts.map(item => <div key={item.attemptKey} className="flex justify-between border-b border-slate-100 pb-3 text-sm"><span>{new Date(item.startedAt).toLocaleDateString()}</span><span className="font-semibold">{item.scorePercent == null ? '—' : `${item.scorePercent}%`}</span></div>) : <EmptyState icon={CheckCircle2} title="No evaluated attempts" description="Completed AI-reviewed practice will appear here." /> })()}</CardBody></Card></div>}
    </div>
  )
}
