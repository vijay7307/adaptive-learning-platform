import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, ChevronDown, ChevronRight, ExternalLink, LoaderCircle, Sparkles, Youtube } from 'lucide-react'
import { ApiError } from '../services/api'
import { curriculumService } from '../services/curriculum.service'
import { learningNotesService } from '../services/learning-notes.service'
import type { Curriculum, CurriculumModule, CurriculumTopic, LearningNote } from '../types/curriculum'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'

function message(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unable to load learning notes.'
}

function topicKey(module: CurriculumModule, topic: CurriculumTopic): string {
  return `${module.order}:${topic.order}`
}

function NoteContent({ note }: { note: LearningNote }) {
  const content = note.content
  return (
    <div className="space-y-6 text-sm leading-6 text-slate-700">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{note.topicTitle}</h2>
        <p className="mt-2">{content.introduction}</p>
      </div>
      <section><h3 className="font-semibold text-slate-900">Learning objectives</h3><ul className="mt-2 list-disc space-y-1 pl-5">{content.learningObjectives.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3 className="font-semibold text-slate-900">Prerequisites</h3><ul className="mt-2 list-disc space-y-1 pl-5">{content.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></section>
      {content.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
          <p>{section.explanation}</p>
          <div><p className="font-medium">Subtopics</p><ul className="list-disc pl-5">{section.subtopics.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><p className="font-medium">Examples</p><ul className="list-disc pl-5">{section.examples.map((item) => <li key={item}>{item}</li>)}</ul></div>
          {section.codeExamples.map((example) => (
            <div key={`${section.title}-${example.language}-${example.code}`} className="overflow-hidden rounded-lg bg-slate-900">
              <div className="border-b border-slate-700 px-3 py-1 text-xs text-slate-400">{example.language}</div>
              <pre className="overflow-x-auto p-3 text-xs text-slate-100"><code>{example.code}</code></pre>
              <p className="border-t border-slate-700 px-3 py-2 text-xs text-slate-300">{example.explanation}</p>
              {example.expectedOutput && <p className="px-3 pb-3 text-xs text-emerald-300">Output: {example.expectedOutput}</p>}
            </div>
          ))}
        </section>
      ))}
      <section><h3 className="font-semibold text-slate-900">Real-world applications</h3><ul className="mt-2 list-disc space-y-1 pl-5">{content.applications.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3 className="font-semibold text-slate-900">Common mistakes</h3><ul className="mt-2 list-disc space-y-1 pl-5">{content.commonMistakes.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3 className="font-semibold text-slate-900">Key takeaways</h3><ul className="mt-2 list-disc space-y-1 pl-5">{content.keyTakeaways.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h3 className="font-semibold text-slate-900">Revision summary</h3><p className="mt-2">{content.revisionSummary}</p></section>
      {content.resources && content.resources.length > 0 && (
        <section>
          <h3 className="font-semibold text-slate-900">Learn more</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {content.resources.map((resource) => (
              <a
                key={`${resource.type}-${resource.url}`}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <div className="flex items-start gap-2">
                  {resource.type === 'youtube'
                    ? <Youtube className="mt-0.5 shrink-0 text-red-500" size={18} />
                    : <ExternalLink className="mt-0.5 shrink-0 text-indigo-500" size={18} />}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{resource.title}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">{resource.type}</p>
                    {resource.description && <p className="mt-1 text-xs text-slate-600">{resource.description}</p>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
      <section><h3 className="font-semibold text-slate-900">Knowledge checks</h3><div className="mt-2 space-y-3">{content.knowledgeChecks.map((check) => <div key={check.question} className="rounded-lg bg-slate-50 p-3"><p className="font-medium">{check.question}</p><p className="mt-1 text-emerald-700">Answer: {check.answer}</p><p className="mt-1 text-xs text-slate-500">{check.explanation}</p></div>)}</div></section>
    </div>
  )
}

export function NotesPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [notes, setNotes] = useState<LearningNote[]>([])
  const [selectedCurriculum, setSelectedCurriculum] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<{ moduleKey: string; topicKey: string; topic: CurriculumTopic } | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [currentNote, setCurrentNote] = useState<LearningNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const curriculum = useMemo(() => curricula.find((item) => item._id === selectedCurriculum), [curricula, selectedCurriculum])
  const latestNote = selectedTopic
    ? notes.filter((note) => note.moduleKey === selectedTopic.moduleKey && note.topicKey === selectedTopic.topicKey).sort((a, b) => b.version - a.version)[0]
    : undefined

  useEffect(() => {
    async function load() {
      try {
        const plans = await curriculumService.list()
        const active = plans.data.curricula.filter((item) => item.status === 'draft' || item.status === 'active')
        setCurricula(active)
        if (active[0]) setSelectedCurriculum(active[0]._id)
      } catch (requestError: unknown) { setError(message(requestError)) } finally { setLoading(false) }
    }
    void load()
  }, [])

  useEffect(() => {
    if (!selectedCurriculum) return
    setCurrentNote(null)
    learningNotesService.list(selectedCurriculum)
      .then((response) => setNotes(response.data.notes))
      .catch((requestError: unknown) => setError(message(requestError)))
  }, [selectedCurriculum])

  function selectTopic(module: CurriculumModule, topic: CurriculumTopic) {
    const selected = { moduleKey: String(module.order), topicKey: topicKey(module, topic), topic }
    setSelectedTopic(selected)
    setCurrentNote(notes
      .filter((note) => note.moduleKey === selected.moduleKey && note.topicKey === selected.topicKey)
      .sort((left, right) => right.version - left.version)[0] || null)
  }

  async function generate(regenerate = false) {
    if (!selectedCurriculum || !selectedTopic) return
    setGenerating(true); setError(null)
    try {
      const response = await learningNotesService.generate(selectedCurriculum, selectedTopic.moduleKey, selectedTopic.topicKey, regenerate)
      setCurrentNote(response.data.note)
      setNotes((current) => [...current.filter((note) => note._id !== response.data.note._id), response.data.note])
    } catch (requestError: unknown) { setError(message(requestError)) } finally { setGenerating(false) }
  }

  if (loading) return <Card><CardBody className="flex min-h-48 items-center justify-center"><LoaderCircle className="animate-spin text-indigo-500" /></CardBody></Card>
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white shadow-md sm:p-8"><div className="flex items-start gap-4"><BookOpen size={28} /><div><h1 className="text-2xl font-bold">Learning Notes</h1><p className="mt-2 text-sm text-indigo-100">Study structured explanations tied to your learning planners.</p></div></div></div>
      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} />{error}</div>}
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card><CardHeader title="Topics" subtitle="Select a planner and topic" /><CardBody className="space-y-3">
          <select value={selectedCurriculum} onChange={(event) => { setSelectedCurriculum(event.target.value); setSelectedTopic(null) }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {curricula.map((item) => <option key={item._id} value={item._id}>{item.goal}</option>)}
          </select>
          {!curriculum && <p className="text-sm text-slate-500">Create a planner to begin.</p>}
          {curriculum?.modules.map((module) => {
            const key = String(module.order); const expanded = expandedModules.has(key)
            return <div key={key} className="rounded-lg border border-slate-100"><button type="button" className="flex w-full items-center gap-2 p-3 text-left text-sm font-medium" onClick={() => setExpandedModules((current) => { const next = new Set(current); expanded ? next.delete(key) : next.add(key); return next })}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}{module.title}</button>{expanded && <div className="border-t border-slate-100 p-2">{module.topics.map((topic) => { const keyValue = topicKey(module, topic); const done = curriculum.completedTopicKeys.includes(keyValue); return <button type="button" key={keyValue} onClick={() => selectTopic(module, topic)} className={`w-full rounded-md px-2 py-2 text-left text-xs ${selectedTopic?.topicKey === keyValue ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>{done ? '✓ ' : ''}{topic.title}</button> })}</div>}</div>
          })}
        </CardBody></Card>
        <Card><CardHeader title={selectedTopic?.topic.title || 'Select a topic'} subtitle={selectedTopic ? `${curriculum?.goal} · ${selectedTopic.topic.learningObjectives.join(' ')}` : 'Choose a topic from the planner'} action={selectedTopic && <Badge variant={currentNote || latestNote ? 'success' : 'info'}>{currentNote || latestNote ? 'Saved' : 'Not generated'}</Badge>} /><CardBody>
          {!selectedTopic ? <div className="flex min-h-64 flex-col items-center justify-center text-center text-slate-500"><Sparkles className="mb-3 text-indigo-400" /><p>Select a topic to read or generate notes.</p></div> : currentNote || latestNote ? <><div className="mb-5 flex flex-wrap gap-2"><button type="button" onClick={() => setCurrentNote(latestNote || null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Latest version</button>{notes.filter((note) => note.moduleKey === selectedTopic.moduleKey && note.topicKey === selectedTopic.topicKey).sort((left, right) => right.version - left.version).map((note) => <button type="button" key={note._id} onClick={() => setCurrentNote(note)} className={`rounded-lg border px-3 py-2 text-sm ${currentNote?._id === note._id ? 'border-indigo-500 text-indigo-700' : 'border-slate-200'}`}>Version {note.version}</button>)}<button type="button" onClick={() => void generate(true)} disabled={generating} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:bg-slate-300">{generating ? 'Generating...' : 'Regenerate notes'}</button></div><NoteContent note={currentNote || latestNote!} /></> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><p className="text-sm text-slate-500">No saved notes for this topic.</p><button type="button" onClick={() => void generate()} disabled={generating} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300">{generating ? 'Generating...' : 'Generate notes'}</button></div>}
        </CardBody></Card>
      </div>
    </div>
  )
}
