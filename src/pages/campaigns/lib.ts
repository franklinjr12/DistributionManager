import type { AdCampaign, AdPlatform, DailyMetric, Lead } from '@/types/domain'
import { belemDay, now } from '@/lib/utils'

export type RangeKey = '7d' | '14d' | '30d' | 'pilot'
export type PlatformFilter = 'ALL' | AdPlatform
export type StatusFilter = 'ALL' | 'ENABLED' | 'PAUSED'

export const PILOT_START_DAY = '2026-10-12'

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '14d', label: '14 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'pilot', label: 'Desde o início do piloto' },
]

export const RANGE_DAYS: Record<RangeKey, number | null> = { '7d': 7, '14d': 14, '30d': 30, pilot: null }

/** Inclusive yyyy-MM-dd window for a range; `prev` = same-length window right before. */
export function rangeWindow(range: RangeKey, offsetWindows = 0): { from: string; to: string } {
  const days = RANGE_DAYS[range]
  const today = now()
  if (days == null) return { from: PILOT_START_DAY, to: belemDay(today) }
  const DAY = 86_400_000
  const toDate = new Date(today.getTime() - offsetWindows * days * DAY)
  const fromDate = new Date(toDate.getTime() - (days - 1) * DAY)
  return { from: belemDay(fromDate), to: belemDay(toDate) }
}

export const inWindow = (day: string, w: { from: string; to: string }) => day >= w.from && day <= w.to

export interface RangeMetrics {
  impressions: number
  clicks: number
  ctr: number
  spend: number
  leads: number
  sqls: number
  cpl: number | null
  wonBRL: number
  roas: number | null
}

export function aggregateDaily(daily: DailyMetric[], w: { from: string; to: string }) {
  let impressions = 0
  let clicks = 0
  let spend = 0
  let leads = 0
  let sqls = 0
  for (const d of daily) {
    if (!inWindow(d.date, w)) continue
    impressions += d.impressions
    clicks += d.clicks
    spend += d.spend
    leads += d.leads
    sqls += d.sqls
  }
  return { impressions, clicks, spend: Math.round(spend * 100) / 100, leads, sqls }
}

export function wonForCampaigns(leads: Lead[], campaignIds: Set<string>, w: { from: string; to: string }) {
  let total = 0
  for (const l of leads) {
    if (l.kanbanStage !== 'WON' || !l.campaignId || !campaignIds.has(l.campaignId) || !l.closedAt) continue
    if (inWindow(belemDay(l.closedAt), w)) total += l.closedValueBRL ?? 0
  }
  return total
}

/**
 * Leads/SQLs counted from the live lead store (createdAt / sqlAt in window), so CRM moves
 * (handoff → SQL, new outbound/SDR leads) show up here immediately. Seed daily series reconcile 1:1.
 */
export function leadCountsForCampaigns(leads: Lead[], campaignIds: Set<string>, w: { from: string; to: string }) {
  let n = 0
  let sqls = 0
  for (const l of leads) {
    if (!l.campaignId || !campaignIds.has(l.campaignId)) continue
    if (inWindow(belemDay(l.createdAt), w)) n++
    if (l.sqlAt && inWindow(belemDay(l.sqlAt), w)) sqls++
  }
  return { leads: n, sqls }
}

export function campaignRangeMetrics(c: AdCampaign, leads: Lead[], w: { from: string; to: string }): RangeMetrics {
  const a = { ...aggregateDaily(c.daily, w), ...leadCountsForCampaigns(leads, new Set([c.id]), w) }
  const wonBRL = wonForCampaigns(leads, new Set([c.id]), w)
  return {
    ...a,
    ctr: a.impressions ? a.clicks / a.impressions : 0,
    cpl: a.leads ? a.spend / a.leads : null,
    wonBRL,
    roas: a.spend ? wonBRL / a.spend : null,
  }
}

export function totalsRangeMetrics(cs: AdCampaign[], leads: Lead[], w: { from: string; to: string }): RangeMetrics {
  let impressions = 0
  let clicks = 0
  let spend = 0
  for (const c of cs) {
    const a = aggregateDaily(c.daily, w)
    impressions += a.impressions
    clicks += a.clicks
    spend += a.spend
  }
  const { leads: leadsN, sqls } = leadCountsForCampaigns(leads, new Set(cs.map((c) => c.id)), w)
  const wonBRL = wonForCampaigns(leads, new Set(cs.map((c) => c.id)), w)
  return {
    impressions,
    clicks,
    ctr: impressions ? clicks / impressions : 0,
    spend: Math.round(spend * 100) / 100,
    leads: leadsN,
    sqls,
    cpl: leadsN ? spend / leadsN : null,
    wonBRL,
    roas: spend ? wonBRL / spend : null,
  }
}

/** Merge daily series of several campaigns (sorted by date) */
export function mergeDaily(cs: AdCampaign[], w: { from: string; to: string }) {
  const map = new Map<string, { date: string; spend: number; leads: number; sqls: number; clicks: number; impressions: number }>()
  for (const c of cs)
    for (const d of c.daily) {
      if (!inWindow(d.date, w)) continue
      const e = map.get(d.date) ?? { date: d.date, spend: 0, leads: 0, sqls: 0, clicks: 0, impressions: 0 }
      e.spend += d.spend
      e.leads += d.leads
      e.sqls += d.sqls
      e.clicks += d.clicks
      e.impressions += d.impressions
      map.set(d.date, e)
    }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ ...e, spend: Math.round(e.spend * 100) / 100 }))
}

export const ratioDelta = (cur: number | null, prev: number | null) => (cur == null || prev == null || prev === 0 ? null : (cur - prev) / prev)

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function scheduleSummary(s: AdCampaign['schedule']) {
  const days = [...s.days].sort()
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1)
  const dayLabel =
    days.length === 0 ? 'Sem dias' : contiguous && days.length > 1 ? `${WEEKDAY_SHORT[days[0]]}–${WEEKDAY_SHORT[days[days.length - 1]]}` : days.map((d) => WEEKDAY_SHORT[d]).join(', ')
  return `${dayLabel} ${s.start}–${s.end}`
}

export const PLATFORM_SHORT: Record<AdPlatform, string> = { GOOGLE: 'Google Ads', META: 'Meta Ads' }

export const PLACEMENT_LABEL: Record<string, string> = {
  facebook_feed: 'Feed do Facebook',
  instagram_feed: 'Feed do Instagram',
  instagram_reels: 'Reels do Instagram',
  instagram_stories: 'Stories do Instagram',
  facebook_reels: 'Reels do Facebook',
  messenger_inbox: 'Caixa do Messenger',
  instagram_explore: 'Explorar do Instagram',
}
export const ALL_PLACEMENTS = Object.keys(PLACEMENT_LABEL)

export const HEADLINE_MAX = 30
export const DESCRIPTION_MAX = 90
export const MIN_DAILY_BUDGET = 5
export const MAX_DAILY_BUDGET = 200
/** business days per month used for budget projection */
export const BUSINESS_DAYS_MONTH = 22

export function formatSeconds(ms: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(ms / 1000)}s`
}

export function domainFromUrl(url: string) {
  try {
    const u = new URL(url)
    return { host: u.hostname.replace(/^www\./, ''), path: u.pathname.replace(/\/$/, '') }
  } catch {
    return { host: url, path: '' }
  }
}
