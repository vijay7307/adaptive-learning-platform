import type { LucideIcon } from 'lucide-react'
import { Brain, Sparkles } from 'lucide-react'

interface PlaceholderPageProps {
  icon: LucideIcon
  title: string
  description: string
  features: string[]
}

export function PlaceholderPage({ icon: Icon, title, description, features }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-10 text-white shadow-lg">
        <div className="relative z-10 flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Icon size={28} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{title}</h2>
              <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-xs font-medium text-indigo-200">
                Coming Soon
              </span>
            </div>
            <p className="mt-2 text-slate-300">{description}</p>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-16 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Features preview */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-700">What you'll be able to do here</h3>
        </div>
        <ul className="space-y-3">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                {i + 1}
              </span>
              <span className="text-sm text-slate-600">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AI badge */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4">
        <Brain size={20} className="text-indigo-500" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">Powered by Gemini AI</p>
          <p className="text-xs text-indigo-600">
            This page will connect to the Gemini API to deliver personalized AI-driven features.
          </p>
        </div>
      </div>
    </div>
  )
}
