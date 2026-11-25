import type { ReactNode } from 'react'

export interface ChartTooltipItem {
  name?: unknown
  value?: unknown
  color?: string
  fill?: string
  stroke?: string
  dataKey?: unknown
  payload?: unknown
}

export interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<ChartTooltipItem>
  label?: unknown
  labelFormatter?: (label: unknown, payload: ReadonlyArray<ChartTooltipItem>) => ReactNode
  valueFormatter?: (value: number, item: ChartTooltipItem) => ReactNode
  footer?: (payload: ReadonlyArray<ChartTooltipItem>) => ReactNode
}

/** Shared recharts tooltip: text in ink tokens; color only on the swatch. */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter, footer }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <p className="mb-1.5 font-semibold text-ink-900">{labelFormatter ? labelFormatter(label, payload) : String(label ?? '')}</p>
      <ul className="space-y-1">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: p.color ?? p.fill ?? p.stroke }} />
            <span className="text-ink-600">{String(p.name ?? '')}</span>
            <span className="num ml-auto pl-3 font-semibold text-ink-900">{valueFormatter ? valueFormatter(Number(p.value), p) : String(p.value)}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-1.5 border-t border-line pt-1.5 text-ink-500">{footer(payload)}</div>}
    </div>
  )
}

export function LegendDot({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-600">
      {line ? <span className="h-0.5 w-3.5 rounded" style={{ background: color }} /> : <span className="size-2.5 rounded-sm" style={{ background: color }} />}
      {label}
    </span>
  )
}

export const AXIS_TICK = { fontSize: 11, fill: 'var(--color-ink-400)' }
export const GRID_STROKE = 'var(--color-line)'
