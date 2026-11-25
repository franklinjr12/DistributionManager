import { create } from 'zustand'

interface UiState {
  /** desktop: sidebar collapsed to icon rail */
  sidebarCollapsed: boolean
  /** mobile: off-canvas drawer open */
  mobileNavOpen: boolean
  /** 0..1 probability that mock API calls fail (demo error states). Default 0. */
  mockFailureRate: number
  /** multiplies mock latency (1 = default 300–1500 ms) */
  latencyMultiplier: number
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setMobileNavOpen: (v: boolean) => void
  setMockFailureRate: (rate: number) => void
  setLatencyMultiplier: (m: number) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  mockFailureRate: 0,
  latencyMultiplier: 1,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  setMockFailureRate: (rate) => set({ mockFailureRate: Math.min(1, Math.max(0, rate)) }),
  setLatencyMultiplier: (m) => set({ latencyMultiplier: Math.max(0, m) }),
}))
