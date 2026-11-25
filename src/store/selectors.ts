import { useMemo } from 'react'
import type { AdCampaign, AdSpendEntry, ChannelKind, Conversation, KanbanStage, Lead, LeadAttribution, Message, Tenant } from '@/types/domain'
import { STAGE_ORDER, isPaidOrigin, originChannel, originLabel } from '@/lib/format'
import { belemDay, median, now, sum } from '@/lib/utils'
import { useLeadStore } from './leadStore'
import { useCampaignStore } from './campaignStore'
import { useAutomationStore } from './automationStore'
import { useTenantStore } from './tenantStore'

// ───────────────────────── Types ─────────────────────────

export interface OriginBreakdown {
  originTag: string
  label: string
  channel: ChannelKind
  paid: boolean
  leads: number
  sqls: number
  won: number
  wonBRL: number
  pipelineBRL: number
  spend: number
  /** spend / leads (null if no spend) */
  cpl: number | null
  /** sqls / leads */
  sqlRate: number
}

export interface ChannelBreakdown {
  channel: ChannelKind
  leads: number
  sqls: number
  wonBRL: number
  spend: number
  cpl: number | null
}

export interface DailyKpi {
  date: string
  spend: number
  leads: number
  sqls: number
  impressions: number
  clicks: number
}

export interface StopLoss {
  target: number
  current: number
  /** current / target (0..1+) */
  pct: number
  dayOfPilot: number
  totalDays: number
  daysLeft: number
  /** linear expected SQLs by today */
  expectedByNow: number
  onTrack: boolean
  /** projected SQLs at day 60 at current pace */
  projected: number
}

export interface Kpis {
  totalSpend: number
  googleSpend: number
  metaSpend: number
  monthlyBudget: number
  totalLeads: number
  paidLeads: number
  /** spend / paidLeads */
  cpl: number | null
  sqlCount: number
  /** spend / sqlCount */
  costPerSql: number | null
  /** sqls / totalLeads */
  leadToSqlRate: number
  pipelineBRL: number
  closedBRL: number
  wonCount: number
  lostCount: number
  disqualifiedCount: number
  /** closedBRL / totalSpend */
  roas: number | null
  medianAiResponseMs: number | null
  medianHumanSlaMin: number | null
  humanSlaWithinTargetRate: number | null
  trackingCoverage: number
  stopLoss: StopLoss
  funnel: { stage: KanbanStage; count: number }[]
  byOrigin: OriginBreakdown[]
  byChannel: ChannelBreakdown[]
  daily: DailyKpi[]
  aiCostUsd: number
}

// ───────────────────────── Pure computation ─────────────────────────

export function computeStopLoss(sqlCount: number, tenant: Tenant, at: Date = now()): StopLoss {
  const start = new Date(tenant.pilot.startDate).getTime()
  const dayOfPilot = Math.max(0, Math.min(tenant.pilot.durationDays, Math.floor((at.getTime() - start) / 86_400_000)))
  const target = tenant.pilot.sqlTarget
  const expectedByNow = (target * dayOfPilot) / tenant.pilot.durationDays
  return {
    target,
    current: sqlCount,
    pct: sqlCount / target,
    dayOfPilot,
    totalDays: tenant.pilot.durationDays,
    daysLeft: tenant.pilot.durationDays - dayOfPilot,
    expectedByNow,
    onTrack: sqlCount >= expectedByNow,
    projected: dayOfPilot ? Math.round((sqlCount / dayOfPilot) * tenant.pilot.durationDays * 10) / 10 : 0,
  }
}

export function computeKpis(input: {
  leads: Lead[]
  conversations: Conversation[]
  campaigns: AdCampaign[]
  spendEntries: AdSpendEntry[]
  attributions: LeadAttribution[]
  messages?: Message[]
  tenant: Tenant
}): Kpis {
  const { leads, conversations, campaigns, spendEntries, attributions, tenant } = input
  const totalSpend = sum(spendEntries.map((e) => e.spendBRL))
  const googleSpend = sum(spendEntries.filter((e) => e.channel === 'GOOGLE_ADS').map((e) => e.spendBRL))
  const metaSpend = totalSpend - googleSpend
  const paid = leads.filter((l) => isPaidOrigin(l.originTag))
  const sqls = leads.filter((l) => l.sqlAt)
  const won = leads.filter((l) => l.kanbanStage === 'WON')
  const pipelineBRL = sum(leads.filter((l) => l.kanbanStage === 'PROPOSAL_SENT').map((l) => l.proposalValueBRL ?? 0))
  const closedBRL = sum(won.map((l) => l.closedValueBRL ?? 0))
  const slas = conversations.map((c) => c.humanSlaMinutes).filter((x): x is number => x != null)
  const paidAttr = attributions.filter((a) => paid.some((l) => l.id === a.leadId))

  // spend per campaign → per origin (campaign lead origins)
  const spendByCampaign = new Map<string, number>()
  for (const e of spendEntries) if (e.campaignId) spendByCampaign.set(e.campaignId, (spendByCampaign.get(e.campaignId) ?? 0) + e.spendBRL)

  const origins = new Map<string, Lead[]>()
  for (const l of leads) origins.set(l.originTag, [...(origins.get(l.originTag) ?? []), l])
  // attribute campaign spend to origins proportionally to lead counts within the campaign
  const originSpend = new Map<string, number>()
  for (const [cid, sp] of spendByCampaign) {
    const ls = leads.filter((l) => l.campaignId === cid)
    if (!ls.length) {
      const c = campaigns.find((x) => x.id === cid)
      const tag = c?.platform === 'GOOGLE' ? 'Google_Ads_Outros' : 'Meta_Outros'
      originSpend.set(tag, (originSpend.get(tag) ?? 0) + sp)
      continue
    }
    for (const l of ls) originSpend.set(l.originTag, (originSpend.get(l.originTag) ?? 0) + sp / ls.length)
  }
  const byOrigin: OriginBreakdown[] = [...new Set([...origins.keys(), ...originSpend.keys()])]
    .map((tag) => {
      const ls = origins.get(tag) ?? []
      const sp = originSpend.get(tag) ?? 0
      return {
        originTag: tag,
        label: originLabel(tag),
        channel: originChannel(tag),
        paid: isPaidOrigin(tag) || sp > 0,
        leads: ls.length,
        sqls: ls.filter((l) => l.sqlAt).length,
        won: ls.filter((l) => l.kanbanStage === 'WON').length,
        wonBRL: sum(ls.filter((l) => l.kanbanStage === 'WON').map((l) => l.closedValueBRL ?? 0)),
        pipelineBRL: sum(ls.filter((l) => l.kanbanStage === 'PROPOSAL_SENT').map((l) => l.proposalValueBRL ?? 0)),
        spend: Math.round(sp * 100) / 100,
        cpl: sp > 0 && ls.length ? sp / ls.length : null,
        sqlRate: ls.length ? ls.filter((l) => l.sqlAt).length / ls.length : 0,
      }
    })
    .sort((a, b) => b.sqls - a.sqls || b.leads - a.leads)

  const channelKinds: ChannelKind[] = ['google', 'meta', 'instagram', 'site', 'whatsapp', 'outbound']
  const byChannel: ChannelBreakdown[] = channelKinds
    .map((ch) => {
      const os = byOrigin.filter((o) => o.channel === ch)
      const spend = sum(os.map((o) => o.spend))
      const leadsN = sum(os.map((o) => o.leads))
      return { channel: ch, leads: leadsN, sqls: sum(os.map((o) => o.sqls)), wonBRL: sum(os.map((o) => o.wonBRL)), spend, cpl: spend && leadsN ? spend / leadsN : null }
    })
    .filter((c) => c.leads || c.spend)

  // daily series (campaign metrics + leads)
  const dayMap = new Map<string, DailyKpi>()
  for (const c of campaigns)
    for (const d of c.daily) {
      const cur = dayMap.get(d.date) ?? { date: d.date, spend: 0, leads: 0, sqls: 0, impressions: 0, clicks: 0 }
      cur.spend += d.spend
      cur.impressions += d.impressions
      cur.clicks += d.clicks
      dayMap.set(d.date, cur)
    }
  for (const l of leads) {
    const d = belemDay(l.createdAt)
    const cur = dayMap.get(d) ?? { date: d, spend: 0, leads: 0, sqls: 0, impressions: 0, clicks: 0 }
    cur.leads += 1
    dayMap.set(d, cur)
    if (l.sqlAt) {
      const sd = belemDay(l.sqlAt)
      const c2 = dayMap.get(sd) ?? { date: sd, spend: 0, leads: 0, sqls: 0, impressions: 0, clicks: 0 }
      c2.sqls += 1
      dayMap.set(sd, c2)
    }
  }
  const daily = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ ...d, spend: Math.round(d.spend * 100) / 100 }))

  const funnel = STAGE_ORDER.map((stage) => ({ stage, count: leads.filter((l) => l.kanbanStage === stage).length }))

  return {
    totalSpend: Math.round(totalSpend * 100) / 100,
    googleSpend: Math.round(googleSpend * 100) / 100,
    metaSpend: Math.round(metaSpend * 100) / 100,
    monthlyBudget: tenant.monthlyAdBudgetBRL,
    totalLeads: leads.length,
    paidLeads: paid.length,
    cpl: paid.length ? totalSpend / paid.length : null,
    sqlCount: sqls.length,
    costPerSql: sqls.length ? totalSpend / sqls.length : null,
    leadToSqlRate: leads.length ? sqls.length / leads.length : 0,
    pipelineBRL,
    closedBRL,
    wonCount: won.length,
    lostCount: leads.filter((l) => l.kanbanStage === 'LOST').length,
    disqualifiedCount: leads.filter((l) => l.kanbanStage === 'DISQUALIFIED').length,
    roas: totalSpend ? closedBRL / totalSpend : null,
    medianAiResponseMs: median(conversations.map((c) => c.firstResponseMs).filter((x): x is number => x != null)),
    medianHumanSlaMin: median(slas),
    humanSlaWithinTargetRate: slas.length ? slas.filter((s) => s <= 15).length / slas.length : null,
    trackingCoverage: paidAttr.length ? paidAttr.filter((a) => a.gclid || a.fbclid || a.igMediaId).length / paidAttr.length : 1,
    stopLoss: computeStopLoss(sqls.length, tenant),
    funnel,
    byOrigin,
    byChannel,
    daily,
    aiCostUsd: sum((input.messages ?? []).map((m) => m.llmCostUsd ?? 0)),
  }
}

// ───────────────────────── Hooks ─────────────────────────

/** All dashboard KPIs, memoized over store state. */
export function useKpis(): Kpis {
  const leads = useLeadStore((s) => s.leads)
  const conversations = useLeadStore((s) => s.conversations)
  const attributions = useLeadStore((s) => s.attributions)
  const messages = useLeadStore((s) => s.messages)
  const campaigns = useCampaignStore((s) => s.campaigns)
  const spendEntries = useAutomationStore((s) => s.adSpendEntries)
  const tenant = useTenantStore((s) => s.tenant)
  return useMemo(
    () => computeKpis({ leads, conversations, campaigns, spendEntries, attributions, messages, tenant }),
    [leads, conversations, campaigns, spendEntries, attributions, messages, tenant],
  )
}

export function useStopLoss(): StopLoss {
  const leads = useLeadStore((s) => s.leads)
  const tenant = useTenantStore((s) => s.tenant)
  return useMemo(() => computeStopLoss(leads.filter((l) => l.sqlAt).length, tenant), [leads, tenant])
}

export const useLead = (id: string | null | undefined) => useLeadStore((s) => (id ? s.leads.find((l) => l.id === id) : undefined))

export const useConversation = (id: string | null | undefined) => useLeadStore((s) => (id ? s.conversations.find((c) => c.id === id) : undefined))

export const useConversationByLead = (leadId: string | null | undefined) =>
  useLeadStore((s) => (leadId ? s.conversations.find((c) => c.leadId === leadId) : undefined))

export const useAttributionByLead = (leadId: string | null | undefined) =>
  useLeadStore((s) => (leadId ? s.attributions.find((a) => a.leadId === leadId) : undefined))

/** Messages of a conversation, sorted ascending. */
export function useMessages(conversationId: string | null | undefined): Message[] {
  const messages = useLeadStore((s) => s.messages)
  return useMemo(
    () => (conversationId ? messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : []),
    [messages, conversationId],
  )
}

/** Leads grouped by Kanban stage (each column sorted by stageChangedAt desc). */
export function useLeadsByStage(): Record<KanbanStage, Lead[]> {
  const leads = useLeadStore((s) => s.leads)
  return useMemo(() => {
    const out = Object.fromEntries(STAGE_ORDER.map((s) => [s, [] as Lead[]])) as unknown as Record<KanbanStage, Lead[]>
    for (const l of leads) out[l.kanbanStage].push(l)
    for (const s of STAGE_ORDER) out[s].sort((a, b) => b.stageChangedAt.localeCompare(a.stageChangedAt))
    return out
  }, [leads])
}

/** Conversations joined with their lead + last message, sorted by lastMessageAt desc (inbox). */
export function useInbox() {
  const leads = useLeadStore((s) => s.leads)
  const conversations = useLeadStore((s) => s.conversations)
  const messages = useLeadStore((s) => s.messages)
  return useMemo(() => {
    const lastByConv = new Map<string, Message>()
    for (const m of messages) {
      const cur = lastByConv.get(m.conversationId)
      if (!cur || cur.createdAt <= m.createdAt) lastByConv.set(m.conversationId, m)
    }
    return conversations
      .map((c) => ({ conversation: c, lead: leads.find((l) => l.id === c.leadId)!, lastMessage: lastByConv.get(c.id) ?? null }))
      .filter((x) => x.lead)
      .sort((a, b) => b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt))
  }, [leads, conversations, messages])
}

/** Totals across non-removed campaigns. */
export function useCampaignTotals() {
  const campaigns = useCampaignStore((s) => s.campaigns)
  return useMemo(() => {
    const live = campaigns.filter((c) => c.status !== 'REMOVED')
    const impressions = sum(live.map((c) => c.metrics.impressions))
    const clicks = sum(live.map((c) => c.metrics.clicks))
    const spend = sum(live.map((c) => c.metrics.spend))
    const leads = sum(live.map((c) => c.metrics.leads))
    const sqls = sum(live.map((c) => c.metrics.sqls))
    return {
      count: live.length,
      enabled: live.filter((c) => c.status === 'ENABLED').length,
      paused: live.filter((c) => c.status === 'PAUSED').length,
      enabledDailyBudget: sum(live.filter((c) => c.status === 'ENABLED').map((c) => c.dailyBudgetBRL)),
      impressions,
      clicks,
      ctr: impressions ? clicks / impressions : 0,
      spend: Math.round(spend * 100) / 100,
      leads,
      sqls,
      wonBRL: sum(live.map((c) => c.metrics.wonBRL)),
      cpl: leads ? spend / leads : null,
      costPerSql: sqls ? spend / sqls : null,
    }
  }, [campaigns])
}
