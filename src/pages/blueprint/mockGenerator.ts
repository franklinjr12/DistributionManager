/**
 * Local enrichment layer on top of the shared `buildBlueprint` mock:
 * themed ad groups with keyword clusters, richer RSA copy, negatives, Meta creatives,
 * Google/Meta budget split, "regenerate" variations, validation and the deploy mutation log.
 */
import type {
  AdGroup,
  AllowedState,
  BlueprintCampaign,
  BlueprintTheme,
  CampaignBlueprint,
  Keyword,
  KeywordMatchType,
  Machine,
  MetaCreative,
} from '@/types/domain'
import { uid } from '@/lib/utils'
import { formatBRL } from '@/lib/format'

export const HEADLINE_MAX = 30
export const DESCRIPTION_MAX = 90
export const META_HEADLINE_MAX = 40
/** seg–sex only → ~22 dias úteis/mês */
export const WORKDAYS_PER_MONTH = 22

export interface WizardConfig {
  allowedStates: AllowedState[]
  days: number[]
  start: string
  end: string
  monthlyBudgetBRL: number
  /** 0..1 share of the monthly budget for Google */
  googleShare: number
  themes: BlueprintTheme[]
  machineIds: string[]
  google: boolean
  meta: boolean
  notes: string
}

export const OBJECTIVES: { theme: BlueprintTheme; label: string; description: string; platform: 'GOOGLE' | 'META' }[] = [
  { theme: 'LOCACAO', label: 'Locação', description: 'Lavadoras e varredeiras para alugar (LTV ~R$ 84 mil)', platform: 'GOOGLE' },
  { theme: 'COMPRA', label: 'Compra', description: 'Equipamentos de alto ticket, Brava elegível BNDES', platform: 'GOOGLE' },
  { theme: 'PECAS', label: 'Peças/Manutenção', description: 'Base instalada Alfa Tennant na região', platform: 'GOOGLE' },
  { theme: 'ROBOTICA', label: 'Robótica Autônoma', description: 'T16AMR para CDs e atacarejos', platform: 'GOOGLE' },
  { theme: 'META_CTWA', label: 'Click-to-WhatsApp', description: 'Vídeos de máquina → conversa com SDR IA', platform: 'META' },
  { theme: 'META_REELS', label: 'Instagram Reels/Direct', description: 'Reels + automação Comment-to-DM', platform: 'META' },
]

// ───────────────────────── Keyword clusters (themed ad groups) ─────────────────────────

type Cluster = { name: string; keywords: [string, KeywordMatchType][]; extraHeadlines: string[] }

const CLUSTERS: Partial<Record<BlueprintTheme, Cluster[]>> = {
  LOCACAO: [
    {
      name: 'Locação · Lavadoras de Piso',
      keywords: [
        ['aluguel lavadora industrial', 'PHRASE'],
        ['locação lavadora de piso', 'PHRASE'],
        ['aluguel lavadora brava', 'EXACT'],
        ['alugar lavadora de piso a bateria', 'PHRASE'],
        ['aluguel maquina de lavar piso', 'BROAD'],
      ],
      extraHeadlines: ['Locação de Lavadoras Industriais', 'Aluguel de Lavadora no PA e MA'],
    },
    {
      name: 'Locação · Varredeiras',
      keywords: [
        ['aluguel varredeira industrial', 'PHRASE'],
        ['locação varredeira s16', 'EXACT'],
        ['alugar varredeira para galpão', 'BROAD'],
        ['varredeira industrial aluguel mensal', 'PHRASE'],
      ],
      extraHeadlines: ['Varredeira S16 para Locação', 'Aluguel de Varredeira em CDs'],
    },
    {
      name: 'Locação · Regional PA/MA/AP',
      keywords: [
        ['aluguel lavadora de piso belém', 'PHRASE'],
        ['locação máquina limpeza são luís', 'PHRASE'],
        ['aluguel lavadora macapá', 'PHRASE'],
        ['locação lavadora ananindeua', 'EXACT'],
      ],
      extraHeadlines: ['Locação em Belém e Ananindeua', 'Entrega em São Luís e Macapá'],
    },
  ],
  COMPRA: [
    {
      name: 'Compra · Varredeiras Industriais',
      keywords: [
        ['varredeira industrial tennant', 'EXACT'],
        ['comprar varredeira industrial', 'PHRASE'],
        ['varredeira a bateria s16', 'PHRASE'],
        ['varredeira para galpão', 'BROAD'],
      ],
      extraHeadlines: ['Varredeira Industrial Tennant', 'S16: Varrição a Bateria'],
    },
    {
      name: 'Compra · Lavadoras de Piso',
      keywords: [
        ['lavadora de piso industrial', 'PHRASE'],
        ['comprar lavadora brava', 'EXACT'],
        ['lavadora de piso bndes', 'PHRASE'],
        ['lavadora piso operada a bordo', 'PHRASE'],
      ],
      extraHeadlines: ['Brava com Financiamento BNDES', 'Lavadora de Piso a Bordo'],
    },
  ],
  PECAS: [
    {
      name: 'Peças · Originais Tennant',
      keywords: [
        ['peças lavadora tennant', 'PHRASE'],
        ['borracha rodo lavadora', 'PHRASE'],
        ['escova lavadora de piso', 'PHRASE'],
        ['bateria lavadora tennant', 'EXACT'],
      ],
      extraHeadlines: ['Peças Originais em Estoque', 'Rodos e Escovas Tennant'],
    },
    {
      name: 'Peças · Assistência Técnica',
      keywords: [
        ['manutenção lavadora de piso', 'PHRASE'],
        ['assistência técnica tennant belém', 'EXACT'],
        ['conserto varredeira industrial', 'PHRASE'],
      ],
      extraHeadlines: ['Assistência Técnica no Pará', 'Técnico em Campo no PA/MA'],
    },
  ],
  ROBOTICA: [
    {
      name: 'Robótica · T16AMR Autônoma',
      keywords: [
        ['robô de limpeza autônomo', 'PHRASE'],
        ['robô lavadora de piso', 'PHRASE'],
        ['tennant t16amr', 'EXACT'],
        ['lavadora autônoma industrial', 'BROAD'],
        ['limpeza robotizada centro de distribuição', 'BROAD'],
      ],
      extraHeadlines: ['Robô de Limpeza Autônomo', 'T16AMR: Limpa Sem Operador'],
    },
  ],
}

/** Extra variations used by "Regenerar" (all ≤ 30 chars). */
const HEADLINE_VARIATIONS: Partial<Record<BlueprintTheme, string[]>> = {
  LOCACAO: [
    'Lavadora de Piso por Mês',
    'Locação Sem Burocracia',
    'Frota Alfa Tennant Pronta',
    'Troca de Máquina Inclusa',
    'Locação com Manutenção',
    'Contrato Flexível de Locação',
    'Limpeza de Galpão Sem Compra',
    'Máquina Entregue em 48h',
    'Suporte Técnico na Locação',
    'Aluguel Diário ou Mensal',
  ],
  COMPRA: [
    'Lavadoras Tennant Oficiais',
    'Orçamento em 1 Dia Útil',
    'Financie pelo BNDES',
    'Demonstração Gratuita',
    'Máquinas Novas c/ Garantia',
    'Alto Rendimento por m²',
    'Economia de Água ec-H2O™',
    'Concessionária no Norte',
  ],
  PECAS: [
    'Peças a Pronta Entrega',
    'Revisão Preventiva Tennant',
    'Sua Máquina Rodando Hoje',
    'Kit Rodo e Escova Original',
    'Contrato de Manutenção',
    'Técnicos Certificados',
  ],
  ROBOTICA: [
    'Robô Lavadora Tennant',
    'Limpeza Autônoma 24h',
    'Turno da Noite Sem Equipe',
    'Navegação BrainOS®',
    'Robô para Atacarejos',
    'Veja o T16AMR em Ação',
  ],
}

const DESCRIPTION_VARIATIONS: Partial<Record<BlueprintTheme, string[]>> = {
  LOCACAO: [
    'Lavadoras e varredeiras Alfa Tennant com manutenção inclusa. Atendemos PA, MA e AP.',
    'Precisa limpar galpão, CD ou supermercado? Alugue a máquina certa sem imobilizar capital.',
  ],
  COMPRA: [
    'Equipamentos novos com garantia de concessionária e peças originais na região Norte.',
    'Fale com um consultor técnico e receba o dimensionamento ideal para o seu piso.',
  ],
  PECAS: ['Estoque de peças originais em Ananindeua-PA. Envio para São Luís e Macapá.'],
  ROBOTICA: ['Robótica de limpeza para grandes áreas: menos dependência de mão de obra.'],
}

export const BASE_NEGATIVES = [
  'grátis',
  'usado',
  'doméstico',
  'residencial',
  'karcher',
  'mercado livre',
  'shopee',
  'emprego',
  'vaga',
  'curso',
  'manual pdf',
  'lavadora de roupa',
]
const THEME_NEGATIVES: Partial<Record<BlueprintTheme, string[]>> = {
  LOCACAO: ['lava jato', 'aluguel de casa'],
  COMPRA: ['barata', 'olx'],
  PECAS: ['peça paralela', 'esquema elétrico'],
  ROBOTICA: ['robô aspirador', 'roomba', 'brinquedo'],
}

// ───────────────────────── Helpers ─────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const kw = (text: string, matchType: KeywordMatchType): Keyword => ({ id: uid('kw'), text, matchType, impressions: 0, clicks: 0 })

function headlinesFor(theme: BlueprintTheme, base: string[], extra: string[], randomize = false): string[] {
  const pool = randomize ? shuffle([...base, ...(HEADLINE_VARIATIONS[theme] ?? [])]) : base
  const out: string[] = []
  for (const h of [...extra, ...pool]) {
    if (out.length >= 15) break
    if (!out.includes(h)) out.push(h)
  }
  return out
}

function descriptionsFor(theme: BlueprintTheme, base: string[], randomize = false): string[] {
  if (!randomize) return base.slice(0, 4)
  return shuffle([...base, ...(DESCRIPTION_VARIATIONS[theme] ?? [])]).slice(0, 4)
}

function buildAdGroups(c: BlueprintCampaign, randomize = false): AdGroup[] {
  const clusters = CLUSTERS[c.theme]
  const template = c.adGroups[0]
  if (!clusters || !template) return c.adGroups
  return clusters.map((cl, i) => ({
    id: uid('ag'),
    name: cl.name,
    keywords: cl.keywords.map(([t, m]) => kw(t, m)),
    // Only the first ad group keeps the AI's "long" headline so the validator has something to flag.
    headlines: headlinesFor(c.theme, template.headlines, randomize ? cl.extraHeadlines.filter((h) => h.length <= HEADLINE_MAX) : i === 0 ? cl.extraHeadlines : cl.extraHeadlines.slice(1), randomize),
    descriptions: descriptionsFor(c.theme, template.descriptions, randomize),
    finalUrl: template.finalUrl,
  }))
}

const META_INTERESTS: Record<string, string[]> = {
  META_CTWA: ['Gestão de facilities', 'Logística e armazenagem', 'Supermercados', 'Indústria', 'Limpeza profissional'],
  META_REELS: ['Facilities', 'Atacarejo', 'Engenharia de produção', 'Empreendedorismo', 'Administração predial'],
}

const CTWA_TEXTS = [
  (m: Machine) => `${m.model} limpando até ${m.productivityLabel.split('(')[0].replace('Até ', '').trim()} — veja operando e fale com um especialista pelo WhatsApp.`,
  (m: Machine) => `Galpão, CD ou supermercado? A ${m.model} resolve. Dimensionamento gratuito em minutos no WhatsApp.`,
  (m: Machine) => `${m.model} Alfa Tennant para locação ou compra no PA, MA e AP. Chame no WhatsApp e receba a indicação ideal.`,
]
const REELS_TEXTS = [
  (m: Machine) => `Antes x depois com a ${m.model} 🔥 Comente "QUERO" e receba os detalhes no Direct.`,
  (m: Machine) => `30 segundos de ${m.model} em ação. Comente "LIMPEZA" que te chamamos no Direct.`,
  (m: Machine) => `Quanto tempo sua equipe leva para limpar 2.000 m²? A ${m.model} mostra. Comente "INFO".`,
]

function buildCreatives(c: BlueprintCampaign, machines: Machine[], variant = 0): MetaCreative[] {
  const isReels = c.theme === 'META_REELS'
  const ids = c.theme === 'META_CTWA' ? ['m_brava', 'm_s16', 'm_a260'] : ['m_s16', 'm_brava', 'm_t16amr']
  // `machines` = catalog seed selected in step 1
  const list = ids.map((id) => machines.find((m) => m.id === id)).filter((m): m is Machine => !!m)
  const texts = isReels ? REELS_TEXTS : CTWA_TEXTS
  return list.map((m, i) => ({
    id: uid('cr'),
    name: `${isReels ? 'Reels' : i === 0 ? 'Vídeo' : 'Carrossel'} · ${m.model}`,
    format: isReels ? 'REELS' : i === 0 ? 'VIDEO' : 'CARROSSEL',
    primaryText: texts[(i + variant) % texts.length](m),
    headline: isReels ? `${m.model} em ação` : `${m.model} · Fale com Especialista`,
    cta: isReels ? 'SEND_MESSAGE' : 'WHATSAPP_MESSAGE',
    machineId: m.id,
    impressions: 0,
    clicks: 0,
  }))
}

/** Re-split daily budgets so Google/Meta respect the configured share, keeping relative weights. */
export function applyBudgetSplit(campaigns: BlueprintCampaign[], monthlyBRL: number, googleShare: number): BlueprintCampaign[] {
  const daily = monthlyBRL / WORKDAYS_PER_MONTH
  const out = campaigns.map((c) => ({ ...c }))
  for (const platform of ['GOOGLE', 'META'] as const) {
    const list = out.filter((c) => c.platform === platform)
    const w = list.reduce((a, c) => a + c.dailyBudgetBRL, 0) || 1
    const platformDaily = daily * (platform === 'GOOGLE' ? googleShare : 1 - googleShare)
    const hasOther = out.some((c) => c.platform !== platform)
    const target = hasOther ? platformDaily : daily
    list.forEach((c) => {
      c.dailyBudgetBRL = Math.max(1, Math.round(((c.dailyBudgetBRL / w) * target) * 2) / 2)
      c.estimatedClicksMonth = Math.round((c.dailyBudgetBRL * WORKDAYS_PER_MONTH) / (platform === 'GOOGLE' ? 3.4 : 1.1))
      c.estimatedLeadsMonth = Math.max(1, Math.round(c.estimatedClicksMonth * (platform === 'GOOGLE' ? 0.07 : 0.05)))
    })
  }
  return out
}

export function enrichBlueprint(bp: CampaignBlueprint, cfg: WizardConfig, machines: Machine[]): CampaignBlueprint {
  const campaigns = bp.campaigns.map((c) => enrichCampaign(c, machines))
  const split = applyBudgetSplit(campaigns, cfg.monthlyBudgetBRL, cfg.googleShare)
  const assets = countAssets(split)
  return {
    ...bp,
    campaigns: split,
    tokensIn: 2140 + split.length * 180,
    tokensOut: 980 + assets * 2,
    costUsd: Number((((2140 + split.length * 180) * 0.15 + (980 + assets * 2) * 0.6) / 1_000_000).toFixed(4)),
  }
}

function enrichCampaign(c: BlueprintCampaign, machines: Machine[]): BlueprintCampaign {
  if (c.platform === 'GOOGLE') {
    return {
      ...c,
      adGroups: buildAdGroups(c),
      negatives: Array.from(new Set([...BASE_NEGATIVES, ...(THEME_NEGATIVES[c.theme] ?? [])])),
    }
  }
  return {
    ...c,
    trackingTemplate: c.trackingTemplate,
    meta: c.meta
      ? {
          ...c.meta,
          interests: META_INTERESTS[c.theme] ?? c.meta.interests,
          creatives: buildCreatives(c, machines),
        }
      : c.meta,
  }
}

/** "Regenerar": new copy/keyword variations for one campaign (keeps budget/include flags). */
export function regenerateCampaign(c: BlueprintCampaign, machines: Machine[]): BlueprintCampaign {
  if (c.platform === 'GOOGLE') {
    const fresh = buildAdGroups(c, true)
    return {
      ...c,
      adGroups: fresh.map((g, i) => ({
        ...g,
        // keep user's keyword edits if any, but shuffle order for a "new" feel
        keywords: shuffle(c.adGroups[i]?.keywords.length ? c.adGroups[i].keywords : g.keywords),
      })),
    }
  }
  return {
    ...c,
    meta: c.meta ? { ...c.meta, creatives: buildCreatives(c, machines, 1 + Math.floor(Math.random() * 2)), interests: shuffle(c.meta.interests) } : c.meta,
  }
}

// ───────────────────────── Counting / validation ─────────────────────────

export function countAssets(campaigns: BlueprintCampaign[]): number {
  return campaigns
    .filter((c) => c.included)
    .reduce(
      (a, c) =>
        a +
        c.adGroups.reduce((s, g) => s + g.headlines.length + g.descriptions.length + g.keywords.length, 0) +
        c.negatives.length +
        (c.meta?.creatives.length ?? 0),
      0,
    )
}

export interface ValidationIssue {
  id: string
  level: 'error' | 'warning' | 'info'
  message: string
  campaignId?: string
  /** auto-fix available */
  fix?: () => void
}

export function validate(
  bp: CampaignBlueprint,
  monthlyBRL: number,
  fixers: { fixHeadline: (cid: string, gid: string, idx: number, value: string) => void },
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const included = bp.campaigns.filter((c) => c.included)
  if (!included.length) issues.push({ id: 'none', level: 'error', message: 'Nenhuma campanha selecionada para implantação.' })
  for (const c of included) {
    c.adGroups.forEach((g) => {
      g.headlines.forEach((h, i) => {
        if (h.length > HEADLINE_MAX)
          issues.push({
            id: `h-${g.id}-${i}`,
            level: 'error',
            campaignId: c.tempId,
            message: `Título "${h}" tem ${h.length} caracteres (máx. ${HEADLINE_MAX}) · ${g.name}`,
            fix: () => fixers.fixHeadline(c.tempId, g.id, i, shortenHeadline(h)),
          })
        if (!h.trim()) issues.push({ id: `he-${g.id}-${i}`, level: 'error', campaignId: c.tempId, message: `Título #${i + 1} vazio · ${g.name}` })
      })
      g.descriptions.forEach((d, i) => {
        if (d.length > DESCRIPTION_MAX)
          issues.push({ id: `d-${g.id}-${i}`, level: 'error', campaignId: c.tempId, message: `Descrição #${i + 1} com ${d.length} caracteres (máx. ${DESCRIPTION_MAX}) · ${g.name}` })
      })
      const dupes = g.headlines.filter((h, i) => h.trim() && g.headlines.indexOf(h) !== i)
      if (dupes.length) issues.push({ id: `dup-${g.id}`, level: 'warning', campaignId: c.tempId, message: `Títulos duplicados em ${g.name}: ${dupes.join(', ')}` })
      if (g.headlines.length < 3) issues.push({ id: `hc-${g.id}`, level: 'error', campaignId: c.tempId, message: `RSA precisa de ao menos 3 títulos · ${g.name}` })
      else if (g.headlines.length < 15) issues.push({ id: `hc-${g.id}`, level: 'info', campaignId: c.tempId, message: `${g.name}: ${g.headlines.length}/15 títulos (recomendado 15 para Ad Strength "Excelente")` })
      if (!g.keywords.length) issues.push({ id: `kw-${g.id}`, level: 'error', campaignId: c.tempId, message: `Grupo sem palavras-chave · ${g.name}` })
    })
    if (c.platform === 'META') {
      c.meta?.creatives.forEach((cr) => {
        if (cr.headline.length > META_HEADLINE_MAX)
          issues.push({ id: `mh-${cr.id}`, level: 'warning', campaignId: c.tempId, message: `Título do criativo "${cr.name}" acima de ${META_HEADLINE_MAX} caracteres (pode ser truncado)` })
      })
      if (!c.meta?.creatives.length) issues.push({ id: `mc-${c.tempId}`, level: 'error', campaignId: c.tempId, message: `${c.name}: nenhum criativo` })
    }
    if (c.dailyBudgetBRL < 3) issues.push({ id: `b-${c.tempId}`, level: 'warning', campaignId: c.tempId, message: `${c.name}: orçamento diário abaixo de R$ 3,00 limita a entrega` })
  }
  const monthly = included.reduce((a, c) => a + c.dailyBudgetBRL, 0) * WORKDAYS_PER_MONTH
  if (monthly > monthlyBRL * 1.02)
    issues.push({ id: 'budget-over', level: 'warning', message: `Soma dos orçamentos (${formatBRL(monthly)}/mês) excede o orçamento mensal de ${formatBRL(monthlyBRL)}.` })
  else if (included.length && monthly < monthlyBRL * 0.9)
    issues.push({ id: 'budget-under', level: 'info', message: `Orçamento projetado ${formatBRL(monthly)}/mês — ${formatBRL(monthlyBRL - monthly)} abaixo do teto mensal.` })
  return issues
}

function shortenHeadline(h: string): string {
  const map: Record<string, string> = { 'Locação de Lavadoras Industriais': 'Locação de Lavadoras' }
  if (map[h]) return map[h]
  if (h.length <= HEADLINE_MAX) return h
  const words = h.split(' ')
  let out = ''
  for (const w of words) {
    if ((out ? out + ' ' + w : w).length > HEADLINE_MAX) break
    out = out ? out + ' ' + w : w
  }
  return out || h.slice(0, HEADLINE_MAX)
}

// ───────────────────────── Generation log ─────────────────────────

export function generationSteps(cfg: WizardConfig, machineCount: number) {
  const states = cfg.allowedStates.join('/') || '—'
  return [
    { label: `Lendo catálogo Alfa Tennant (${machineCount} máquinas)…`, ms: 750 },
    { label: `Aplicando geofencing ${states}…`, ms: 650 },
    { label: 'Chamando gpt-4o-mini · Structured Outputs (json_schema)…', ms: 1100 },
    { label: 'Gerando 15 headlines RSA…', ms: 900 },
    { label: 'Clusterizando palavras-chave…', ms: 800 },
    { label: 'Gerando lista de negativas…', ms: 600 },
    { label: 'Injetando UTM/gclid/fbclid…', ms: 550 },
    { label: 'Validando JSON contra schema Zod ✓', ms: 500 },
  ]
}

// ───────────────────────── Deploy mutation log ─────────────────────────

export interface DeployLine {
  id: string
  platform: 'GOOGLE' | 'META'
  service: string
  detail: string
  result: string
  campaignTempId: string
}

const rnd = (digits: number) => String(Math.floor(10 ** (digits - 1) + Math.random() * 9 * 10 ** (digits - 1)))

export function buildDeployLines(
  campaigns: BlueprintCampaign[],
  googleCustomerId: string,
  metaAdAccountId: string,
): { lines: DeployLine[]; externalIds: Record<string, string> } {
  const cust = googleCustomerId.replace(/-/g, '')
  const lines: DeployLine[] = []
  const externalIds: Record<string, string> = {}
  for (const c of campaigns.filter((x) => x.included)) {
    const states = c.targetStates.join(', ')
    const push = (service: string, detail: string, result: string) =>
      lines.push({ id: uid('dl'), platform: c.platform, service, detail, result, campaignTempId: c.tempId })
    if (c.platform === 'GOOGLE') {
      const cid = `2189${rnd(7)}`
      externalIds[c.tempId] = cid
      const kwCount = c.adGroups.reduce((a, g) => a + g.keywords.length, 0)
      push('CampaignBudgetService', `Orçamento ${formatBRL(c.dailyBudgetBRL, { decimals: 2 })}/dia · ${c.name}`, `customers/${cust}/campaignBudgets/${rnd(11)}`)
      push('CampaignService', `SEARCH · status=PAUSED · ${c.name}`, `customers/${cust}/campaigns/${cid}`)
      push(
        'CampaignCriterionService',
        `geo ${states} + ad_schedule seg–sex ${c.schedule.start}–${c.schedule.end} (${c.targetStates.length + c.schedule.days.length} critérios)`,
        `${c.targetStates.length + c.schedule.days.length} critérios`,
      )
      push('AdGroupService', `${c.adGroups.length} grupos: ${c.adGroups.map((g) => g.name.split('·').pop()?.trim()).join(', ')}`, `adGroups/${rnd(11)}…`)
      push('AdGroupCriterionService', `${kwCount} palavras-chave + ${c.negatives.length} negativas`, `${kwCount + c.negatives.length} criteria`)
      push('AdGroupAdService', `${c.adGroups.length} RSA (15 títulos / 4 descrições) · PAUSED`, `adGroupAds/${rnd(11)}…`)
    } else {
      const cid = `120214558${rnd(8)}`
      externalIds[c.tempId] = cid
      const creatives = c.meta?.creatives.length ?? 0
      const acc = `/${metaAdAccountId}`
      push(`POST ${acc}/campaigns`, `${c.type === 'CLICK_TO_WHATSAPP' ? 'OUTCOME_ENGAGEMENT · MESSAGES' : 'OUTCOME_ENGAGEMENT'} · status=PAUSED · ${c.name}`, `id ${cid}`)
      push(`POST ${acc}/adsets`, `geo ${states} · ${c.meta?.placements.length ?? 0} posicionamentos · ${formatBRL(c.dailyBudgetBRL, { decimals: 2 })}/dia`, `id 120214558${rnd(8)}`)
      push(`POST ${acc}/adimages`, `${creatives} mídias (vídeo/carrossel)`, `hash ${Math.random().toString(16).slice(2, 10)}…`)
      push(`POST ${acc}/adcreatives`, `${creatives} criativos · CTA ${c.type === 'CLICK_TO_WHATSAPP' ? 'WHATSAPP_MESSAGE' : 'SEND_MESSAGE'} · UTM + fbclid`, `${creatives} creative_id`)
      push(`POST ${acc}/ads`, `${creatives} anúncios · status=PAUSED`, `id 120214558${rnd(8)}…`)
    }
  }
  return { lines, externalIds }
}
