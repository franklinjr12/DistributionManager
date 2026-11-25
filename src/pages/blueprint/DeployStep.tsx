import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CircleCheck, CircleX, LoaderCircle, RefreshCw, Rocket, Sparkles, Timer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { AdCampaign } from '@/types/domain'
import { Badge, Button, Card, ChannelIcon, ProgressBar } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DeployLine } from './mockGenerator'

interface Props {
  lines: DeployLine[]
  /** promise-returning deploy call (mock API) */
  run: () => Promise<AdCampaign[]>
  onFinished: (created: AdCampaign[]) => void
  onRestart: () => void
  onBackToReview: () => void
  created: AdCampaign[] | null
}

const TOTAL_MS = 8000

export function DeployStep({ lines, run, onFinished, onRestart, onBackToReview, created }: Props) {
  const navigate = useNavigate()
  const [shown, setShown] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  /** one promise per attempt — survives StrictMode double effects (no double deploy) */
  const runs = useRef<Record<number, Promise<AdCampaign[]>>>({})
  const logRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (created) return
    let cancelled = false
    setShown(0)
    setError(null)
    const t0 = performance.now()
    const per = TOTAL_MS / Math.max(1, lines.length)
    const tick = setInterval(() => {
      if (cancelled) return
      const ms = performance.now() - t0
      setElapsed(ms)
      setShown(Math.min(lines.length, Math.floor(ms / per)))
    }, 100)
    const animation = new Promise((r) => setTimeout(r, TOTAL_MS + 200))
    runs.current[attempt] ??= run()
    Promise.all([runs.current[attempt], animation])
      .then(([res]) => {
        if (cancelled) return
        clearInterval(tick)
        setShown(lines.length)
        setElapsed(performance.now() - t0)
        onFinished(res)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        clearInterval(tick)
        setError(e instanceof Error ? e.message : 'Falha ao implantar')
      })
    return () => {
      cancelled = true
      clearInterval(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [shown])

  const pct = created ? 100 : (shown / Math.max(1, lines.length)) * 100
  const secs = (elapsed / 1000).toFixed(1).replace('.', ',')

  if (created) {
    const g = created.filter((c) => c.platform === 'GOOGLE').length
    return (
      <Card padding="none" className="overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-br from-success-500 to-success-700 px-6 py-8 text-center text-white">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/20 animate-scale-in">
            <CircleCheck className="h-8 w-8" />
          </span>
          <h2 className="mt-3 text-xl font-semibold">{created.length} campanhas criadas em status PAUSADO</h2>
          <p className="mt-1 text-sm text-white/85 num">
            {g} Google Ads · {created.length - g} Meta · {lines.length} mutações em {secs} s (meta &lt; 5 min) · 100% dos IDs persistidos
          </p>
        </div>
        <ul className="divide-y divide-line">
          {created.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3">
              <ChannelIcon channel={c.platform === 'GOOGLE' ? 'google' : c.type === 'CLICK_TO_WHATSAPP' ? 'whatsapp' : 'instagram'} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{c.name}</p>
                <p className="text-xs text-ink-500 num">ID externo {c.externalId} · {formatBRL(c.dailyBudgetBRL, { decimals: 2 })}/dia · {c.targetStates.join('/')}</p>
              </div>
              <Badge tone="neutral" dot>Pausada</Badge>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 border-t border-line bg-ink-50 px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" leftIcon={<Sparkles className="h-4 w-4" />} onClick={onRestart}>Gerar outro blueprint</Button>
          <Button rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate('/ads')} autoFocus>Revisar e ativar no Ads Manager</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none" className="overflow-hidden animate-fade-in" aria-busy={!error}>
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <span className={cn('grid h-10 w-10 place-items-center rounded-xl', error ? 'bg-danger-50 text-danger-600' : 'bg-primary-50 text-primary-600')}>
          {error ? <CircleX className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-ink-900">{error ? 'Falha na implantação' : 'Implantando campanhas em PAUSED…'}</h2>
          <p className="text-xs text-ink-500">Batch mutations · Google Ads API v26 + Meta Marketing API v26.0 · idempotência por blueprint_id</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1 text-xs text-ink-600 num" aria-live="off">
          <Timer className="h-3.5 w-3.5" /> {secs} s <span className="text-ink-400">/ meta &lt; 5 min</span>
        </span>
      </div>
      <div className="px-5 pt-4">
        <ProgressBar value={pct} tone={error ? 'danger' : 'primary'} size="sm" label={`${shown} de ${lines.length} mutações`} valueLabel={`${Math.round(pct)}%`} striped={!error} />
      </div>
      <ol ref={logRef} className="scrollbar-thin mx-5 my-4 max-h-[26rem] space-y-0.5 overflow-y-auto rounded-xl bg-ink-900 p-3 font-mono text-[12px] leading-relaxed" aria-live="polite">
        {lines.slice(0, Math.min(lines.length, shown + 1)).map((l, i) => {
          const done = i < shown
          const failed = !!error && i === shown
          return (
            <li key={l.id} className="flex items-start gap-2 animate-fade-in">
              {failed ? (
                <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500" />
              ) : done ? (
                <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-500" />
              ) : (
                <LoaderCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-primary-300" />
              )}
              <span className="min-w-0 flex-1">
                <span className={cn('font-semibold', l.platform === 'GOOGLE' ? 'text-sky-300' : 'text-violet-300')}>{l.service}</span>{' '}
                <span className="text-ink-300">{l.detail}</span>
                {done && <span className="block text-success-100/80 sm:ml-2 sm:inline">→ {l.result}</span>}
              </span>
            </li>
          )
        })}
      </ol>
      {error && (
        <div className="flex flex-col gap-2 border-t border-line bg-danger-50 px-5 py-3 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-danger-700">{error} Nenhuma campanha foi ativada.</p>
          <Button variant="ghost" onClick={onBackToReview}>Voltar à revisão</Button>
          <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setAttempt((a) => a + 1)}>Tentar novamente</Button>
        </div>
      )}
    </Card>
  )
}
