/**
 * Deterministic mock SDR engine (no LLM). Pure TS: keyword/regex extraction in pt-BR,
 * incremental merge, state decision, SPEC §3.2 sizing, guarded reply templates and
 * a structured output matching the SPEC §3.3 JSON schema.
 */
import type { DirtProfile, FloorType, Machine, Modality, PowerPreference, RecommendedModel, Segment } from '@/types/domain'
import { recommendMachines } from '@/lib/sizing'
import { DIRT_LABEL, FLOOR_LABEL, MODALITY_LABEL, SEGMENT_LABEL, formatNumber } from '@/lib/format'
import { hashString, seededRandom } from '@/lib/utils'

export type NextState = 'QUALIFYING' | 'QUALIFIED_HANDOFF' | 'DISQUALIFIED_OUT_OF_REGION' | 'HUMAN_REQUESTED'
export type EngineState = 'NEW' | NextState

export const COVERED_UF = ['PA', 'MA', 'AP'] as const

export interface ExtractedFields {
  lead_name: string | null
  company_name: string | null
  modality: Modality | null
  segment: Segment | null
  area_m2: number | null
  floor_type: FloorType | null
  dirt_profile: DirtProfile | null
  power_preference: PowerPreference | null
  usage_routine: string | null
  location_city: string | null
  location_state: string | null
}

export interface StructuredOutput {
  reply_text: string
  next_state: NextState
  extracted_fields: ExtractedFields
  recommended_models: { model_name: string; reason: string; productivity_m2h?: number }[]
  handoff_summary_4_lines: string | null
}

export interface EngineFlags {
  laborShortage: boolean
  needsSweeping: boolean
  sweepOnly: boolean
  ownedModel: string | null
  phone: string | null
}

export interface EngineContext {
  fields: ExtractedFields
  flags: EngineFlags
  state: EngineState
  turn: number
  priceProbes: number
  greeted: boolean
  /** history tokens grow each turn (fake) */
  historyChars: number
  historyText: string
  lastAsked: string
}

export interface TurnInput {
  text: string
  bubbles: number
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'WIDGET'
  originTag: string
  businessHours: boolean
  catalog?: Machine[]
  /** WhatsApp wa_id of the simulated lead (known by the channel itself) */
  waPhone?: string | null
  /** e.g. @igusername when the name is unknown */
  leadLabel?: string | null
}

export interface GuardrailChecks {
  price: 'ok' | 'triggered'
  catalog: 'ok'
  region: 'ok' | 'pending' | 'blocked'
  hours: 'business' | 'after_hours'
}

export interface TurnMetrics {
  latencyMs: number
  tokensIn: number
  cachedTokens: number
  tokensOut: number
  cacheHitPct: number
  costUsd: number
}

export interface TurnResult {
  output: StructuredOutput
  newlyExtracted: (keyof ExtractedFields)[]
  recommended: RecommendedModel[]
  guardrails: GuardrailChecks
  metrics: TurnMetrics
  priceProbe: boolean
  bubbles: number
  phoneCaptured: string | null
}

export const EMPTY_FIELDS: ExtractedFields = {
  lead_name: null,
  company_name: null,
  modality: null,
  segment: null,
  area_m2: null,
  floor_type: null,
  dirt_profile: null,
  power_preference: null,
  usage_routine: null,
  location_city: null,
  location_state: null,
}

export function initialContext(seed?: Partial<ExtractedFields>): EngineContext {
  return {
    fields: { ...EMPTY_FIELDS, ...seed },
    flags: { laborShortage: false, needsSweeping: false, sweepOnly: false, ownedModel: null, phone: null },
    state: 'NEW',
    turn: 0,
    priceProbes: 0,
    greeted: false,
    historyChars: 0,
    historyText: '',
    lastAsked: '',
  }
}

// ───────────────────────────── Extraction ─────────────────────────────

/** lowercase + strip accents; NFKD also turns "²" into "2". */
export function norm(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const CITIES: [RegExp, string, string][] = [
  [/\bbelem\b/, 'Belém', 'PA'],
  [/\bananindeua\b/, 'Ananindeua', 'PA'],
  [/\bmarituba\b/, 'Marituba', 'PA'],
  [/\bcastanhal\b/, 'Castanhal', 'PA'],
  [/\bmaraba\b/, 'Marabá', 'PA'],
  [/\bsantarem\b/, 'Santarém', 'PA'],
  [/\bparauapebas\b/, 'Parauapebas', 'PA'],
  [/\bbarcarena\b/, 'Barcarena', 'PA'],
  [/\bsao luis\b/, 'São Luís', 'MA'],
  [/\bimperatriz\b/, 'Imperatriz', 'MA'],
  [/\bsao jose de ribamar\b/, 'São José de Ribamar', 'MA'],
  [/\btimon\b/, 'Timon', 'MA'],
  [/\bacailandia\b/, 'Açailândia', 'MA'],
  [/\bmacapa\b/, 'Macapá', 'AP'],
  [/\bsantana\b/, 'Santana', 'AP'],
  [/\bsao paulo\b/, 'São Paulo', 'SP'],
  [/\bcampinas\b/, 'Campinas', 'SP'],
  [/\bguarulhos\b/, 'Guarulhos', 'SP'],
  [/\brio de janeiro\b/, 'Rio de Janeiro', 'RJ'],
  [/\bbelo horizonte\b/, 'Belo Horizonte', 'MG'],
  [/\bfortaleza\b/, 'Fortaleza', 'CE'],
  [/\bteresina\b/, 'Teresina', 'PI'],
  [/\bmanaus\b/, 'Manaus', 'AM'],
  [/\brecife\b/, 'Recife', 'PE'],
  [/\bsalvador\b/, 'Salvador', 'BA'],
  [/\bbrasilia\b/, 'Brasília', 'DF'],
  [/\bcuritiba\b/, 'Curitiba', 'PR'],
  [/\bporto alegre\b/, 'Porto Alegre', 'RS'],
  [/\bgoiania\b/, 'Goiânia', 'GO'],
  [/\bpalmas\b/, 'Palmas', 'TO'],
]

const STATE_NAMES: [RegExp, string][] = [
  [/\bPar[áa]\b(?!\s+(?:o|a|os|as|um|uma|limpar|lavar|levar|meu|minha)\b)/, 'PA'],
  [/\bMaranh[ãa]o\b/i, 'MA'],
  [/\bAmap[áa]\b/i, 'AP'],
  [/\bMinas Gerais\b/i, 'MG'],
  [/\bBahia\b/i, 'BA'],
  [/\bCear[áa]\b/i, 'CE'],
  [/\bAmazonas\b/i, 'AM'],
  [/\bTocantins\b/i, 'TO'],
  [/\bPiau[íi]\b/i, 'PI'],
  [/\bGoi[áa]s\b/i, 'GO'],
]

const UFS = 'AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO'
const UF_RE = new RegExp(`(?:^|[\\s,/-])(${UFS})\\b`)

const CAP = '[A-ZÀ-Ý][\\wÀ-ÿ.&-]*'
const CAP_SEQ = `${CAP}(?:\\s+(?:${CAP}|&|de|do|da))*?`

function trimCompany(s: string): string {
  return s.replace(/\s+(de|do|da)$/i, '').trim()
}

const MODEL_RE = /\b(a260c?|t600e|brava|t16amr|s16|i-?mop(?: lite)?|alfa mini|alfa bizz|ext52|pressure 400)\b/
const MODEL_NAME: Record<string, string> = {
  a260: 'A260',
  a260c: 'A260c',
  t600e: 'T600e',
  brava: 'Brava',
  t16amr: 'T16AMR',
  s16: 'S16',
  imop: 'i-mop Lite',
  'i-mop': 'i-mop Lite',
  'i-mop lite': 'i-mop Lite',
  'imop lite': 'i-mop Lite',
  'alfa mini': 'Alfa Mini',
  'alfa bizz': 'Alfa Bizz',
  ext52: 'Extratora Alfa Ext52',
  'pressure 400': 'Alfa Pressure 400',
}

export const PRICE_RE =
  /(quanto (custa|sai|fica|e|seria|cobra)|qual (o|e o) (valor|preco)|\bvalor(es)?\b|\bprecos?\b|mensalidade|\bdesconto|\bfrete\b|orcamento aproximado|\bmedia\b|faixa de (preco|valor)|prazo de entrega|r\$)/
const HUMAN_RE =
  /((falar|conversar|tratar|atendimento)\s+(direto\s+|diretamente\s+)?(com\s+)?(o\s+|um\s+|uma\s+|a\s+)?(vinicius|humano|vendedor|atendente|pessoa|alguem|gerente|responsavel|comercial))|quero um humano|me liga|ligar pra mim|nao quero (falar com )?robo/

export interface Extraction {
  fields: Partial<ExtractedFields>
  laborShortage?: boolean
  needsSweeping?: boolean
  sweepOnly?: boolean
  ownedModel?: string
  phone?: string
  humanRequest: boolean
  priceProbe: boolean
}

export function extract(raw: string): Extraction {
  const t = norm(raw)
  const f: Partial<ExtractedFields> = {}
  const out: Extraction = { fields: f, humanRequest: HUMAN_RE.test(t), priceProbe: PRICE_RE.test(t) }

  // modality
  if (/(manutenc|\bpecas?\b|borracha|\brodo\b|conserto|reparo|assistencia tecnica|preventiva|corretiva|revisao)/.test(t)) f.modality = 'MANUTENCAO_PECAS'
  else if (/(alug|locac|\blocar\b|locacao|comodato)/.test(t)) f.modality = 'LOCACAO'
  else if (/(\bcompr|adquirir|aquisicao|\bnova\b.*maquina|investir)/.test(t)) f.modality = 'COMPRA'

  // segment
  if (/(galpao|\bcd\b|centro de distribuicao|logistic|armazem|deposito|transportadora)/.test(t)) f.segment = 'CD_LOGISTICA'
  else if (/(supermercado|atacarejo|atacado|hipermercado|\bmercado\b)/.test(t)) f.segment = 'SUPERMERCADO_ATACAREJO'
  else if (/shopping/.test(t)) f.segment = 'SHOPPING'
  else if (/(alimentos|bebidas|frigorific|laticini|cervejaria|cozinha industrial|padaria industrial)/.test(t)) f.segment = 'ALIMENTOS_BEBIDAS'
  else if (/(hospital|clinica|hotel|escola|faculdade|universidade|consultorio|pousada|colegio)/.test(t)) f.segment = 'HOSPITAL_HOTEL_ESCOLA'
  else if (/(prestadora|terceirizad|empresa de limpeza|facilities|servicos de limpeza)/.test(t)) f.segment = 'PRESTADORA_LIMPEZA'
  else if (/(\bindustria\b|fabrica|planta industrial|metalurgic|usina)/.test(t)) f.segment = 'INDUSTRIA'

  // area
  const am = t.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+(?:,\d+)?)\s*(mil)?\s*(?:m2|metros quadrados|metros|mts|m\b)/)
  if (am) {
    let n = Number(am[1].replace(/[.\s]/g, '').replace(',', '.'))
    if (am[2]) n *= 1000
    if (n >= 10 && n <= 500000) f.area_m2 = Math.round(n)
  }

  // floor
  if (/porcelanato|granitina/.test(t)) f.floor_type = 'porcelanato'
  else if (/epoxi|epoxy/.test(t)) f.floor_type = 'epoxi'
  else if (/cimento queimado|concreto|cimentado/.test(t)) f.floor_type = 'cimento_queimado'
  else if (/ceramic/.test(t)) f.floor_type = 'ceramica'
  else if (/granito/.test(t)) f.floor_type = 'granito'
  else if (/vinil/.test(t)) f.floor_type = 'vinilico'
  else if (/(externo|asfalto|patio|estacionamento)/.test(t)) f.floor_type = 'externo_asfalto'
  else if (/(carpete|estofad|tapete|carpet)/.test(t)) f.floor_type = 'carpete_estofado'

  // dirt
  const dirt: DirtProfile[] = []
  if (/(poeira|po fino|\bpo\b)/.test(t)) dirt.push('poeira_fina')
  if (/(graxa|oleo|gordura)/.test(t)) dirt.push('graxa_oleo')
  if (/(detrito|entulho|pallet|papelao|areia|solidos|cascalho)/.test(t)) dirt.push('detritos_solidos')
  if (/(alto trafego|muito movimento|fluxo|trafego intenso|alto fluxo)/.test(t)) dirt.push('alto_trafego')
  if (dirt.length === 1) f.dirt_profile = dirt[0]
  else if (dirt.length > 1) f.dirt_profile = dirt.includes('detritos_solidos') ? 'detritos_solidos' : 'misto'

  if (/(varr|varredeira|poeira|areia|detrito)/.test(t)) out.needsSweeping = true
  if (/(so varrer|apenas varrer|somente varr)/.test(t)) out.sweepOnly = true
  if (/(falta de (mao de obra|funcionari|operador|gente|pessoal)|rotatividade|turnos?|robo|robotic|autonom)/.test(t)) out.laborShortage = true

  // power
  if (/bateria/.test(t)) f.power_preference = 'bateria'
  else if (/(\bcabo\b|tomada|eletrica com fio)/.test(t)) f.power_preference = 'cabo'
  else if (/(manual|sem energia)/.test(t) && !/manutenc/.test(t)) f.power_preference = 'manual'

  // routine
  if (/(todo dia|todos os dias|diari|diaria)/.test(t)) f.usage_routine = /turno/.test(t) ? 'Diária, multi-turno' : 'Limpeza diária'
  else if (/turno/.test(t)) f.usage_routine = 'Multi-turno'
  else if (/semanal|uma vez por semana/.test(t)) f.usage_routine = 'Semanal'

  // location
  for (const [re, city, uf] of CITIES) {
    if (re.test(t)) {
      f.location_city = city
      f.location_state = uf
      break
    }
  }
  if (!f.location_state) {
    const um = raw.match(UF_RE)
    if (um) f.location_state = um[1]
    else for (const [re, uf] of STATE_NAMES) if (re.test(raw)) { f.location_state = uf; break }
  }

  // name + company
  const nm = raw.match(new RegExp(`(?:[Mm]eu nome [ée]|[Mm]e chamo|\\b[Ss]ou (?:o|a)|[Aa]qui [ée] (?:o|a))\\s+([A-ZÀ-Ý][a-zà-ÿ]+)(?:,?\\s+(?:da|do|de)\\s+(${CAP_SEQ})(?=[,.!?\\n]|$|\\s+(?:e|aqui|em|somos)\\b))?`))
  if (nm) {
    f.lead_name = nm[1]
    if (nm[2]) f.company_name = trimCompany(nm[2])
  }
  if (!f.company_name) {
    const cm = raw.match(new RegExp(`(?:[Ee]mpresa|[Ff]alo d[ao]|[Ss]ou d[ao]|[Rr]epresento (?:a|o)|[Tt]rabalho n[ao])\\s+(${CAP_SEQ})(?=[,.!?\\n]|$|\\s+(?:e|em|aqui|somos)\\b)`))
    if (cm) f.company_name = trimCompany(cm[1])
  }

  // owned machine (maintenance)
  const om = t.match(new RegExp(`(tenho|possuo|nossa|minha|temos)\\s+(uma\\s+)?(lavadora|maquina|varredeira)?\\s*(alfa\\s+)?(tennant\\s+)?${MODEL_RE.source}`))
  if (om) out.ownedModel = MODEL_NAME[om[6]] ?? om[6].toUpperCase()

  // phone
  const pm = raw.match(/\(?\b(\d{2})\)?\s*(9\s?\d{4}|\d{4})[-\s]?(\d{4})\b/)
  if (pm) out.phone = `+55${pm[1]}${pm[2].replace(/\s/g, '')}${pm[3]}`

  return out
}

/** Never overwrite known fields with null. */
export function mergeFields(prev: ExtractedFields, patch: Partial<ExtractedFields>): { fields: ExtractedFields; changed: (keyof ExtractedFields)[] } {
  const next = { ...prev }
  const changed: (keyof ExtractedFields)[] = []
  for (const k of Object.keys(patch) as (keyof ExtractedFields)[]) {
    const v = patch[k]
    if (v == null) continue
    if (next[k] !== v) {
      ;(next as Record<string, unknown>)[k] = v
      changed.push(k)
    }
  }
  return { fields: next, changed }
}

// ───────────────────────────── Mandatory fields ─────────────────────────────

export type MandatoryKey = 'modality' | 'segment' | 'dimension' | 'location'

export const MANDATORY: { key: MandatoryKey; label: string }[] = [
  { key: 'modality', label: 'Modalidade' },
  { key: 'segment', label: 'Segmento / Ambiente' },
  { key: 'dimension', label: 'Dimensão, piso e sujeira' },
  { key: 'location', label: 'Localização (cidade/UF)' },
]

export function mandatoryStatus(ctx: Pick<EngineContext, 'fields' | 'flags'>): Record<MandatoryKey, string | null> {
  const f = ctx.fields
  const maint = f.modality === 'MANUTENCAO_PECAS'
  const dim = f.area_m2
    ? [`${formatNumber(f.area_m2)} m²`, f.floor_type ? FLOOR_LABEL[f.floor_type] : null, f.dirt_profile ? DIRT_LABEL[f.dirt_profile] : null].filter(Boolean).join(' · ')
    : maint && ctx.flags.ownedModel
      ? `Equipamento atual: ${ctx.flags.ownedModel}`
      : null
  const seg = f.segment ? SEGMENT_LABEL[f.segment] : maint && ctx.flags.ownedModel ? 'Cliente de pós-venda' : null
  return {
    modality: f.modality ? MODALITY_LABEL[f.modality] : null,
    segment: seg,
    dimension: dim,
    location: f.location_state ? `${f.location_city ?? '—'}-${f.location_state}` : null,
  }
}

// ───────────────────────────── Reply templates ─────────────────────────────

const QUESTIONS: Record<MandatoryKey, string> = {
  modality: 'Você procura **compra**, **locação** ou **manutenção/peças**?',
  segment: 'Qual é o tipo de operação — galpão/CD, supermercado, indústria, shopping, clínica/hotel ou prestadora de limpeza?',
  dimension: 'Qual a metragem aproximada (m²) e o tipo de piso (epóxi, porcelanato, cimento queimado…)? Se puder, conte também o tipo de sujeira predominante.',
  location: 'Em qual cidade e estado fica a operação?',
}
const SHORT_QUESTIONS: Record<MandatoryKey, string> = {
  modality: 'seria compra, locação ou manutenção/peças',
  segment: 'o tipo de operação',
  dimension: 'a metragem aproximada (m²)',
  location: 'a cidade/UF',
}
const MAINT_QUESTIONS: Partial<Record<MandatoryKey, string>> = {
  dimension: 'Qual equipamento Alfa Tennant você possui hoje (modelo) e o que está precisando?',
  segment: 'Qual equipamento Alfa Tennant você possui hoje (modelo)?',
}

function priceRefusal(n: number): string {
  if (n <= 1)
    return 'Sobre valores: eu não passo preços, mensalidades ou descontos por aqui 🙂 Cada orçamento da Maquinabel é personalizado pela equipe comercial (Vinicius Goés), conforme o modelo, a modalidade e a sua operação.'
  if (n === 2)
    return 'Entendo a necessidade de ter uma referência, mas não consigo informar nem valor aproximado — isso poderia gerar uma expectativa errada. O orçamento oficial sai com o dimensionamento correto, feito pela nossa equipe comercial.'
  return 'Sigo sem poder informar valores, nem médias 🙏 O caminho mais rápido para você ter o número em mãos é eu concluir o dimensionamento e passar para o Vinicius, que envia a proposta oficial.'
}

function ufOk(uf: string | null): boolean {
  return !!uf && (COVERED_UF as readonly string[]).includes(uf)
}

function firstName(f: ExtractedFields) {
  return f.lead_name ? `, ${f.lead_name}` : ''
}

function ackText(f: ExtractedFields, changed: (keyof ExtractedFields)[], newOwned: string | null): string | null {
  const bits: string[] = []
  if (changed.includes('modality') && f.modality) bits.push(MODALITY_LABEL[f.modality].toLowerCase())
  if (changed.includes('segment') && f.segment) bits.push(f.segment === 'CD_LOGISTICA' ? 'CD / logística' : SEGMENT_LABEL[f.segment].toLowerCase())
  if (changed.includes('area_m2') && f.area_m2) bits.push(`${formatNumber(f.area_m2)} m²`)
  if (changed.includes('floor_type') && f.floor_type) bits.push(`piso ${FLOOR_LABEL[f.floor_type].toLowerCase()}`)
  if (changed.includes('dirt_profile') && f.dirt_profile) bits.push(DIRT_LABEL[f.dirt_profile].toLowerCase())
  if (changed.includes('location_state') && f.location_state) bits.push(`${f.location_city ? f.location_city + '-' : ''}${f.location_state}`)
  if (newOwned) bits.push(`equipamento ${newOwned}`)
  if (!bits.length) return null
  return `Anotado: ${bits.join(', ')}. ✅`
}

function recText(recs: RecommendedModel[]): string {
  const [a, b] = recs
  const prof = (r: RecommendedModel) => (r.productivityM2h && !r.reason.includes('m²/h') ? ` (até ${formatNumber(r.productivityM2h)} m²/h)` : '')
  let s = `Pelo perfil da sua operação, a indicação técnica é a **${a.modelName}**${prof(a)}: ${a.reason}`
  if (b) s += `\n\nComo ${/S16|Bizz/.test(a.modelName + b.modelName) ? 'complemento' : 'alternativa'}, a **${b.modelName}**${prof(b)}: ${b.reason}`
  return s
}

function hoursText(business: boolean, human = false): string {
  if (business)
    return human
      ? 'Ele já foi notificado e costuma responder em poucos minutos por aqui mesmo.'
      : 'Ele vai preparar o orçamento oficial personalizado e falar com você em instantes por aqui.'
  return 'Como estamos fora do horário comercial (seg–sex, 08h às 18h), ele retorna com a proposta formal na **segunda-feira a partir das 08:00**. Deixei tudo registrado para agilizar.'
}

export function buildSummary4(
  f: ExtractedFields,
  flags: EngineFlags,
  recs: RecommendedModel[],
  originTag: string,
  trigger: NextState,
  fallbackName?: string | null,
): [string, string, string, string] {
  const contact = flags.phone ? `wa.me/${flags.phone.replace('+', '')}` : 'WhatsApp a coletar'
  const tech = [
    f.segment ? SEGMENT_LABEL[f.segment] : null,
    f.area_m2 ? `${formatNumber(f.area_m2)} m²` : null,
    f.floor_type ? FLOOR_LABEL[f.floor_type] : null,
    f.dirt_profile ? DIRT_LABEL[f.dirt_profile] : null,
    f.usage_routine,
    flags.ownedModel ? `Possui ${flags.ownedModel}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return [
    `${f.lead_name ?? fallbackName ?? 'Lead'} · ${f.company_name ?? 'Empresa não informada'} · ${contact} · ${f.location_city ?? '?'}-${f.location_state ?? '?'}`,
    `${f.modality ? MODALITY_LABEL[f.modality] : 'Modalidade a confirmar'} · Origem: ${originTag}${trigger === 'HUMAN_REQUESTED' ? ' · PEDIU HUMANO' : ''}`,
    tech || 'Perfil técnico a levantar',
    recs.length ? `${recs.map((r) => r.modelName).join(' + ')} — ${recs[0].reason} → card no Kanban` : 'Sem recomendação ainda (pedido direto de humano) → card no Kanban',
  ]
}

// ───────────────────────────── Turn ─────────────────────────────

export function runTurn(ctx: EngineContext, input: TurnInput): { ctx: EngineContext; result: TurnResult } {
  const ex = extract(input.text)
  const { fields, changed } = mergeFields(ctx.fields, ex.fields)
  const flags: EngineFlags = {
    laborShortage: ctx.flags.laborShortage || !!ex.laborShortage,
    needsSweeping: ctx.flags.needsSweeping || !!ex.needsSweeping,
    sweepOnly: ctx.flags.sweepOnly || !!ex.sweepOnly,
    ownedModel: ex.ownedModel ?? ctx.flags.ownedModel,
    phone: ex.phone ?? ctx.flags.phone ?? (input.channel === 'WHATSAPP' ? input.waPhone ?? null : null),
  }
  const priceProbes = ctx.priceProbes + (ex.priceProbe ? 1 : 0)
  const turn = ctx.turn + 1
  const maint = fields.modality === 'MANUTENCAO_PECAS'
  const status = mandatoryStatus({ fields, flags })
  const missing = MANDATORY.filter((m) => !status[m.key]).map((m) => m.key)

  let next: NextState = 'QUALIFYING'
  if (ex.humanRequest) next = 'HUMAN_REQUESTED'
  else if (fields.location_state && !ufOk(fields.location_state)) next = 'DISQUALIFIED_OUT_OF_REGION'
  else if (missing.length === 0) next = 'QUALIFIED_HANDOFF'

  let recs: RecommendedModel[] = []
  if (next === 'QUALIFIED_HANDOFF') {
    if (maint && flags.ownedModel) {
      recs = [{ machineId: 'owned', modelName: flags.ownedModel, reason: 'Equipamento já instalado no cliente: peças originais Alfa Tennant (kit borracha do rodo) + manutenção preventiva.' }]
    } else {
      recs = recommendMachines(
        {
          areaM2: fields.area_m2,
          segment: fields.segment,
          floorType: fields.floor_type,
          dirtProfile: fields.dirt_profile,
          powerPreference: fields.power_preference,
          laborShortage: flags.laborShortage,
          needsSweeping: flags.needsSweeping,
          sweepOnly: flags.sweepOnly,
        },
        input.catalog,
      )
      // washing explicitly requested → show the scrubber first
      if (/(lavar|lavagem|lavadora)/.test(norm(input.text + ' ' + ctx.historyText)) && recs.length === 2 && /S16|Bizz/.test(recs[0].modelName)) recs = [recs[1], recs[0]]
    }
  }

  // ── reply
  const parts: string[] = []
  let asked = ''
  if (!ctx.greeted) {
    parts.push(
      next === 'HUMAN_REQUESTED'
        ? `Olá${firstName(fields)}! Aqui é o consultor técnico virtual da Maquinabel, concessionária Alfa Tennant.`
        : `Olá${firstName(fields)}! 👋 Sou o consultor técnico virtual da Maquinabel, concessionária autorizada Alfa Tennant no Norte e Nordeste.`,
    )
  }
  if (next === 'HUMAN_REQUESTED') {
    parts.push(`Claro, vou te passar agora para o **Vinicius Goés**, nosso diretor comercial. ${hoursText(input.businessHours, true)}`)
    if (ex.priceProbe) parts.push(priceRefusal(priceProbes))
  } else if (next === 'DISQUALIFIED_OUT_OF_REGION') {
    const where = `${fields.location_city ? fields.location_city + '-' : ''}${fields.location_state}`
    parts.push(
      `Muito obrigado pelo contato! No momento a Maquinabel atende exclusivamente **Pará (PA), Maranhão (MA) e Amapá (AP)**, com matriz em Ananindeua-PA e filial em São Luís-MA — por isso não conseguimos atender a operação em ${where}.`,
    )
    parts.push('Recomendo procurar a rede oficial Alfa Tennant/Tennant da sua região. Se tiver unidades no Norte/Nordeste, é só me chamar por aqui! 🙂')
  } else {
    const ack = ackText(fields, changed, ex.ownedModel && !ctx.flags.ownedModel ? ex.ownedModel : null)
    if (ack) parts.push(ack)
    if (ex.priceProbe) parts.push(priceRefusal(priceProbes))
    if (next === 'QUALIFIED_HANDOFF') {
      if (maint && flags.ownedModel) {
        parts.push(
          `Perfeito! ${fields.location_city ?? fields.location_state} está dentro da nossa cobertura e trabalhamos com **peças originais Alfa Tennant** e manutenção preventiva/corretiva para a sua **${flags.ownedModel}**.`,
        )
      } else if (recs.length) {
        parts.push(recText(recs))
      }
      parts.push(`Já encaminhei seu atendimento ao **Vinicius Goés**, nosso diretor comercial. ${hoursText(input.businessHours)}`)
      if (input.channel === 'INSTAGRAM' && !flags.phone) parts.push('Se preferir, me passa seu WhatsApp que enviamos a ficha técnica em PDF por lá.')
    } else {
      const keys = missing.slice(0, maint ? 1 : 2)
      asked = keys.join(',')
      if (!ctx.greeted && !ex.priceProbe) parts.push('Para indicar a máquina ideal, preciso entender rapidinho sua operação.')
      if (asked === ctx.lastAsked) {
        parts.push(`Me conta só ${keys.map((k) => SHORT_QUESTIONS[k]).join(' e ')}, que eu já dimensiono a máquina certa para você 😉`)
      } else {
        const qs = keys.map((k) => (maint ? MAINT_QUESTIONS[k] ?? QUESTIONS[k] : QUESTIONS[k]))
        parts.push(qs.join(' '))
      }
      if (input.channel === 'INSTAGRAM' && flags.phone && changed.length === 0) parts.push('Recebi seu WhatsApp, obrigado! Vou unificar o atendimento por lá.')
    }
  }
  const reply_text = parts.join('\n\n')

  const summary =
    next === 'QUALIFIED_HANDOFF' || next === 'HUMAN_REQUESTED' ? buildSummary4(fields, flags, recs, input.originTag, next, input.leadLabel).join('\n') : null

  const output: StructuredOutput = {
    reply_text,
    next_state: next,
    extracted_fields: fields,
    recommended_models: recs.map((r) => ({ model_name: r.modelName, reason: r.reason, ...(r.productivityM2h ? { productivity_m2h: r.productivityM2h } : {}) })),
    handoff_summary_4_lines: summary,
  }

  // ── fake metrics (deterministic per turn)
  const rnd = seededRandom(hashString(`${input.text}|${turn}`))
  const historyChars = ctx.historyChars + input.text.length + reply_text.length
  const sys = 3120 // system prompt + catalog markdown (cacheable)
  const tokensIn = sys + Math.round(historyChars / 3.6) + 40
  const cachedTokens = turn === 1 && rnd() < 0.3 ? 0 : Math.min(sys, Math.round(sys * (0.86 + rnd() * 0.1)))
  const tokensOut = Math.round(JSON.stringify(output).length / 3.4)
  const costUsd = ((tokensIn - cachedTokens) * 0.15 + cachedTokens * 0.075 + tokensOut * 0.6) / 1_000_000
  const metrics: TurnMetrics = {
    latencyMs: Math.round(1100 + rnd() * 1300),
    tokensIn,
    cachedTokens,
    tokensOut,
    cacheHitPct: cachedTokens / tokensIn,
    costUsd,
  }

  const guardrails: GuardrailChecks = {
    price: ex.priceProbe ? 'triggered' : 'ok',
    catalog: 'ok',
    region: !fields.location_state ? 'pending' : ufOk(fields.location_state) ? 'ok' : 'blocked',
    hours: input.businessHours ? 'business' : 'after_hours',
  }

  const newCtx: EngineContext = { fields, flags, state: next, turn, priceProbes, greeted: true, historyChars, historyText: `${ctx.historyText}
${input.text}`, lastAsked: asked }
  return {
    ctx: newCtx,
    result: {
      output,
      newlyExtracted: changed,
      recommended: recs,
      guardrails,
      metrics,
      priceProbe: ex.priceProbe,
      bubbles: input.bubbles,
      phoneCaptured: ex.phone ?? null,
    },
  }
}

export function isTerminal(s: EngineState): boolean {
  return s === 'QUALIFIED_HANDOFF' || s === 'HUMAN_REQUESTED' || s === 'DISQUALIFIED_OUT_OF_REGION'
}

// ───────────────────────────── Instagram comment trigger ─────────────────────────────

export const IG_PUBLIC_REPLIES = [
  'Olá! Acabamos de enviar os detalhes técnicos e opções para sua operação no seu Direct! 📩',
  'Oi! Te chamamos no Direct com as informações da máquina, dá uma olhadinha 😉',
  'Opa, obrigado pelo interesse! Mandamos tudo certinho por mensagem privada.',
  'Olá! Enviamos no seu Direct as opções de locação e compra para o seu caso 🙌',
  'Oi! Já te respondemos no Direct com a ficha técnica e próximos passos.',
]

export const IG_TRIGGER_RE = /(preco|valor|quanto|aluguel|locacao|alugar|cotacao|orcamento|ficha|comprar|funciona|lavadora|varredeira|manutencao)/

export function pickPublicReply(seed: number): { index: number; text: string } {
  const index = Math.abs(seed) % IG_PUBLIC_REPLIES.length
  return { index, text: IG_PUBLIC_REPLIES[index] }
}
