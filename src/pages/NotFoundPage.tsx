import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft, LayoutDashboard } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
        <FileQuestion size={36} />
      </div>

      <span className="mt-6 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
        404 Error
      </span>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Page not found
      </h1>

      <p className="mt-2 text-sm text-slate-500 max-w-md">
        Sorry, the page you are looking for does not exist, has been moved, or is temporarily unavailable.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <LayoutDashboard size={16} />
          Return to Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </div>
  )
}
