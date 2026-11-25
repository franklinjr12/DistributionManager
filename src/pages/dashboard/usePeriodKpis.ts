import { useMemo } from 'react'
import type { AdSpendEntry, ChannelKind } from '@/types/domain'
import { computeKpis, useAutomationStore, useCampaignStore, useLeadStore, useTenantStore, type Kpis } from '@/store'
import { belemDay, now, sum } from '@/lib/utils'

export type Period = '7d' | '30d' | 'pilot'

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'pilot', label: 'Desde o início do piloto' },
]

export const PERIOD_SHORT: Record<Period, string> = { '7d': 'últimos 7 dias', '30d': 'últimos 30 dias', pilot: 'desde o início do piloto' }

/** Categorical colors per channel — fixed per entity, never by rank. */
export type SplitChannel = 'google' | 'meta' | 'instagram' | 'site' | 'whatsapp' | 'outbound'
export const SPLIT_CHANNEL_ORDER: SplitChannel[] = ['google', 'meta', 'instagram', 'site', 'whatsapp', 'outbound']
export const SPLIT_CHANNEL_LABEL: Record<SplitChannel, string> = {
  google: 'Google Ads',
  meta: 'Meta Ads (FB + IG pago)',
  instagram: 'Orgânico IG',
  site: 'Site',
  whatsapp: 'WhatsApp direto',
  outbound: 'Outbound',
}
export const SPLIT_CHANNEL_COLOR: Record<SplitChannel, string> = {
  google: 'var(--color-chart-1)',
  meta: 'var(--color-chart-4)',
  instagram: 'var(--color-chart-5)',
  site: 'var(--color-chart-6)',
  whatsapp: 'var(--color-chart-2)',
  outbound: 'var(--color-chart-3)',
}
export const SPLIT_CHANNEL_ICON: Record<SplitChannel, ChannelKind> = {
  google: 'google',
  meta: 'meta',
  instagram: 'instagram',
  site: 'site',
  whatsapp: 'whatsapp',
  outbound: 'outbound',
}

export interface ChannelSplitRow {
  channel: SplitChannel
  leads: number
  sqls: number
  spend: number
  wonBRL: number
}

const DAY = 86_400_000

function dayStr(offsetDays: number): string {
  return belemDay(new Date(now().getTime() - offsetDays * DAY))
}

/** Inclusive list of yyyy-MM-dd between from and to. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  let t = new Date(`${from}T12:00:00-03:00`).getTime()
  const end = new Date(`${to}T12:00:00-03:00`).getTime()
  while (t <= end) {
    out.push(belemDay(new Date(t)))
    t += DAY
  }
  return out
}

export interface PeriodKpis {
  kpis: Kpis
  /** previous equivalent window (null for "pilot") */
  prev: Kpis | null
  from: string
  to: string
  /** daily series with zero-filled gaps */
  daily: Kpis['daily']
  channels: ChannelSplitRow[]
  /** spend registered for current month (yyyy-MM) */
  monthSpend: number
  monthLabel: string
}

export function usePeriodKpis(period: Period): PeriodKpis {
  const leads = useLeadStore((s) => s.leads)
  const conversations = useLeadStore((s) => s.conversations)
  const attributions = useLeadStore((s) => s.attributions)
  const messages = useLeadStore((s) => s.messages)
  const campaigns = useCampaignStore((s) => s.campaigns)
  const spendEntries = useAutomationStore((s) => s.adSpendEntries)
  const tenant = useTenantStore((s) => s.tenant)

  return useMemo(() => {
    const to = dayStr(0)
    const pilotFrom = belemDay(tenant.pilot.startDate)
    const span = period === '7d' ? 7 : period === '30d' ? 30 : 0

    const windowKpis = (from: string, until: string): Kpis => {
      const inRange = (iso: string) => {
        const d = belemDay(iso)
        return d >= from && d <= until
      }
      const ls = leads.filter((l) => inRange(l.createdAt))
      const leadIds = new Set(ls.map((l) => l.id))
      const convs = conversations.filter((c) => leadIds.has(c.leadId))
      const convIds = new Set(convs.map((c) => c.id))
      const camps = campaigns.map((c) => ({ ...c, daily: c.daily.filter((d) => d.date >= from && d.date <= until) }))
      // Spend in a sub-window is derived from the campaigns' daily consumption (API sync).
      const derived: AdSpendEntry[] = camps
        .map((c) => ({
          id: `derived_${c.id}`,
          monthStart: `${until.slice(0, 7)}-01`,
          channel: c.platform === 'GOOGLE' ? ('GOOGLE_ADS' as const) : ('META_ADS' as const),
          campaignId: c.id,
          campaignName: c.name,
          spendBRL: sum(c.daily.map((d) => d.spend)),
          source: 'API_SYNC' as const,
          notes: null,
        }))
        .filter((e) => e.spendBRL > 0)
      return computeKpis({
        leads: ls,
        conversations: convs,
        campaigns: camps,
        spendEntries: derived,
        attributions: attributions.filter((a) => leadIds.has(a.leadId)),
        messages: messages.filter((m) => convIds.has(m.conversationId)),
        tenant,
      })
    }

    let kpis: Kpis
    let prev: Kpis | null = null
    let from: string
    if (period === 'pilot') {
      from = pilotFrom
      kpis = computeKpis({ leads, conversations, campaigns, spendEntries, attributions, messages, tenant })
    } else {
      from = dayStr(span - 1)
      kpis = windowKpis(from, to)
      prev = windowKpis(dayStr(span * 2 - 1), dayStr(span))
    }

    const byDate = new Map(kpis.daily.map((d) => [d.date, d]))
    const daily = dateRange(from, to).map((date) => byDate.get(date) ?? { date, spend: 0, leads: 0, sqls: 0, impressions: 0, clicks: 0 })

    const chMap = new Map<SplitChannel, ChannelSplitRow>()
    for (const o of kpis.byOrigin) {
      const ch: SplitChannel = o.channel === 'instagram' && o.spend > 0 ? 'meta' : (o.channel as SplitChannel)
      const cur = chMap.get(ch) ?? { channel: ch, leads: 0, sqls: 0, spend: 0, wonBRL: 0 }
      cur.leads += o.leads
      cur.sqls += o.sqls
      cur.spend += o.spend
      cur.wonBRL += o.wonBRL
      chMap.set(ch, cur)
    }
    const channels = SPLIT_CHANNEL_ORDER.map((c) => chMap.get(c) ?? { channel: c, leads: 0, sqls: 0, spend: 0, wonBRL: 0 })

    const month = to.slice(0, 7)
    const monthSpend = sum(spendEntries.filter((e) => e.monthStart.startsWith(month)).map((e) => e.spendBRL))
    const monthLabel = new Date(`${month}-15T12:00:00-03:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    return { kpis, prev, from, to, daily, channels, monthSpend, monthLabel }
  }, [period, leads, conversations, campaigns, spendEntries, attributions, messages, tenant])
}

/** Relative change helper → ratio or null. */
export function deltaOf(cur: number | null | undefined, prev: number | null | undefined): number | null {
  if (cur == null || prev == null || prev === 0) return null
  return (cur - prev) / prev
}
