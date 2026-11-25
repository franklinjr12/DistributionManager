import { create } from 'zustand'
import type {
  AttributionChannel,
  Conversation,
  ConversationChannel,
  ConversationState,
  ConversionEventType,
  HandoffEvent,
  KanbanStage,
  Lead,
  LeadAttribution,
  LossReason,
  Message,
  Modality,
  OfflineConversionEvent,
} from '@/types/domain'
import { seedAttributions, seedConversations, seedHandoffEvents, seedLeads, seedMessages } from '@/mock/data/leads'
import { VINICIUS_ID, TENANT_ID } from '@/mock/data/tenant'
import { diffMinutes, fakeSha256, isBusinessHours, nowISO, sessionCode, uid } from '@/lib/utils'
import { DIRT_LABEL, FLOOR_LABEL, MODALITY_LABEL, SEGMENT_LABEL, STAGE_LABEL, formatBRL, LOSS_REASON_LABEL } from '@/lib/format'
import { useAutomationStore } from './automationStore'
import { useCampaignStore } from './campaignStore'
import { useNotificationStore } from './notificationStore'

export interface MoveStagePayload {
  /** PROPOSAL_SENT: estimated proposal value (BRL) */
  proposalValue?: number
  /** WON: final contract/sale value (BRL). For rentals, if omitted, = rentalMonthly × rentalMonths */
  closedValue?: number
  /** WON: COMPRA vs LOCACAO (MANUTENCAO_PECAS allowed) */
  modality?: Modality
  rentalMonths?: number
  rentalMonthly?: number
  /** LOST / DISQUALIFIED */
  lossReason?: LossReason
  lossNotes?: string
  /** HANDOFF trigger (default QUALIFIED) */
  trigger?: 'QUALIFIED' | 'HUMAN_REQUESTED'
  /** Suppress the SYSTEM message in the transcript */
  silent?: boolean
}

export interface NewLeadInput extends Partial<Omit<Lead, 'id' | 'conversationId'>> {
  name: string
  originTag: string
  channel?: ConversationChannel
  attributionChannel?: AttributionChannel
  attribution?: Partial<LeadAttribution>
}

interface LeadState {
  leads: Lead[]
  conversations: Conversation[]
  messages: Message[]
  attributions: LeadAttribution[]
  handoffEvents: HandoffEvent[]

  /** Kanban move with close-out discipline. Appends SYSTEM msg; HANDOFF → SQL conversion; WON → WON conversion (PENDING → SENT). */
  moveLeadStage: (id: string, stage: KanbanStage, payload?: MoveStagePayload) => void
  /** Shortcut for moveLeadStage(id, 'HANDOFF', { trigger }) */
  handoffLead: (id: string, trigger?: 'QUALIFIED' | 'HUMAN_REQUESTED') => void
  updateLeadFields: (id: string, patch: Partial<Lead>) => void
  /** Creates lead + conversation + attribution. Returns the new lead. */
  createLead: (input: NewLeadInput) => Lead
  deleteLead: (id: string) => void

  /** Appends a message. HUMAN_AGENT messages record human SLA on first reply after handoff. */
  addMessage: (conversationId: string, msg: Pick<Message, 'senderType' | 'text'> & Partial<Message>) => Message
  /** Toggle (or set) AI pause. Appends a SYSTEM message. */
  toggleAiPaused: (conversationId: string, paused?: boolean) => void
  setConversationState: (conversationId: string, state: ConversationState) => void
  markConversationRead: (conversationId: string) => void
}

function buildSummary(l: Lead): [string, string, string, string] {
  const contact = l.phoneE164 ? `wa.me/${l.phoneE164.replace('+', '')}` : l.igUsername ?? '—'
  const tech = [
    l.segment ? SEGMENT_LABEL[l.segment] : null,
    l.areaM2 ? `${l.areaM2.toLocaleString('pt-BR')} m²` : null,
    l.floorType ? FLOOR_LABEL[l.floorType] : null,
    l.dirtProfile ? DIRT_LABEL[l.dirtProfile] : null,
    l.usageRoutine,
  ]
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

function syncCampaignMetrics(leads: Lead[], attributions: LeadAttribution[]) {
  const tracked = new Set(attributions.filter((a) => a.gclid || a.fbclid || a.igMediaId).map((a) => a.leadId))
  useCampaignStore.getState().syncLeadMetrics(leads, tracked)
}

/** Creates conversion event(s) as PENDING, then flips to SENT after 1.2–2.8 s (simulated worker). */
function dispatchConversion(lead: Lead, attribution: LeadAttribution | undefined, event: ConversionEventType) {
  const platform = lead.originTag.startsWith('Google') ? 'GOOGLE_ADS' : lead.originTag.startsWith('Meta') || lead.originTag.startsWith('IG_Reels') ? 'META_CAPI' : null
  if (!platform) return
  const auto = useAutomationStore.getState()
  const hasKey = platform === 'GOOGLE_ADS' ? !!attribution?.gclid : !!(attribution?.fbclid || lead.phoneE164 || lead.email)
  const ev: OfflineConversionEvent = {
    id: uid('oc'),
    leadId: lead.id,
    leadName: lead.name,
    event,
    platform,
    conversionAction:
      platform === 'GOOGLE_ADS'
        ? event === 'SQL'
          ? 'SQL - Lead Qualificado (offline)'
          : 'Venda Fechada (offline · valor BRL)'
        : event === 'SQL'
          ? 'Lead (CAPI · QualifiedLead)'
          : 'Purchase (CAPI)',
    matchKey: {
      gclid: attribution?.gclid ?? null,
      fbclid: attribution?.fbclid ?? null,
      emailSha256: lead.email ? fakeSha256(lead.email) : null,
      phoneSha256: lead.phoneE164 ? fakeSha256(lead.phoneE164) : null,
    },
    status: hasKey ? 'PENDING' : 'SKIPPED',
    responseCode: null,
    responseMessage: hasKey ? null : 'Sem chave de correspondência (gclid/fbclid/hash) — evento ignorado.',
    valueBRL: event === 'WON' ? lead.closedValueBRL ?? 0 : 0,
    attempts: 0,
    createdAt: nowISO(),
    sentAt: null,
  }
  auto.addConversionEvent(ev)
  if (!hasKey) return
  setTimeout(
    () => {
      useAutomationStore.getState().updateConversionEvent(ev.id, {
        status: 'SENT',
        responseCode: 200,
        responseMessage:
          platform === 'GOOGLE_ADS' ? 'UploadClickConversions OK · partial_failure_error: null' : `{"events_received":1,"messages":[],"fbtrace_id":"A${Math.random().toString(36).slice(2, 12).toUpperCase()}"}`,
        attempts: 1,
        sentAt: nowISO(),
      })
    },
    1200 + Math.random() * 1600,
  )
}

export const useLeadStore = create<LeadState>((set, get) => ({
  leads: seedLeads,
  conversations: seedConversations,
  messages: seedMessages,
  attributions: seedAttributions,
  handoffEvents: seedHandoffEvents,

  moveLeadStage: (id, stage, payload = {}) => {
    const state = get()
    const lead = state.leads.find((l) => l.id === id)
    if (!lead || lead.kanbanStage === stage) return
    const t = nowISO()
    const next: Lead = { ...lead, kanbanStage: stage, stageChangedAt: t, updatedAt: t }
    let sysText = `Card movido de «${STAGE_LABEL[lead.kanbanStage]}» para «${STAGE_LABEL[stage]}» por Vinicius Goés.`
    let newSql = false

    if (stage === 'HANDOFF') {
      if (!next.handoffAt) next.handoffAt = t
      if (!next.sqlAt && payload.trigger !== 'HUMAN_REQUESTED') {
        next.sqlAt = t
        newSql = true
      }
      next.handoffSummary = next.handoffSummary ?? buildSummary(next)
    }
    if (stage === 'PROPOSAL_SENT') {
      next.proposalValueBRL = payload.proposalValue ?? next.proposalValueBRL
      next.proposalAt = t
      if (!next.sqlAt) {
        next.sqlAt = t
        newSql = true
      }
      sysText += next.proposalValueBRL ? ` Proposta estimada: ${formatBRL(next.proposalValueBRL)}.` : ''
    }
    if (stage === 'WON') {
      const modality = payload.modality ?? next.modality ?? 'COMPRA'
      next.closedModality = modality
      next.rentalMonths = modality === 'LOCACAO' ? payload.rentalMonths ?? next.rentalMonths : null
      next.rentalMonthlyBRL = modality === 'LOCACAO' ? payload.rentalMonthly ?? next.rentalMonthlyBRL : null
      next.closedValueBRL =
        payload.closedValue ?? (next.rentalMonthlyBRL && next.rentalMonths ? next.rentalMonthlyBRL * next.rentalMonths : next.proposalValueBRL)
      next.closedAt = t
      next.lossReason = null
      if (!next.sqlAt) {
        next.sqlAt = t
        newSql = true
      }
      sysText += ` Valor fechado: ${formatBRL(next.closedValueBRL)}${modality === 'LOCACAO' && next.rentalMonths ? ` (${formatBRL(next.rentalMonthlyBRL)}/mês × ${next.rentalMonths} meses)` : ''}.`
    }
    if (stage === 'LOST' || stage === 'DISQUALIFIED') {
      next.lossReason = payload.lossReason ?? (stage === 'DISQUALIFIED' ? 'FORA_REGIAO' : next.lossReason)
      next.lossNotes = payload.lossNotes ?? next.lossNotes
      next.closedAt = t
      if (next.lossReason) sysText += ` Motivo: ${LOSS_REASON_LABEL[next.lossReason]}.`
    }
    if (stage === 'NEW' || stage === 'QUALIFYING') {
      next.closedAt = null
    }

    // conversation side-effects
    const conv = state.conversations.find((c) => c.id === lead.conversationId)
    let convPatch: Partial<Conversation> = {}
    const extraMsgs: Message[] = []
    if (conv) {
      if (stage === 'HANDOFF') {
        const human = payload.trigger === 'HUMAN_REQUESTED'
        convPatch = { aiPaused: true, state: human ? 'HUMAN_REQUESTED' : 'QUALIFIED_HANDOFF', handoffAt: conv.handoffAt ?? t }
        sysText = human
          ? 'Lead pediu atendimento humano (HUMAN_REQUESTED). IA pausada e Vinicius Goés notificado via template novo_lead_qualificado.'
          : isBusinessHours(t)
            ? 'Lead qualificado. Resumo de 4 linhas enviado ao Vinicius Goés via WhatsApp (template novo_lead_qualificado). IA pausada automaticamente.'
            : 'Lead qualificado fora do horário comercial. Resumo enviado ao Vinicius Goés; retorno previsto para o próximo dia útil às 08:00. IA pausada.'
      } else if (stage === 'PROPOSAL_SENT') convPatch = { aiPaused: true, state: 'HUMAN_ACTIVE' }
      else if (stage === 'WON' || stage === 'LOST') convPatch = { aiPaused: true, state: 'CLOSED' }
      else if (stage === 'DISQUALIFIED') convPatch = { state: 'DISQUALIFIED_OUT_OF_REGION' }
      else if (stage === 'QUALIFYING') convPatch = { state: 'QUALIFYING' }
      if (!payload.silent)
        extraMsgs.push({
          id: uid('msg'),
          conversationId: conv.id,
          direction: 'OUTBOUND',
          senderType: 'SYSTEM',
          text: sysText,
          createdAt: t,
          status: 'SENT',
          metaMessageId: null,
          template: stage === 'HANDOFF' ? 'novo_lead_qualificado' : undefined,
        })
    }

    const handoff: HandoffEvent | null =
      stage === 'HANDOFF' && conv
        ? {
            id: uid('ho'),
            leadId: id,
            conversationId: conv.id,
            assignedUserId: VINICIUS_ID,
            triggerReason: payload.trigger ?? 'QUALIFIED',
            summaryLines: next.handoffSummary ?? [],
            whatsappDeliveryStatus: 'SENT',
            notifiedAt: t,
            acknowledgedAt: null,
            afterHours: !isBusinessHours(t),
          }
        : null

    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? next : l)),
      conversations: conv ? s.conversations.map((c) => (c.id === conv.id ? { ...c, ...convPatch, updatedAt: t, lastMessageAt: extraMsgs.length ? t : c.lastMessageAt } : c)) : s.conversations,
      messages: extraMsgs.length ? [...s.messages, ...extraMsgs] : s.messages,
      handoffEvents: handoff ? [handoff, ...s.handoffEvents] : s.handoffEvents,
    }))

    if (handoff) {
      setTimeout(() => set((s) => ({ handoffEvents: s.handoffEvents.map((h) => (h.id === handoff.id ? { ...h, whatsappDeliveryStatus: 'DELIVERED' } : h)) })), 1500)
    }

    // notifications + conversions
    const attribution = get().attributions.find((a) => a.leadId === id)
    const notify = useNotificationStore.getState().pushNotification
    if (stage === 'HANDOFF') {
      notify({
        type: payload.trigger === 'HUMAN_REQUESTED' ? 'HUMAN_REQUESTED' : 'LEAD_QUALIFIED',
        title: payload.trigger === 'HUMAN_REQUESTED' ? `${next.name} quer falar com você` : `Novo lead qualificado: ${next.name}`,
        body: next.handoffSummary?.[0] ?? next.name,
        href: `/crm?lead=${id}`,
      })
    }
    if (newSql) dispatchConversion(next, attribution, 'SQL')
    if (stage === 'WON') {
      dispatchConversion(next, attribution, 'WON')
      notify({
        type: 'DEAL_WON',
        title: `Negócio ganho: ${next.companyName ?? next.name}`,
        body: `${next.closedModality ? MODALITY_LABEL[next.closedModality] : ''} · ${formatBRL(next.closedValueBRL)}`,
        href: `/crm?lead=${id}`,
      })
    }
    syncCampaignMetrics(get().leads, get().attributions)
  },

  handoffLead: (id, trigger = 'QUALIFIED') => get().moveLeadStage(id, 'HANDOFF', { trigger }),

  updateLeadFields: (id, patch) => {
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: nowISO() } : l)) }))
    if ('campaignId' in patch) syncCampaignMetrics(get().leads, get().attributions)
  },

  createLead: (input) => {
    const t = nowISO()
    const id = uid('ld')
    const convId = uid('cv')
    const attrId = uid('at')
    const { channel = 'WHATSAPP', attributionChannel = 'WHATSAPP_DIRECT', attribution, ...rest } = input
    const lead: Lead = {
      tenantId: TENANT_ID,
      phoneE164: null,
      email: null,
      igUsername: null,
      companyName: null,
      cnpj: null,
      isB2B: null,
      modality: null,
      segment: null,
      areaM2: null,
      floorType: null,
      dirtProfile: null,
      powerPreference: null,
      usageRoutine: null,
      locationCity: null,
      locationState: null,
      recommendedModels: [],
      handoffSummary: null,
      kanbanStage: 'NEW',
      proposalValueBRL: null,
      closedValueBRL: null,
      closedModality: null,
      rentalMonths: null,
      rentalMonthlyBRL: null,
      lossReason: null,
      lossNotes: null,
      campaignId: null,
      attributionId: attrId,
      prospectId: null,
      notes: null,
      lgpdConsentAt: null,
      sqlAt: null,
      handoffAt: null,
      proposalAt: null,
      closedAt: null,
      stageChangedAt: t,
      createdAt: t,
      updatedAt: t,
      ...rest,
      id,
      conversationId: convId,
    }
    const conv: Conversation = {
      id: convId,
      leadId: id,
      channel,
      state: 'NEW',
      aiPaused: false,
      lastUserMessageAt: null,
      lastAiResponseAt: null,
      lastMessageAt: t,
      firstResponseMs: null,
      handoffAt: null,
      humanFirstResponseAt: null,
      humanSlaMinutes: null,
      unreadCount: 0,
      createdAt: t,
      updatedAt: t,
    }
    const attr: LeadAttribution = {
      id: attrId,
      leadId: id,
      sessionCode: sessionCode(),
      channel: attributionChannel,
      landingUrl: null,
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      gclid: null,
      fbclid: null,
      igMediaId: null,
      createdAt: t,
      ...attribution,
    }
    set((s) => ({ leads: [lead, ...s.leads], conversations: [conv, ...s.conversations], attributions: [attr, ...s.attributions] }))
    syncCampaignMetrics(get().leads, get().attributions)
    return lead
  },

  deleteLead: (id) =>
    set((s) => {
      const lead = s.leads.find((l) => l.id === id)
      return {
        leads: s.leads.filter((l) => l.id !== id),
        conversations: s.conversations.filter((c) => c.leadId !== id),
        messages: lead ? s.messages.filter((m) => m.conversationId !== lead.conversationId) : s.messages,
        attributions: s.attributions.filter((a) => a.leadId !== id),
      }
    }),

  addMessage: (conversationId, msg) => {
    const t = msg.createdAt ?? nowISO()
    const m: Message = {
      id: uid('msg'),
      conversationId,
      direction: msg.senderType === 'LEAD' ? 'INBOUND' : 'OUTBOUND',
      status: msg.senderType === 'LEAD' ? 'DELIVERED' : 'SENT',
      metaMessageId: msg.senderType === 'SYSTEM' ? null : `wamid.${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
      createdAt: t,
      ...msg,
    }
    if (m.senderType === 'HUMAN_AGENT' && !m.authorUserId) m.authorUserId = VINICIUS_ID
    set((s) => ({
      messages: [...s.messages, m],
      conversations: s.conversations.map((c) => {
        if (c.id !== conversationId) return c
        const patch: Partial<Conversation> = { lastMessageAt: t, updatedAt: t }
        if (m.senderType === 'LEAD') {
          patch.lastUserMessageAt = t
          patch.unreadCount = c.unreadCount + 1
          if (c.state === 'NEW' && c.lastAiResponseAt) patch.state = 'QUALIFYING'
        }
        if (m.senderType === 'AI') {
          patch.lastAiResponseAt = t
          if (c.firstResponseMs == null && c.lastUserMessageAt) patch.firstResponseMs = m.latencyMs ?? new Date(t).getTime() - new Date(c.lastUserMessageAt).getTime()
          if (c.state === 'NEW') patch.state = 'QUALIFYING'
        }
        if (m.senderType === 'HUMAN_AGENT') {
          patch.unreadCount = 0
          if (c.handoffAt && !c.humanFirstResponseAt) {
            patch.humanFirstResponseAt = t
            patch.humanSlaMinutes = Math.max(0, Math.round(diffMinutes(t, c.handoffAt) * 10) / 10)
          }
          if (c.state !== 'CLOSED' && c.state !== 'DISQUALIFIED_OUT_OF_REGION') patch.state = 'HUMAN_ACTIVE'
          patch.aiPaused = true
        }
        return { ...c, ...patch }
      }),
    }))
    // NEW lead card moves to QUALIFYING once AI starts triage
    if (m.senderType === 'AI') {
      const conv = get().conversations.find((c) => c.id === conversationId)
      const lead = conv && get().leads.find((l) => l.id === conv.leadId)
      if (lead && lead.kanbanStage === 'NEW' && get().messages.filter((x) => x.conversationId === conversationId && x.senderType === 'LEAD').length >= 2) {
        set((s) => ({ leads: s.leads.map((l) => (l.id === lead.id ? { ...l, kanbanStage: 'QUALIFYING', stageChangedAt: t, updatedAt: t } : l)) }))
      }
    }
    // acknowledge handoff event on first human reply
    if (m.senderType === 'HUMAN_AGENT') {
      set((s) => ({
        handoffEvents: s.handoffEvents.map((h) => (h.conversationId === conversationId && !h.acknowledgedAt ? { ...h, acknowledgedAt: t, whatsappDeliveryStatus: 'READ' } : h)),
      }))
    }
    return m
  },

  toggleAiPaused: (conversationId, paused) => {
    const conv = get().conversations.find((c) => c.id === conversationId)
    if (!conv) return
    const value = paused ?? !conv.aiPaused
    if (value === conv.aiPaused) return
    const t = nowISO()
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, aiPaused: value, state: value ? (c.state === 'QUALIFYING' || c.state === 'NEW' ? 'HUMAN_ACTIVE' : c.state) : c.state === 'HUMAN_ACTIVE' ? 'QUALIFYING' : c.state, updatedAt: t }
          : c,
      ),
      messages: [
        ...s.messages,
        {
          id: uid('msg'),
          conversationId,
          direction: 'OUTBOUND',
          senderType: 'SYSTEM',
          text: value ? 'IA pausada por Vinicius Goés — atendimento humano assumiu a conversa.' : 'IA retomada por Vinicius Goés — o SDR IA volta a responder automaticamente.',
          createdAt: t,
          status: 'SENT',
          metaMessageId: null,
        },
      ],
    }))
  },

  setConversationState: (conversationId, st) =>
    set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, state: st, updatedAt: nowISO() } : c)) })),

  markConversationRead: (conversationId) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      messages: s.messages.map((m) => (m.conversationId === conversationId && m.senderType === 'LEAD' && m.status !== 'READ' ? { ...m, status: 'READ' } : m)),
    })),
}))
