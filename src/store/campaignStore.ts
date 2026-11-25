import { create } from 'zustand'
import type { AdCampaign, AdGroup, CampaignBlueprint, CampaignStatus, Keyword, Lead } from '@/types/domain'
import { seedCampaigns } from '@/mock/data/campaigns'
import { nowISO, uid } from '@/lib/utils'

interface CampaignState {
  campaigns: AdCampaign[]
  blueprints: CampaignBlueprint[]
  /** ENABLED ⇄ PAUSED (REMOVED stays REMOVED) */
  toggleCampaignStatus: (id: string) => void
  setCampaignStatus: (id: string, status: CampaignStatus) => void
  /** Generic patch: dailyBudgetBRL, name, negatives, targetStates, schedule, meta… */
  updateCampaign: (id: string, patch: Partial<AdCampaign>) => void
  updateAdGroup: (campaignId: string, adGroupId: string, patch: Partial<AdGroup>) => void
  addKeyword: (campaignId: string, adGroupId: string, keyword: Pick<Keyword, 'text' | 'matchType'>) => void
  removeKeyword: (campaignId: string, adGroupId: string, keywordId: string) => void
  /** Adds deployed campaigns (status PAUSED) on top of the list */
  addCampaigns: (campaigns: AdCampaign[]) => void
  removeCampaign: (id: string) => void
  addCampaignNegatives: (campaignId: string, terms: string[]) => void
  addBlueprint: (bp: CampaignBlueprint) => void
  updateBlueprint: (id: string, patch: Partial<CampaignBlueprint>) => void
  /** Recompute leads / SQLs / won BRL / tracking for every campaign from the leads list */
  syncLeadMetrics: (leads: Lead[], trackedLeadIds?: Set<string>) => void
}

const mapCampaign = (list: AdCampaign[], id: string, fn: (c: AdCampaign) => AdCampaign) => list.map((c) => (c.id === id ? fn(c) : c))

export const useCampaignStore = create<CampaignState>((set) => ({
  campaigns: seedCampaigns,
  blueprints: [],
  toggleCampaignStatus: (id) =>
    set((s) => ({
      campaigns: mapCampaign(s.campaigns, id, (c) =>
        c.status === 'REMOVED' ? c : { ...c, status: c.status === 'ENABLED' ? 'PAUSED' : 'ENABLED', statusChangedAt: nowISO(), lastSyncedAt: nowISO() },
      ),
    })),
  setCampaignStatus: (id, status) =>
    set((s) => ({ campaigns: mapCampaign(s.campaigns, id, (c) => ({ ...c, status, statusChangedAt: nowISO(), lastSyncedAt: nowISO() })) })),
  updateCampaign: (id, patch) => set((s) => ({ campaigns: mapCampaign(s.campaigns, id, (c) => ({ ...c, ...patch })) })),
  updateAdGroup: (campaignId, adGroupId, patch) =>
    set((s) => ({
      campaigns: mapCampaign(s.campaigns, campaignId, (c) => ({ ...c, adGroups: c.adGroups.map((g) => (g.id === adGroupId ? { ...g, ...patch } : g)) })),
    })),
  addKeyword: (campaignId, adGroupId, keyword) =>
    set((s) => ({
      campaigns: mapCampaign(s.campaigns, campaignId, (c) => ({
        ...c,
        adGroups: c.adGroups.map((g) =>
          g.id === adGroupId ? { ...g, keywords: [...g.keywords, { id: uid('kw'), impressions: 0, clicks: 0, ...keyword }] } : g,
        ),
      })),
    })),
  removeKeyword: (campaignId, adGroupId, keywordId) =>
    set((s) => ({
      campaigns: mapCampaign(s.campaigns, campaignId, (c) => ({
        ...c,
        adGroups: c.adGroups.map((g) => (g.id === adGroupId ? { ...g, keywords: g.keywords.filter((k) => k.id !== keywordId) } : g)),
      })),
    })),
  addCampaigns: (campaigns) => set((s) => ({ campaigns: [...campaigns, ...s.campaigns] })),
  removeCampaign: (id) => set((s) => ({ campaigns: mapCampaign(s.campaigns, id, (c) => ({ ...c, status: 'REMOVED', statusChangedAt: nowISO() })) })),
  addCampaignNegatives: (campaignId, terms) =>
    set((s) => ({
      campaigns: mapCampaign(s.campaigns, campaignId, (c) => ({ ...c, negatives: Array.from(new Set([...c.negatives, ...terms])) })),
    })),
  addBlueprint: (bp) => set((s) => ({ blueprints: [bp, ...s.blueprints] })),
  updateBlueprint: (id, patch) => set((s) => ({ blueprints: s.blueprints.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
  syncLeadMetrics: (leads, trackedLeadIds) =>
    set((s) => ({
      campaigns: s.campaigns.map((c) => {
        const ls = leads.filter((l) => l.campaignId === c.id)
        if (!ls.length && !c.metrics.leads) return c
        const tracked = trackedLeadIds ? ls.filter((l) => trackedLeadIds.has(l.id)).length : null
        return {
          ...c,
          metrics: {
            ...c.metrics,
            leads: ls.length,
            sqls: ls.filter((l) => l.sqlAt).length,
            wonBRL: ls.filter((l) => l.kanbanStage === 'WON').reduce((a, l) => a + (l.closedValueBRL ?? 0), 0),
            trackingCoverage: tracked != null && ls.length ? tracked / ls.length : c.metrics.trackingCoverage,
          },
        }
      }),
    })),
}))

export const useCampaign = (id: string | null | undefined) => useCampaignStore((s) => (id ? s.campaigns.find((c) => c.id === id) : undefined))
