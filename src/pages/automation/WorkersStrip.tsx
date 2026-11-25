import { useMemo, useState, type ReactNode } from 'react'
import { ChartColumn, Layers, Play, Radar, RefreshCw, Send, Sparkles } from 'lucide-react'
import * as api from '@/mock/api'
import { useAutomationStore } from '@/store'
import { Button, ChannelIcon, Tooltip, toast } from '@/components/ui'
import { formatDateTime, formatRelative } from '@/lib/format'
import { addMinutes, belem, cn, nowISO } from '@/lib/utils'
import type { TabKey } from './lib'
import { nextMondayAt7 } from './lib'

type WorkerId = 'conversions' | 'optimizer' | 'outbound' | 'metrics' | 'ig' | 'debounce'
type Health = 'ok' | 'running' | 'warning' | 'idle'

interface WorkerDef {
  id: WorkerId
  name: string
  icon: ReactNode
  schedule: string
  cron: string
  tab?: TabKey
}

const WORKERS: WorkerDef[] = [
  { id: 'conversions', name: 'OfflineConversionSyncWorker', icon: <RefreshCw />, schedule: 'Por evento + varredura a cada 1 min', cron: '* * * * *', tab: 'capi' },
  { id: 'optimizer', name: 'GoogleAdsWeeklyOptimizerWorker', icon: <Sparkles />, schedule: 'Toda segunda-feira às 07:00', cron: '0 7 * * 1', tab: 'otimizador' },
  { id: 'outbound', name: 'OutboundProspectingWorker', icon: <Radar />, schedule: 'Dias úteis às 09:00 · throttle 40/h', cron: '0 9 * * 1-5', tab: 'outbound' },
  { id: 'metrics', name: 'MetricsSyncWorker', icon: <ChartColumn />, schedule: 'A cada hora (Google Ads + Meta)', cron: '0 * * * *' },
  { id: 'ig', name: 'IG Comment-to-DM webhook', icon: <ChannelIcon channel="instagram" variant="plain" size="sm" />, schedule: 'Tempo real · webhook Graph API', cron: 'webhook', tab: 'instagram' },
  { id: 'debounce', name: 'Fila de debounce (BullMQ)', icon: <Layers />, schedule: 'Janela deslizante de 5 s · Upstash Redis', cron: 'sliding 5s', tab: 'webhooks' },
]

const DOT: Record<Health, string> = {
  ok: 'bg-success-500',
  running: 'bg-warning-500 animate-pulse',
  warning: 'bg-danger-500',
  idle: 'bg-ink-300',
}
const HEALTH_LABEL: Record<Health, string> = { ok: 'Saudável', running: 'Executando', warning: 'Atenção', idle: 'Ocioso' }

export function WorkersStrip({ onOpen }: { onOpen: (tab: TabKey, autoRun?: boolean) => void }) {
  const runs = useAutomationStore((s) => s.optimizationRuns)
  const events = useAutomationStore((s) => s.conversionEvents)
  const igEvents = useAutomationStore((s) => s.igEvents)

  const [running, setRunning] = useState<WorkerId | null>(null)
  const [lastRunOverride, setLastRunOverride] = useState<Partial<Record<WorkerId, string>>>({})

  const meta = useMemo(() => {
    const lastOpt = runs.reduce<string | null>((a, r) => (!a || r.runDate > a ? r.runDate : a), null)
    const lastIg = igEvents.reduce<string | null>((a, e) => (!a || e.createdAt > a ? e.createdAt : a), null)
    const failed = events.filter((e) => e.status === 'FAILED').length
    const base: Record<WorkerId, { last: string | null; next: string | null; health: Health; extra: string }> = {
      conversions: {
        last: belem('2026-11-20', '10:29'),
        next: belem('2026-11-20', '10:31'),
        health: failed ? 'warning' : 'ok',
        extra: failed ? `${failed} evento(s) com falha` : 'Fila vazia',
      },
      optimizer: { last: lastOpt, next: nextMondayAt7(), health: 'ok', extra: `${runs.length} execuções` },
      outbound: { last: belem('2026-11-20', '09:00'), next: belem('2026-11-23', '09:00'), health: 'ok', extra: 'Resend + template WhatsApp' },
      metrics: { last: belem('2026-11-20', '10:00'), next: belem('2026-11-20', '11:00'), health: 'ok', extra: '8 campanhas sincronizadas' },
      ig: { last: lastIg, next: null, health: 'ok', extra: 'Escutando comments + messages' },
      debounce: { last: belem('2026-11-20', '10:29'), next: null, health: 'ok', extra: '3 jobs aguardando janela' },
    }
    for (const k of Object.keys(lastRunOverride) as WorkerId[]) {
      const v = lastRunOverride[k]
      if (v && (!base[k].last || v > base[k].last!)) base[k].last = v
    }
    if (lastRunOverride.metrics) base.metrics.next = addMinutes(lastRunOverride.metrics, 60)
    return base
  }, [runs, events, igEvents, lastRunOverride])

  const runNow = async (w: WorkerDef) => {
    if (w.id === 'optimizer' || w.id === 'outbound') {
      onOpen(w.tab!, true)
      return
    }
    setRunning(w.id)
    try {
      if (w.id === 'conversions') {
        const n = await api.syncConversions()
        toast.success('OfflineConversionSyncWorker executado', n ? `${n} evento(s) reenviado(s) com 200 OK.` : 'Nenhum evento pendente.')
      } else if (w.id === 'metrics') {
        await api.syncCampaignMetrics()
        toast.success('Métricas sincronizadas', 'Impressões, cliques e investimento atualizados (Google Ads + Meta).')
      } else if (w.id === 'ig') {
        await api.delay(500, 1100)
        toast.success('Webhook do Instagram respondeu', 'GET hub.challenge verificado · assinatura OK.')
      } else {
        await api.delay(500, 1100)
        toast.success('Fila de debounce drenada', '3 jobs consolidados → 3 inferências de IA.')
      }
      setLastRunOverride((o) => ({ ...o, [w.id]: nowISO() }))
    } catch (e) {
      toast.error('Falha ao executar worker', (e as Error).message)
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="scrollbar-thin -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
      {WORKERS.map((w) => {
        const m = meta[w.id]
        const health: Health = running === w.id ? 'running' : m.health
        return (
          <div key={w.id} className="flex w-72 shrink-0 snap-start flex-col rounded-xl border border-line bg-surface p-3.5 shadow-card sm:w-auto">
            <div className="flex items-start gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 [&_svg]:size-4">{w.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Tooltip content={HEALTH_LABEL[health]}>
                    <span className={cn('size-2 shrink-0 rounded-full', DOT[health])} />
                  </Tooltip>
                  <button
                    type="button"
                    onClick={() => w.tab && onOpen(w.tab)}
                    className={cn('truncate font-mono text-[12px] font-semibold text-ink-900', w.tab && 'hover:text-primary-600')}
                    title={w.name}
                  >
                    {w.name}
                  </button>
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-500" title={w.schedule}>
                  {w.schedule} <span className="font-mono text-[10px] text-ink-400">· {w.cron}</span>
                </div>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-ink-400">Última execução</dt>
                <dd className="text-ink-700" title={formatDateTime(m.last)}>
                  {running === w.id ? 'agora…' : formatRelative(m.last)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-400">Próxima</dt>
                <dd className="text-ink-700">{m.next ? formatDateTime(m.next).slice(0, 16) : 'contínuo'}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <span className={cn('truncate text-[11px]', m.health === 'warning' ? 'text-danger-600' : 'text-ink-500')}>{m.extra}</span>
              <Button size="xs" variant="outline" leftIcon={w.id === 'ig' ? <Send /> : <Play />} loading={running === w.id} disabled={!!running && running !== w.id} onClick={() => runNow(w)}>
                {w.id === 'ig' ? 'Testar' : 'Executar agora'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
