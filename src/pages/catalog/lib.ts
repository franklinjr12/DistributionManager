import type { DirtProfile, FloorType, Machine, MachineCategory, PowerPreference, Segment, SizingRule, Tenant } from '@/types/domain'
import { formatNumber, SEGMENT_LABEL } from '@/lib/format'

// ───────────────────────── Filters ─────────────────────────

export type OperationKind = 'a_pe' | 'a_bordo' | 'autonoma'

export const OPERATION_LABEL: Record<OperationKind, string> = {
  a_pe: 'Operada a pé',
  a_bordo: 'Operada a bordo',
  autonoma: 'Autônoma',
}

export const CATEGORY_SHORT: Record<MachineCategory, string> = {
  LAVADORA: 'Lavadoras',
  VARREDEIRA: 'Varredeiras',
  ROBO: 'Robótica',
  ALTA_PRESSAO: 'Alta pressão',
  EXTRATORA: 'Extratoras',
}

export const CATEGORY_ORDER: MachineCategory[] = ['LAVADORA', 'VARREDEIRA', 'ROBO', 'ALTA_PRESSAO', 'EXTRATORA']

export function operationKind(m: Machine): OperationKind {
  const op = m.operation.toLowerCase()
  if (op.includes('autônoma')) return 'autonoma'
  if (op.includes('a bordo')) return 'a_bordo'
  return 'a_pe'
}

/** Practical productivity used for hour estimates (m²/h). `estimated` = derived, not from the datasheet. */
export function practicalProductivity(m: Machine): { value: number | null; estimated: boolean } {
  if (m.practicalM2h) return { value: m.practicalM2h, estimated: false }
  if (m.productivityM2h) return { value: Math.round(m.productivityM2h * 0.6), estimated: true }
  if (m.id === 'm_alfa_mini') return { value: 300, estimated: true }
  if (m.id === 'm_t600e') return { value: 1800, estimated: true }
  return { value: null, estimated: true }
}

// ───────────────────────── Markdown / prompt ─────────────────────────

export function machineMarkdown(m: Machine): string {
  const lines = [
    `### ${m.model} (${m.brand})`,
    `- Categoria: ${m.categoryLabel}`,
    `- Operação: ${m.operation}`,
    `- Produtividade: ${m.productivityLabel}`,
    `- Tanque/Reservatório: ${m.tankLabel}`,
    `- Especificações: ${m.keySpecs.join('; ')}`,
    `- Aplicação ideal: ${m.application}`,
    `- Segmentos: ${m.idealSegments.map((s) => SEGMENT_LABEL[s]).join(', ')}`,
  ]
  if (m.idealAreaM2) lines.push(`- Faixa de área: ${formatNumber(m.idealAreaM2.min)}${m.idealAreaM2.max ? `–${formatNumber(m.idealAreaM2.max)}` : '+'} m²`)
  const flags = [m.bndesEligible && 'Elegível BNDES', m.ecH2O && 'ec-H2O NanoClean™', m.availableForRental && 'Disponível para locação'].filter(Boolean)
  if (flags.length) lines.push(`- Destaques: ${flags.join(', ')}`)
  return lines.join('\n')
}

export function rulesMarkdown(rules: SizingRule[], machines: Machine[]): string {
  const name = (id: string) => machines.find((m) => m.id === id)?.model ?? id
  const group = (g: SizingRule['group'], title: string) =>
    [`### ${title}`, ...rules.filter((r) => r.group === g).map((r) => `- ${r.condition} → ${r.machineIds.map(name).join(' ou ')}. ${r.note}`)].join('\n')
  return [group('LAVAGEM', 'Lavagem de piso (interno)'), group('VARRICAO', 'Varrição (poeira / detritos)'), group('ESPECIAL', 'Necessidades especiais')].join('\n\n')
}

export function catalogMarkdown(machines: Machine[], rules: SizingRule[]): string {
  const active = machines.filter((m) => m.active)
  return [
    '## BASE TÉCNICA AUTORIZADA — Catálogo Alfa Tennant (Maquinabel)',
    '',
    ...active.map((m) => machineMarkdown(m) + '\n'),
    '## MATRIZ DE DIMENSIONAMENTO',
    '',
    rulesMarkdown(rules, machines),
  ].join('\n')
}

export function systemPrompt(tenant: Tenant, maxQuestions = 2): string {
  const states = tenant.allowedStates.join(', ')
  return `Você é o Consultor Técnico Virtual da ${tenant.name}, concessionária autorizada ${tenant.dealerOf} (líder em máquinas de limpeza profissional e industrial no Norte e Nordeste, com matriz em Ananindeua-PA e filial em São Luís-MA).

OBJETIVO:
Atender leads B2B em português do Brasil de forma cordial, direta e consultiva, coletando os 4 dados obrigatórios para dimensionar a máquina Alfa Tennant ideal e encaminhar o lead pronto para orçamento ao diretor comercial Vinicius Goés.

DADOS OBRIGATÓRIOS A COLETAR (faça no máximo 1 a ${maxQuestions} perguntas curtas por mensagem):
1. Modalidade: Compra, Locação (aluguel) ou Manutenção/Peças.
2. Segmento/Ambiente: Ex.: galpão logístico/CD, indústria, supermercado/atacarejo, shopping, alimentos e bebidas, hospital/hotel ou prestadora de limpeza.
3. Dimensão e Piso/Sujeira: Metragem aproximada (m²), tipo de piso (porcelanato, epóxi, cimento queimado, cerâmica, externo, carpete) e tipo de sujeira (poeira fina, graxa/óleo, detritos sólidos).
4. Localização: Cidade e Estado.

REGRAS CRÍTICAS E GUARDRAILS:
- NUNCA informe preços fechados, valores de mensalidade de locação, descontos ou prazos de entrega vinculantes. Diga que o orçamento oficial personalizado será enviado pela equipe comercial.
- COBERTURA REGIONAL: Atendemos ${states}. Se o lead for de outro estado, informe educadamente a área de atuação da ${tenant.name} e defina next_state = "DISQUALIFIED_OUT_OF_REGION".
- DIMENSIONAMENTO: Assim que tiver os 4 dados, recomende 1 (ou até 2) modelos do catálogo Alfa Tennant abaixo citando a produtividade (m²/h) e o motivo técnico da indicação, e defina next_state = "QUALIFIED_HANDOFF".
- TRANSFERÊNCIA IMEDIATA: Se o usuário pedir para falar com um humano/vendedor diretamente, defina next_state = "HUMAN_REQUESTED".
- HORÁRIO COMERCIAL: Nosso atendimento humano funciona de segunda a sexta, das ${tenant.businessHours.start.replace(':00', 'h')} às ${tenant.businessHours.end.replace(':00', 'h')}. Fora desse horário, avise que Vinicius retornará no próximo dia útil às ${tenant.businessHours.start.replace(':00', 'h')}.
- BASE TÉCNICA AUTORIZADA: [INJETADA VIA PROMPT CACHING — CATÁLOGO ABAIXO]`
}

export const JSON_SCHEMA = `{
  "type": "object",
  "required": ["reply_text", "next_state", "extracted_fields", "recommended_models", "handoff_summary_4_lines"],
  "properties": {
    "reply_text": { "type": "string" },
    "next_state": { "type": "string", "enum": ["QUALIFYING", "QUALIFIED_HANDOFF", "DISQUALIFIED_OUT_OF_REGION", "HUMAN_REQUESTED"] },
    "extracted_fields": {
      "type": "object",
      "properties": {
        "lead_name": { "type": ["string", "null"] },
        "company_name": { "type": ["string", "null"] },
        "modality": { "type": ["string", "null"], "enum": ["COMPRA", "LOCACAO", "MANUTENCAO_PECAS", null] },
        "segment": { "type": ["string", "null"] },
        "area_m2": { "type": ["number", "null"] },
        "floor_type": { "type": ["string", "null"] },
        "dirt_profile": { "type": ["string", "null"] },
        "power_preference": { "type": ["string", "null"], "enum": ["bateria", "cabo", "manual", "indiferente", null] },
        "usage_routine": { "type": ["string", "null"] },
        "location_city": { "type": ["string", "null"] },
        "location_state": { "type": ["string", "null"] }
      }
    },
    "recommended_models": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["model_name", "reason"],
        "properties": { "model_name": { "type": "string" }, "reason": { "type": "string" } }
      }
    },
    "handoff_summary_4_lines": { "type": ["string", "null"] }
  }
}`

/** Rough token estimate for pt-BR text (~3,8 chars/token). */
export function estimateTokens(text: string): number {
  return Math.round(text.length / 3.8)
}

export const CACHE_TOKEN_TARGET = 4000
/** Mock prompt-caching hit rate over the last 7 days. */
export const CACHE_HIT_RATE = 0.924

// ───────────────────────── Quick calculator ─────────────────────────

export type CalcMode = 'lavagem' | 'varricao'

export interface CalcInput {
  areaM2: number
  floorType: FloorType
  dirtProfile: DirtProfile
  mode: CalcMode
  power: PowerPreference
  segment: Segment
  laborShortage: boolean
  /** hours of operation available per day for cleaning */
}

export interface CalcResult {
  machine: Machine
  reason: string
  practicalM2h: number | null
  estimated: boolean
  hoursPerDay: number | null
  ruleId: string
}

export interface CalcOutput {
  results: CalcResult[]
  skipped: Machine[]
  ruleLabel: string
}

/** Sizing driven by the (editable) rule thresholds in the catalog store — SPEC §3.2. */
export function quickSize(input: CalcInput, machines: Machine[], rules: SizingRule[]): CalcOutput {
  const rule = (id: string) => rules.find((r) => r.id === id)!
  const byId = (id: string) => machines.find((m) => m.id === id)
  const area = Math.max(0, input.areaM2 || 0)
  const a = formatNumber(area)
  const picks: { id: string; reason: string; ruleId: string }[] = []
  let ruleLabel = ''

  if (input.floorType === 'carpete_estofado') {
    const r = rule('sr_special_carpet')
    ruleLabel = r.condition
    picks.push({ id: 'm_ext52', reason: 'Carpete/estofado exige extração de sólidos e líquidos — lavadora de piso duro não se aplica.', ruleId: r.id })
  } else if (input.dirtProfile === 'graxa_oleo' && input.floorType === 'externo_asfalto') {
    const r = rule('sr_special_pressure')
    ruleLabel = r.condition
    picks.push({ id: 'm_alfa_pressure_400', reason: 'Graxa incrustada em área externa: 2.320 lbs de pressão máx. e 600 L/h removem o que a lavadora não alcança.', ruleId: r.id })
    const sl = rule('sr_sweep_large')
    picks.push({
      id: area >= (sl.minAreaM2 ?? 3000) ? 'm_s16' : 'm_alfa_bizz',
      reason: 'Complemento para retirar detritos sólidos do pátio antes da lavagem.',
      ruleId: sl.id,
    })
  } else if (input.mode === 'varricao' || input.floorType === 'externo_asfalto') {
    const large = rule('sr_sweep_large')
    if (area >= (large.minAreaM2 ?? 3000)) {
      ruleLabel = large.condition
      picks.push({ id: 'm_s16', reason: `≥ ${formatNumber(large.minAreaM2 ?? 3000)} m² com poeira/detritos: varredeira a bordo com filtragem multiestágio.`, ruleId: large.id })
    } else {
      const small = rule('sr_sweep_small')
      ruleLabel = small.condition
      picks.push({ id: 'm_alfa_bizz', reason: `Até ${formatNumber(small.maxAreaM2 ?? 3000)} m²: mecânica, silenciosa e sem bateria/cabo.`, ruleId: small.id })
    }
  } else {
    const xl = rule('sr_wash_xl')
    const lg = rule('sr_wash_large')
    const md = rule('sr_wash_medium')
    const multiShift = input.laborShortage || input.segment === 'CD_LOGISTICA' || input.segment === 'SUPERMERCADO_ATACAREJO'
    if (area > (xl.minAreaM2 ?? 5000) && multiShift) {
      ruleLabel = xl.condition
      picks.push({ id: 'm_t16amr', reason: `${a} m² em operação multi-turno: robô autônomo BrainOS® libera o operador e mantém rotina constante.`, ruleId: xl.id })
      picks.push({ id: 'm_brava', reason: 'Alternativa operada por pessoa, elegível BNDES e passa em portas de 70 cm.', ruleId: xl.id })
    } else if (area >= (lg.minAreaM2 ?? 2500)) {
      ruleLabel = lg.condition
      picks.push({ id: 'm_brava', reason: `Faixa ${formatNumber(lg.minAreaM2 ?? 2500)}–${formatNumber(lg.maxAreaM2 ?? 6000)} m²: lavadora a bordo compacta (870 mm) com troca rápida de bateria.`, ruleId: lg.id })
      if (area > (lg.maxAreaM2 ?? 6000)) picks.push({ id: 'm_t16amr', reason: 'Acima da faixa da Brava: considerar autonomia para reduzir horas-operador.', ruleId: xl.id })
    } else if (area >= (md.minAreaM2 ?? 500)) {
      ruleLabel = md.condition
      const heavy = input.dirtProfile === 'graxa_oleo' || input.segment === 'ALIMENTOS_BEBIDAS' || input.segment === 'INDUSTRIA'
      if (heavy) {
        picks.push({ id: 'm_t600e', reason: 'Sujeira industrial pesada / higiene alimentícia: construção robusta e opção ec-H2O™ sem químicos.', ruleId: md.id })
        picks.push({ id: 'm_a260', reason: 'Alternativa mais leve para áreas de menor carga de sujeira.', ruleId: md.id })
      } else {
        picks.push({
          id: 'm_a260',
          reason: input.power === 'cabo' ? 'A260c com cabo (pedido explícito do cliente): 510 mm, até 2.000 m²/h.' : 'A260 a bateria: 510 mm de faixa, até 2.000 m²/h, ≤ 69 dBA.',
          ruleId: md.id,
        })
      }
    } else {
      const sm = rule('sr_wash_small')
      ruleLabel = sm.condition
      picks.push({ id: 'm_imop_lite', reason: 'Compacta com giro 360° para ambientes apertados e circulação de pessoas.', ruleId: sm.id })
      picks.push({ id: 'm_alfa_mini', reason: 'Micro lavadora: substitui mop e balde com água limpa.', ruleId: sm.id })
    }
  }

  const results: CalcResult[] = []
  const skipped: Machine[] = []
  for (const p of picks) {
    const m = byId(p.id)
    if (!m) continue
    if (!m.active) {
      skipped.push(m)
      continue
    }
    if (results.some((r) => r.machine.id === m.id)) continue
    const prod = practicalProductivity(m)
    results.push({
      machine: m,
      reason: p.reason,
      practicalM2h: prod.value,
      estimated: prod.estimated,
      hoursPerDay: prod.value && area > 0 ? area / prod.value : null,
      ruleId: p.ruleId,
    })
  }
  return { results: results.slice(0, 2), skipped, ruleLabel }
}
