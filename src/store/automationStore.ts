import { create } from 'zustand'
import type {
  AdSpendEntry,
  IgCommentEvent,
  NegativeKeyword,
  OfflineConversionEvent,
  OptimizationLog,
  OptimizationRun,
  OutboundProspect,
} from '@/types/domain'
import {
  seedConversionEvents,
  seedIgEvents,
  seedNegativeKeywords,
  seedOptimizationLogs,
  seedOptimizationRuns,
  seedProspects,
} from '@/mock/data/automation'
import { seedAdSpendEntries } from '@/mock/data/campaigns'
import { nowISO, uid } from '@/lib/utils'

interface AutomationState {
  optimizationRuns: OptimizationRun[]
  optimizationLogs: OptimizationLog[]
  negativeKeywords: NegativeKeyword[]
  conversionEvents: OfflineConversionEvent[]
  prospects: OutboundProspect[]
  igEvents: IgCommentEvent[]
  adSpendEntries: AdSpendEntry[]

  addOptimizationRun: (run: OptimizationRun, logs: OptimizationLog[]) => void
  /** Adds negatives (deduped by text+scope+campaign). Accepts plain strings or partial objects. */
  addNegatives: (items: (string | Partial<NegativeKeyword>)[], defaults?: Partial<NegativeKeyword>) => NegativeKeyword[]
  removeNegative: (id: string) => void
  /** Override an optimizer decision (e.g. keep a term that was negated) */
  updateOptimizationLog: (id: string, patch: Partial<OptimizationLog>) => void

  addConversionEvent: (e: OfflineConversionEvent) => void
  updateConversionEvent: (id: string, patch: Partial<OfflineConversionEvent>) => void

  addProspects: (items: OutboundProspect[]) => void
  updateProspect: (id: string, patch: Partial<OutboundProspect>) => void

  addIgEvent: (e: IgCommentEvent) => void
  updateIgEvent: (id: string, patch: Partial<IgCommentEvent>) => void

  addAdSpendEntry: (e: Omit<AdSpendEntry, 'id'>) => AdSpendEntry
  updateAdSpendEntry: (id: string, patch: Partial<AdSpendEntry>) => void
  removeAdSpendEntry: (id: string) => void
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  optimizationRuns: seedOptimizationRuns,
  optimizationLogs: seedOptimizationLogs,
  negativeKeywords: seedNegativeKeywords,
  conversionEvents: seedConversionEvents,
  prospects: seedProspects,
  igEvents: [...seedIgEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  adSpendEntries: seedAdSpendEntries,

  addOptimizationRun: (run, logs) => set((s) => ({ optimizationRuns: [run, ...s.optimizationRuns], optimizationLogs: [...logs, ...s.optimizationLogs] })),
  addNegatives: (items, defaults = {}) => {
    const existing = get().negativeKeywords
    const added: NegativeKeyword[] = []
    for (const it of items) {
      const base: NegativeKeyword = {
        id: uid('neg'),
        text: '',
        matchType: 'PHRASE',
        scope: 'ACCOUNT',
        campaignId: null,
        listName: 'Manual · Vinicius',
        source: 'MANUAL',
        runId: null,
        addedAt: nowISO(),
        ...defaults,
        ...(typeof it === 'string' ? { text: it } : it),
      }
      base.text = base.text.trim().toLowerCase()
      if (!base.text) continue
      const dup = [...existing, ...added].some((n) => n.text === base.text && n.scope === base.scope && n.campaignId === base.campaignId)
      if (!dup) added.push(base)
    }
    if (added.length) set((s) => ({ negativeKeywords: [...added, ...s.negativeKeywords] }))
    return added
  },
  removeNegative: (id) => set((s) => ({ negativeKeywords: s.negativeKeywords.filter((n) => n.id !== id) })),
  updateOptimizationLog: (id, patch) => set((s) => ({ optimizationLogs: s.optimizationLogs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),

  addConversionEvent: (e) => set((s) => ({ conversionEvents: [e, ...s.conversionEvents] })),
  updateConversionEvent: (id, patch) => set((s) => ({ conversionEvents: s.conversionEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

  addProspects: (items) => set((s) => ({ prospects: [...items, ...s.prospects] })),
  updateProspect: (id, patch) => set((s) => ({ prospects: s.prospects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  addIgEvent: (e) => set((s) => ({ igEvents: [e, ...s.igEvents] })),
  updateIgEvent: (id, patch) => set((s) => ({ igEvents: s.igEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

  addAdSpendEntry: (e) => {
    const entry: AdSpendEntry = { id: uid('sp'), ...e }
    set((s) => ({ adSpendEntries: [entry, ...s.adSpendEntries] }))
    return entry
  },
  updateAdSpendEntry: (id, patch) => set((s) => ({ adSpendEntries: s.adSpendEntries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  removeAdSpendEntry: (id) => set((s) => ({ adSpendEntries: s.adSpendEntries.filter((e) => e.id !== id) })),
}))
