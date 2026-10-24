interface ProgressBarProps {
  value: number // 0-100
  max?: number
  color?: 'indigo' | 'green' | 'amber' | 'red' | 'sky'
  size?: 'sm' | 'md'
  showLabel?: boolean
  label?: string
}

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  sky: 'bg-sky-500',
}

const sizeMap: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
}

export function ProgressBar({
  value,
  max = 100,
  color = 'indigo',
  size = 'md',
  showLabel = false,
  label,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${sizeMap[size]}`}>
        <div
          className={`${sizeMap[size]} rounded-full transition-all duration-500 ${colorMap[color]}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
