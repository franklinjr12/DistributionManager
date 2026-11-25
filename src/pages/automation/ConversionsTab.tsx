import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleCheck, Gauge, RefreshCw, RotateCcw, Search, Send, Target, Timer } from 'lucide-react'
import type { ConversionPlatform, ConversionStatus, OfflineConversionEvent } from '@/types/domain'
import * as api from '@/mock/api'
import { useAutomationStore } from '@/store'
import { Badge, Button, Card, ChannelIcon, Drawer, EmptyState, Input, KpiCard, Num, Select, StatusPill, Table, Tooltip, toast } from '@/components/ui'
import { formatBRL, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { cn, median } from '@/lib/utils'
import { formatLatency, latencySeconds, truncHash, truncId } from './lib'
import { CodeBlock, JobConsole, Mono, TableSkeleton, useBoot, useJob } from './shared'

const PLATFORM_LABEL: Record<ConversionPlatform, string> = { GOOGLE_ADS: 'Google Ads', META_CAPI: 'Meta CAPI' }
const SYNC_STEPS = ['Buscando eventos pendentes', 'Google Ads API · UploadClickConversions', 'Meta Conversions API · /events']

function matchKeyOf(e: OfflineConversionEvent) {
  if (e.platform === 'GOOGLE_ADS' && e.matchKey.gclid) return { label: 'gclid', value: truncId(e.matchKey.gclid, 16) }
  if (e.platform === 'META_CAPI' && e.matchKey.fbclid) return { label: 'fbclid', value: truncId(e.matchKey.fbclid, 16) }
  if (e.matchKey.emailSha256) return { label: 'email SHA-256', value: truncHash(e.matchKey.emailSha256) }
  if (e.matchKey.phoneSha256) return { label: 'phone SHA-256', value: truncHash(e.matchKey.phoneSha256) }
  return { label: '—', value: 'sem chave' }
}

function matchQuality(e: OfflineConversionEvent) {
  const k = e.matchKey
  return [k.gclid || k.fbclid, k.emailSha256, k.phoneSha256].filter(Boolean).length
}

export function ConversionsTab() {
  const events = useAutomationStore((s) => s.conversionEvents)
  const booting = useBoot()
  const [platform, setPlatform] = useState<'ALL' | ConversionPlatform>('ALL')
  const [status, setStatus] = useState<'ALL' | ConversionStatus>('ALL')
  const [type, setType] = useState<'ALL' | 'SQL' | 'WON'>('ALL')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  const { job, run, running } = useJob(SYNC_STEPS)

  const sorted = useMemo(() => [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [events])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return sorted.filter(
      (e) =>
        (platform === 'ALL' || e.platform === platform) &&
        (status === 'ALL' || e.status === status) &&
        (type === 'ALL' || e.event === type) &&
        (!s || e.leadName.toLowerCase().includes(s) || e.leadId.includes(s)),
    )
  }, [sorted, platform, status, type, q])

  const kpis = useMemo(() => {
    const sent = events.filter((e) => e.status === 'SENT')
    const done = events.filter((e) => e.status === 'SENT' || e.status === 'FAILED')
    const lat = sent.map((e) => latencySeconds(e.createdAt, e.sentAt)).filter((x): x is number => x != null)
    const matched = events.filter((e) => matchQuality(e) >= 2).length
    return {
      sent: sent.length,
      success: done.length ? sent.length / done.length : null,
      matchRate: events.length ? matched / events.length : null,
      latency: median(lat),
      value: sent.filter((e) => e.event === 'WON').reduce((a, e) => a + e.valueBRL, 0),
    }
  }, [events])

  const failedCount = events.filter((e) => e.status === 'FAILED' || e.status === 'PENDING').length
  const open = events.find((e) => e.id === openId) ?? null

  const retry = async (id: string) => {
    setRetrying(id)
    try {
      await api.retryConversion(id)
      toast.success('Evento reenviado', 'Resposta 200 OK da plataforma.')
    } catch (e) {
      toast.error('Reenvio falhou', (e as Error).message)
    } finally {
      setRetrying(null)
    }
  }

  const syncAll = async () => {
    const n = await run((onStep) => api.syncConversions(onStep), 'Falha na sincronização')
    if (n != null) toast.success('Sincronização concluída', n ? `${n} evento(s) enviados com 200 OK.` : 'Nenhum evento pendente.')
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard loading={booting} label="Eventos enviados" value={formatNumber(kpis.sent)} icon={<Send />} caption={`${formatBRL(kpis.value, { decimals: 0 })} em vendas (WON) devolvidos às plataformas`} />
        <KpiCard loading={booting} label="Taxa de sucesso" value={formatPercent(kpis.success)} icon={<CircleCheck />} iconTone="success" caption="200 OK / eventos processados" />
        <KpiCard loading={booting} label="Match rate" value={formatPercent(kpis.matchRate)} icon={<Target />} iconTone="violet" caption="≥ 2 chaves (click id + hash e-mail/telefone)" />
        <KpiCard
          loading={booting}
          label="Tempo médio até envio"
          value={formatLatency(kpis.latency)}
          icon={<Timer />}
          iconTone={kpis.latency != null && kpis.latency < 60 ? 'success' : 'warning'}
          caption="meta < 60 s (E2-05)"
        />
      </div>

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-900">Eventos de conversão offline</div>
            <p className="text-xs text-ink-500">SQL (handoff qualificado) e WON (venda com valor BRL) → Google Ads API v26 (gclid) e Meta CAPI v26.0 (fbclid + SHA-256).</p>
          </div>
          <Button size="sm" variant="outline" leftIcon={<RefreshCw />} loading={running} onClick={syncAll}>
            Sincronizar pendentes{failedCount ? ` (${failedCount})` : ''}
          </Button>
        </div>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input size="sm" placeholder="Buscar lead…" leftIcon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            size="sm"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
            options={[
              { value: 'ALL', label: 'Todas as plataformas' },
              { value: 'GOOGLE_ADS', label: 'Google Ads' },
              { value: 'META_CAPI', label: 'Meta CAPI' },
            ]}
          />
          <Select
            size="sm"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            options={[
              { value: 'ALL', label: 'Todos os eventos' },
              { value: 'SQL', label: 'SQL (lead qualificado)' },
              { value: 'WON', label: 'WON (venda fechada)' },
            ]}
          />
          <Select
            size="sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            options={[
              { value: 'ALL', label: 'Todos os status' },
              { value: 'SENT', label: 'Enviado' },
              { value: 'PENDING', label: 'Pendente' },
              { value: 'FAILED', label: 'Falhou' },
            ]}
          />
        </div>
        {job.status !== 'idle' && (
          <div className="border-b border-line p-4">
            <JobConsole job={job} title="worker:OfflineConversionSyncWorker · flush" />
          </div>
        )}
        {booting ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={<Gauge />} title="Nenhum evento encontrado" description="Mova um lead para Handoff ou Ganho no CRM para disparar uma conversão." />
        ) : (
          <Table hover compact>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Evento</th>
                <th>Plataforma</th>
                <th>Chave de match</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th>Criado</th>
                <th className="text-right">Latência</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const mk = matchKeyOf(e)
                const lat = latencySeconds(e.createdAt, e.sentAt)
                return (
                  <tr key={e.id} className="cursor-pointer" onClick={() => setOpenId(e.id)}>
                    <td>
                      <Link to={`/crm?lead=${e.leadId}`} onClick={(ev) => ev.stopPropagation()} className="font-medium whitespace-nowrap text-ink-900 hover:text-primary-600 hover:underline">
                        {e.leadName}
                      </Link>
                      <div className="font-mono text-[10px] text-ink-400">{e.leadId}</div>
                    </td>
                    <td>
                      <Badge tone={e.event === 'WON' ? 'success' : 'primary'}>{e.event}</Badge>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <ChannelIcon channel={e.platform === 'GOOGLE_ADS' ? 'google' : 'meta'} size="xs" />
                        {PLATFORM_LABEL[e.platform]}
                      </span>
                    </td>
                    <td>
                      <div className="text-[10px] text-ink-400 uppercase">{mk.label}</div>
                      <Mono>{mk.value}</Mono>
                    </td>
                    <td>
                      <Num>{e.valueBRL ? formatBRL(e.valueBRL) : '—'}</Num>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <StatusPill kind="conversion" value={e.status} />
                        {e.responseCode != null && <span className={cn('num text-[11px]', e.responseCode === 200 ? 'text-success-700' : 'text-danger-600')}>{e.responseCode}</span>}
                      </div>
                    </td>
                    <td className="text-xs whitespace-nowrap text-ink-500">{formatDateTime(e.createdAt)}</td>
                    <td>
                      <Num className={cn(lat != null && lat >= 60 && 'text-danger-600')}>{formatLatency(lat)}</Num>
                    </td>
                    <td className="text-right" onClick={(ev) => ev.stopPropagation()}>
                      {e.status === 'FAILED' && (
                        <Button size="xs" variant="outline" leftIcon={<RotateCcw />} loading={retrying === e.id} onClick={() => retry(e.id)}>
                          Reenviar
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <ConversionDrawer event={open} onClose={() => setOpenId(null)} onRetry={retry} retrying={retrying === open?.id} />
    </div>
  )
}

function ConversionDrawer({ event, onClose, onRetry, retrying }: { event: OfflineConversionEvent | null; onClose: () => void; onRetry: (id: string) => void; retrying: boolean }) {
  if (!event) return <Drawer open={false} onClose={onClose} />
  const e = event
  const ts = Math.floor(new Date(e.createdAt).getTime() / 1000)
  const request =
    e.platform === 'GOOGLE_ADS'
      ? {
          method: 'POST',
          url: 'https://googleads.googleapis.com/v26/customers/4829137705:uploadClickConversions',
          body: {
            conversions: [
              {
                gclid: e.matchKey.gclid,
                conversion_action: `customers/4829137705/conversionActions/${e.event === 'SQL' ? '611204' : '611205'}`,
                conversion_date_time: formatDateTime(e.createdAt).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1') + ':00-03:00',
                conversion_value: e.valueBRL,
                currency_code: 'BRL',
                user_identifiers: [
                  e.matchKey.emailSha256 && { hashed_email: e.matchKey.emailSha256 },
                  e.matchKey.phoneSha256 && { hashed_phone_number: e.matchKey.phoneSha256 },
                ].filter(Boolean),
              },
            ],
            partial_failure: true,
          },
        }
      : {
          method: 'POST',
          url: 'https://graph.facebook.com/v26.0/1180044729913/events',
          body: {
            data: [
              {
                event_name: e.event === 'SQL' ? 'QualifiedLead' : 'Purchase',
                event_time: ts,
                action_source: 'system_generated',
                user_data: {
                  em: e.matchKey.emailSha256 ? [e.matchKey.emailSha256] : undefined,
                  ph: e.matchKey.phoneSha256 ? [e.matchKey.phoneSha256] : undefined,
                  fbc: e.matchKey.fbclid ? `fb.1.${ts}000.${e.matchKey.fbclid}` : undefined,
                },
                custom_data: { value: e.valueBRL, currency: 'BRL', lead_id: e.leadId },
              },
            ],
          },
        }
  const ok = e.status === 'SENT'
  const response =
    e.status === 'PENDING'
      ? '// aguardando resposta…'
      : ok
        ? JSON.stringify(
            e.platform === 'GOOGLE_ADS'
              ? { results: [{ gclid: e.matchKey.gclid, conversion_action: 'customers/4829137705/conversionActions/…', conversion_date_time: '…' }], partial_failure_error: null }
              : { events_received: 1, messages: [], fbtrace_id: 'AbX9' + e.id.slice(-6) },
            null,
            2,
          )
        : JSON.stringify({ error: { code: e.responseCode, message: e.responseMessage ?? 'Gateway Timeout', status: 'UNAVAILABLE' } }, null, 2)
  const lat = latencySeconds(e.createdAt, e.sentAt)

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={`${e.event} · ${PLATFORM_LABEL[e.platform]}`}
      description={e.conversionAction}
      headerActions={<StatusPill kind="conversion" value={e.status} />}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Link to={`/crm?lead=${e.leadId}`} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
            Abrir lead no CRM <ArrowUpRight className="size-3.5" />
          </Link>
          {e.status === 'FAILED' && (
            <Button size="sm" leftIcon={<RotateCcw />} loading={retrying} onClick={() => onRetry(e.id)}>
              Reenviar evento
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Item label="Lead" value={e.leadName} />
          <Item label="Valor" value={e.valueBRL ? formatBRL(e.valueBRL) : '—'} />
          <Item label="Criado em" value={formatDateTime(e.createdAt)} />
          <Item label="Enviado em" value={formatDateTime(e.sentAt)} />
          <Item label="Latência" value={formatLatency(lat)} />
          <Item label="Tentativas" value={String(e.attempts)} />
        </dl>
        <div>
          <div className="mb-2 text-xs font-medium text-ink-500">Chaves de correspondência</div>
          <div className="space-y-1.5 text-xs">
            {(
              [
                ['gclid', e.matchKey.gclid],
                ['fbclid', e.matchKey.fbclid],
                ['email (SHA-256)', e.matchKey.emailSha256],
                ['telefone E.164 (SHA-256)', e.matchKey.phoneSha256],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-ink-500">{k}</span>
                {v ? (
                  <Tooltip content={v}>
                    <Mono>{k.includes('SHA') ? truncHash(v, 16) : truncId(v, 24)}</Mono>
                  </Tooltip>
                ) : (
                  <span className="text-ink-300">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <CodeBlock title={`${request.method} ${request.url}`} code={JSON.stringify(request.body, null, 2)} />
        <CodeBlock
          title={e.status === 'PENDING' ? 'Resposta pendente' : `${e.responseCode} ${ok ? 'OK' : 'ERRO'} · ${e.responseMessage ?? ''}`}
          tone={ok ? 'success' : e.status === 'FAILED' ? 'danger' : 'neutral'}
          code={response}
        />
      </div>
    </Drawer>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink-900">{value}</dd>
    </div>
  )
}
