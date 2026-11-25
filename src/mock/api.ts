/**
 * Mock API layer. Every "backend" call goes through here: simulated latency (300–1500 ms),
 * optional fake progress for multi-step jobs, optional failures (useUiStore.mockFailureRate),
 * and store mutations after the delay. Names mirror SPEC §4.4 endpoints.
 */
import type {
  AdCampaign,
  AdPlatform,
  AllowedState,
  BlueprintCampaign,
  BlueprintConfig,
  BlueprintTheme,
  CampaignBlueprint,
  CampaignStatus,
  ConversionEventType,
  IgCommentEvent,
  IntegrationKey,
  KanbanStage,
  Lead,
  Message,
  OfflineConversionEvent,
  OptimizationLog,
  OptimizationRun,
  OutboundProspect,
  SearchTermClass,
  Segment,
  Tenant,
} from '@/types/domain'
import { useUiStore } from '@/store/uiStore'
import { useLeadStore, type MoveStagePayload } from '@/store/leadStore'
import { useCampaignStore } from '@/store/campaignStore'
import { useAutomationStore } from '@/store/automationStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useTenantStore } from '@/store/tenantStore'
import { useCatalogStore } from '@/store/catalogStore'
import { computeKpis } from '@/store/selectors'
import { ACCOUNT_NEGATIVES, AD_COPY, BUSINESS_SCHEDULE, GOOGLE_TRACKING_TEMPLATE, META_TRACKING_TEMPLATE } from './data/campaigns'
import { addMinutes, fakeSha256, nowISO, uid } from '@/lib/utils'
import { formatBRL, formatDate, formatMs, formatMinutes, formatPercent } from '@/lib/format'

// ───────────────────────── Helpers ─────────────────────────

export class ApiError extends Error {
  code: string
  status: number
  constructor(message: string, code = 'MOCK_FAILURE', status = 500) {
    super(message)
    this.code = code
    this.status = status
  }
}

/** Resolves after a random delay between min and max ms (scaled by useUiStore.latencyMultiplier). */
export function delay(min = 300, max = 1500): Promise<void> {
  const mult = useUiStore.getState().latencyMultiplier
  const ms = (min + Math.random() * (max - min)) * mult
  return new Promise((r) => setTimeout(r, ms))
}

/** Throws ApiError with probability useUiStore.mockFailureRate (default 0 = never). */
export function maybeFail(operation: string) {
  const rate = useUiStore.getState().mockFailureRate
  if (rate > 0 && Math.random() < rate) {
    throw new ApiError(`Falha simulada em "${operation}". Tente novamente.`, 'MOCK_FAILURE', 503)
  }
}

export interface ProgressStep {
  label: string
  /** ms for this step (default random 400–1100) */
  ms?: number
}

/**
 * Runs fake multi-step jobs. onStep(index, step, pct) is called when each step STARTS;
 * finally called with index = steps.length and pct = 1.
 * Example: await withProgress(['Lendo catálogo', 'Gerando keywords'], (i, s, pct) => setProgress(pct))
 */
export async function withProgress(
  steps: (string | ProgressStep)[],
  onStep?: (index: number, step: ProgressStep | null, pct: number) => void,
): Promise<void> {
  const norm = steps.map((s) => (typeof s === 'string' ? { label: s } : s))
  const mult = useUiStore.getState().latencyMultiplier
  for (let i = 0; i < norm.length; i++) {
    onStep?.(i, norm[i], i / norm.length)
    const ms = (norm[i].ms ?? 400 + Math.random() * 700) * mult
    await new Promise((r) => setTimeout(r, ms))
  }
  onStep?.(norm.length, null, 1)
}

type OnStep = (index: number, step: ProgressStep | null, pct: number) => void

// ───────────────────────── Ads: blueprint & deploy ─────────────────────────

export const BLUEPRINT_STEPS: ProgressStep[] = [
  { label: 'Lendo configuração do tenant (PA/MA/AP, seg–sex 08–18h, orçamento)', ms: 600 },
  { label: 'Carregando catálogo Alfa Tennant via Prompt Caching', ms: 700 },
  { label: 'gpt-4o-mini · Structured Outputs: estrutura de campanhas', ms: 1100 },
  { label: 'Gerando clusters de palavras-chave e negativas', ms: 900 },
  { label: 'Escrevendo RSAs (15 títulos / 4 descrições) e criativos Meta', ms: 1000 },
  { label: 'Injetando tracking (UTM + gclid/fbclid) e validando schema Zod', ms: 600 },
]

export const DEPLOY_STEPS: ProgressStep[] = [
  { label: 'CampaignBudgetService · criando orçamentos', ms: 600 },
  { label: 'CampaignService · campanhas em PAUSED', ms: 700 },
  { label: 'CampaignCriterionService · geo PA/MA/AP + agenda', ms: 600 },
  { label: 'AdGroupService / AdGroupCriterionService · keywords', ms: 700 },
  { label: 'AdGroupAdService · Responsive Search Ads', ms: 600 },
  { label: 'Meta Marketing API · /campaigns, /adsets, /adcreatives, /ads', ms: 900 },
  { label: 'Persistindo IDs externos em ad_campaigns', ms: 400 },
]

const THEME_META: Record<
  BlueprintTheme,
  { platform: AdPlatform; type: BlueprintCampaign['type']; name: string; objective: string; modality: BlueprintCampaign['targetModality']; weight: number; machineIds: string[]; finalUrl: string; rationale: string }
> = {
  LOCACAO: {
    platform: 'GOOGLE',
    type: 'SEARCH',
    name: 'Search · Locação Lavadoras & Varredeiras',
    objective: 'Leads de locação (WhatsApp / site)',
    modality: 'LOCACAO',
    weight: 0.28,
    machineIds: ['m_brava', 'm_s16', 'm_a260', 'm_ext52'],
    finalUrl: 'https://vendas.maquinabel.com.br/locacao',
    rationale: 'Locação tem LTV de R$ 84 mil (R$ 3.500/mês × 24) — maior volume de busca comercial em PA/MA.',
  },
  COMPRA: {
    platform: 'GOOGLE',
    type: 'SEARCH',
    name: 'Search · Compra Varredeiras & Robótica T16AMR',
    objective: 'Leads de compra de alto ticket',
    modality: 'COMPRA',
    weight: 0.2,
    machineIds: ['m_s16', 'm_t16amr', 'm_brava', 'm_a260'],
    finalUrl: 'https://vendas.maquinabel.com.br/compra',
    rationale: 'Termos de compra industrial têm alta intenção; Brava elegível BNDES reduz objeção de preço.',
  },
  PECAS: {
    platform: 'GOOGLE',
    type: 'SEARCH',
    name: 'Search · Peças & Manutenção',
    objective: 'Ordens de serviço e venda de peças',
    modality: 'MANUTENCAO_PECAS',
    weight: 0.08,
    machineIds: ['m_a260', 'm_brava', 'm_s16'],
    finalUrl: 'https://maquinabel.com.br/manutencao/',
    rationale: 'CPC baixo e base instalada Alfa Tennant na região: receita recorrente e porta de entrada para upgrade.',
  },
  ROBOTICA: {
    platform: 'GOOGLE',
    type: 'SEARCH',
    name: 'Search · Robótica Autônoma',
    objective: 'Leads de robótica (T16AMR)',
    modality: 'COMPRA',
    weight: 0.1,
    machineIds: ['m_t16amr'],
    finalUrl: 'https://vendas.maquinabel.com.br/robotica-t16amr',
    rationale: 'Falta de mão de obra em CDs e atacarejos: T16AMR é o maior ticket do catálogo.',
  },
  META_CTWA: {
    platform: 'META',
    type: 'CLICK_TO_WHATSAPP',
    name: 'Meta · Click-to-WhatsApp Brava & S16',
    objective: 'Conversas no WhatsApp (MESSAGES)',
    modality: null,
    weight: 0.2,
    machineIds: ['m_brava', 'm_s16'],
    finalUrl: 'https://wa.me/5591993801020',
    rationale: 'Vídeos de máquina operando geram demanda latente; conversa cai direto no SDR IA.',
  },
  META_REELS: {
    platform: 'META',
    type: 'IG_REELS_DIRECT',
    name: 'Meta · Instagram Reels & Direct (S16 / Brava)',
    objective: 'Engajamento → Direct (Comment-to-DM)',
    modality: null,
    weight: 0.14,
    machineIds: ['m_s16', 'm_brava'],
    finalUrl: 'https://instagram.com/maquinabel',
    rationale: 'Reels gravados pelo Vinicius + automação Comment-to-DM com tag de origem IG_Reels_*.',
  },
  META_REMARKETING: {
    platform: 'META',
    type: 'REMARKETING',
    name: 'Meta · Remarketing Site → WhatsApp',
    objective: 'Reengajar visitantes do site (30 dias)',
    modality: null,
    weight: 0.05,
    machineIds: [],
    finalUrl: 'https://wa.me/5591993801020',
    rationale: 'Recupera visitantes de vendas.maquinabel.com.br que não iniciaram conversa.',
  },
  META_LEADS: {
    platform: 'META',
    type: 'LEAD_ADS',
    name: 'Meta · Lead Ads Prestadoras de Limpeza',
    objective: 'Formulário instantâneo (prestadoras B2B)',
    modality: 'LOCACAO',
    weight: 0.07,
    machineIds: ['m_a260', 'm_imop_lite', 'm_alfa_bizz'],
    finalUrl: 'https://vendas.maquinabel.com.br/locacao',
    rationale: 'Prestadoras ganham contratos novos e precisam de frota rápida — ICP de locação recorrente.',
  },
}

const THEME_KEYWORDS: Partial<Record<BlueprintTheme, [string, 'EXACT' | 'PHRASE' | 'BROAD'][]>> = {
  LOCACAO: [
    ['aluguel lavadora de piso', 'PHRASE'],
    ['locação lavadora de piso industrial', 'PHRASE'],
    ['aluguel varredeira industrial', 'PHRASE'],
    ['locação lavadora brava', 'EXACT'],
    ['alugar lavadora piso sao luis', 'PHRASE'],
    ['aluguel maquina limpeza galpao', 'BROAD'],
  ],
  COMPRA: [
    ['varredeira industrial', 'PHRASE'],
    ['varredeira industrial tennant', 'EXACT'],
    ['lavadora de piso industrial', 'PHRASE'],
    ['comprar lavadora de piso a bateria', 'PHRASE'],
    ['lavadora brava alfa', 'EXACT'],
  ],
  PECAS: [
    ['peças lavadora tennant', 'PHRASE'],
    ['manutenção lavadora de piso', 'PHRASE'],
    ['assistencia tecnica tennant belem', 'EXACT'],
    ['borracha rodo lavadora', 'PHRASE'],
  ],
  ROBOTICA: [
    ['robo lavadora de piso autonomo', 'PHRASE'],
    ['robo de limpeza industrial', 'PHRASE'],
    ['t16amr', 'EXACT'],
    ['lavadora autonoma', 'BROAD'],
  ],
}

/** Pure generator (no delay) — builds a blueprint from config + catalog. */
export function buildBlueprint(config: BlueprintConfig): CampaignBlueprint {
  const themes = config.themes.filter((t) => config.platforms.includes(THEME_META[t].platform))
  const totalWeight = themes.reduce((a, t) => a + THEME_META[t].weight, 0) || 1
  const dailyTotal = config.monthlyBudgetBRL / 22 // weekdays only (seg–sex)
  const machines = useCatalogStore.getState().machines
  const schedule = { days: config.businessHours.days, start: config.businessHours.start, end: config.businessHours.end, timezone: config.businessHours.timezone }
  const campaigns: BlueprintCampaign[] = themes.map((theme) => {
    const meta = THEME_META[theme]
    const dailyBudgetBRL = Math.max(3, Math.round(((dailyTotal * meta.weight) / totalWeight) * 2) / 2)
    const machineIds = meta.machineIds.filter((id) => config.machineIds.length === 0 || config.machineIds.includes(id))
    const copy = AD_COPY[theme as keyof typeof AD_COPY]
    const kws = THEME_KEYWORDS[theme] ?? []
    const isGoogle = meta.platform === 'GOOGLE'
    const estClicks = Math.round((dailyBudgetBRL * 22) / (isGoogle ? 3.4 : 1.1))
    return {
      tempId: uid('bpc'),
      theme,
      platform: meta.platform,
      type: meta.type,
      name: meta.name,
      objective: meta.objective,
      targetModality: meta.modality,
      dailyBudgetBRL,
      targetStates: config.allowedStates,
      schedule,
      trackingTemplate: isGoogle ? GOOGLE_TRACKING_TEMPLATE : META_TRACKING_TEMPLATE,
      finalUrl: meta.finalUrl,
      adGroups:
        isGoogle && copy
          ? [
              {
                id: uid('ag'),
                name: `${meta.name.replace('Search · ', '')} · Principal`,
                keywords: kws.map(([text, matchType]) => ({ id: uid('kw'), text, matchType, impressions: 0, clicks: 0 })),
                headlines: [...copy.headlines],
                descriptions: [...copy.descriptions],
                finalUrl: meta.finalUrl,
              },
            ]
          : [],
      negatives: isGoogle ? [...ACCOUNT_NEGATIVES] : [],
      meta: isGoogle
        ? null
        : {
            placements: theme === 'META_REELS' ? ['instagram_reels', 'instagram_explore'] : ['facebook_feed', 'instagram_feed', 'instagram_stories', 'instagram_reels'],
            ageMin: 25,
            ageMax: 60,
            interests: ['Gestão de facilities', 'Logística', 'Supermercados', 'Indústria'],
            whatsappNumber: '+5591993801020',
            creatives: machineIds.slice(0, 2).map((mid) => {
              const m = machines.find((x) => x.id === mid)
              return {
                id: uid('cr'),
                name: `${theme === 'META_REELS' ? 'Reels' : 'Vídeo'} · ${m?.model ?? 'Institucional'}`,
                format: theme === 'META_REELS' ? ('REELS' as const) : ('VIDEO' as const),
                primaryText: `${m?.model ?? 'Máquinas Alfa Tennant'}: ${m?.application ?? 'limpeza profissional'} Fale com nosso consultor técnico.`,
                headline: m ? `${m.model} · ${m.productivityLabel}` : 'Dimensionamento gratuito',
                cta: theme === 'META_LEADS' ? ('SIGN_UP' as const) : theme === 'META_REELS' ? ('SEND_MESSAGE' as const) : ('WHATSAPP_MESSAGE' as const),
                machineId: mid,
                impressions: 0,
                clicks: 0,
              }
            }),
          },
      machineIds,
      rationale: meta.rationale,
      estimatedClicksMonth: estClicks,
      estimatedLeadsMonth: Math.max(1, Math.round(estClicks * (isGoogle ? 0.07 : 0.05))),
      included: true,
    }
  })
  return {
    id: uid('bp'),
    generatedAt: nowISO(),
    model: 'gpt-4o-mini',
    config,
    campaigns,
    tokensIn: 3820 + campaigns.length * 210,
    tokensOut: 1450 + campaigns.length * 690,
    costUsd: Number(((3820 * 0.15 + (1450 + campaigns.length * 690) * 0.6) / 1_000_000).toFixed(5)),
    generationMs: 6200 + Math.round(Math.random() * 2600),
    status: 'DRAFT',
    deployedAt: null,
  }
}

/** POST /api/v1/ads/campaigns/generate-blueprint */
export async function generateBlueprint(config: BlueprintConfig, onStep?: OnStep): Promise<CampaignBlueprint> {
  await withProgress(BLUEPRINT_STEPS, onStep)
  maybeFail('generate-blueprint')
  const bp = buildBlueprint(config)
  useCampaignStore.getState().addBlueprint(bp)
  return bp
}

/** POST /api/v1/ads/campaigns/deploy — creates PAUSED campaigns from included blueprint campaigns. */
export async function deployCampaigns(blueprint: CampaignBlueprint, onStep?: OnStep): Promise<AdCampaign[]> {
  await withProgress(DEPLOY_STEPS, onStep)
  maybeFail('deploy')
  const t = nowISO()
  const tenantId = useTenantStore.getState().tenant.id
  const created: AdCampaign[] = blueprint.campaigns
    .filter((c) => c.included)
    .map((c) => ({
      id: uid('c'),
      tenantId,
      platform: c.platform,
      type: c.type,
      name: c.name,
      objective: c.objective,
      targetModality: c.targetModality,
      status: 'PAUSED',
      externalId: c.platform === 'GOOGLE' ? String(21893340000 + Math.floor(Math.random() * 99999)) : `1202145588300${Math.floor(10000 + Math.random() * 89999)}`,
      targetStates: c.targetStates,
      dailyBudgetBRL: c.dailyBudgetBRL,
      schedule: c.schedule,
      trackingTemplate: c.trackingTemplate,
      finalUrl: c.finalUrl,
      metrics: { impressions: 0, clicks: 0, ctr: 0, spend: 0, leads: 0, sqls: 0, wonBRL: 0, trackingCoverage: 1 },
      daily: [],
      adGroups: c.adGroups,
      negatives: c.negatives,
      meta: c.meta,
      machineIds: c.machineIds,
      createdBy: 'AI_BLUEPRINT',
      blueprintId: blueprint.id,
      createdAt: t,
      lastSyncedAt: t,
      statusChangedAt: t,
    }))
  useCampaignStore.getState().addCampaigns(created)
  useCampaignStore.getState().updateBlueprint(blueprint.id, { status: 'DEPLOYED', deployedAt: t })
  useNotificationStore.getState().pushNotification({
    type: 'CAMPAIGN',
    title: `${created.length} campanhas criadas em PAUSED`,
    body: 'Revise e ative com 1 clique no Ads Manager.',
    href: '/ads',
  })
  return created
}

/** PATCH /api/v1/ads/campaigns/:id/status */
export async function patchCampaignStatus(id: string, status: CampaignStatus): Promise<AdCampaign> {
  await delay(500, 1400)
  maybeFail('campaign-status')
  useCampaignStore.getState().setCampaignStatus(id, status)
  return useCampaignStore.getState().campaigns.find((c) => c.id === id)!
}

/** Update budget/keywords/headlines/etc. and "sync" to the platform. */
export async function updateCampaign(id: string, patch: Partial<AdCampaign>): Promise<AdCampaign> {
  await delay(400, 1100)
  maybeFail('campaign-update')
  useCampaignStore.getState().updateCampaign(id, { ...patch, lastSyncedAt: nowISO() })
  return useCampaignStore.getState().campaigns.find((c) => c.id === id)!
}

/** Pulls "live" metrics: bumps today's impressions/clicks/spend a little on ENABLED campaigns. */
export async function syncCampaignMetrics(): Promise<void> {
  await delay(700, 1600)
  maybeFail('metrics-sync')
  const { campaigns, updateCampaign: upd } = useCampaignStore.getState()
  const t = nowISO()
  for (const c of campaigns) {
    if (c.status !== 'ENABLED' || !c.daily.length) {
      upd(c.id, { lastSyncedAt: t })
      continue
    }
    const daily = [...c.daily]
    const last = { ...daily[daily.length - 1] }
    const addSpend = Math.round(c.dailyBudgetBRL * (0.03 + Math.random() * 0.05) * 100) / 100
    const addClicks = Math.round(Math.random() * 2)
    const addImpr = Math.round(10 + Math.random() * 40)
    last.spend = Math.round((last.spend + addSpend) * 100) / 100
    last.clicks += addClicks
    last.impressions += addImpr
    daily[daily.length - 1] = last
    const impressions = c.metrics.impressions + addImpr
    const clicks = c.metrics.clicks + addClicks
    upd(c.id, {
      daily,
      lastSyncedAt: t,
      metrics: { ...c.metrics, impressions, clicks, ctr: impressions ? clicks / impressions : 0, spend: Math.round((c.metrics.spend + addSpend) * 100) / 100 },
    })
  }
}

// ───────────────────────── Offline conversions ─────────────────────────

/** POST /api/v1/ads/sync-conversions (single lead). Creates & sends an SQL/WON event. */
export async function dispatchOfflineConversion(leadId: string, event: ConversionEventType): Promise<OfflineConversionEvent> {
  const { leads, attributions } = useLeadStore.getState()
  const lead = leads.find((l) => l.id === leadId)
  if (!lead) throw new ApiError('Lead não encontrado', 'NOT_FOUND', 404)
  const attr = attributions.find((a) => a.leadId === leadId)
  const platform = lead.originTag.startsWith('Google') ? 'GOOGLE_ADS' : 'META_CAPI'
  const ev: OfflineConversionEvent = {
    id: uid('oc'),
    leadId,
    leadName: lead.name,
    event,
    platform,
    conversionAction: platform === 'GOOGLE_ADS' ? (event === 'SQL' ? 'SQL - Lead Qualificado (offline)' : 'Venda Fechada (offline · valor BRL)') : event === 'SQL' ? 'Lead (CAPI · QualifiedLead)' : 'Purchase (CAPI)',
    matchKey: {
      gclid: attr?.gclid ?? null,
      fbclid: attr?.fbclid ?? null,
      emailSha256: lead.email ? fakeSha256(lead.email) : null,
      phoneSha256: lead.phoneE164 ? fakeSha256(lead.phoneE164) : null,
    },
    status: 'PENDING',
    responseCode: null,
    responseMessage: null,
    valueBRL: event === 'WON' ? lead.closedValueBRL ?? 0 : 0,
    attempts: 0,
    createdAt: nowISO(),
    sentAt: null,
  }
  useAutomationStore.getState().addConversionEvent(ev)
  await delay(800, 1800)
  try {
    maybeFail('offline-conversion')
  } catch (e) {
    useAutomationStore.getState().updateConversionEvent(ev.id, { status: 'FAILED', responseCode: 503, responseMessage: (e as Error).message, attempts: 1 })
    throw e
  }
  const patch = { status: 'SENT' as const, responseCode: 200, responseMessage: platform === 'GOOGLE_ADS' ? 'UploadClickConversions OK · partial_failure_error: null' : '{"events_received":1,"messages":[]}', attempts: 1, sentAt: nowISO() }
  useAutomationStore.getState().updateConversionEvent(ev.id, patch)
  return { ...ev, ...patch }
}

/** Retries a FAILED/PENDING conversion event. */
export async function retryConversion(eventId: string): Promise<OfflineConversionEvent> {
  const store = useAutomationStore.getState()
  const ev = store.conversionEvents.find((e) => e.id === eventId)
  if (!ev) throw new ApiError('Evento não encontrado', 'NOT_FOUND', 404)
  store.updateConversionEvent(eventId, { status: 'PENDING' })
  await delay(800, 1700)
  try {
    maybeFail('retry-conversion')
  } catch (e) {
    useAutomationStore.getState().updateConversionEvent(eventId, { status: 'FAILED', attempts: ev.attempts + 1, responseMessage: (e as Error).message, responseCode: 503 })
    throw e
  }
  const patch = { status: 'SENT' as const, responseCode: 200, responseMessage: 'UploadClickConversions OK · partial_failure_error: null', attempts: ev.attempts + 1, sentAt: nowISO() }
  useAutomationStore.getState().updateConversionEvent(eventId, patch)
  return { ...ev, ...patch }
}

/** POST /api/v1/ads/sync-conversions — flushes all PENDING/FAILED events. Returns count sent. */
export async function syncConversions(onStep?: OnStep): Promise<number> {
  const pending = useAutomationStore.getState().conversionEvents.filter((e) => e.status === 'PENDING' || e.status === 'FAILED')
  await withProgress(
    [{ label: 'Buscando eventos pendentes', ms: 500 }, { label: 'Google Ads API · UploadClickConversions', ms: 900 }, { label: 'Meta Conversions API · /events', ms: 800 }],
    onStep,
  )
  maybeFail('sync-conversions')
  const t = nowISO()
  for (const e of pending)
    useAutomationStore.getState().updateConversionEvent(e.id, { status: 'SENT', responseCode: 200, responseMessage: 'OK (sincronização manual)', attempts: e.attempts + 1, sentAt: t })
  return pending.length
}

// ───────────────────────── Search-term optimizer ─────────────────────────

const NEW_TERMS: [string, SearchTermClass, string | null, string][] = [
  ['lavadora de piso residencial pequena', 'RESIDENCIAL', 'residencial pequena', 'Uso residencial.'],
  ['aluguel lavadora brava belem', 'ICP_B2B', null, 'Locação Brava na área de cobertura — ICP.'],
  ['karcher fc3 preço', 'RESIDENCIAL', 'karcher fc3', 'Mop elétrico doméstico.'],
  ['varredeira para estacionamento shopping', 'ICP_B2B', null, 'Shopping com área externa — perfil S16/Alfa Bizz.'],
  ['lavadora de piso recife', 'IRRELEVANTE', 'recife', 'Cidade fora da cobertura PA/MA/AP.'],
  ['vaga operador de maquinas limpeza', 'EMPREGO', 'vaga operador de maquinas', 'Busca de emprego.'],
  ['lavadora de alta pressão para lava jato', 'ICP_B2B', null, 'Lava-jato comercial — perfil Alfa Pressure 400.'],
  ['aspirador de pó vertical sem fio', 'VAREJO', 'aspirador vertical', 'Eletrodoméstico de varejo.'],
  ['locação robo limpeza t16amr', 'ICP_B2B', null, 'Interesse em robótica — ICP de alto ticket.'],
  ['enceradeira industrial usada olx', 'VAREJO', 'usada olx', 'Marketplace de usados.'],
]

/** POST /api/v1/ads/optimize-negative-keywords — weekly search-term auditor (manual trigger). */
export async function runSearchTermOptimizer(onStep?: OnStep): Promise<{ run: OptimizationRun; logs: OptimizationLog[] }> {
  await withProgress(
    [
      { label: 'GoogleAdsService.SearchStream · relatório de termos (7 dias)', ms: 900 },
      { label: 'gpt-4o-mini · classificando intenção (ICP vs residencial/varejo)', ms: 1300 },
      { label: 'Aplicando negativas nas campanhas ativas', ms: 700 },
      { label: 'Enviando digest ao Vinicius no WhatsApp', ms: 500 },
    ],
    onStep,
  )
  maybeFail('optimize-negative-keywords')
  const runId = uid('run')
  const t = nowISO()
  const campaigns = useCampaignStore.getState().campaigns.filter((c) => c.platform === 'GOOGLE' && c.status === 'ENABLED')
  const picked = [...NEW_TERMS].sort(() => Math.random() - 0.5).slice(0, 7)
  const logs: OptimizationLog[] = picked.map(([term, cls, neg, reason], i) => {
    const c = campaigns[i % Math.max(1, campaigns.length)]
    const clicks = cls === 'ICP_B2B' ? 2 + Math.floor(Math.random() * 6) : Math.floor(Math.random() * 4)
    return {
      id: `${runId}_t${i + 1}`,
      runId,
      searchTerm: term,
      campaignId: c?.id ?? 'c_g_compra',
      campaignName: c?.name ?? 'Search',
      impressions: 10 + Math.floor(Math.random() * 80),
      clicks,
      cost: Math.round(clicks * (2.2 + Math.random() * 2.2) * 100) / 100,
      classification: cls,
      action: neg ? 'NEGATIVE_ADDED' : 'KEPT',
      reason,
      negativeKeyword: neg,
      createdAt: t,
    }
  })
  const negatives = logs.filter((l) => l.negativeKeyword)
  useAutomationStore.getState().addNegatives(
    negatives.map((l) => l.negativeKeyword!),
    { source: 'AI_OPTIMIZER', runId, listName: 'Negativas IA · Otimizador semanal', matchType: 'PHRASE', scope: 'ACCOUNT' },
  )
  const run: OptimizationRun = {
    id: runId,
    runDate: t,
    provider: 'GOOGLE_ADS',
    actionType: 'NEGATIVE_KEYWORDS_PRUNING',
    termsAnalyzed: 18 + Math.floor(Math.random() * 20),
    negativesAdded: negatives.length,
    keptCount: logs.length - negatives.length,
    wastedSpendSavedBRL: Math.round(negatives.reduce((a, l) => a + l.cost, 0) * 4 * 100) / 100,
    summaryText: `Execução manual: ${negatives.length} negativas adicionadas e ${logs.length - negatives.length} termos B2B mantidos. Digest enviado ao Vinicius no WhatsApp.`,
    digestSentAt: t,
    trigger: 'MANUAL',
  }
  useAutomationStore.getState().addOptimizationRun(run, logs)
  useNotificationStore.getState().pushNotification({
    type: 'OPTIMIZER',
    title: `Otimizador adicionou ${negatives.length} negativas`,
    body: negatives
      .slice(0, 3)
      .map((l) => `“${l.negativeKeyword}”`)
      .join(', '),
    href: '/automacao',
  })
  return { run, logs }
}

/** Add negatives manually (account or campaign scope). */
export async function addNegativeKeywords(terms: string[], campaignId: string | null = null) {
  await delay(300, 900)
  maybeFail('add-negatives')
  const added = useAutomationStore
    .getState()
    .addNegatives(terms, { source: 'MANUAL', scope: campaignId ? 'CAMPAIGN' : 'ACCOUNT', campaignId, listName: 'Manual · Vinicius' })
  if (campaignId) useCampaignStore.getState().addCampaignNegatives(campaignId, added.map((n) => n.text))
  return added
}

// ───────────────────────── Outbound prospecting ─────────────────────────

const PROSPECT_POOL: [string, string, string, Segment, string, AllowedState, string][] = [
  ['Armazém Ver-o-Peso Logística Ltda', '5211-7/99', 'Depósitos de mercadorias para terceiros', 'CD_LOGISTICA', 'Belém', 'PA', '91'],
  ['Supermercado Formosa Castanhal Ltda', '4711-3/02', 'Comércio varejista — supermercados', 'SUPERMERCADO_ATACAREJO', 'Castanhal', 'PA', '91'],
  ['Açaí Norte Indústria de Polpas Ltda', '1031-7/00', 'Fabricação de conservas de frutas', 'ALIMENTOS_BEBIDAS', 'Ananindeua', 'PA', '91'],
  ['Facilities Amazônia Serviços Ltda', '8121-4/00', 'Limpeza em prédios e em domicílios', 'PRESTADORA_LIMPEZA', 'Belém', 'PA', '91'],
  ['Rede Mateus Atacarejo Imperatriz', '4639-7/01', 'Comércio atacadista de produtos alimentícios em geral', 'SUPERMERCADO_ATACAREJO', 'Imperatriz', 'MA', '99'],
  ['Shopping Pátio Norte Ltda', '6822-6/00', 'Gestão e administração da propriedade imobiliária', 'SHOPPING', 'São Luís', 'MA', '98'],
  ['Transportadora Itaqui Cargas Ltda', '4930-2/02', 'Transporte rodoviário de carga intermunicipal', 'CD_LOGISTICA', 'São Luís', 'MA', '98'],
  ['Frigorífico Amapá Carnes Ltda', '1011-2/01', 'Frigorífico — abate de bovinos', 'ALIMENTOS_BEBIDAS', 'Macapá', 'AP', '96'],
  ['Hospital São Camilo Macapá Ltda', '8610-1/01', 'Atividades de atendimento hospitalar', 'HOSPITAL_HOTEL_ESCOLA', 'Macapá', 'AP', '96'],
  ['Indústria Cerâmica Marajoara Ltda', '2342-7/02', 'Fabricação de azulejos e pisos', 'INDUSTRIA', 'São Miguel do Guamá', 'PA', '91'],
  ['Centro de Distribuição Tapajós Ltda', '5211-7/99', 'Depósitos de mercadorias para terceiros', 'CD_LOGISTICA', 'Santarém', 'PA', '93'],
  ['Atacadão Timbira Ltda', '4711-3/01', 'Comércio varejista — hipermercados', 'SUPERMERCADO_ATACAREJO', 'Caxias', 'MA', '99'],
]

/** POST /api/v1/outbound/trigger-prospecting — mines new ICP prospects. */
export async function triggerProspecting(
  params: { states?: AllowedState[]; segments?: Segment[]; source?: 'CNAE' | 'GOOGLE_PLACES'; limit?: number } = {},
  onStep?: OnStep,
): Promise<OutboundProspect[]> {
  await withProgress(
    [
      { label: params.source === 'GOOGLE_PLACES' ? 'Google Places API · buscando empresas por categoria' : 'Receita Federal · minerando CNPJs por CNAE', ms: 1000 },
      { label: 'Enriquecendo contatos (telefone, e-mail, porte)', ms: 900 },
      { label: 'Calculando score de fit ICP', ms: 600 },
      { label: 'Agendando sequência (Resend e-mail + template WhatsApp)', ms: 600 },
    ],
    onStep,
  )
  maybeFail('trigger-prospecting')
  const existing = new Set(useAutomationStore.getState().prospects.map((p) => p.razaoSocial))
  const pool = PROSPECT_POOL.filter(
    (p) => !existing.has(p[0]) && (!params.states?.length || params.states.includes(p[5])) && (!params.segments?.length || params.segments.includes(p[3])),
  )
  const t = nowISO()
  const items: OutboundProspect[] = pool.slice(0, params.limit ?? 5).map((p) => {
    const n = () => Math.floor(Math.random() * 10)
    const slug = p[0].split(' ').slice(0, 2).join('').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
    return {
      id: uid('pr'),
      cnpj: `${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}/0001-${n()}${n()}`,
      razaoSocial: p[0],
      nomeFantasia: p[0].replace(/ Ltda$/, ''),
      cnae: p[1],
      cnaeDescription: p[2],
      segment: p[3],
      city: p[4],
      state: p[5],
      phoneE164: `+55${p[6]}9${80000000 + Math.floor(Math.random() * 19999999)}`,
      email: `contato@${slug}.com.br`,
      source: params.source ?? 'CNAE',
      employeesRange: ['20–49', '50–99', '100–249'][Math.floor(Math.random() * 3)],
      googleRating: params.source === 'GOOGLE_PLACES' ? Math.round((3.8 + Math.random()) * 10) / 10 : null,
      fitScore: 70 + Math.floor(Math.random() * 28),
      sequenceStep: 0,
      sequenceTotal: 4,
      status: 'PENDING',
      lastTouchChannel: null,
      lastContactedAt: null,
      nextTouchAt: addMinutes(t, 60 * 24),
      leadId: null,
      createdAt: t,
    }
  })
  useAutomationStore.getState().addProspects(items)
  return items
}

/** Sends the next outbound touch (EMAIL via Resend or WHATSAPP utility template). */
export async function sendOutboundTouch(prospectId: string, channel: 'EMAIL' | 'WHATSAPP'): Promise<OutboundProspect> {
  await delay(500, 1300)
  maybeFail('outbound-touch')
  const p = useAutomationStore.getState().prospects.find((x) => x.id === prospectId)
  if (!p) throw new ApiError('Prospect não encontrado', 'NOT_FOUND', 404)
  const t = nowISO()
  const patch: Partial<OutboundProspect> = {
    sequenceStep: Math.min(p.sequenceTotal, p.sequenceStep + 1),
    status: channel === 'EMAIL' ? 'SENT_EMAIL' : 'SENT_WA',
    lastTouchChannel: channel,
    lastContactedAt: t,
    nextTouchAt: p.sequenceStep + 1 < p.sequenceTotal ? addMinutes(t, 3 * 24 * 60) : null,
  }
  useAutomationStore.getState().updateProspect(prospectId, patch)
  return { ...p, ...patch }
}

/** Converts a prospect that replied into a lead (enters the SDR state machine). */
export async function convertProspectToLead(prospectId: string): Promise<Lead> {
  await delay(500, 1100)
  maybeFail('convert-prospect')
  const p = useAutomationStore.getState().prospects.find((x) => x.id === prospectId)
  if (!p) throw new ApiError('Prospect não encontrado', 'NOT_FOUND', 404)
  const lead = useLeadStore.getState().createLead({
    name: `Contato ${p.nomeFantasia}`,
    companyName: p.nomeFantasia,
    cnpj: p.cnpj,
    isB2B: true,
    segment: p.segment,
    locationCity: p.city,
    locationState: p.state,
    phoneE164: p.phoneE164,
    email: p.email,
    originTag: p.source === 'CNAE' ? 'Outbound_CNAE' : 'Outbound_Places',
    prospectId: p.id,
    channel: 'WHATSAPP',
    attributionChannel: 'OUTBOUND',
    attribution: { utmSource: p.source === 'CNAE' ? 'resend' : 'whatsapp_template', utmMedium: 'outbound', utmCampaign: 'prospeccao_icp_pa_ma_ap' },
  })
  useAutomationStore.getState().updateProspect(prospectId, { status: 'CONVERTED', leadId: lead.id })
  return lead
}

// ───────────────────────── Conversations / CRM ─────────────────────────

/** POST /api/v1/conversations/:id/messages — human agent reply (records SLA). */
export async function sendHumanReply(conversationId: string, text: string): Promise<Message> {
  await delay(400, 1000)
  maybeFail('send-message')
  const msg = useLeadStore.getState().addMessage(conversationId, { senderType: 'HUMAN_AGENT', text })
  setTimeout(() => {
    useLeadStore.setState((s) => ({ messages: s.messages.map((m) => (m.id === msg.id ? { ...m, status: 'DELIVERED' } : m)) }))
  }, 900)
  setTimeout(() => {
    useLeadStore.setState((s) => ({ messages: s.messages.map((m) => (m.id === msg.id ? { ...m, status: 'READ' } : m)) }))
  }, 3500)
  return msg
}

/** POST /api/v1/conversations/:id/toggle-ai */
export async function toggleAi(conversationId: string, paused: boolean): Promise<void> {
  await delay(300, 800)
  maybeFail('toggle-ai')
  useLeadStore.getState().toggleAiPaused(conversationId, paused)
}

/** PATCH /api/v1/leads/:id — stage move with close-out payload. */
export async function patchLeadStage(leadId: string, stage: KanbanStage, payload?: MoveStagePayload): Promise<Lead> {
  await delay(300, 900)
  maybeFail('patch-lead')
  useLeadStore.getState().moveLeadStage(leadId, stage, payload)
  return useLeadStore.getState().leads.find((l) => l.id === leadId)!
}

/** PATCH /api/v1/leads/:id — field updates (notes, values, technical profile). */
export async function patchLead(leadId: string, patch: Partial<Lead>): Promise<Lead> {
  await delay(300, 800)
  maybeFail('patch-lead')
  useLeadStore.getState().updateLeadFields(leadId, patch)
  return useLeadStore.getState().leads.find((l) => l.id === leadId)!
}

// ───────────────────────── Instagram ─────────────────────────

/** Simulates an inbound IG comment webhook → intent filter → public reply + DM. */
export async function simulateIgComment(input: { mediaTag: string; mediaCaption?: string; username: string; text: string }): Promise<IgCommentEvent> {
  await delay(900, 2000)
  maybeFail('ig-webhook')
  const { aiSettings } = useTenantStore.getState().tenant
  const lower = input.text.toLowerCase()
  const kw = aiSettings.igTriggerKeywords.find((k) => lower.includes(k)) ?? null
  const spam = /seguidores|link na bio|ganhe|promo/i.test(input.text)
  const commercial = !!kw && !spam
  const ev: IgCommentEvent = {
    id: uid('ig'),
    mediaId: String(18040000000000000 + Math.floor(Math.random() * 9999999999)),
    mediaTag: input.mediaTag,
    mediaCaption: input.mediaCaption ?? '',
    username: input.username.startsWith('@') ? input.username : `@${input.username}`,
    commentText: input.text,
    classification: spam ? 'SPAM' : commercial ? 'COMMERCIAL_INQUIRY' : /top|show|lind|parab|👏|🔥/i.test(input.text) ? 'ELOGIO' : 'OUTRO',
    matchedKeyword: kw,
    publicReply: commercial ? aiSettings.publicReplyVariations[Math.floor(Math.random() * aiSettings.publicReplyVariations.length)] : null,
    dmSent: commercial,
    dmText: commercial ? `Oi! Vi seu comentário no post (${input.mediaTag}). Para eu te indicar a configuração certa: qual o tamanho da área e em qual cidade?` : null,
    leadId: null,
    latencyMs: commercial ? 2400 + Math.round(Math.random() * 1800) : null,
    createdAt: nowISO(),
  }
  useAutomationStore.getState().addIgEvent(ev)
  if (commercial)
    useNotificationStore.getState().pushNotification({
      type: 'IG_COMMENT',
      title: `Comentário com intenção: ${ev.username}`,
      body: `“${input.text}” — resposta pública + Direct enviados em ${formatMs(ev.latencyMs)}.`,
      href: '/automacao',
    })
  return ev
}

// ───────────────────────── Tenant settings ─────────────────────────

export async function updateTenantSettings(patch: Partial<Tenant>): Promise<Tenant> {
  await delay(400, 1000)
  maybeFail('tenant-settings')
  useTenantStore.getState().updateTenant(patch)
  return useTenantStore.getState().tenant
}

/** Tests an integration connection; PENDING ones become CONNECTED. */
export async function testIntegration(key: IntegrationKey): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  await delay(700, 1600)
  maybeFail('integration-test')
  const latencyMs = 120 + Math.round(Math.random() * 380)
  useTenantStore.getState().updateIntegration(key, { status: 'CONNECTED', lastSyncAt: nowISO(), detail: undefined })
  return { ok: true, latencyMs, message: `Conexão OK em ${latencyMs} ms` }
}

// ───────────────────────── Reports ─────────────────────────

/** Builds a pt-BR CSV (semicolon-separated) with the pilot KPIs. */
export async function exportPilotReportCsv(): Promise<string> {
  await delay(500, 1200)
  maybeFail('export-report')
  const { leads, conversations, attributions, messages } = useLeadStore.getState()
  const k = computeKpis({
    leads,
    conversations,
    attributions,
    messages,
    campaigns: useCampaignStore.getState().campaigns,
    spendEntries: useAutomationStore.getState().adSpendEntries,
    tenant: useTenantStore.getState().tenant,
  })
  const rows: [string, string][] = [
    ['Relatório', `Piloto Maquinabel — gerado em ${formatDate(nowISO())}`],
    ['Dia do piloto', `${k.stopLoss.dayOfPilot} de ${k.stopLoss.totalDays}`],
    ['Investimento em mídia', formatBRL(k.totalSpend)],
    ['Leads totais', String(k.totalLeads)],
    ['Leads pagos', String(k.paidLeads)],
    ['CPL', formatBRL(k.cpl)],
    ['SQLs', `${k.sqlCount} / ${k.stopLoss.target}`],
    ['Custo por SQL', formatBRL(k.costPerSql)],
    ['Pipeline aberto', formatBRL(k.pipelineBRL)],
    ['Receita fechada', formatBRL(k.closedBRL)],
    ['ROAS', k.roas ? `${k.roas.toFixed(1)}x` : '—'],
    ['Mediana resposta IA', formatMs(k.medianAiResponseMs)],
    ['Mediana SLA humano', formatMinutes(k.medianHumanSlaMin)],
    ['Cobertura de rastreamento', formatPercent(k.trackingCoverage)],
  ]
  const origin = k.byOrigin.map((o) => [o.label, o.leads, o.sqls, formatBRL(o.spend), formatBRL(o.wonBRL)].join(';'))
  return [...rows.map((r) => r.join(';')), '', 'Origem;Leads;SQLs;Investimento;Receita', ...origin].join('\n')
}

/** Default blueprint config from tenant + active catalog. */
export function defaultBlueprintConfig(): BlueprintConfig {
  const t = useTenantStore.getState().tenant
  return {
    platforms: ['GOOGLE', 'META'],
    themes: ['LOCACAO', 'COMPRA', 'PECAS', 'ROBOTICA', 'META_CTWA', 'META_REELS'],
    monthlyBudgetBRL: t.monthlyAdBudgetBRL,
    allowedStates: t.allowedStates,
    businessHours: t.businessHours ?? BUSINESS_SCHEDULE,
    machineIds: useCatalogStore.getState().machines.filter((m) => m.active).map((m) => m.id),
  }
}
