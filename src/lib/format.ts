import { formatDistanceStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  AdPlatform,
  AttributionChannel,
  CampaignStatus,
  CampaignType,
  ChannelKind,
  ConversationChannel,
  ConversationState,
  ConversionStatus,
  DirtProfile,
  FloorType,
  IntegrationStatus,
  KanbanStage,
  LossReason,
  MachineCategory,
  Modality,
  PowerPreference,
  ProspectStatus,
  SearchTermClass,
  Segment,
  Tone,
} from '@/types/domain'
import { now, toBelemISO } from './utils'

// ───────────────────────────── Numbers ─────────────────────────────

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, minimumFractionDigits: 0 })

/**
 * formatBRL(1234.5) → "R$ 1.234,50"
 * formatBRL(86400, { decimals: 0 }) → "R$ 86.400"
 * formatBRL(380000, { compact: true }) → "R$ 380 mil"
 */
export function formatBRL(value: number | null | undefined, opts: { compact?: boolean; decimals?: 0 | 2 } = {}): string {
  if (value == null || !Number.isFinite(value)) return '—'
  if (opts.compact) {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `R$ ${formatNumber(value / 1_000_000, { maxDecimals: 1 })} mi`
    if (abs >= 10_000) return `R$ ${formatNumber(value / 1000, { maxDecimals: abs >= 100_000 ? 0 : 1 })} mil`
  }
  return (opts.decimals === 0 ? brl0 : brl).format(value).replace(/ /g, ' ')
}

export function formatNumber(value: number | null | undefined, opts: { maxDecimals?: number; minDecimals?: number; compact?: boolean } = {}): string {
  if (value == null || !Number.isFinite(value)) return '—'
  if (opts.compact) {
    return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: opts.maxDecimals ?? 0,
    minimumFractionDigits: opts.minDecimals ?? 0,
  }).format(value)
}

/** formatPercent(0.0532) → "5,3%" (input is a ratio 0..1) */
export function formatPercent(ratio: number | null | undefined, decimals = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—'
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(ratio * 100)}%`
}

/** Signed delta for KPI cards: 0.12 → "+12,0%" */
export function formatDelta(ratio: number, decimals = 1): string {
  const s = formatPercent(Math.abs(ratio), decimals)
  return `${ratio > 0 ? '+' : ratio < 0 ? '−' : ''}${s}`
}

/** 6200 → "6,2 s"; 850 → "850 ms" */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${formatNumber(ms / 1000, { maxDecimals: 1 })} s`
}

/** 12 → "12 min"; 135 → "2 h 15 min" */
export function formatMinutes(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return '—'
  if (min < 60) return `${formatNumber(min, { maxDecimals: min < 10 ? 1 : 0 })} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h >= 24) return `${formatNumber(h / 24, { maxDecimals: 1 })} dias`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function formatArea(m2: number | null | undefined): string {
  if (m2 == null) return '—'
  return `${formatNumber(m2)} m²`
}

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '—'
  const m = e164.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/)
  if (!m) return e164
  return `(${m[1]}) ${m[2]}-${m[3]}`
}

// ───────────────────────────── Dates (rendered in Belém time) ─────────────────────────────

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

function parts(input: string | Date) {
  const iso = typeof input === 'string' ? (input.length === 10 ? `${input}T12:00:00-03:00` : input) : toBelemISO(input)
  const b = toBelemISO(new Date(iso))
  return {
    y: b.slice(0, 4),
    m: b.slice(5, 7),
    d: b.slice(8, 10),
    hm: b.slice(11, 16),
    wd: new Date(`${b.slice(0, 10)}T12:00:00Z`).getUTCDay(),
  }
}

/** "20/11/2026" */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const p = parts(input)
  return `${p.d}/${p.m}/${p.y}`
}

/** "20/11/2026 10:30" */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const p = parts(input)
  return `${p.d}/${p.m}/${p.y} ${p.hm}`
}

/** "10:30" */
export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return '—'
  return parts(input).hm
}

/** "20 nov" (chart axes) */
export function formatDayMonth(input: string | Date): string {
  const p = parts(input)
  return `${Number(p.d)} ${MONTHS_SHORT[Number(p.m) - 1]}`
}

/** "novembro de 2026" */
export function formatMonthYear(input: string | Date): string {
  const p = parts(input)
  return `${MONTHS_LONG[Number(p.m) - 1]} de ${p.y}`
}

/** "sex, 20 nov" */
export function formatWeekdayShort(input: string | Date): string {
  const p = parts(input)
  return `${WEEKDAYS_SHORT[p.wd]}, ${Number(p.d)} ${MONTHS_SHORT[Number(p.m) - 1]}`
}

/** Relative to the demo clock: "há 5 minutos", "em 2 dias". */
export function formatRelative(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const d = typeof input === 'string' ? new Date(input) : input
  const base = now()
  if (Math.abs(base.getTime() - d.getTime()) < 45_000) return 'agora mesmo'
  return formatDistanceStrict(d, base, { locale: ptBR, addSuffix: true })
}

/** Chat-style stamp: today → "10:30", yesterday → "ontem 16:05", else "14/11 14:00" */
export function formatChatStamp(input: string): string {
  const p = parts(input)
  const today = parts(now())
  const y = parts(new Date(now().getTime() - 86_400_000))
  if (p.y === today.y && p.m === today.m && p.d === today.d) return p.hm
  if (p.y === y.y && p.m === y.m && p.d === y.d) return `ontem ${p.hm}`
  return `${p.d}/${p.m} ${p.hm}`
}

// ───────────────────────────── Label maps (pt-BR) ─────────────────────────────

export const STAGE_ORDER: KanbanStage[] = ['NEW', 'QUALIFYING', 'HANDOFF', 'PROPOSAL_SENT', 'WON', 'LOST', 'DISQUALIFIED']

export const STAGE_LABEL: Record<KanbanStage, string> = {
  NEW: 'Novos',
  QUALIFYING: 'Em Qualificação',
  HANDOFF: 'Enviado ao Vendedor',
  PROPOSAL_SENT: 'Proposta Enviada',
  WON: 'Fechado (Ganho)',
  LOST: 'Perdido',
  DISQUALIFIED: 'Desqualificado',
}

export const STAGE_TONE: Record<KanbanStage, Tone> = {
  NEW: 'info',
  QUALIFYING: 'primary',
  HANDOFF: 'violet',
  PROPOSAL_SENT: 'warning',
  WON: 'success',
  LOST: 'danger',
  DISQUALIFIED: 'neutral',
}

export const MODALITY_LABEL: Record<Modality, string> = {
  COMPRA: 'Compra',
  LOCACAO: 'Locação',
  MANUTENCAO_PECAS: 'Manutenção / Peças',
}
export const MODALITY_TONE: Record<Modality, Tone> = {
  COMPRA: 'primary',
  LOCACAO: 'violet',
  MANUTENCAO_PECAS: 'warning',
}

export const SEGMENT_LABEL: Record<Segment, string> = {
  CD_LOGISTICA: 'CD / Logística',
  INDUSTRIA: 'Indústria',
  SUPERMERCADO_ATACAREJO: 'Supermercado / Atacarejo',
  SHOPPING: 'Shopping',
  ALIMENTOS_BEBIDAS: 'Alimentos & Bebidas',
  PRESTADORA_LIMPEZA: 'Prestadora de Limpeza',
  HOSPITAL_HOTEL_ESCOLA: 'Hospital / Hotel / Escola',
  OUTRO: 'Outro',
}

export const FLOOR_LABEL: Record<FloorType, string> = {
  porcelanato: 'Porcelanato',
  ceramica: 'Cerâmica',
  cimento_queimado: 'Cimento queimado',
  epoxi: 'Epóxi',
  granito: 'Granito / Granilite',
  vinilico: 'Vinílico',
  externo_asfalto: 'Externo / Asfalto',
  carpete_estofado: 'Carpete / Estofado',
}

export const DIRT_LABEL: Record<DirtProfile, string> = {
  poeira_fina: 'Poeira fina',
  graxa_oleo: 'Graxa / Óleo',
  detritos_solidos: 'Detritos sólidos',
  alto_trafego: 'Alto tráfego de pessoas',
  misto: 'Misto (poeira + lavagem)',
}

export const POWER_LABEL: Record<PowerPreference, string> = {
  bateria: 'Bateria',
  cabo: 'Cabo (elétrica)',
  manual: 'Manual (sem energia)',
  indiferente: 'Indiferente',
}

export const LOSS_REASON_LABEL: Record<LossReason, string> = {
  PRECO: 'Preço',
  PRAZO: 'Prazo',
  FORA_REGIAO: 'Fora de Região',
  SEM_RETORNO: 'Sem Retorno',
  CONCORRENTE: 'Concorrente',
  CURIOSO_RESIDENCIAL: 'Curioso / Residencial',
}

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  ENABLED: 'Ativa',
  PAUSED: 'Pausada',
  REMOVED: 'Removida',
}
export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, Tone> = {
  ENABLED: 'success',
  PAUSED: 'warning',
  REMOVED: 'neutral',
}

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  SEARCH: 'Pesquisa (Search)',
  CLICK_TO_WHATSAPP: 'Click-to-WhatsApp',
  IG_REELS_DIRECT: 'Instagram Reels / Direct',
  REMARKETING: 'Remarketing',
  LEAD_ADS: 'Formulário (Lead Ads)',
}

export const PLATFORM_LABEL: Record<AdPlatform, string> = {
  GOOGLE: 'Google Ads',
  META: 'Meta Ads',
}

export const CONV_STATE_LABEL: Record<ConversationState, string> = {
  NEW: 'Novo',
  QUALIFYING: 'Qualificando (IA)',
  QUALIFIED_HANDOFF: 'Qualificado → Vendedor',
  HUMAN_REQUESTED: 'Pediu humano',
  HUMAN_ACTIVE: 'Atendimento humano',
  CLOSED: 'Encerrada',
  DISQUALIFIED_OUT_OF_REGION: 'Fora da região',
}
export const CONV_STATE_TONE: Record<ConversationState, Tone> = {
  NEW: 'info',
  QUALIFYING: 'primary',
  QUALIFIED_HANDOFF: 'violet',
  HUMAN_REQUESTED: 'warning',
  HUMAN_ACTIVE: 'success',
  CLOSED: 'neutral',
  DISQUALIFIED_OUT_OF_REGION: 'neutral',
}

export const CONV_CHANNEL_LABEL: Record<ConversationChannel, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram Direct',
  WIDGET: 'Site (Typebot)',
}

export const ATTRIBUTION_CHANNEL_LABEL: Record<AttributionChannel, string> = {
  WEB_WIDGET: 'Widget do site',
  WHATSAPP_DIRECT: 'WhatsApp direto',
  IG_COMMENT: 'Comentário Instagram',
  IG_DM: 'Direct Instagram',
  META_AD: 'Anúncio Meta',
  GOOGLE_AD: 'Anúncio Google',
  OUTBOUND: 'Prospecção ativa',
}

export const CONVERSION_STATUS_LABEL: Record<ConversionStatus, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  FAILED: 'Falhou',
  SKIPPED: 'Ignorado',
}
export const CONVERSION_STATUS_TONE: Record<ConversionStatus, Tone> = {
  PENDING: 'warning',
  SENT: 'success',
  FAILED: 'danger',
  SKIPPED: 'neutral',
}

export const PROSPECT_STATUS_LABEL: Record<ProspectStatus, string> = {
  PENDING: 'Na fila',
  SENT_EMAIL: 'E-mail enviado',
  SENT_WA: 'WhatsApp enviado',
  REPLIED: 'Respondeu',
  CONVERTED: 'Virou lead',
  DISQUALIFIED: 'Descartado',
}
export const PROSPECT_STATUS_TONE: Record<ProspectStatus, Tone> = {
  PENDING: 'neutral',
  SENT_EMAIL: 'info',
  SENT_WA: 'primary',
  REPLIED: 'violet',
  CONVERTED: 'success',
  DISQUALIFIED: 'danger',
}

export const SEARCH_TERM_CLASS_LABEL: Record<SearchTermClass, string> = {
  ICP_B2B: 'ICP B2B',
  RESIDENCIAL: 'Residencial',
  VAREJO: 'Varejo / Doméstico',
  CONCORRENTE: 'Concorrente',
  EMPREGO: 'Busca de emprego',
  IRRELEVANTE: 'Irrelevante',
}
export const SEARCH_TERM_CLASS_TONE: Record<SearchTermClass, Tone> = {
  ICP_B2B: 'success',
  RESIDENCIAL: 'danger',
  VAREJO: 'danger',
  CONCORRENTE: 'warning',
  EMPREGO: 'neutral',
  IRRELEVANTE: 'neutral',
}

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, string> = {
  CONNECTED: 'Conectado',
  PENDING: 'Pendente',
  ERROR: 'Erro',
  DISCONNECTED: 'Desconectado',
}
export const INTEGRATION_STATUS_TONE: Record<IntegrationStatus, Tone> = {
  CONNECTED: 'success',
  PENDING: 'warning',
  ERROR: 'danger',
  DISCONNECTED: 'neutral',
}

export const MACHINE_CATEGORY_LABEL: Record<MachineCategory, string> = {
  LAVADORA: 'Lavadoras de piso',
  VARREDEIRA: 'Varredeiras',
  ROBO: 'Robótica autônoma',
  ALTA_PRESSAO: 'Alta pressão',
  EXTRATORA: 'Extratoras',
}

export const UF_NAME: Record<string, string> = {
  PA: 'Pará',
  MA: 'Maranhão',
  AP: 'Amapá',
  SP: 'São Paulo',
  CE: 'Ceará',
  AM: 'Amazonas',
  PI: 'Piauí',
  GO: 'Goiás',
  TO: 'Tocantins',
  RJ: 'Rio de Janeiro',
  MG: 'Minas Gerais',
}

/** Human labels for origin tags. Unknown tags fall back to underscores → spaces. */
export const ORIGIN_LABEL: Record<string, string> = {
  Google_Ads_Locacao: 'Google Ads · Locação',
  Google_Ads_Compra: 'Google Ads · Compra',
  Google_Ads_Pecas: 'Google Ads · Peças & Manutenção',
  Google_Ads_Robotica: 'Google Ads · Robótica',
  Meta_CTWA_Brava: 'Meta · Click-to-WhatsApp',
  IG_Reels_S16: 'Instagram Reels · S16',
  IG_Reels_Brava: 'Instagram Reels · Brava',
  IG_Direct: 'Instagram Direct (orgânico)',
  Site_Brava: 'Site · Página Brava',
  Site_Organico: 'Site (orgânico)',
  WhatsApp_Direto: 'WhatsApp direto',
  Outbound_CNAE: 'Prospecção CNAE',
  Outbound_Places: 'Prospecção Google Places',
}

export function originLabel(tag: string | null | undefined): string {
  if (!tag) return 'Desconhecida'
  return ORIGIN_LABEL[tag] ?? tag.replace(/_/g, ' ')
}

/** Map an origin tag to a ChannelKind for icons/grouping. */
export function originChannel(tag: string | null | undefined): ChannelKind {
  if (!tag) return 'site'
  if (tag.startsWith('Google')) return 'google'
  if (tag.startsWith('Meta')) return 'meta'
  if (tag.startsWith('IG')) return 'instagram'
  if (tag.startsWith('WhatsApp')) return 'whatsapp'
  if (tag.startsWith('Outbound')) return 'outbound'
  return 'site'
}

/** true if origin comes from a paid campaign */
export function isPaidOrigin(tag: string | null | undefined): boolean {
  return !!tag && (tag.startsWith('Google_Ads') || tag.startsWith('Meta_') || tag.startsWith('IG_Reels'))
}

export const CHANNEL_KIND_LABEL: Record<ChannelKind, string> = {
  google: 'Google Ads',
  meta: 'Meta Ads',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  site: 'Site',
  outbound: 'Outbound',
}

/** Tailwind classes per tone (badge-like soft style). */
export const TONE_SOFT: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-success-50 text-success-700 ring-success-100',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100',
  danger: 'bg-danger-50 text-danger-700 ring-danger-100',
  info: 'bg-info-50 text-info-700 ring-info-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
}
/** Solid dot color per tone */
export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-ink-400',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
  violet: 'bg-violet-500',
}
/** Hex color per tone (charts) */
export const TONE_HEX: Record<Tone, string> = {
  neutral: '#98a2b5',
  primary: '#2556eb',
  success: '#12b76a',
  warning: '#f79009',
  danger: '#f04438',
  info: '#0ba5ec',
  violet: '#7a5af8',
}
