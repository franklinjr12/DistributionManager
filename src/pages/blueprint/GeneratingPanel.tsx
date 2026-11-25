import { CircleCheck, Cpu, LoaderCircle, Sparkles } from 'lucide-react'
import { Badge, Card, ProgressBar } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  steps: { label: string }[]
  current: number
  pct: number
  /** final estimate tokens (in+out) */
  targetTokens: number
  elapsedMs: number
}

export function GeneratingPanel({ steps, current, pct, targetTokens, elapsedMs }: Props) {
  const tokens = Math.round(targetTokens * Math.min(1, pct))
  // gpt-4o-mini ≈ US$ 0,15/M in · 0,60/M out → blended ~US$ 0,55/M for this prompt shape
  const cost = (tokens * 0.55) / 1_000_000
  return (
    <Card padding="none" className="overflow-hidden animate-scale-in" aria-live="polite" aria-busy={pct < 1}>
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-primary-600 to-primary-800 px-6 py-6 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Gerando blueprint com IA…</h2>
            <p className="text-sm text-white/80">gpt-4o-mini · Structured Outputs · Prompt Caching do catálogo</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-all duration-500 ease-out" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85 num">
              <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> {formatNumber(tokens)} tokens</span>
              <span>US$ {cost.toFixed(4).replace('.', ',')}</span>
              <span>{(elapsedMs / 1000).toFixed(1).replace('.', ',')} s</span>
            </div>
          </div>
        </div>
      </div>
      <ol className="divide-y divide-line px-6 py-2 font-mono text-[13px]">
        {steps.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={s.label} className={cn('flex items-center gap-3 py-2.5 transition-opacity duration-300', i > current ? 'opacity-30' : 'opacity-100')}>
              {done ? (
                <CircleCheck className="h-4 w-4 shrink-0 text-success-500" />
              ) : active ? (
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-primary-600" />
              ) : (
                <span className="h-4 w-4 shrink-0 rounded-full border border-line-strong" />
              )}
              <span className={cn('min-w-0 flex-1', done ? 'text-ink-600' : active ? 'font-medium text-ink-900' : 'text-ink-400')}>{s.label}</span>
              {done && <Badge tone="success" size="sm">ok</Badge>}
            </li>
          )
        })}
      </ol>
      <div className="border-t border-line bg-ink-50 px-6 py-3">
        <ProgressBar value={pct * 100} size="xs" tone="violet" striped />
      </div>
    </Card>
  )
}
