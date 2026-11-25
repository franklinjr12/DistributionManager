import { useEffect, useMemo, useState } from 'react'
import { BellRing, Inbox, Layers, RotateCcw, ServerCrash, ShieldCheck, ShieldX, Timer, TriangleExclamationPoint, Webhook } from 'lucide-react'
import * as api from '@/mock/api'
import { useNotificationStore } from '@/store'
import { Badge, Button, Card, CardHeader, ChannelIcon, EmptyState, Input, KpiCard, Num, ProgressBar, Select, Switch, Table, Tooltip, toast } from '@/components/ui'
import { formatDateTime, formatNumber, formatPercent, formatTime } from '@/lib/format'
import { cn, fakeSha256, nowISO, uid } from '@/lib/utils'
import { buildDeadLetters, buildDebounceJobs, buildWebhookLogs, truncId, type DeadLetter, type DebounceJob, type WebhookLog, type WebhookSource, type WebhookStatus } from './lib'
import { Mono, TableSkeleton, useBoot } from './shared'

const SOURCE_LABEL: Record<WebhookSource, string> = { WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', WIDGET: 'Widget site' }
const SOURCE_CH = { WHATSAPP: 'whatsapp', INSTAGRAM: 'instagram', WIDGET: 'site' } as const
const STATUS_LABEL: Record<WebhookStatus, string> = { PROCESSED: 'Processado', DUPLICATE: 'Duplicado (ignorado)', FAILED: 'Rejeitado', RETRYING: 'Em retry' }
const STATUS_TONE = { PROCESSED: 'success', DUPLICATE: 'neutral', FAILED: 'danger', RETRYING: 'warning' } as const

export function WebhooksTab() {
  const booting = useBoot()
  const [logs, setLogs] = useState<WebhookLog[]>(() => buildWebhookLogs())
  const [dlq, setDlq] = useState<DeadLetter[]>(() => buildDeadLetters())
  const [source, setSource] = useState<'ALL' | WebhookSource>('ALL')
  const [status, setStatus] = useState<'ALL' | WebhookStatus>('ALL')
  const [retrying, setRetrying] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [alertFired, setAlertFired] = useState<string | null>(null)
  const [threshold, setThreshold] = useState('3')
  const [windowMin, setWindowMin] = useState('5')
  const [channels, setChannels] = useState({ slack: true, whatsapp: true, email: false })

  const filtered = useMemo(() => logs.filter((l) => (source === 'ALL' || l.source === source) && (status === 'ALL' || l.status === status)), [logs, source, status])

  const kpis = useMemo(() => {
    const acks = [...logs.map((l) => l.ackMs)].sort((a, b) => a - b)
    const p95 = acks[Math.floor(acks.length * 0.95)] ?? 0
    return {
      p95,
      under200: logs.length ? logs.filter((l) => l.ackMs < 200).length / logs.length : 0,
      dup: logs.filter((l) => l.status === 'DUPLICATE').length,
      hmacFail: logs.filter((l) => !l.hmacValid).length,
    }
  }, [logs])

  const retryDlq = async (d: DeadLetter) => {
    setRetrying(d.id)
    try {
      await api.delay(700, 1500)
      api.maybeFail('dlq-retry')
      setDlq((x) => x.filter((y) => y.id !== d.id))
      toast.success('Job reprocessado com sucesso', `${d.queue} · ${d.jobName}`)
    } catch (e) {
      setDlq((x) => x.map((y) => (y.id === d.id ? { ...y, attempts: y.attempts + 1, failedAt: nowISO() } : y)))
      toast.error('Retry falhou', (e as Error).message)
    } finally {
      setRetrying(null)
    }
  }

  const simulateOutage = async () => {
    setSimulating(true)
    setAlertFired(null)
    const n = Number(threshold) + 1
    for (let i = 0; i < n; i++) {
      await api.delay(250, 450)
      const t = nowISO()
      setLogs((x) => [
        {
          id: uid('wh'),
          source: 'INSTAGRAM',
          endpoint: '/webhooks/meta/instagram',
          eventType: 'comments',
          metaMessageId: `ig.${fakeSha256(t + i).slice(0, 20).toUpperCase()}`,
          hmacValid: true,
          ackMs: 40 + Math.round(Math.random() * 60),
          status: 'RETRYING',
          httpStatus: 200,
          receivedAt: t,
          note: 'Graph API 500 ao enviar private reply — retry 3/3 com backoff exponencial (2s, 4s, 8s)',
        },
        ...x,
      ])
    }
    setDlq((x) => [
      {
        id: uid('dlq'),
        queue: 'ig-comment-dm',
        jobName: 'send-private-reply',
        error: 'Graph API 500 · simulado — 3 tentativas esgotadas',
        attempts: 3,
        failedAt: nowISO(),
        payloadPreview: '{"comment_id":"1799…","media_tag":"IG_Reels_S16"}',
      },
      ...x,
    ])
    const active = Object.entries(channels)
      .filter(([, v]) => v)
      .map(([k]) => ({ slack: 'Slack', whatsapp: 'WhatsApp', email: 'E-mail' })[k as 'slack'])
    const msg = `${n} falhas em ${windowMin} min no webhook do Instagram → alerta enviado (${active.join(', ') || 'nenhum canal'})`
    setAlertFired(msg)
    useNotificationStore.getState().pushNotification({ type: 'SYSTEM', title: 'Alerta: falhas no webhook do Instagram', body: msg, href: '/automacao?tab=webhooks' })
    toast.warning('Alerta de falhas disparado', msg)
    setSimulating(false)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard loading={booting} label="Ack p95" value={`${kpis.p95} ms`} icon={<Timer />} iconTone={kpis.p95 < 200 ? 'success' : 'danger'} caption={`${formatPercent(kpis.under200, 0)} abaixo de 200 ms (E4-02)`} />
        <KpiCard loading={booting} label="Webhooks recebidos" value={formatNumber(logs.length)} icon={<Webhook />} caption="últimas ~3 horas" />
        <KpiCard loading={booting} label="Duplicados ignorados" value={formatNumber(kpis.dup)} icon={<ShieldCheck />} iconTone="info" caption="dedupe por meta_message_id" />
        <KpiCard loading={booting} label="Dead-letter" value={formatNumber(dlq.length)} icon={<ServerCrash />} iconTone={dlq.length ? 'warning' : 'success'} caption={`${kpis.hmacFail} assinatura(s) HMAC inválida(s)`} />
      </div>

      {alertFired && (
        <div className="animate-fade-in flex items-start gap-3 rounded-xl border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700">
          <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Regra de alerta disparada</div>
            <div className="text-xs">{alertFired}</div>
          </div>
          <Button size="xs" variant="ghost" onClick={() => setAlertFired(null)}>
            Dispensar
          </Button>
        </div>
      )}

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-900">Log de webhooks</div>
            <p className="text-xs text-ink-500">Verificação X-Hub-Signature-256 (HMAC SHA-256), dedupe por meta_message_id e ack imediato antes de enfileirar no BullMQ.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-96">
            <Select
              size="sm"
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              options={[{ value: 'ALL', label: 'Todas as origens' }, ...(Object.keys(SOURCE_LABEL) as WebhookSource[]).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))]}
            />
            <Select
              size="sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              options={[{ value: 'ALL', label: 'Todos os status' }, ...(Object.keys(STATUS_LABEL) as WebhookStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
            />
          </div>
        </div>
        {booting ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={<Inbox />} title="Nenhum webhook neste filtro" />
        ) : (
          <Table hover compact wrapperClassName="max-h-[460px] overflow-y-auto">
            <thead>
              <tr>
                <th>Recebido</th>
                <th>Origem</th>
                <th>Evento</th>
                <th>HMAC</th>
                <th>meta_message_id</th>
                <th className="text-right">Ack</th>
                <th>Status</th>
                <th className="min-w-[220px]">Observação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="num text-xs whitespace-nowrap text-ink-600">{formatTime(l.receivedAt)}:{l.receivedAt.slice(17, 19)}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
                      <ChannelIcon channel={SOURCE_CH[l.source]} size="xs" />
                      {SOURCE_LABEL[l.source]}
                    </span>
                  </td>
                  <td>
                    <div className="font-mono text-[11px] text-ink-800">{l.eventType}</div>
                    <div className="font-mono text-[10px] text-ink-400">{l.endpoint}</div>
                  </td>
                  <td>
                    {l.source === 'WIDGET' ? (
                      <Tooltip content="Widget usa token de sessão, não HMAC Meta">
                        <span className="text-xs text-ink-400">n/a</span>
                      </Tooltip>
                    ) : l.hmacValid ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success-700">
                        <ShieldCheck className="size-3.5" /> válido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-danger-600">
                        <ShieldX className="size-3.5" /> inválido
                      </span>
                    )}
                  </td>
                  <td>
                    <Tooltip content={l.metaMessageId}>
                      <Mono>{truncId(l.metaMessageId, 16)}</Mono>
                    </Tooltip>
                  </td>
                  <td>
                    <Num className={cn('whitespace-nowrap', l.ackMs >= 200 && 'text-danger-600')}>{l.ackMs} ms</Num>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                      <span className={cn('num text-[11px]', l.httpStatus === 200 ? 'text-ink-400' : 'text-danger-600')}>{l.httpStatus}</span>
                    </div>
                  </td>
                  <td className="text-xs whitespace-normal text-ink-500">{l.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <DebounceQueue />

        <Card padding="none">
          <CardHeader icon={<ServerCrash />} title="Dead-letter queue" description="Jobs que esgotaram 3 tentativas com backoff" />
          {dlq.length === 0 ? (
            <EmptyState compact icon={<ShieldCheck />} title="Fila limpa" description="Nenhum job falho no momento." />
          ) : (
            <ul className="divide-y divide-line">
              {dlq.map((d) => (
                <li key={d.id} className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Mono>{d.queue}</Mono>
                        <span className="text-xs font-medium text-ink-800">{d.jobName}</span>
                      </div>
                      <div className="mt-1 text-xs text-danger-600">{d.error}</div>
                      <div className="mt-1 truncate font-mono text-[10px] text-ink-400" title={d.payloadPreview}>
                        {d.payloadPreview}
                      </div>
                      <div className="mt-1 text-[11px] text-ink-400">
                        {d.attempts} tentativas · {formatDateTime(d.failedAt)}
                      </div>
                    </div>
                    <Button size="xs" variant="outline" leftIcon={<RotateCcw />} loading={retrying === d.id} onClick={() => retryDlq(d)}>
                      Retry
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="none">
          <CardHeader icon={<BellRing />} title="Regra de alerta de falhas" description="E4-06 · notifica o desenvolvedor" />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
              Se houver mais de
              <Input size="sm" type="number" min={1} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-16" wrapperClassName="w-16" />
              falhas em
              <Input size="sm" type="number" min={1} value={windowMin} onChange={(e) => setWindowMin(e.target.value)} className="w-16" wrapperClassName="w-16" />
              min → alerta
            </div>
            <div className="space-y-2.5">
              <Switch size="sm" checked={channels.slack} onChange={(v) => setChannels({ ...channels, slack: v })} label="Slack #alertas-maquinabel" />
              <Switch size="sm" checked={channels.whatsapp} onChange={(v) => setChannels({ ...channels, whatsapp: v })} label="WhatsApp do desenvolvedor" />
              <Switch size="sm" checked={channels.email} onChange={(v) => setChannels({ ...channels, email: v })} label="E-mail" />
            </div>
            <div className="rounded-md bg-ink-50 p-2.5 text-[11px] text-ink-500">
              Falhas são persistidas em <span className="font-mono">webhook_logs</span> e reprocessadas 3× (backoff exponencial) sem perder a mensagem.
            </div>
            <Button fullWidth variant="outline" leftIcon={<TriangleExclamationPoint />} loading={simulating} onClick={simulateOutage}>
              Simular erro 500 da Meta
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

const NEW_MSGS = ['e o prazo de entrega?', 'ok', 'piso é epóxi', 'somos de Belém', 'quanto tempo de locação mínimo?', 'obrigado!']

function DebounceQueue() {
  const [state, setState] = useState<{ jobs: DebounceJob[]; fired: number }>(() => ({ jobs: buildDebounceJobs(), fired: 0 }))
  const { jobs, fired } = state

  useEffect(() => {
    const t = setInterval(() => {
      setState((s) => {
        let count = 0
        const next = s.jobs.map((j) => {
          const w = j.windowEndsInMs - 200
          if (w <= 0) {
            count++
            return { ...j, windowEndsInMs: 5000, bufferedMessages: [NEW_MSGS[(s.fired + count) % NEW_MSGS.length]] }
          }
          return { ...j, windowEndsInMs: w }
        })
        return { jobs: next, fired: s.fired + count }
      })
    }, 200)
    return () => clearInterval(t)
  }, [])

  return (
    <Card padding="none">
      <CardHeader
        icon={<Layers />}
        title="Fila de debounce (BullMQ)"
        description="Janela deslizante de 5 s por conversation_id"
        actions={<Badge tone="success" dot>{`${fired} inferências`}</Badge>}
      />
      <ul className="divide-y divide-line">
        {jobs.map((j) => (
          <li key={j.id} className="p-4">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">{j.leadName}</span>
              <Mono>{j.conversationId}</Mono>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {j.bufferedMessages.map((m, i) => (
                <span key={i} className="rounded-md bg-whatsapp-light px-1.5 py-0.5 text-[11px] text-ink-700">
                  {m}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar className="flex-1" size="xs" value={5000 - j.windowEndsInMs} max={5000} tone="primary" />
              <span className="num w-12 text-right text-[11px] text-ink-500">{(j.windowEndsInMs / 1000).toFixed(1).replace('.', ',')} s</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-4 py-2.5 text-[11px] text-ink-500">{jobs.reduce((a, j) => a + j.bufferedMessages.length, 0)} mensagens em buffer → 1 chamada ao LLM por conversa</div>
    </Card>
  )
}
