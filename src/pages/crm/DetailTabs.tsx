import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpDown,
  Bot,
  CircleCheck,
  Circle,
  ClipboardList,
  Clock,
  Copy,
  CopyCheck,
  ExternalLink,
  Link as LinkIcon,
  MapPin,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Timer,
  TriangleExclamationPoint,
  UserRound,
} from 'lucide-react'
import type { Conversation, DirtProfile, FloorType, Lead, Modality, PowerPreference, Segment } from '@/types/domain'
import { Badge, Button, Input, ProgressBar, Select, StatusPill, Switch, Tabs, toast } from '@/components/ui'
import { useAttributionByLead, useAutomationStore, useCatalogStore, useLeadStore, useMessages } from '@/store'
import * as api from '@/mock/api'
import {
  ATTRIBUTION_CHANNEL_LABEL,
  DIRT_LABEL,
  FLOOR_LABEL,
  LOSS_REASON_LABEL,
  MODALITY_LABEL,
  POWER_LABEL,
  SEGMENT_LABEL,
  STAGE_LABEL,
  formatBRL,
  formatDateTime,
  formatMinutes,
  formatMs,
  originLabel,
} from '@/lib/format'
import { recommendMachines } from '@/lib/sizing'
import { cn } from '@/lib/utils'
import { ALLOWED_UF, SLA_TARGET_MIN, previewBrief, qualificationChecklist, slaInfo } from './helpers'

export type DetailTab = 'qual' | 'rec' | 'brief' | 'attr' | 'hist'

export function DetailTabs({ lead, conv }: { lead: Lead; conv: Conversation | undefined }) {
  const [tab, setTab] = useState<DetailTab>('qual')
  const checklist = qualificationChecklist(lead)
  const done = checklist.filter((c) => c.done).length
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs
        className="shrink-0 px-3"
        size="sm"
        value={tab}
        onChange={(v) => setTab(v as DetailTab)}
        items={[
          { value: 'qual', label: 'Qualificação', icon: <ClipboardList />, count: done },
          { value: 'rec', label: 'Recomendação IA', icon: <Sparkles /> },
          { value: 'brief', label: 'Brief 4 linhas', icon: <Send /> },
          { value: 'attr', label: 'Atribuição', icon: <Target /> },
          { value: 'hist', label: 'Histórico', icon: <Clock /> },
        ]}
      />
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'qual' && <QualificationTab lead={lead} />}
        {tab === 'rec' && <RecommendationTab lead={lead} />}
        {tab === 'brief' && <BriefTab lead={lead} conv={conv} />}
        {tab === 'attr' && <AttributionTab lead={lead} />}
        {tab === 'hist' && <HistoryTab lead={lead} conv={conv} />}
      </div>
    </div>
  )
}

function Section({ title, children, right }: { title: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{title}</h4>
        {right}
      </div>
      {children}
    </section>
  )
}

const opts = <T extends string>(m: Record<T, string>) => [{ value: '', label: '—' }, ...(Object.keys(m) as T[]).map((k) => ({ value: k, label: m[k] }))]

// ───────────────────────────── Qualificação ─────────────────────────────

function QualificationTab({ lead }: { lead: Lead }) {
  const update = useLeadStore((s) => s.updateLeadFields)
  const checklist = qualificationChecklist(lead)
  const done = checklist.filter((c) => c.done).length
  const patch = (p: Partial<Lead>) => update(lead.id, p)
  const outOfRegion = !!lead.locationState && !ALLOWED_UF.includes(lead.locationState)

  return (
    <>
      <Section title="4 campos obrigatórios" right={<span className="text-xs font-medium text-ink-600">{done}/4</span>}>
        <ProgressBar value={done} max={4} size="sm" tone={done === 4 ? 'success' : 'primary'} className="mb-3" />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.key} className={cn('flex items-start gap-2 rounded-xl border px-3 py-2', c.done ? 'border-success-100 bg-success-50/60' : 'border-dashed border-line-strong')}>
              {c.done ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-ink-300" />}
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink-500">{c.label}</div>
                <div className={cn('truncate text-sm', c.done ? 'font-medium text-ink-900' : 'text-ink-400 italic')}>{c.value}</div>
              </div>
            </li>
          ))}
        </ul>
        {done === 4 && lead.kanbanStage === 'QUALIFYING' && (
          <p className="mt-2 text-xs text-success-700">Todos os campos preenchidos — pronto para handoff ao Vinicius.</p>
        )}
      </Section>

      <Section title="Editar campos">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Modalidade" size="sm" value={lead.modality ?? ''} onChange={(e) => patch({ modality: (e.target.value || null) as Modality | null })} options={opts(MODALITY_LABEL)} />
          <Select label="Segmento" size="sm" value={lead.segment ?? ''} onChange={(e) => patch({ segment: (e.target.value || null) as Segment | null })} options={opts(SEGMENT_LABEL)} />
          <Input
            label="Área (m²)"
            size="sm"
            type="number"
            min={0}
            suffix="m²"
            className="num"
            value={lead.areaM2 ?? ''}
            onChange={(e) => patch({ areaM2: e.target.value ? Number(e.target.value) : null })}
          />
          <Select label="Tipo de piso" size="sm" value={lead.floorType ?? ''} onChange={(e) => patch({ floorType: (e.target.value || null) as FloorType | null })} options={opts(FLOOR_LABEL)} />
          <Select label="Sujeira / tráfego" size="sm" value={lead.dirtProfile ?? ''} onChange={(e) => patch({ dirtProfile: (e.target.value || null) as DirtProfile | null })} options={opts(DIRT_LABEL)} />
          <Select
            label="Energia"
            size="sm"
            value={lead.powerPreference ?? ''}
            onChange={(e) => patch({ powerPreference: (e.target.value || null) as PowerPreference | null })}
            options={opts(POWER_LABEL)}
          />
          <Input label="Cidade" size="sm" value={lead.locationCity ?? ''} onChange={(e) => patch({ locationCity: e.target.value || null })} />
          <Input
            label="UF"
            size="sm"
            maxLength={2}
            value={lead.locationState ?? ''}
            onChange={(e) => patch({ locationState: e.target.value.toUpperCase() || null })}
            error={outOfRegion ? 'Fora da cobertura PA/MA/AP' : undefined}
          />
          <Input label="Rotina de uso" size="sm" wrapperClassName="sm:col-span-2" value={lead.usageRoutine ?? ''} onChange={(e) => patch({ usageRoutine: e.target.value || null })} placeholder="Ex.: 2 turnos, lavagem diária" />
          <Input label="Empresa" size="sm" value={lead.companyName ?? ''} onChange={(e) => patch({ companyName: e.target.value || null })} />
          <Input label="CNPJ" size="sm" value={lead.cnpj ?? ''} onChange={(e) => patch({ cnpj: e.target.value || null })} placeholder="00.000.000/0000-00" />
          <div className="sm:col-span-2">
            <Switch
              size="sm"
              checked={!!lead.isB2B}
              onChange={(v) => patch({ isB2B: v })}
              label="Conta B2B (ICP)"
              description={lead.isB2B == null ? 'Ainda não identificado pela IA' : lead.isB2B ? 'Empresa — perfil ICP' : 'Possível residencial / curioso'}
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink-400">Alterações salvas automaticamente · campos também extraídos pela IA (extracted_fields).</p>
      </Section>
    </>
  )
}

// ───────────────────────────── Recomendação ─────────────────────────────

function RecommendationTab({ lead }: { lead: Lead }) {
  const machines = useCatalogStore((s) => s.machines)
  const update = useLeadStore((s) => s.updateLeadFields)
  const suggested = useMemo(
    () =>
      lead.areaM2
        ? recommendMachines(
            { areaM2: lead.areaM2, segment: lead.segment, floorType: lead.floorType, dirtProfile: lead.dirtProfile, powerPreference: lead.powerPreference, needsSweeping: lead.dirtProfile === 'detritos_solidos' || lead.dirtProfile === 'misto' },
            machines,
          )
        : [],
    [lead.areaM2, lead.segment, lead.floorType, lead.dirtProfile, lead.powerPreference, machines],
  )
  const recs = lead.recommendedModels.length ? lead.recommendedModels : suggested
  const isLive = !lead.recommendedModels.length && suggested.length > 0

  return (
    <>
      <Section
        title="Modelos Alfa Tennant recomendados"
        right={
          <Button
            size="xs"
            variant="ghost"
            leftIcon={<RefreshCw />}
            disabled={!lead.areaM2}
            onClick={() => {
              update(lead.id, { recommendedModels: suggested })
              toast.success('Recomendação recalculada', suggested.map((s) => s.modelName).join(' + ') || 'Sem modelo compatível')
            }}
          >
            Recalcular
          </Button>
        }
      >
        {isLive && <p className="mb-2 text-xs text-warning-700">Prévia calculada pela heurística §3.2 — ainda não confirmada pela IA.</p>}
        {recs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-500">Informe a área e o perfil técnico na aba Qualificação para gerar a recomendação.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {recs.map((r) => {
              const m = machines.find((x) => x.id === r.machineId)
              return (
                <div key={r.machineId} className="rounded-xl border border-line p-3 shadow-card">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: m?.color ?? '#2556eb' }}>
                      <Sparkles className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-900">{r.modelName}</span>
                        {m && <Badge tone="neutral">{m.brand}</Badge>}
                        {m?.availableForRental && <Badge tone="violet">Locação</Badge>}
                      </div>
                      <div className="text-xs text-ink-500">{m?.categoryLabel}</div>
                    </div>
                    {r.productivityM2h != null && (
                      <div className="text-right">
                        <div className="num text-sm font-semibold text-ink-900">{r.productivityM2h.toLocaleString('pt-BR')}</div>
                        <div className="text-[10px] text-ink-500">m²/h prática</div>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink-700">{r.reason}</p>
                  {m && lead.areaM2 && (m.practicalM2h ?? m.productivityM2h) && (
                    <p className="mt-1 text-xs text-ink-500">
                      ≈ {formatMinutes((lead.areaM2 / (m.practicalM2h ?? m.productivityM2h!)) * 60)} por passada em {lead.areaM2.toLocaleString('pt-BR')} m²
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
      <div className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">
        <span>Somente modelos do catálogo verificado · zero preço pela IA.</span>
        <Link to="/catalogo" className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline">
          Ver catálogo <ExternalLink className="size-3" />
        </Link>
      </div>
    </>
  )
}

// ───────────────────────────── Brief ─────────────────────────────

const BRIEF_LABELS = ['Contato', 'Modalidade + Origem', 'Perfil técnico', 'Recomendação']

function BriefTab({ lead, conv }: { lead: Lead; conv: Conversation | undefined }) {
  const addMessage = useLeadStore((s) => s.addMessage)
  const events = useLeadStore((s) => s.handoffEvents)
  const lastEvent = useMemo(() => events.find((h) => h.leadId === lead.id), [events, lead.id])
  const [copied, setCopied] = useState(false)
  const [resending, setResending] = useState(false)
  const lines = lead.handoffSummary ?? previewBrief(lead)
  const isPreview = !lead.handoffSummary
  const fullText = `*Novo lead qualificado — Maquinabel*\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
    } catch {
      /* ignore */
    }
    setCopied(true)
    toast.success('Brief copiado')
    setTimeout(() => setCopied(false), 1800)
  }
  const resend = async () => {
    setResending(true)
    await api.delay(600, 1200)
    if (conv) addMessage(conv.id, { senderType: 'SYSTEM', text: 'Brief de 4 linhas reenviado ao WhatsApp do Vinicius Goés.', template: 'novo_lead_qualificado' })
    setResending(false)
    toast.success('Brief reenviado ao Vinicius', 'Template novo_lead_qualificado · WhatsApp Cloud API')
  }

  return (
    <>
      <Section
        title={isPreview ? 'Prévia do brief (ainda não enviado)' : 'Brief enviado ao Vinicius'}
        right={lastEvent && <Badge tone={lastEvent.whatsappDeliveryStatus === 'READ' ? 'success' : 'info'}>{{ SENT: 'Enviado', DELIVERED: 'Entregue', READ: 'Lido', FAILED: 'Falhou' }[lastEvent.whatsappDeliveryStatus]}</Badge>}
      >
        <div className="rounded-2xl bg-[#efeae2] p-3">
          <div className="max-w-full rounded-xl rounded-tl-sm bg-white p-3 text-[13px] leading-relaxed text-ink-800 shadow-xs">
            <div className="mb-1 font-mono text-[10px] text-ink-400">template: novo_lead_qualificado</div>
            <p className="font-semibold">Novo lead qualificado — Maquinabel</p>
            <ol className="mt-1 flex flex-col gap-1.5">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-whatsapp-light text-[11px] font-semibold text-whatsapp-dark">{i + 1}</span>
                  <span className="min-w-0 break-words">
                    <span className="block text-[10.5px] font-medium tracking-wide text-ink-400 uppercase">{BRIEF_LABELS[i]}</span>
                    {i === 3 ? l.replace(/→ \/crm\?lead=.*$/, '') : l}
                    {i === 3 && (
                      <Link to={`/crm?lead=${lead.id}`} className="ml-1 text-[#027eb5] underline">
                        maquinabel.app/crm?lead={lead.id}
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-1 text-right text-[10.5px] text-ink-400">{lastEvent ? formatDateTime(lastEvent.notifiedAt) : 'prévia'}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" leftIcon={copied ? <CopyCheck /> : <Copy />} onClick={copy}>
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button size="sm" variant="success" leftIcon={<Send />} loading={resending} onClick={resend} disabled={isPreview}>
            Reenviar ao Vinicius
          </Button>
        </div>
        {isPreview && <p className="mt-2 text-xs text-ink-500">O brief é enviado automaticamente quando o card vai para «Enviado ao Vendedor».</p>}
      </Section>
    </>
  )
}

// ───────────────────────────── Atribuição ─────────────────────────────

function KV({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
      <span className="shrink-0 text-ink-500">{k}</span>
      <span className={cn('min-w-0 text-right break-all text-ink-800', mono && 'font-mono text-xs')}>{v ?? <span className="text-ink-300">—</span>}</span>
    </div>
  )
}

function AttributionTab({ lead }: { lead: Lead }) {
  const attr = useAttributionByLead(lead.id)
  const allEvents = useAutomationStore((s) => s.conversionEvents)
  const events = useMemo(() => allEvents.filter((e) => e.leadId === lead.id), [allEvents, lead.id])
  const [retrying, setRetrying] = useState<string | null>(null)

  const retry = async (id: string) => {
    setRetrying(id)
    try {
      await api.retryConversion(id)
      toast.success('Conversão reenviada', '200 OK')
    } catch (e) {
      toast.error('Falha ao reenviar conversão', e instanceof Error ? e.message : undefined)
    } finally {
      setRetrying(null)
    }
  }

  return (
    <>
      <Section title="Sessão & canal">
        <div className="rounded-xl border border-line px-3">
          <KV k="Código de sessão" v={attr?.sessionCode ? <Badge tone="primary">{attr.sessionCode}</Badge> : null} />
          <KV k="Origem" v={`${lead.originTag} · ${originLabel(lead.originTag)}`} />
          <KV k="Canal" v={attr ? ATTRIBUTION_CHANNEL_LABEL[attr.channel] : null} />
          <KV k="Landing page" v={attr?.landingUrl} mono />
          <KV k="Referrer" v={attr?.referrer} mono />
        </div>
      </Section>
      <Section title="UTMs & click IDs">
        <div className="rounded-xl border border-line px-3">
          <KV k="utm_source" v={attr?.utmSource} mono />
          <KV k="utm_medium" v={attr?.utmMedium} mono />
          <KV k="utm_campaign" v={attr?.utmCampaign} mono />
          <KV k="utm_term" v={attr?.utmTerm} mono />
          <KV k="utm_content" v={attr?.utmContent} mono />
          <KV k="gclid" v={attr?.gclid} mono />
          <KV k="fbclid" v={attr?.fbclid} mono />
          <KV k="ig_media_id" v={attr?.igMediaId} mono />
        </div>
      </Section>
      <Section title="Conversões offline">
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong p-4 text-center text-xs text-ink-500">
            Nenhum evento ainda. SQL é enviado no handoff; WON no fechamento (Google Ads & Meta CAPI).
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <div key={e.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={e.event === 'WON' ? 'success' : 'violet'}>{e.event}</Badge>
                  <span className="text-sm font-medium text-ink-800">{e.platform === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta CAPI'}</span>
                  <StatusPill kind="conversion" value={e.status} className="ml-auto" />
                </div>
                <div className="mt-1 text-xs text-ink-500">{e.conversionAction}</div>
                {e.valueBRL > 0 && <div className="num mt-1 text-xs text-ink-700">Valor: {formatBRL(e.valueBRL)}</div>}
                {e.responseMessage && <div className="mt-1 truncate font-mono text-[10.5px] text-ink-400">{e.responseCode ? `${e.responseCode} · ` : ''}{e.responseMessage}</div>}
                {e.status === 'FAILED' && (
                  <Button size="xs" variant="outline" className="mt-2" leftIcon={<RefreshCw />} loading={retrying === e.id} onClick={() => retry(e.id)}>
                    Reenviar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}

// ───────────────────────────── Histórico ─────────────────────────────

interface TimelineItem {
  at: string
  icon: ReactNode
  tone: string
  title: string
  detail?: string
}

function HistoryTab({ lead, conv }: { lead: Lead; conv: Conversation | undefined }) {
  const messages = useMessages(conv?.id)
  const events = useLeadStore((s) => s.handoffEvents)
  const sla = slaInfo(lead, conv)

  const items = useMemo(() => {
    const out: TimelineItem[] = [{ at: lead.createdAt, icon: <UserRound />, tone: 'bg-info-500', title: 'Lead criado', detail: `Origem ${lead.originTag}` }]
    const firstAi = messages.find((m) => m.senderType === 'AI')
    if (firstAi) out.push({ at: firstAi.createdAt, icon: <Bot />, tone: 'bg-violet-500', title: 'Primeira resposta da IA', detail: conv?.firstResponseMs != null ? `em ${formatMs(conv.firstResponseMs)}` : undefined })
    for (const h of events.filter((e) => e.leadId === lead.id))
      out.push({
        at: h.notifiedAt,
        icon: <Send />,
        tone: 'bg-violet-600',
        title: h.triggerReason === 'HUMAN_REQUESTED' ? 'Handoff (lead pediu humano)' : 'Handoff para Vinicius Goés',
        detail: `Brief 4 linhas via WhatsApp${h.afterHours ? ' · fora do horário' : ''}${h.acknowledgedAt ? ` · reconhecido ${formatDateTime(h.acknowledgedAt)}` : ''}`,
      })
    if (conv?.humanFirstResponseAt)
      out.push({ at: conv.humanFirstResponseAt, icon: <UserRound />, tone: 'bg-whatsapp', title: 'Primeira resposta humana', detail: `SLA ${formatMinutes(conv.humanSlaMinutes)}` })
    for (const m of messages.filter((x) => x.senderType === 'SYSTEM' && !x.template))
      out.push({ at: m.createdAt, icon: /pausada|retomada/i.test(m.text) ? <Bot /> : <ArrowUpDown />, tone: 'bg-ink-400', title: m.text.length > 80 ? m.text.slice(0, 78) + '…' : m.text })
    if (lead.proposalAt) out.push({ at: lead.proposalAt, icon: <Send />, tone: 'bg-warning-500', title: 'Proposta enviada', detail: formatBRL(lead.proposalValueBRL) })
    if (lead.closedAt && lead.kanbanStage === 'WON')
      out.push({ at: lead.closedAt, icon: <CircleCheck />, tone: 'bg-success-500', title: 'Fechado (Ganho)', detail: `${lead.closedModality ? MODALITY_LABEL[lead.closedModality] : ''} · ${formatBRL(lead.closedValueBRL)}` })
    if (lead.closedAt && (lead.kanbanStage === 'LOST' || lead.kanbanStage === 'DISQUALIFIED'))
      out.push({ at: lead.closedAt, icon: <TriangleExclamationPoint />, tone: 'bg-danger-500', title: STAGE_LABEL[lead.kanbanStage], detail: lead.lossReason ? `Motivo: ${LOSS_REASON_LABEL[lead.lossReason]}${lead.lossNotes ? ` — ${lead.lossNotes}` : ''}` : undefined })
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, [lead, conv, messages, events])

  return (
    <>
      <Section title="SLA">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <Bot className="size-3.5" /> 1ª resposta IA
            </div>
            <div className="num mt-1 text-lg font-semibold text-ink-900">{formatMs(conv?.firstResponseMs)}</div>
            <div className="text-[11px] text-ink-400">meta &lt; 60 s · 24/7</div>
          </div>
          <div className={cn('rounded-xl border p-3', sla.breached ? 'border-danger-100 bg-danger-50/50' : 'border-line')}>
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <Timer className="size-3.5" /> 1ª resposta humana {sla.waiting && <Badge tone="warning">aguardando</Badge>}
            </div>
            <div className={cn('num mt-1 text-lg font-semibold', sla.breached ? 'text-danger-700' : 'text-ink-900')}>{sla.minutes != null ? formatMinutes(sla.minutes) : '—'}</div>
            {sla.minutes != null ? (
              <ProgressBar value={sla.minutes} max={SLA_TARGET_MIN * 2} size="xs" tone={sla.breached ? 'danger' : 'success'} marker={SLA_TARGET_MIN} markerLabel="15 min" className="mt-1" />
            ) : (
              <div className="text-[11px] text-ink-400">sem handoff ainda</div>
            )}
            <div className="mt-1 text-[11px] text-ink-400">meta ≤ 15 min (horário comercial)</div>
          </div>
        </div>
      </Section>
      <Section title="Linha do tempo">
        <ol className="relative ml-2 border-l border-line">
          {items.map((it, i) => (
            <li key={i} className="relative pb-4 pl-5 last:pb-0">
              <span className={cn('absolute top-0 -left-[11px] flex size-[22px] items-center justify-center rounded-full text-white ring-4 ring-white [&_svg]:size-3', it.tone)}>{it.icon}</span>
              <div className="text-sm font-medium text-ink-800">{it.title}</div>
              {it.detail && <div className="text-xs text-ink-500">{it.detail}</div>}
              <div className="text-[11px] text-ink-400">{formatDateTime(it.at)}</div>
            </li>
          ))}
        </ol>
      </Section>
      {(lead.locationCity || lead.locationState) && (
        <p className="flex items-center gap-1 text-[11px] text-ink-400">
          <MapPin className="size-3" /> {lead.locationCity}/{lead.locationState} <LinkIcon className="ml-2 size-3" /> {lead.id}
        </p>
      )}
    </>
  )
}
