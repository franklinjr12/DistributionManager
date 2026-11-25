import { create } from 'zustand'
import type { Machine, SizingRule } from '@/types/domain'
import { machines as seedMachines, sizingRules as seedRules } from '@/mock/data/catalog'

interface CatalogState {
  machines: Machine[]
  sizingRules: SizingRule[]
  updateMachine: (id: string, patch: Partial<Machine>) => void
  toggleMachineActive: (id: string) => void
  updateSizingRule: (id: string, patch: Partial<SizingRule>) => void
}

export const useCatalogStore = create<CatalogState>((set) => ({
  machines: seedMachines,
  sizingRules: seedRules,
  updateMachine: (id, patch) => set((s) => ({ machines: s.machines.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  toggleMachineActive: (id) => set((s) => ({ machines: s.machines.map((m) => (m.id === id ? { ...m, active: !m.active } : m)) })),
  updateSizingRule: (id, patch) => set((s) => ({ sizingRules: s.sizingRules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
}))

export const useMachine = (id: string | null | undefined) => useCatalogStore((s) => (id ? s.machines.find((m) => m.id === id) : undefined))
