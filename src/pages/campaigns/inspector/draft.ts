import type { AdCampaign, AdGroup, AllowedState, MetaSettings } from '@/types/domain'
import { DESCRIPTION_MAX, HEADLINE_MAX, MAX_DAILY_BUDGET, MIN_DAILY_BUDGET } from '../lib'

export interface Draft {
  /** raw input text (pt-BR decimal comma allowed) */
  budget: string
  targetStates: AllowedState[]
  negatives: string[]
  adGroups: AdGroup[]
  meta: MetaSettings | null
}

export type SetDraft = (fn: (d: Draft) => Draft) => void

export const budgetToText = (v: number) => String(v).replace('.', ',')
export const parseBudget = (s: string) => {
  const t = s.trim()
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return Number.isFinite(n) && s.trim() !== '' ? n : NaN
}

export function draftFrom(c: AdCampaign): Draft {
  return {
    budget: budgetToText(c.dailyBudgetBRL),
    targetStates: [...c.targetStates],
    negatives: [...c.negatives],
    adGroups: structuredClone(c.adGroups),
    meta: c.meta ? structuredClone(c.meta) : null,
  }
}

export function budgetError(text: string): string | null {
  const n = parseBudget(text)
  if (Number.isNaN(n)) return 'Informe um valor numérico.'
  if (n < MIN_DAILY_BUDGET) return `Mínimo de R$ ${MIN_DAILY_BUDGET},00 por dia.`
  if (n > MAX_DAILY_BUDGET) return `Máximo de R$ ${MAX_DAILY_BUDGET},00 por dia no piloto.`
  return null
}

export interface DraftErrors {
  budget: string | null
  states: string | null
  ads: string | null
  count: number
}

export function validate(d: Draft): DraftErrors {
  const budget = budgetError(d.budget)
  const states = d.targetStates.length ? null : 'Selecione ao menos um estado.'
  let ads: string | null = null
  for (const g of d.adGroups) {
    if (g.headlines.some((h) => h.length > HEADLINE_MAX)) ads = `Títulos acima de ${HEADLINE_MAX} caracteres em “${g.name}”.`
    else if (g.descriptions.some((x) => x.length > DESCRIPTION_MAX)) ads = `Descrições acima de ${DESCRIPTION_MAX} caracteres em “${g.name}”.`
    else if (g.headlines.filter((h) => h.trim()).length < 3) ads = `“${g.name}” precisa de ao menos 3 títulos.`
    else if (g.descriptions.filter((h) => h.trim()).length < 2) ads = `“${g.name}” precisa de ao menos 2 descrições.`
    if (ads) break
  }
  return { budget, states, ads, count: [budget, states, ads].filter(Boolean).length }
}

export function toPatch(d: Draft): Partial<AdCampaign> {
  return {
    dailyBudgetBRL: Math.round(parseBudget(d.budget) * 100) / 100,
    targetStates: d.targetStates,
    negatives: d.negatives,
    adGroups: d.adGroups.map((g) => ({ ...g, headlines: g.headlines.map((h) => h.trim()), descriptions: g.descriptions.map((x) => x.trim()) })),
    meta: d.meta,
  }
}

/** compare draft against campaign — normalized */
export function isDirty(d: Draft, c: AdCampaign) {
  return JSON.stringify(draftFrom(c)) !== JSON.stringify(d)
}
