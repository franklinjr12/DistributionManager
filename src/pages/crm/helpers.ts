import { useEffect, useState } from 'react'
import type { Conversation, KanbanStage, Lead, LossReason, Tone } from '@/types/domain'
import { DIRT_LABEL, FLOOR_LABEL, MODALITY_LABEL, SEGMENT_LABEL } from '@/lib/format'
import { isBusinessHours, now } from '@/lib/utils'

export const ALLOWED_UF = ['PA', 'MA', 'AP']
export const SLA_TARGET_MIN = 15

export interface ColumnDef {
  id: KanbanStage
  label: string
  stages: KanbanStage[]
  tone: Tone
  /** which BRL value to sum in the header */
  sum?: 'proposal' | 'closed'
  emptyHint: string
}

export const COLUMNS: ColumnDef[] = [
  { id: 'NEW', label: 'Novos', stages: ['NEW'], tone: 'info', emptyHint: 'Novos leads chegam aqui em tempo real.' },
  { id: 'QUALIFYING', label: 'Em Qualificação', stages: ['QUALIFYING'], tone: 'primary', emptyHint: 'A IA está sem triagens em andamento.' },
  { id: 'HANDOFF', label: 'Enviado ao Vendedor', stages: ['HANDOFF'], tone: 'violet', emptyHint: 'Arraste aqui para enviar o brief ao Vinicius.' },
  { id: 'PROPOSAL_SENT', label: 'Proposta Enviada', stages: ['PROPOSAL_SENT'], tone: 'warning', sum: 'proposal', emptyHint: 'Nenhuma proposta em aberto.' },
  { id: 'WON', label: 'Fechado (Ganho)', stages: ['WON'], tone: 'success', sum: 'closed', emptyHint: 'Arraste aqui para registrar o ganho.' },
  { id: 'LOST', label: 'Perdido / Desqualificado', stages: ['LOST', 'DISQUALIFIED'], tone: 'danger', emptyHint: 'Nenhum lead perdido.' },
]

export function columnOf(stage: KanbanStage): KanbanStage {
  return stage === 'DISQUALIFIED' ? 'LOST' : stage
}

/** Reasons that classify a lead as DISQUALIFIED instead of LOST. */
export const DISQUALIFY_REASONS: LossReason[] = ['FORA_REGIAO', 'CURIOSO_RESIDENCIAL']

const BELEM_OFFSET = 3 * 3600_000
/** Minutes inside business hours (seg–sex 08–18 Belém) between two instants. */
export function businessMinutesBetween(startISO: string, end: Date = now()): number {
  const s = new Date(startISO).getTime() - BELEM_OFFSET
  const e = end.getTime() - BELEM_OFFSET
  if (e <= s) return 0
  let total = 0
  const dayMs = 86_400_000
  for (let d = Math.floor(s / dayMs) * dayMs; d < e; d += dayMs) {
    const wd = new Date(d).getUTCDay()
    if (wd === 0 || wd === 6) continue
    const ws = d + 8 * 3600_000
    const we = d + 18 * 3600_000
    const a = Math.max(ws, s)
    const b = Math.min(we, e)
    if (b > a) total += (b - a) / 60_000
  }
  return total
}

export interface SlaInfo {
  /** handoff happened, human not yet responded */
  waiting: boolean
  /** business minutes elapsed (waiting) or recorded SLA */
  minutes: number | null
  breached: boolean
}

export function slaInfo(lead: Lead, conv: Conversation | undefined): SlaInfo {
  const handoffAt = conv?.handoffAt ?? lead.handoffAt
  if (!handoffAt) return { waiting: false, minutes: null, breached: false }
  if (conv?.humanFirstResponseAt) {
    const m = conv.humanSlaMinutes ?? null
    return { waiting: false, minutes: m, breached: m != null && m > SLA_TARGET_MIN }
  }
  if (lead.kanbanStage !== 'HANDOFF') return { waiting: false, minutes: null, breached: false }
  const m = businessMinutesBetween(handoffAt)
  return { waiting: true, minutes: m, breached: m > SLA_TARGET_MIN }
}

export type AiStatus = 'AI' | 'PAUSED' | 'HUMAN'
export function aiStatus(conv: Conversation | undefined): AiStatus {
  if (!conv) return 'PAUSED'
  if (!conv.aiPaused) return 'AI'
  if (conv.state === 'HUMAN_ACTIVE' || conv.humanFirstResponseAt) return 'HUMAN'
  return 'PAUSED'
}
export const AI_STATUS_LABEL: Record<AiStatus, string> = { AI: 'IA ativa', PAUSED: 'IA pausada', HUMAN: 'Humano' }
export const AI_STATUS_TONE: Record<AiStatus, Tone> = { AI: 'success', PAUSED: 'warning', HUMAN: 'primary' }

export function isAfterHours(lead: Lead): boolean {
  return !isBusinessHours(lead.createdAt)
}

export function leadValue(lead: Lead): number | null {
  if (lead.kanbanStage === 'WON') return lead.closedValueBRL
  if (lead.kanbanStage === 'PROPOSAL_SENT') return lead.proposalValueBRL
  return null
}

/** Re-render every `ms` so relative times / SLA timers stay live. */
export function useTick(ms = 30_000) {
  const [, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

/** Compact relative: "agora", "5 min", "3 h", "2 d". */
export function shortAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  const min = (now().getTime() - new Date(iso).getTime()) / 60_000
  if (min < 1) return 'agora'
  if (min < 60) return `${Math.floor(min)} min`
  if (min < 60 * 24) return `${Math.floor(min / 60)} h`
  return `${Math.floor(min / 1440)} d`
}

export function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

/** Local preview of the 4-line brief (mirrors store's buildSummary) for leads not yet handed off. */
export function previewBrief(l: Lead): [string, string, string, string] {
  const contact = l.phoneE164 ? `wa.me/${l.phoneE164.replace('+', '')}` : l.igUsername ?? '—'
  const tech = [l.segment ? SEGMENT_LABEL[l.segment] : null, l.areaM2 ? `${l.areaM2.toLocaleString('pt-BR')} m²` : null, l.floorType ? FLOOR_LABEL[l.floorType] : null, l.dirtProfile ? DIRT_LABEL[l.dirtProfile] : null, l.usageRoutine]
    .filter(Boolean)
    .join(' · ')
  const recs = l.recommendedModels
  return [
    `${l.name} · ${l.companyName ?? 'Empresa não informada'} · ${contact} · ${l.locationCity ?? '?'}-${l.locationState ?? '?'}`,
    `${l.modality ? MODALITY_LABEL[l.modality] : 'Modalidade a confirmar'} · Origem: ${l.originTag}`,
    tech || 'Perfil técnico a levantar',
    recs.length ? `${recs.map((r) => r.modelName).join(' + ')} — ${recs[0].reason} → /crm?lead=${l.id}` : `Sem recomendação ainda → /crm?lead=${l.id}`,
  ]
}

export interface QualItem {
  key: string
  label: string
  done: boolean
  value: string
}

export function qualificationChecklist(l: Lead): QualItem[] {
  return [
    { key: 'modality', label: 'Modalidade', done: !!l.modality, value: l.modality ? MODALITY_LABEL[l.modality] : 'Pendente' },
    { key: 'segment', label: 'Segmento', done: !!l.segment, value: l.segment ? SEGMENT_LABEL[l.segment] : 'Pendente' },
    {
      key: 'tech',
      label: 'Dimensão & Piso/Sujeira',
      done: !!(l.areaM2 && l.floorType && l.dirtProfile),
      value: [l.areaM2 ? `${l.areaM2.toLocaleString('pt-BR')} m²` : null, l.floorType ? FLOOR_LABEL[l.floorType] : null, l.dirtProfile ? DIRT_LABEL[l.dirtProfile] : null].filter(Boolean).join(' · ') || 'Pendente',
    },
    {
      key: 'location',
      label: 'Localização',
      done: !!(l.locationCity && l.locationState),
      value: l.locationCity || l.locationState ? `${l.locationCity ?? '?'}-${l.locationState ?? '?'}` : 'Pendente',
    },
  ]
}

/** "R$" masked input helpers: digits → value in BRL (2 decimals). */
export function parseMoneyDigits(raw: string): number | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  return Number(digits) / 100
}
export function formatMoneyInput(v: number | null): string {
  if (v == null) return ''
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
