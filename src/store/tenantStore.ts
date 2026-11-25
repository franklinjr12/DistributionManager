import { create } from 'zustand'
import type { AiSettings, Integration, IntegrationKey, Tenant, User } from '@/types/domain'
import { otherTenants, tenant as seedTenant, users as seedUsers, VINICIUS_ID } from '@/mock/data/tenant'

interface TenantState {
  tenant: Tenant
  /** placeholder tenants (comingSoon) for the switcher */
  otherTenants: typeof otherTenants
  users: User[]
  currentUserId: string
  updateTenant: (patch: Partial<Tenant>) => void
  updateAiSettings: (patch: Partial<AiSettings>) => void
  updateBusinessHours: (patch: Partial<Tenant['businessHours']>) => void
  updateIntegration: (key: IntegrationKey, patch: Partial<Integration>) => void
  updateUser: (id: string, patch: Partial<User>) => void
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: seedTenant,
  otherTenants,
  users: seedUsers,
  currentUserId: VINICIUS_ID,
  updateTenant: (patch) => set((s) => ({ tenant: { ...s.tenant, ...patch } })),
  updateAiSettings: (patch) => set((s) => ({ tenant: { ...s.tenant, aiSettings: { ...s.tenant.aiSettings, ...patch } } })),
  updateBusinessHours: (patch) => set((s) => ({ tenant: { ...s.tenant, businessHours: { ...s.tenant.businessHours, ...patch } } })),
  updateIntegration: (key, patch) =>
    set((s) => ({
      tenant: { ...s.tenant, integrations: s.tenant.integrations.map((i) => (i.key === key ? { ...i, ...patch } : i)) },
    })),
  updateUser: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
}))

/** Current logged-in user (Vinicius Goés). */
export const useCurrentUser = () => useTenantStore((s) => s.users.find((u) => u.id === s.currentUserId)!)
