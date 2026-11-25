import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { Tone } from '@/types/domain'
import { cn } from '@/lib/utils'
import { formatDelta } from '@/lib/format'
import { Tooltip } from './Tooltip'

export interface KpiCardProps {
  label: ReactNode
  value: ReactNode
  /** ratio change, e.g. 0.12 = +12% */
  delta?: number | null
  deltaLabel?: ReactNode
  /** when true, negative delta is good (e.g. CPL, cost/SQL) */
  invertDelta?: boolean
  icon?: ReactNode
  iconTone?: Tone
  hint?: ReactNode
  /** extra content below (sparkline, progress) */
  footer?: ReactNode
  /** small caption under value, e.g. "meta ≤ 15 min" */
  caption?: ReactNode
  className?: string
  loading?: boolean
}

const ICON_BG: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-info-700',
  violet: 'bg-violet-50 text-violet-600',
}

export function KpiCard({ label, value, delta, deltaLabel, invertDelta, icon, iconTone = 'primary', hint, footer, caption, className, loading }: KpiCardProps) {
  const good = delta != null && (invertDelta ? delta < 0 : delta > 0)
  const bad = delta != null && delta !== 0 && !good
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
          {label}
          {hint && (
            <Tooltip content={hint}>
              <span className="flex size-3.5 cursor-help items-center justify-center rounded-full bg-ink-100 text-[9px] font-bold text-ink-500">?</span>
            </Tooltip>
          )}
        </div>
        {icon && <div className={cn('flex size-8 items-center justify-center rounded-lg [&_svg]:size-4', ICON_BG[iconTone])}>{icon}</div>}
      </div>
      <div>
        {loading ? <div className="h-7 w-24 animate-pulse rounded bg-ink-200/70" /> : <div className="num text-2xl font-semibold tracking-tight text-ink-900">{value}</div>}
        {(delta != null || caption) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {delta != null && (
              <span className={cn('inline-flex items-center gap-0.5 font-semibold', good && 'text-success-600', bad && 'text-danger-600', delta === 0 && 'text-ink-500')}>
                {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {formatDelta(delta)}
              </span>
            )}
            {deltaLabel && <span className="text-ink-400">{deltaLabel}</span>}
            {caption && <span className="text-ink-500">{caption}</span>}
          </div>
        )}
      </div>
      {footer}
    </div>
  )
}
