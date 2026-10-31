import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  Lightbulb,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { ApiError } from '../services/api'
import { curriculumService } from '../services/curriculum.service'
import type {
  Curriculum,
  CurriculumGenerationRequest,
  CurriculumModule,
  SkillLevel,
} from '../types/curriculum'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'

interface PlannerFormState {
  goal: string
  subject: string
  currentSkillLevel: SkillLevel
  availableStudyHoursPerDay: string
  targetDurationDays: string
  deadline: string
}

interface PlannerFormErrors {
  goal?: string
  subject?: string
  availableStudyHoursPerDay?: string
  targetDurationDays?: string
  deadline?: string
}

const initialForm: PlannerFormState = {
  goal: '',
  subject: '',
  currentSkillLevel: 'beginner',
  availableStudyHoursPerDay: '1',
  targetDurationDays: '30',
  deadline: '',
}

const skillLevelLabels: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function validatePlannerForm(
  form: PlannerFormState,
  today = new Date(),
): PlannerFormErrors {
  const errors: PlannerFormErrors = {}
  const hours = Number(form.availableStudyHoursPerDay)
  const duration = Number(form.targetDurationDays)

  if (!form.goal.trim()) errors.goal = 'Tell us what you want to achieve.'
  else if (form.goal.trim().length > 200) errors.goal = 'Keep your goal under 200 characters.'

  if (!form.subject.trim()) errors.subject = 'Enter a subject or skill.'
  else if (form.subject.trim().length > 120) errors.subject = 'Keep the subject under 120 characters.'

  if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) {
    errors.availableStudyHoursPerDay = 'Choose between 0.25 and 24 hours per day.'
  } else if (!Number.isInteger(hours * 60)) {
    errors.availableStudyHoursPerDay = 'Use a time value that converts to whole minutes.'
  }

  if (!Number.isInteger(duration) || duration < 1 || duration > 3650) {
    errors.targetDurationDays = 'Choose a duration between 1 and 3650 days.'
  }

  if (form.deadline) {
    const deadline = new Date(`${form.deadline}T23:59:59`)
    const latest = new Date(today)
    latest.setDate(latest.getDate() + (Number.isInteger(duration) ? duration : 0))
    if (Number.isNaN(deadline.getTime()) || deadline <= today) {
      errors.deadline = 'Choose a future completion date.'
    } else if (Number.isInteger(duration) && deadline > latest) {
      errors.deadline = `This date is beyond the requested ${duration}-day duration.`
    }
  }

  return errors
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.statusCode === 429) {
    const wait = error.retryAfterSeconds
    return wait
      ? `Gemini's generation quota is temporarily exhausted. Please wait about ${wait} seconds before trying again.`
      : 'Gemini’s generation quota is temporarily exhausted. Please try again later.'
  }
  return error instanceof ApiError || error instanceof Error ? error.message : fallback
}

function getRecommendationLines(curriculum: Curriculum): {
  practice: string[]
  revision: string[]
  assessment: string[]
} {
  const criteria = curriculum.modules[0]?.completionCriteria || []
  const getLines = (prefix: string) => {
    const entry = criteria.find((criterion) => criterion.startsWith(prefix))
    return entry
      ? entry
          .slice(prefix.length)
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)
      : []
  }
  return {
    practice: getLines('Practice activities:'),
    revision: getLines('Revision sessions:'),
    assessment: getLines('Assessment recommendations:'),
  }
}

function SummaryStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <Icon size={16} className="text-indigo-500" />
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function RecommendationList({ title, items, icon: Icon }: { title: string; items: string[]; icon: LucideIcon }) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ModuleCard({ module }: { module: CurriculumModule }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white" open={module.order === 1}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">
          {module.order}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-800">{module.title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{module.milestone}</span>
        </span>
        <ChevronDown size={18} className="text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
        {module.topics.map((topic) => (
          <div key={`${module.order}-${topic.order}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-700">
                {topic.order}. {topic.title}
              </h4>
              <Badge variant="info">{formatMinutes(topic.estimatedDurationMinutes)}</Badge>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Learning objectives</p>
            <ul className="mt-1 space-y-1">
              {topic.learningObjectives.map((objective) => (
                <li key={objective} className="text-sm text-slate-600">• {objective}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Complete when</p>
            <p className="mt-1 text-sm text-slate-600">{topic.completionCriteria.join(' • ')}</p>
          </div>
        ))}
      </div>
    </details>
  )
}

function CurriculumReview({ curriculum, requestedDuration }: { curriculum: Curriculum; requestedDuration?: number }) {
  const recommendations = getRecommendationLines(curriculum)
  const hasLongerRecommendation =
    requestedDuration !== undefined && curriculum.targetDurationDays > requestedDuration

  return (
    <Card>
      <CardHeader
        title="Review your generated plan"
        subtitle="This curriculum has already been saved to your account."
        action={<Badge variant={curriculum.status === 'active' ? 'success' : 'indigo'}>{curriculum.status}</Badge>}
      />
      <CardBody className="space-y-6">
        <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">Learning goal</p>
          <h2 className="mt-1 text-xl font-bold">{curriculum.goal}</h2>
          <p className="mt-1 text-sm text-indigo-200">{curriculum.subject} · {skillLevelLabels[curriculum.currentSkillLevel]}</p>
          {hasLongerRecommendation && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/10 p-3 text-sm text-indigo-50">
              <Lightbulb size={17} className="mt-0.5 shrink-0 text-amber-300" />
              <p>
                Gemini recommended a longer, more realistic timeline of <strong>{curriculum.targetDurationDays} days</strong> instead of the requested {requestedDuration} days.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat icon={CalendarDays} label="Duration" value={`${curriculum.targetDurationDays} days`} />
          <SummaryStat icon={Clock3} label="Daily study" value={formatMinutes(curriculum.availableStudyTimeMinutesPerDay)} />
          <SummaryStat icon={Target} label="Target date" value={formatDate(curriculum.deadline)} />
          <SummaryStat icon={BookOpen} label="Modules" value={String(curriculum.modules.length)} />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <RecommendationList title="Practice activities" items={recommendations.practice} icon={Target} />
          <RecommendationList title="Revision sessions" items={recommendations.revision} icon={RefreshCw} />
          <RecommendationList title="Assessments" items={recommendations.assessment} icon={GraduationCap} />
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <BookOpen size={17} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Modules and topics</h3>
          </div>
          <div className="space-y-3">
            {curriculum.modules.map((module) => <ModuleCard key={module.order} module={module} />)}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={17} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800">Milestones</h3>
          </div>
          <div className="space-y-3">
            {curriculum.milestones.map((milestone) => (
              <div key={`${milestone.title}-${milestone.targetDate}`} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-700">{milestone.title}</h4>
                    <Badge variant="warning">{formatDate(milestone.targetDate)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{milestone.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{milestone.completionCriteria.join(' • ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export function PlannerPage() {
  const [form, setForm] = useState<PlannerFormState>(initialForm)
  const [validationErrors, setValidationErrors] = useState<PlannerFormErrors>({})
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null)
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [requestedDurationForReview, setRequestedDurationForReview] = useState<number | undefined>()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [plansError, setPlansError] = useState<string | null>(null)
  const [activePlannerCount, setActivePlannerCount] = useState(0)
  const [maxActivePlanners, setMaxActivePlanners] = useState(3)

  async function loadPlans() {
    setIsLoadingPlans(true)
    setPlansError(null)
    try {
      const response = await curriculumService.list()
      setCurricula(response.data.curricula)
      setActivePlannerCount(response.data.activeCount)
      setMaxActivePlanners(response.data.maxActive)
    } catch (error: unknown) {
      setPlansError(getErrorMessage(error, 'Unable to load your saved plans.'))
    } finally {
      setIsLoadingPlans(false)
    }
  }

  useEffect(() => {
    void loadPlans()
  }, [])

  function updateField<K extends keyof PlannerFormState>(field: K, value: PlannerFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setValidationErrors((current) => ({ ...current, [field]: undefined }))
    setErrorMessage(null)
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validatePlannerForm(form)
    setValidationErrors(errors)
    setErrorMessage(null)
    if (Object.keys(errors).length > 0) return

    const request: CurriculumGenerationRequest = {
      goal: form.goal.trim(),
      subject: form.subject.trim(),
      currentSkillLevel: form.currentSkillLevel,
      availableStudyHoursPerDay: Number(form.availableStudyHoursPerDay),
      targetDurationDays: Number(form.targetDurationDays),
      ...(form.deadline ? { deadline: new Date(`${form.deadline}T23:59:59`).toISOString() } : {}),
    }

    if (activePlannerCount >= maxActivePlanners) {
      setErrorMessage(`You already have ${maxActivePlanners} active learning planners. Complete or archive one before creating another.`)
      return
    }

    setIsGenerating(true)
    try {
      const response = await curriculumService.generate(request, `planner-${crypto.randomUUID()}`)
      setSelectedCurriculum(response.data.curriculum)
      setRequestedDurationForReview(request.targetDurationDays)
      setCurricula((current) => [
        response.data.curriculum,
        ...current.filter((item) => item._id !== response.data.curriculum._id),
      ])
      setActivePlannerCount((count) =>
        curricula.some((item) => item._id === response.data.curriculum._id)
          ? count
          : Math.min(maxActivePlanners, count + 1),
      )
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Unable to generate your curriculum. Please try again.'))
    } finally {
      setIsGenerating(false)
    }
  }

  async function openPlan(id: string) {
    setIsLoadingPlan(true)
    setErrorMessage(null)
    try {
      const response = await curriculumService.getById(id)
      setSelectedCurriculum(response.data.curriculum)
      setRequestedDurationForReview(undefined)
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Unable to open this learning plan.'))
    } finally {
      setIsLoadingPlan(false)
    }
  }

  const inputClass = (field: keyof PlannerFormErrors) =>
    `mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors ${
      validationErrors[field]
        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
        : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
    }`

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-md sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-indigo-200">
            <Sparkles size={17} />
            <span className="text-xs font-semibold uppercase tracking-wider">Powered by Gemini AI</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Build your learning plan</h1>
          <p className="mt-2 text-sm text-indigo-100 sm:text-base">
            Tell us where you want to go. Gemini will turn your goal, time, and experience into a structured curriculum you can review immediately.
          </p>
        </div>
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-white/5" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader
            title="Start a new plan"
            subtitle={`${activePlannerCount}/${maxActivePlanners} active planners · A few details help AI tailor the roadmap to you.`}
          />
          <CardBody>
            {activePlannerCount >= maxActivePlanners && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
                You have reached the {maxActivePlanners}-planner limit. Complete or archive an existing planner to create another.
              </div>
            )}
            {errorMessage && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}
            <form onSubmit={handleGenerate} className="space-y-5" noValidate>
              <fieldset disabled={isGenerating || activePlannerCount >= maxActivePlanners} className="space-y-5">
              <div>
                <label htmlFor="goal" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">What do you want to achieve?</label>
                <textarea id="goal" rows={3} value={form.goal} onChange={(event) => updateField('goal', event.target.value)} disabled={isGenerating || activePlannerCount >= maxActivePlanners} placeholder="Become job-ready in TypeScript" className={`${inputClass('goal')} resize-none`} />
                <p className="mt-1 text-xs text-slate-400">Be specific about the outcome you want.</p>
                {validationErrors.goal && <p className="mt-1 text-xs text-red-600">{validationErrors.goal}</p>}
              </div>
              <div>
                <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Subject or skill</label>
                <input id="subject" value={form.subject} onChange={(event) => updateField('subject', event.target.value)} disabled={isGenerating} placeholder="TypeScript" className={inputClass('subject')} />
                {validationErrors.subject && <p className="mt-1 text-xs text-red-600">{validationErrors.subject}</p>}
              </div>
              <div>
                <label htmlFor="currentSkillLevel" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Current skill level</label>
                <select id="currentSkillLevel" value={form.currentSkillLevel} onChange={(event) => updateField('currentSkillLevel', event.target.value as SkillLevel)} disabled={isGenerating} className={inputClass('subject')}>
                  {Object.entries(skillLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="availableStudyHoursPerDay" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Study hours per day</label>
                  <input id="availableStudyHoursPerDay" type="number" min="0.25" max="24" step="0.25" value={form.availableStudyHoursPerDay} onChange={(event) => updateField('availableStudyHoursPerDay', event.target.value)} disabled={isGenerating} className={inputClass('availableStudyHoursPerDay')} />
                  {validationErrors.availableStudyHoursPerDay && <p className="mt-1 text-xs text-red-600">{validationErrors.availableStudyHoursPerDay}</p>}
                </div>
                <div>
                  <label htmlFor="targetDurationDays" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Duration in days</label>
                  <input id="targetDurationDays" type="number" min="1" max="3650" step="1" value={form.targetDurationDays} onChange={(event) => updateField('targetDurationDays', event.target.value)} disabled={isGenerating} className={inputClass('targetDurationDays')} />
                  {validationErrors.targetDurationDays && <p className="mt-1 text-xs text-red-600">{validationErrors.targetDurationDays}</p>}
                </div>
              </div>
              <div>
                <label htmlFor="deadline" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Target completion date <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <input id="deadline" type="date" value={form.deadline} onChange={(event) => updateField('deadline', event.target.value)} disabled={isGenerating} className={inputClass('deadline')} />
                <p className="mt-1 text-xs text-slate-400">Leave this blank if you want AI to suggest a feasible date.</p>
                {validationErrors.deadline && <p className="mt-1 text-xs text-red-600">{validationErrors.deadline}</p>}
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isGenerating ? <><LoaderCircle size={17} className="animate-spin" /> Generating your plan...</> : <><Sparkles size={17} /> Generate learning plan <ArrowRight size={16} /></>}
              </button>
              {isGenerating && <p className="text-center text-xs text-slate-500">Gemini is structuring your modules and milestones. This can take up to two minutes.</p>}
              </fieldset>
            </form>
          </CardBody>
        </Card>

        <div>
          {isLoadingPlan ? (
            <Card><CardBody className="flex min-h-64 items-center justify-center"><LoaderCircle size={24} className="animate-spin text-indigo-500" /></CardBody></Card>
          ) : selectedCurriculum ? (
            <CurriculumReview
              curriculum={selectedCurriculum}
              requestedDuration={requestedDurationForReview}
            />
          ) : (
            <Card><CardBody className="flex min-h-64 flex-col items-center justify-center text-center"><Lightbulb size={30} className="text-indigo-300" /><h2 className="mt-3 text-base font-semibold text-slate-700">Your plan will appear here</h2><p className="mt-1 max-w-sm text-sm text-slate-500">Complete the form to generate a curriculum. You can review the saved plan without submitting another request.</p></CardBody></Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="My learning plans" subtitle="Saved curricula belonging to your account." action={<button type="button" onClick={() => void loadPlans()} disabled={isLoadingPlans} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"><RefreshCw size={13} className={isLoadingPlans ? 'animate-spin' : ''} /> Refresh</button>} />
        <CardBody>
          {isLoadingPlans ? <div className="flex items-center justify-center py-8"><LoaderCircle size={22} className="animate-spin text-indigo-500" /></div> : plansError ? <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />{plansError}</div> : curricula.length === 0 ? <div className="py-8 text-center"><BookOpen size={28} className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-600">No saved plans yet</p><p className="mt-1 text-xs text-slate-400">Generate your first personalized curriculum above.</p></div> : <div className="grid gap-3 md:grid-cols-2">{curricula.map((curriculum) => <button key={curriculum._id} type="button" onClick={() => void openPlan(curriculum._id)} className={`group rounded-xl border p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 ${selectedCurriculum?._id === curriculum._id ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200'}`}><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100"><BookOpen size={17} className="text-indigo-600" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold text-slate-800">{curriculum.goal}</h3><ArrowRight size={15} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" /></div><p className="mt-1 text-xs text-slate-500">{curriculum.subject} · {curriculum.targetDurationDays} days · {formatDate(curriculum.createdAt)}</p><div className="mt-2 flex items-center gap-2"><Badge variant={curriculum.status === 'completed' ? 'success' : 'indigo'}>{curriculum.status}</Badge><span className="text-xs text-slate-400">{curriculum.modules.length} modules</span></div></div></div></button>)}</div>}
        </CardBody>
      </Card>
    </div>
  )
}
