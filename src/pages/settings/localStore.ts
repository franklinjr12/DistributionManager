import { create } from 'zustand'
import type { IntegrationStatus, UserRole } from '@/types/domain'
import { nowISO, uid } from '@/lib/utils'

/** Settings that are not (yet) part of the Tenant domain type — kept locally for the demo. */

export interface DayHours {
  on: boolean
  start: string
  end: string
}

export interface ExtraIntegration {
  key: 'SUPABASE' | 'UPSTASH'
  name: string
  description: string
  status: IntegrationStatus
  accountLabel: string
  detail?: string
  lastSyncAt?: string
}

export interface Invite {
  id: string
  fullName: string
  email: string
  role: UserRole
  sentAt: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  action: string
  target: string
}

export interface LocalSettings {
  cnpj: string
  logoColor: string
  slaMinutes: number
  triggerFieldsComplete: boolean
  triggerHumanRequest: boolean
  notifyEmailCopy: boolean
  weekHours: Record<number, DayHours>
  catalogGrounding: boolean
  businessHoursGuardrail: boolean
  aiMonthlyBudgetUsd: number
  lgpdConsentText: string
  retentionMonths: number
  anonymizeOnRequest: boolean
  window24hProtection: boolean
  extraIntegrations: ExtraIntegration[]
  invites: Invite[]
  audit: AuditEntry[]
}

interface LocalState extends LocalSettings {
  patch: (p: Partial<LocalSettings>) => void
  log: (action: string, target: string) => void
}

const weekday = (on: boolean): DayHours => ({ on, start: '08:00', end: '18:00' })

export const useLocalSettings = create<LocalState>((set) => ({
  cnpj: '12.345.678/0001-90',
  logoColor: '#1d4ed8',
  slaMinutes: 15,
  triggerFieldsComplete: true,
  triggerHumanRequest: true,
  notifyEmailCopy: false,
  weekHours: { 0: weekday(false), 1: weekday(true), 2: weekday(true), 3: weekday(true), 4: weekday(true), 5: weekday(true), 6: weekday(false) },
  catalogGrounding: true,
  businessHoursGuardrail: true,
  aiMonthlyBudgetUsd: 15,
  lgpdConsentText: 'Ao enviar, você autoriza o contato da Maquinabel para retorno comercial.',
  retentionMonths: 24,
  anonymizeOnRequest: true,
  window24hProtection: true,
  extraIntegrations: [
    {
      key: 'SUPABASE',
      name: 'Supabase (Postgres + RLS)',
      description: 'Banco multi-tenant com Row-Level Security por tenant_id e Auth do painel.',
      status: 'CONNECTED',
      accountLabel: 'projeto maquinabel-prod · sa-east-1',
      lastSyncAt: '2026-11-20T10:30:00-03:00',
    },
    {
      key: 'UPSTASH',
      name: 'Upstash Redis',
      description: 'Fila de debounce (5 s) das mensagens e locks de idempotência dos webhooks.',
      status: 'CONNECTED',
      accountLabel: 'maquinabel-queue · gru1',
      lastSyncAt: '2026-11-20T10:29:00-03:00',
    },
  ],
  invites: [],
  audit: [
    { id: 'au_1', at: '2026-11-20T10:18:00-03:00', actor: 'Sistema', action: 'Handoff enviado via template', target: 'Lead Macapá (A260)' },
    { id: 'au_2', at: '2026-11-20T09:02:00-03:00', actor: 'Vinicius Goés', action: 'Login no painel', target: 'IP 177.71.•••.12' },
    { id: 'au_3', at: '2026-11-19T16:40:00-03:00', actor: 'Vinicius Goés', action: 'Exportou relatório do piloto', target: 'CSV (;)' },
    { id: 'au_4', at: '2026-11-18T11:05:00-03:00', actor: 'Equipe Plataforma', action: 'Rotacionou token Meta System User', target: 'META_ADS' },
    { id: 'au_5', at: '2026-11-16T07:00:00-03:00', actor: 'Worker otimizador', action: 'Adicionou 7 negativas', target: 'Google Ads' },
    { id: 'au_6', at: '2026-11-12T14:22:00-03:00', actor: 'Sistema', action: 'Anonimização LGPD (DELETE /gdpr)', target: 'Lead ld_0••' },
  ],
  patch: (p) => set(p),
  log: (action, target) =>
    set((s) => ({
      audit: [{ id: uid('au'), at: nowISO(), actor: 'Vinicius Goés', action, target }, ...s.audit].slice(0, 12),
    })),
}))
