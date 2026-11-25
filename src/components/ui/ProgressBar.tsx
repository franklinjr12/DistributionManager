import type { ReactNode } from 'react'
import type { Tone } from '@/types/domain'
import { cn, clamp } from '@/lib/utils'

export interface ProgressBarProps {
  /** 0..max */
  value: number
  max?: number
  tone?: Tone
  size?: 'xs' | 'sm' | 'md' | 'lg'
  label?: ReactNode
  /** right-side text, e.g. "7 / 10" */
  valueLabel?: ReactNode
  /** optional marker position (0..max), e.g. expected pace */
  marker?: number
  markerLabel?: string
  className?: string
  /** animate stripes (in-progress jobs) */
  striped?: boolean
}

const FILL: Record<Tone, string> = {
  neutral: 'bg-ink-400',
  primary: 'bg-primary-600',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  violet: 'bg-violet-500',
}
const H = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }

export function ProgressBar({ value, max = 100, tone = 'primary', size = 'md', label, valueLabel, marker, markerLabel, className, striped }: ProgressBarProps) {
  const pct = clamp((value / (max || 1)) * 100, 0, 100)
  return (
    <div className={cn('w-full', className)}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-ink-600">{label}</span>
          <span className="num font-semibold text-ink-800">{valueLabel}</span>
        </div>
      )}
      <div className={cn('relative w-full overflow-visible rounded-full bg-ink-100', H[size])}>
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', FILL[tone], striped && 'animate-pulse')}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={max}
        />
        {marker != null && (
          <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink-700" style={{ left: `${clamp((marker / (max || 1)) * 100, 0, 100)}%` }} title={markerLabel} />
        )}
      </div>
    </div>
  )
}
