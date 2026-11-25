/**
 * Domain types for the Maquinabel demo (modelled on SPEC §4.3 + Modules 1–4).
 * All dates are ISO-8601 strings with -03:00 offset (America/Belem).
 * All money values are BRL numbers (not cents).
 */

export type ISODate = string
export type UF = string
export type AllowedState = 'PA' | 'MA' | 'AP'

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

/** Visual channel kinds (ChannelIcon). */
export type ChannelKind = 'google' | 'meta' | 'whatsapp' | 'instagram' | 'site' | 'outbound'

// ───────────────────────────── Tenant / Users ─────────────────────────────

export interface BusinessHours {
  /** 0 = domingo … 6 = sábado */
  days: number[]
  start: string // '08:00'
  end: string // '18:00'
  timezone: string // 'America/Belem'
}

export type IntegrationKey =
  | 'GOOGLE_ADS'
  | 'META_ADS'
  | 'META_CAPI'
  | 'WHATSAPP_CLOUD'
  | 'INSTAGRAM_GRAPH'
  | 'OPENAI'
  | 'RESEND'
  | 'TYPEBOT'
  | 'GOOGLE_PLACES'

export type IntegrationStatus = 'CONNECTED' | 'PENDING' | 'ERROR' | 'DISCONNECTED'

export interface Integration {
  key: IntegrationKey
  name: string
  description: string
  status: IntegrationStatus
  /** e.g. account id / phone number id shown masked */
  accountLabel?: string
  detail?: string
  lastSyncAt?: ISODate
}

export interface AiSettings {
  model: string // 'gpt-4o-mini'
  fallbackModel: string // 'claude-3-5-haiku'
  temperature: number
  maxQuestionsPerTurn: number
  debounceSeconds: number
  priceGuardrail: boolean
  outOfRegionFilter: boolean
  afterHoursMessage: string
  systemPromptOverride: string | null
  publicReplyVariations: string[]
  igTriggerKeywords: string[]
}

export interface PilotSettings {
  startDate: ISODate
  durationDays: number
  sqlTarget: number
}

export interface Tenant {
  id: string
  slug: string
  name: string
  /** e.g. 'Alfa Tennant' */
  dealerOf: string
  timezone: string
  businessHours: BusinessHours
  allowedStates: AllowedState[]
  handoffWhatsappPhone: string
  commercialEmail: string
  monthlyAdBudgetBRL: number
  pilot: PilotSettings
  metaWabaId: string
  metaPhoneNumberId: string
  metaIgAccountId: string
  googleAdsCustomerId: string
  metaAdAccountId: string
  aiSettings: AiSettings
  integrations: Integration[]
  addresses: { label: string; address: string }[]
  active: boolean
  /** true for placeholder tenants shown as "em breve" */
  comingSoon?: boolean
  createdAt: ISODate
}

export type UserRole = 'ADMIN' | 'SALES_REP'

export interface User {
  id: string
  tenantId: string
  fullName: string
  email: string
  role: UserRole
  title: string
  whatsappPhone: string
  createdAt: ISODate
}

// ───────────────────────────── Leads ─────────────────────────────

export type KanbanStage = 'NEW' | 'QUALIFYING' | 'HANDOFF' | 'PROPOSAL_SENT' | 'WON' | 'LOST' | 'DISQUALIFIED'

export type Modality = 'COMPRA' | 'LOCACAO' | 'MANUTENCAO_PECAS'

export type Segment =
  | 'CD_LOGISTICA'
  | 'INDUSTRIA'
  | 'SUPERMERCADO_ATACAREJO'
  | 'SHOPPING'
  | 'ALIMENTOS_BEBIDAS'
  | 'PRESTADORA_LIMPEZA'
  | 'HOSPITAL_HOTEL_ESCOLA'
  | 'OUTRO'

export type FloorType =
  | 'porcelanato'
  | 'ceramica'
  | 'cimento_queimado'
  | 'epoxi'
  | 'granito'
  | 'vinilico'
  | 'externo_asfalto'
  | 'carpete_estofado'

export type DirtProfile = 'poeira_fina' | 'graxa_oleo' | 'detritos_solidos' | 'alto_trafego' | 'misto'

export type PowerPreference = 'bateria' | 'cabo' | 'manual' | 'indiferente'

export type LossReason = 'PRECO' | 'PRAZO' | 'FORA_REGIAO' | 'SEM_RETORNO' | 'CONCORRENTE' | 'CURIOSO_RESIDENCIAL'

export interface RecommendedModel {
  machineId: string
  modelName: string
  reason: string
  productivityM2h?: number
}

export interface Lead {
  id: string
  tenantId: string
  name: string
  phoneE164: string | null
  email: string | null
  igUsername: string | null
  companyName: string | null
  cnpj: string | null
  isB2B: boolean | null
  modality: Modality | null
  segment: Segment | null
  areaM2: number | null
  floorType: FloorType | null
  dirtProfile: DirtProfile | null
  powerPreference: PowerPreference | null
  usageRoutine: string | null
  locationCity: string | null
  locationState: UF | null
  recommendedModels: RecommendedModel[]
  /** 4-line structured handoff brief (SPEC Module 4) or null if not handed off */
  handoffSummary: [string, string, string, string] | null
  kanbanStage: KanbanStage
  proposalValueBRL: number | null
  closedValueBRL: number | null
  /** Modality used at close (sale vs rental) */
  closedModality: Modality | null
  rentalMonths: number | null
  rentalMonthlyBRL: number | null
  lossReason: LossReason | null
  lossNotes: string | null
  /** e.g. Google_Ads_Locacao, IG_Reels_S16, Site_Brava, Outbound_CNAE */
  originTag: string
  campaignId: string | null
  conversationId: string
  attributionId: string | null
  prospectId: string | null
  notes: string | null
  lgpdConsentAt: ISODate | null
  /** set when lead first reached HANDOFF via qualification → counts as SQL */
  sqlAt: ISODate | null
  handoffAt: ISODate | null
  proposalAt: ISODate | null
  closedAt: ISODate | null
  stageChangedAt: ISODate
  createdAt: ISODate
  updatedAt: ISODate
}

export type AttributionChannel = 'WEB_WIDGET' | 'WHATSAPP_DIRECT' | 'IG_COMMENT' | 'IG_DM' | 'META_AD' | 'GOOGLE_AD' | 'OUTBOUND'

export interface LeadAttribution {
  id: string
  leadId: string
  /** e.g. MQ-4821 */
  sessionCode: string
  channel: AttributionChannel
  landingUrl: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  gclid: string | null
  fbclid: string | null
  igMediaId: string | null
  createdAt: ISODate
}

// ───────────────────────────── Conversations ─────────────────────────────

export type ConversationChannel = 'WHATSAPP' | 'INSTAGRAM' | 'WIDGET'

export type ConversationState =
  | 'NEW'
  | 'QUALIFYING'
  | 'QUALIFIED_HANDOFF'
  | 'HUMAN_REQUESTED'
  | 'HUMAN_ACTIVE'
  | 'CLOSED'
  | 'DISQUALIFIED_OUT_OF_REGION'

export interface Conversation {
  id: string
  leadId: string
  channel: ConversationChannel
  state: ConversationState
  aiPaused: boolean
  lastUserMessageAt: ISODate | null
  lastAiResponseAt: ISODate | null
  lastMessageAt: ISODate
  /** AI first response latency (ms) */
  firstResponseMs: number | null
  handoffAt: ISODate | null
  humanFirstResponseAt: ISODate | null
  /** minutes between handoff and first human reply (null if none yet) */
  humanSlaMinutes: number | null
  unreadCount: number
  createdAt: ISODate
  updatedAt: ISODate
}

export type MessageDirection = 'INBOUND' | 'OUTBOUND'
export type SenderType = 'LEAD' | 'AI' | 'HUMAN_AGENT' | 'SYSTEM'
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export interface Message {
  id: string
  conversationId: string
  direction: MessageDirection
  senderType: SenderType
  text: string
  createdAt: ISODate
  status: MessageStatus
  metaMessageId: string | null
  /** AI only */
  llmTokensIn?: number
  llmTokensOut?: number
  llmCostUsd?: number
  latencyMs?: number
  model?: string
  /** HUMAN_AGENT only */
  authorUserId?: string
  /** SYSTEM: utility template name e.g. novo_lead_qualificado */
  template?: string
}

export interface HandoffEvent {
  id: string
  leadId: string
  conversationId: string
  assignedUserId: string
  triggerReason: 'QUALIFIED' | 'HUMAN_REQUESTED'
  summaryLines: string[]
  whatsappDeliveryStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
  notifiedAt: ISODate
  acknowledgedAt: ISODate | null
  afterHours: boolean
}

// ───────────────────────────── Catalog ─────────────────────────────

export type MachineCategory = 'LAVADORA' | 'VARREDEIRA' | 'ROBO' | 'ALTA_PRESSAO' | 'EXTRATORA'

export interface Machine {
  id: string
  model: string
  brand: 'Tennant' | 'Alfa'
  /** pt-BR category label e.g. "Lavadora de piso operada a bordo" */
  categoryLabel: string
  category: MachineCategory
  operation: string
  power: PowerPreference[]
  /** e.g. "Até 5.220 m²/h (prática ~2.015 m²/h)" */
  productivityLabel: string
  productivityM2h: number | null
  practicalM2h: number | null
  tankLabel: string
  cleaningPathMm: number | null
  weightKg: number | null
  noiseDb: number | null
  keySpecs: string[]
  application: string
  idealSegments: Segment[]
  idealAreaM2: { min: number; max: number | null } | null
  bndesEligible: boolean
  ecH2O: boolean
  availableForRental: boolean
  rentalFleetUnits: number
  sourceUrl: string
  /** lucide-react icon name to use on the colored tile */
  icon: 'Droplets' | 'Sparkles' | 'Bot' | 'Wind' | 'Gauge' | 'Sofa' | 'Truck' | 'Brush'
  /** tile color (hex) */
  color: string
  active: boolean
}

export interface SizingRule {
  id: string
  group: 'LAVAGEM' | 'VARRICAO' | 'ESPECIAL'
  condition: string
  minAreaM2: number | null
  maxAreaM2: number | null
  machineIds: string[]
  note: string
}

// ───────────────────────────── Ads ─────────────────────────────

export type AdPlatform = 'GOOGLE' | 'META'
export type CampaignType = 'SEARCH' | 'CLICK_TO_WHATSAPP' | 'IG_REELS_DIRECT' | 'REMARKETING' | 'LEAD_ADS'
export type CampaignStatus = 'PAUSED' | 'ENABLED' | 'REMOVED'
export type KeywordMatchType = 'EXACT' | 'PHRASE' | 'BROAD'

export interface Keyword {
  id: string
  text: string
  matchType: KeywordMatchType
  impressions: number
  clicks: number
}

export interface AdGroup {
  id: string
  name: string
  keywords: Keyword[]
  /** Responsive Search Ad: 15 headlines (≤30 chars), 4 descriptions (≤90 chars) */
  headlines: string[]
  descriptions: string[]
  finalUrl: string
}

export interface MetaCreative {
  id: string
  name: string
  format: 'REELS' | 'IMAGEM' | 'CARROSSEL' | 'VIDEO'
  primaryText: string
  headline: string
  cta: 'WHATSAPP_MESSAGE' | 'SEND_MESSAGE' | 'LEARN_MORE' | 'SIGN_UP'
  machineId: string | null
  impressions: number
  clicks: number
}

export interface MetaSettings {
  placements: string[]
  ageMin: number
  ageMax: number
  interests: string[]
  creatives: MetaCreative[]
  whatsappNumber?: string
}

export interface AdSchedule {
  days: number[] // 1..5
  start: string
  end: string
  timezone: string
}

export interface CampaignMetrics {
  impressions: number
  clicks: number
  /** ratio 0..1 */
  ctr: number
  spend: number
  leads: number
  sqls: number
  wonBRL: number
  /** ratio 0..1 of ad leads with gclid/fbclid captured */
  trackingCoverage: number
}

export interface DailyMetric {
  date: string // yyyy-MM-dd
  impressions: number
  clicks: number
  spend: number
  leads: number
  sqls: number
}

export interface AdCampaign {
  id: string
  tenantId: string
  platform: AdPlatform
  type: CampaignType
  name: string
  objective: string
  targetModality: Modality | null
  status: CampaignStatus
  externalId: string
  targetStates: AllowedState[]
  dailyBudgetBRL: number
  schedule: AdSchedule
  trackingTemplate: string
  finalUrl: string
  metrics: CampaignMetrics
  daily: DailyMetric[]
  adGroups: AdGroup[]
  negatives: string[]
  meta: MetaSettings | null
  machineIds: string[]
  createdBy: 'AI_BLUEPRINT' | 'MANUAL'
  blueprintId: string | null
  createdAt: ISODate
  lastSyncedAt: ISODate
  statusChangedAt: ISODate
}

export type BlueprintTheme = 'LOCACAO' | 'COMPRA' | 'PECAS' | 'ROBOTICA' | 'META_CTWA' | 'META_REELS' | 'META_REMARKETING' | 'META_LEADS'

export interface BlueprintConfig {
  platforms: AdPlatform[]
  themes: BlueprintTheme[]
  monthlyBudgetBRL: number
  allowedStates: AllowedState[]
  businessHours: BusinessHours
  machineIds: string[]
}

/** A campaign proposed by the AI blueprint (not yet deployed) */
export interface BlueprintCampaign {
  tempId: string
  theme: BlueprintTheme
  platform: AdPlatform
  type: CampaignType
  name: string
  objective: string
  targetModality: Modality | null
  dailyBudgetBRL: number
  targetStates: AllowedState[]
  schedule: AdSchedule
  trackingTemplate: string
  finalUrl: string
  adGroups: AdGroup[]
  negatives: string[]
  meta: MetaSettings | null
  machineIds: string[]
  rationale: string
  estimatedClicksMonth: number
  estimatedLeadsMonth: number
  included: boolean
}

export interface CampaignBlueprint {
  id: string
  generatedAt: ISODate
  model: string
  config: BlueprintConfig
  campaigns: BlueprintCampaign[]
  tokensIn: number
  tokensOut: number
  costUsd: number
  generationMs: number
  status: 'DRAFT' | 'DEPLOYED'
  deployedAt: ISODate | null
}

// ───────────────────────────── Optimization / automation ─────────────────────────────

export type SearchTermClass = 'ICP_B2B' | 'RESIDENCIAL' | 'VAREJO' | 'CONCORRENTE' | 'EMPREGO' | 'IRRELEVANTE'
export type OptimizationAction = 'NEGATIVE_ADDED' | 'KEPT' | 'REVIEW'

/** One analysed search term in a weekly optimizer run */
export interface OptimizationLog {
  id: string
  runId: string
  searchTerm: string
  campaignId: string
  campaignName: string
  impressions: number
  clicks: number
  cost: number
  classification: SearchTermClass
  action: OptimizationAction
  reason: string
  negativeKeyword: string | null
  createdAt: ISODate
}

export interface OptimizationRun {
  id: string
  runDate: ISODate
  provider: 'GOOGLE_ADS'
  actionType: 'NEGATIVE_KEYWORDS_PRUNING'
  termsAnalyzed: number
  negativesAdded: number
  keptCount: number
  wastedSpendSavedBRL: number
  summaryText: string
  digestSentAt: ISODate | null
  trigger: 'CRON' | 'MANUAL'
}

export interface NegativeKeyword {
  id: string
  text: string
  matchType: KeywordMatchType
  scope: 'ACCOUNT' | 'CAMPAIGN'
  campaignId: string | null
  listName: string
  source: 'AI_OPTIMIZER' | 'BLUEPRINT' | 'MANUAL'
  runId: string | null
  addedAt: ISODate
}

export type ConversionEventType = 'SQL' | 'WON'
export type ConversionPlatform = 'GOOGLE_ADS' | 'META_CAPI'
export type ConversionStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED'

export interface OfflineConversionEvent {
  id: string
  leadId: string
  leadName: string
  event: ConversionEventType
  platform: ConversionPlatform
  conversionAction: string
  matchKey: {
    gclid: string | null
    fbclid: string | null
    emailSha256: string | null
    phoneSha256: string | null
  }
  status: ConversionStatus
  responseCode: number | null
  responseMessage: string | null
  valueBRL: number
  attempts: number
  createdAt: ISODate
  sentAt: ISODate | null
}

export type ProspectStatus = 'PENDING' | 'SENT_EMAIL' | 'SENT_WA' | 'REPLIED' | 'CONVERTED' | 'DISQUALIFIED'

export interface OutboundProspect {
  id: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  cnae: string
  cnaeDescription: string
  segment: Segment
  city: string
  state: AllowedState
  phoneE164: string | null
  email: string | null
  source: 'CNAE' | 'GOOGLE_PLACES'
  employeesRange: string
  googleRating: number | null
  /** ICP fit score 0–100 */
  fitScore: number
  sequenceStep: number
  sequenceTotal: number
  status: ProspectStatus
  lastTouchChannel: 'EMAIL' | 'WHATSAPP' | null
  lastContactedAt: ISODate | null
  nextTouchAt: ISODate | null
  leadId: string | null
  createdAt: ISODate
}

export type IgCommentClass = 'COMMERCIAL_INQUIRY' | 'ELOGIO' | 'SPAM' | 'OUTRO'

export interface IgCommentEvent {
  id: string
  mediaId: string
  /** e.g. IG_Reels_S16 */
  mediaTag: string
  mediaCaption: string
  username: string
  commentText: string
  classification: IgCommentClass
  matchedKeyword: string | null
  publicReply: string | null
  dmSent: boolean
  dmText: string | null
  leadId: string | null
  latencyMs: number | null
  createdAt: ISODate
}

export interface AdSpendEntry {
  id: string
  /** yyyy-MM-01 */
  monthStart: string
  channel: 'GOOGLE_ADS' | 'META_ADS'
  campaignId: string | null
  campaignName: string
  spendBRL: number
  source: 'API_SYNC' | 'MANUAL' | 'CSV'
  notes: string | null
}

export type NotificationType =
  | 'LEAD_QUALIFIED'
  | 'HUMAN_REQUESTED'
  | 'OPTIMIZER'
  | 'CONVERSION'
  | 'CAMPAIGN'
  | 'OUTBOUND'
  | 'IG_COMMENT'
  | 'SLA_ALERT'
  | 'DEAL_WON'
  | 'SYSTEM'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  createdAt: ISODate
  read: boolean
  href: string | null
}
