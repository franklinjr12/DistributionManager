import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, CheckCheck, Circle, CircleCheck, CircleX, Copy, LoaderCircle, Terminal } from 'lucide-react'
import { ProgressBar, toast } from '@/components/ui'
import { cn, now } from '@/lib/utils'
import { formatTime } from '@/lib/format'
import type { OnStep } from './lib'

// ───────────────────────── Fake job runner ─────────────────────────

export type JobStatus = 'idle' | 'running' | 'done' | 'error'

export interface JobState {
  labels: string[]
  current: number
  pct: number
  status: JobStatus
  error?: string
  stamps: string[]
}

export function useJob(initialLabels: readonly string[]) {
  const init = useRef(initialLabels)
  const [job, setJob] = useState<JobState>({ labels: [...initialLabels], current: -1, pct: 0, status: 'idle', stamps: [] })

  const run = useCallback(async <T,>(fn: (onStep: OnStep) => Promise<T>, errorTitle = 'Falha na execução'): Promise<T | undefined> => {
    setJob({ labels: [...init.current], current: 0, pct: 0, status: 'running', stamps: [formatTime(now())] })
    try {
      const res = await fn((i, step, pct) =>
        setJob((j) => {
          const labels = [...j.labels]
          if (step) labels[i] = step.label
          const stamps = [...j.stamps]
          stamps[i] = formatClock()
          return { ...j, labels, stamps, current: i, pct }
        }),
      )
      setJob((j) => ({ ...j, status: 'done', current: j.labels.length, pct: 1 }))
      return res
    } catch (e) {
      const msg = (e as Error).message
      setJob((j) => ({ ...j, status: 'error', error: msg }))
      toast.error(errorTitle, msg)
      return undefined
    }
  }, [])

  const reset = useCallback(() => setJob({ labels: [...init.current], current: -1, pct: 0, status: 'idle', stamps: [] }), [])

  return { job, run, reset, running: job.status === 'running' }
}

function formatClock() {
  const d = now()
  return `${formatTime(d)}:${String(d.getSeconds()).padStart(2, '0')}`
}

/** Dark "terminal" style step log for theatrical fake jobs. */
export function JobConsole({ job, title, result, className }: { job: JobState; title: string; result?: ReactNode; className?: string }) {
  if (job.status === 'idle') return null
  return (
    <div className={cn('animate-fade-in overflow-hidden rounded-xl border border-ink-800 bg-ink-900 text-ink-100 shadow-card', className)}>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <Terminal className="size-4 text-ink-400" />
        <span className="font-mono text-xs text-ink-300">{title}</span>
        <span className="ml-auto text-xs">
          {job.status === 'running' && <span className="text-warning-500">executando…</span>}
          {job.status === 'done' && <span className="text-success-500">concluído</span>}
          {job.status === 'error' && <span className="text-danger-500">falhou</span>}
        </span>
      </div>
      <div className="px-4 pt-3">
        <ProgressBar value={job.pct * 100} size="xs" tone={job.status === 'error' ? 'danger' : job.status === 'done' ? 'success' : 'primary'} striped={job.status === 'running'} />
      </div>
      <ol className="space-y-1.5 px-4 py-3 font-mono text-xs">
        {job.labels.map((l, i) => {
          const done = i < job.current || job.status === 'done'
          const active = i === job.current && job.status === 'running'
          const failed = i === job.current && job.status === 'error'
          return (
            <li key={i} className={cn('flex items-start gap-2', !done && !active && !failed && 'text-ink-500')}>
              <span className="mt-px shrink-0">
                {done ? (
                  <CircleCheck className="size-3.5 text-success-500" />
                ) : active ? (
                  <LoaderCircle className="size-3.5 animate-spin text-warning-500" />
                ) : failed ? (
                  <CircleX className="size-3.5 text-danger-500" />
                ) : (
                  <Circle className="size-3.5" />
                )}
              </span>
              <span className="w-16 shrink-0 text-ink-500">{job.stamps[i] ?? ''}</span>
              <span className="min-w-0 break-words">{l}</span>
            </li>
          )
        })}
        {job.status === 'error' && <li className="pt-1 text-danger-500">✗ {job.error}</li>}
      </ol>
      {job.status === 'done' && result && <div className="border-t border-white/10 px-4 py-3 text-xs text-ink-200">{result}</div>}
    </div>
  )
}

// ───────────────────────── WhatsApp preview ─────────────────────────

export function WhatsAppPhone({ contact, subtitle, children, className }: { contact: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-line shadow-card', className)}>
      <div className="flex items-center gap-2.5 bg-whatsapp-dark px-4 py-2.5 text-white">
        <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">MQ</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{contact}</div>
          {subtitle && <div className="truncate text-[11px] text-white/75">{subtitle}</div>}
        </div>
      </div>
      <div className="space-y-2 bg-[#efeae2] p-3">{children}</div>
    </div>
  )
}

export function WhatsAppBubble({ children, time, outgoing = true, read = true }: { children: ReactNode; time: string; outgoing?: boolean; read?: boolean }) {
  return (
    <div className={cn('flex', outgoing ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[92%] rounded-lg px-3 py-2 text-[13px] leading-relaxed text-ink-900 shadow-sm', outgoing ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white')}>
        <div className="whitespace-pre-line">{children}</div>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ink-500">
          {time}
          {outgoing && (read ? <CheckCheck className="size-3.5 text-info-500" /> : <Check className="size-3.5" />)}
        </div>
      </div>
    </div>
  )
}

/** WhatsApp-style *bold* formatting */
export function waFormat(text: string): ReactNode {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <strong key={i}>{part.slice(1, -1)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

// ───────────────────────── Code block ─────────────────────────

export function CodeBlock({ title, code, tone = 'neutral' }: { title: ReactNode; code: string; tone?: 'neutral' | 'success' | 'danger' }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div
        className={cn(
          'flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs font-medium',
          tone === 'success' ? 'bg-success-50 text-success-700' : tone === 'danger' ? 'bg-danger-50 text-danger-700' : 'bg-ink-50 text-ink-600',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-ink-500 hover:bg-white hover:text-ink-800"
          onClick={() => {
            navigator.clipboard?.writeText(code).catch(() => undefined)
            toast.info('Copiado para a área de transferência')
          }}
        >
          <Copy className="size-3" /> Copiar
        </button>
      </div>
      <pre className="scrollbar-thin max-h-80 overflow-auto bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-100">{code}</pre>
    </div>
  )
}

/** Small mono chip for ids / hashes */
export function Mono({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] text-ink-700', className)}>
      {children}
    </span>
  )
}

/** Table skeleton */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-ink-100" />
      ))}
    </div>
  )
}

/** Boot flag: short skeleton on first mount (theatrical loading). */
export function useBoot(ms = 450) {
  const [booting, setBooting] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), ms)
    return () => clearTimeout(t)
  }, [ms])
  return booting
}
