import type {
  AdCampaign,
  AdGroup,
  AdSchedule,
  AdSpendEntry,
  CampaignMetrics,
  DailyMetric,
  Keyword,
  KeywordMatchType,
  MetaSettings,
} from '@/types/domain'
import { belem, belemDay, belemWeekday, hashString, seededRandom } from '@/lib/utils'
import { TENANT_ID } from './tenant'
import { seedAttributions, seedLeads } from './leads'

export const BUSINESS_SCHEDULE: AdSchedule = { days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00', timezone: 'America/Belem' }

export const GOOGLE_TRACKING_TEMPLATE =
  '{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}&gclid={gclid}'
export const META_TRACKING_TEMPLATE =
  'utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&fbclid={{fbclid}}'

let kwSeq = 0
const kw = (text: string, matchType: KeywordMatchType = 'PHRASE'): Keyword => ({
  id: `kw_${++kwSeq}`,
  text,
  matchType,
  impressions: 0,
  clicks: 0,
})

const emptyMetrics = (): CampaignMetrics => ({
  impressions: 0,
  clicks: 0,
  ctr: 0,
  spend: 0,
  leads: 0,
  sqls: 0,
  wonBRL: 0,
  trackingCoverage: 1,
})

// ───────────────────────── Ad copy ─────────────────────────

const H_LOCACAO = [
  'Aluguel de Lavadora de Piso',
  'Locação Alfa Tennant no PA',
  'Lavadora Brava para Locação',
  'Varredeira S16 para Alugar',
  'Atendemos PA, MA e AP',
  'Máquinas Revisadas e Limpas',
  'Locação de 1 Dia a 1+ Ano',
  'Orçamento pelo WhatsApp',
  'Concessionária Alfa Tennant',
  'Dimensionamento Gratuito',
  'Lavadoras para Galpões e CDs',
  'Assistência Técnica Própria',
  'Matriz em Ananindeua-PA',
  'Filial em São Luís-MA',
  'Fale com um Consultor Agora',
]
const D_LOCACAO = [
  'Locação de lavadoras e varredeiras Alfa Tennant para empresas no PA, MA e AP.',
  'Máquinas revisadas e higienizadas antes da entrega. Contratos de 1 dia a mais de 1 ano.',
  'Nosso consultor técnico indica a máquina certa para o seu m² em minutos. Chame agora.',
  'Brava, S16, A260 e mais. Assistência autorizada com matriz em Ananindeua-PA.',
]

const H_COMPRA = [
  'Varredeiras Industriais',
  'Compre da Concessionária',
  'Robô T16AMR Tennant',
  'Lavadora Autônoma BrainOS®',
  'Varredeira S16 a Bateria',
  'Brava Elegível ao BNDES',
  'Alfa Tennant no Pará',
  'Atendimento em PA, MA e AP',
  'Até 13.490 m²/h de Varrição',
  'Peça Seu Orçamento Oficial',
  'Consultor Técnico 24h',
  'Lavadoras de Piso Industrial',
  'Demonstração no Seu Piso',
  'Garantia e Peças Originais',
  'Fabricada no Brasil (Brava)',
]
const D_COMPRA = [
  'Varredeiras e lavadoras Tennant e Alfa para CDs, indústrias e atacarejos no Norte.',
  'T16AMR: lavadora autônoma até 5.890 m²/h que resolve a falta de mão de obra na limpeza.',
  'Dimensionamento técnico grátis em minutos pelo WhatsApp. Orçamento oficial pelo comercial.',
  'Concessionária autorizada Alfa Tennant com assistência técnica própria no PA, MA e AP.',
]

const H_PECAS = [
  'Peças Originais Tennant',
  'Manutenção Alfa Tennant',
  'Assistência Técnica Autorizada',
  'Borracha de Rodo A260',
  'Escovas e Pads Originais',
  'Manutenção Preventiva',
  'Técnicos em PA, MA e AP',
  'Conserto de Lavadora de Piso',
  'Peças para Brava e S16',
  'Atendimento em Campo',
  'Revisão Completa da Máquina',
  'Agende pelo WhatsApp',
  'Desde 2008 no Norte',
  'Diagnóstico Rápido',
  'Concessionária Oficial',
]
const D_PECAS = [
  'Peças originais e manutenção autorizada Alfa Tennant em Belém, São Luís e Macapá.',
  'Preventiva e corretiva em campo para lavadoras, varredeiras e robôs. Agende pelo WhatsApp.',
  'Rodos, escovas, baterias e filtros originais com garantia de concessionária.',
  'Equipe técnica própria: sua máquina parada pelo menor tempo possível.',
]

const H_ROBO = [
  'Robô de Limpeza Industrial',
  'Tennant T16AMR',
  'Lavadora Autônoma BrainOS®',
  'Até 5.890 m²/h Sem Operador',
  'Falta de Mão de Obra?',
  'Limpeza 24h com Robótica',
  'Robô para CDs e Atacarejos',
  'Demonstração em Vídeo',
  'Concessionária Alfa Tennant',
  'Atendimento PA, MA e AP',
  'Até 5,5 h de Autonomia',
  'Tecnologia ec-H2O™',
  'Relatórios de Limpeza',
  'Fale com um Especialista',
  'Robótica Aplicada à Limpeza',
]
const D_ROBO = [
  'T16AMR: lavadora autônoma com navegação BrainOS® para grandes CDs e atacarejos.',
  'Aprende a rota uma vez e repete sozinha. Até 5.890 m²/h com cabeçote de 910 mm.',
  'Resolva a falta de operadores de limpeza no turno da noite. Fale com nosso consultor.',
  'Implantação e assistência técnica locais no Pará, Maranhão e Amapá.',
]

const ACCOUNT_NEGATIVES = ['residencial', 'doméstica', 'casa', 'karcher k2', 'mercado livre', 'shopee', 'usada barata', 'emprego', 'vaga', 'curso', 'manual pdf', 'brinquedo']

/** Reusable RSA copy (15 headlines ≤30 chars / 4 descriptions ≤90 chars) per theme. */
export const AD_COPY = {
  LOCACAO: { headlines: H_LOCACAO, descriptions: D_LOCACAO },
  COMPRA: { headlines: H_COMPRA, descriptions: D_COMPRA },
  PECAS: { headlines: H_PECAS, descriptions: D_PECAS },
  ROBOTICA: { headlines: H_ROBO, descriptions: D_ROBO },
}
export { ACCOUNT_NEGATIVES }

function adGroup(id: string, name: string, keywords: Keyword[], headlines: string[], descriptions: string[], finalUrl: string): AdGroup {
  return { id, name, keywords, headlines, descriptions, finalUrl }
}

// ───────────────────────── Campaign definitions ─────────────────────────

interface Def {
  base: Omit<AdCampaign, 'metrics' | 'daily' | 'tenantId' | 'lastSyncedAt'>
  /** active ranges for metric generation (inclusive yyyy-MM-dd) */
  activeFrom: string | null
  activeTo: string | null
  cpc: [number, number]
  ctr: [number, number]
}

const metaBase = (creatives: MetaSettings['creatives'], interests: string[], placements: string[]): MetaSettings => ({
  placements,
  ageMin: 25,
  ageMax: 60,
  interests,
  creatives,
  whatsappNumber: '+5591993801020',
})

const DEFS: Def[] = [
  {
    base: {
      id: 'c_g_locacao',
      platform: 'GOOGLE',
      type: 'SEARCH',
      name: 'Search · Locação Lavadoras & Varredeiras',
      objective: 'Leads de locação (WhatsApp / site)',
      targetModality: 'LOCACAO',
      status: 'ENABLED',
      externalId: '21893340571',
      targetStates: ['PA', 'MA', 'AP'],
      dailyBudgetBRL: 14,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: GOOGLE_TRACKING_TEMPLATE,
      finalUrl: 'https://vendas.maquinabel.com.br/locacao',
      adGroups: [
        adGroup(
          'ag_loc_lav',
          'Locação · Lavadoras de piso',
          [
            kw('aluguel lavadora de piso', 'PHRASE'),
            kw('locação lavadora de piso industrial', 'PHRASE'),
            kw('aluguel lavadora de piso industrial belem', 'EXACT'),
            kw('alugar lavadora piso sao luis', 'PHRASE'),
            kw('locação lavadora brava', 'EXACT'),
            kw('aluguel maquina de lavar piso galpao', 'BROAD'),
          ],
          H_LOCACAO,
          D_LOCACAO,
          'https://vendas.maquinabel.com.br/locacao',
        ),
        adGroup(
          'ag_loc_var',
          'Locação · Varredeiras',
          [kw('aluguel varredeira industrial', 'PHRASE'), kw('locação varredeira s16', 'EXACT'), kw('alugar varredeira patio', 'PHRASE'), kw('aluguel extratora de carpete', 'PHRASE')],
          H_LOCACAO,
          D_LOCACAO,
          'https://vendas.maquinabel.com.br/locacao',
        ),
      ],
      negatives: [...ACCOUNT_NEGATIVES, 'lavadora de roupa', 'lava jato'],
      meta: null,
      machineIds: ['m_brava', 'm_s16', 'm_a260', 'm_ext52'],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_pilot_001',
      createdAt: belem('2026-10-12', '08:00'),
      statusChangedAt: belem('2026-10-12', '08:05'),
    },
    activeFrom: '2026-10-12',
    activeTo: null,
    cpc: [2.6, 3.9],
    ctr: [0.055, 0.085],
  },
  {
    base: {
      id: 'c_g_compra',
      platform: 'GOOGLE',
      type: 'SEARCH',
      name: 'Search · Compra Varredeiras & Robótica T16AMR',
      objective: 'Leads de compra de alto ticket',
      targetModality: 'COMPRA',
      status: 'ENABLED',
      externalId: '21893340588',
      targetStates: ['PA', 'MA', 'AP'],
      dailyBudgetBRL: 10,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: GOOGLE_TRACKING_TEMPLATE,
      finalUrl: 'https://vendas.maquinabel.com.br/compra',
      adGroups: [
        adGroup(
          'ag_cmp_var',
          'Compra · Varredeiras',
          [kw('varredeira industrial', 'PHRASE'), kw('varredeira industrial tennant', 'EXACT'), kw('comprar varredeira a bateria', 'PHRASE'), kw('varredeira s16 tennant', 'EXACT')],
          H_COMPRA,
          D_COMPRA,
          'https://vendas.maquinabel.com.br/compra',
        ),
        adGroup(
          'ag_cmp_lav',
          'Compra · Lavadoras',
          [
            kw('lavadora de piso industrial', 'PHRASE'),
            kw('lavadora de piso para clinica', 'PHRASE'),
            kw('lavadora de piso industria alimenticia', 'PHRASE'),
            kw('lavadora alta pressao profissional', 'PHRASE'),
            kw('lavadora de piso porcelanato', 'BROAD'),
          ],
          H_COMPRA,
          D_COMPRA,
          'https://vendas.maquinabel.com.br/compra',
        ),
        adGroup(
          'ag_cmp_robo',
          'Compra · T16AMR',
          [kw('t16amr', 'EXACT'), kw('lavadora autonoma tennant', 'PHRASE')],
          H_COMPRA,
          D_COMPRA,
          'https://vendas.maquinabel.com.br/robotica-t16amr',
        ),
      ],
      negatives: [...ACCOUNT_NEGATIVES, 'aluguel', 'locação'],
      meta: null,
      machineIds: ['m_s16', 'm_t16amr', 'm_brava', 'm_a260', 'm_imop_lite', 'm_alfa_pressure_400'],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_pilot_001',
      createdAt: belem('2026-10-12', '08:00'),
      statusChangedAt: belem('2026-10-12', '08:05'),
    },
    activeFrom: '2026-10-12',
    activeTo: null,
    cpc: [3.1, 4.6],
    ctr: [0.045, 0.07],
  },
  {
    base: {
      id: 'c_g_pecas',
      platform: 'GOOGLE',
      type: 'SEARCH',
      name: 'Search · Peças & Manutenção',
      objective: 'Ordens de serviço e venda de peças',
      targetModality: 'MANUTENCAO_PECAS',
      status: 'ENABLED',
      externalId: '21893340602',
      targetStates: ['PA', 'MA', 'AP'],
      dailyBudgetBRL: 4,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: GOOGLE_TRACKING_TEMPLATE,
      finalUrl: 'https://maquinabel.com.br/manutencao/',
      adGroups: [
        adGroup(
          'ag_pec_pecas',
          'Peças originais',
          [kw('peças lavadora tennant', 'PHRASE'), kw('borracha rodo lavadora a260', 'EXACT'), kw('escova lavadora de piso', 'PHRASE')],
          H_PECAS,
          D_PECAS,
          'https://maquinabel.com.br/manutencao/',
        ),
        adGroup(
          'ag_pec_manut',
          'Manutenção',
          [kw('manutenção lavadora de piso', 'PHRASE'), kw('assistencia tecnica tennant belem', 'EXACT'), kw('conserto varredeira industrial', 'PHRASE')],
          H_PECAS,
          D_PECAS,
          'https://maquinabel.com.br/manutencao/',
        ),
      ],
      negatives: [...ACCOUNT_NEGATIVES, 'lava louça', 'maquina de lavar roupa'],
      meta: null,
      machineIds: ['m_a260', 'm_brava', 'm_s16'],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_pilot_001',
      createdAt: belem('2026-10-12', '08:00'),
      statusChangedAt: belem('2026-10-12', '08:05'),
    },
    activeFrom: '2026-10-12',
    activeTo: null,
    cpc: [1.4, 2.4],
    ctr: [0.06, 0.1],
  },
  {
    base: {
      id: 'c_g_robotica',
      platform: 'GOOGLE',
      type: 'SEARCH',
      name: 'Search · Robótica Autônoma',
      objective: 'Leads de robótica (T16AMR)',
      targetModality: 'COMPRA',
      status: 'PAUSED',
      externalId: '21893340619',
      targetStates: ['PA', 'MA', 'AP'],
      dailyBudgetBRL: 6,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: GOOGLE_TRACKING_TEMPLATE,
      finalUrl: 'https://vendas.maquinabel.com.br/robotica-t16amr',
      adGroups: [
        adGroup(
          'ag_rob',
          'Robótica · T16AMR',
          [kw('robo lavadora de piso autonomo', 'PHRASE'), kw('robo de limpeza industrial', 'PHRASE'), kw('lavadora autonoma', 'BROAD'), kw('tennant t16amr preço', 'PHRASE')],
          H_ROBO,
          D_ROBO,
          'https://vendas.maquinabel.com.br/robotica-t16amr',
        ),
      ],
      negatives: [...ACCOUNT_NEGATIVES, 'robo aspirador', 'roomba', 'xiaomi'],
      meta: null,
      machineIds: ['m_t16amr'],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_pilot_001',
      createdAt: belem('2026-10-12', '08:00'),
      statusChangedAt: belem('2026-11-05', '17:20'),
    },
    activeFrom: '2026-10-12',
    activeTo: '2026-11-05',
    cpc: [3.8, 5.6],
    ctr: [0.03, 0.05],
  },
  {
    base: {
      id: 'c_m_ctwa',
      platform: 'META',
      type: 'CLICK_TO_WHATSAPP',
      name: 'Meta · Click-to-WhatsApp Brava & S16',
      objective: 'Conversas no WhatsApp (MESSAGES)',
      targetModality: null,
      status: 'ENABLED',
      externalId: '120214558830040712',
      targetStates: ['PA', 'MA', 'AP'],
      dailyBudgetBRL: 10,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: META_TRACKING_TEMPLATE,
      finalUrl: 'https://wa.me/5591993801020',
      adGroups: [],
      negatives: [],
      meta: metaBase(
        [
          {
            id: 'cr_ctwa_1',
            name: 'Vídeo · Brava no supermercado',
            format: 'VIDEO',
            primaryText: 'Sua equipe lava 3.000 m² em 1h30 com a Brava. Lavadora a bordo fabricada no Brasil, elegível BNDES. Fale com nosso consultor técnico no WhatsApp.',
            headline: 'Brava · Lavadora a bordo',
            cta: 'WHATSAPP_MESSAGE',
            machineId: 'm_brava',
            impressions: 0,
            clicks: 0,
          },
          {
            id: 'cr_ctwa_2',
            name: 'Carrossel · Brava + S16 para CDs',
            format: 'CARROSSEL',
            primaryText: 'Varre e lava seu galpão sem vassoura: S16 recolhe a poeira, Brava lava o piso. Dimensionamento gratuito pelo WhatsApp.',
            headline: 'Galpão limpo em 2 passos',
            cta: 'WHATSAPP_MESSAGE',
            machineId: 'm_s16',
            impressions: 0,
            clicks: 0,
          },
        ],
        ['Gestão de facilities', 'Logística', 'Supermercados', 'Indústria', 'Administração de empresas'],
        ['facebook_feed', 'instagram_feed', 'instagram_reels', 'instagram_stories'],
      ),
      machineIds: ['m_brava', 'm_s16'],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_pilot_001',
      createdAt: belem('2026-10-12', '08:00'),
      statusChangedAt: belem('2026-10-12', '08:06'),
    },
    activeFrom: '2026-10-12',
    activeTo: null,
    cpc: [0.9, 1.6],
    ctr: [0.011, 0.019],
  },
  {
    base: {
      id: 'c_m_reels',
      platform: 'META',
      type: 'IG_REELS_DIRECT',
      name: 'Meta · Instagram Reels & Direct (S16 / Brava)',
      objective: 'Engajamento → Direct (Comment-to-DM)',
      targetModality: null,
      status: 'ENABLED',
      externalId: '120214558830041190',
      targetStates: ['PA', 'MA', 'AP'],
      dailyBudgetBRL: 7,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: META_TRACKING_TEMPLATE,
      finalUrl: 'https://instagram.com/maquinabel',
      adGroups: [],
      negatives: [],
      meta: metaBase(
        [
          {
            id: 'cr_reels_1',
            name: 'Reels · S16 varrendo pátio logístico',
            format: 'REELS',
            primaryText: '13 mil m²/h de varrição com controle de pó. Comente "ALUGAR" que te mandamos a ficha técnica no Direct.',
            headline: 'Tennant S16',
            cta: 'SEND_MESSAGE',
            machineId: 'm_s16',
            impressions: 0,
            clicks: 0,
          },
          {
            id: 'cr_reels_2',
            name: 'Reels · Brava em shopping',
            format: 'REELS',
            primaryText: 'Passa em portas de 70 cm e elevadores. Comente "PREÇO" e receba as opções no Direct.',
            headline: 'Alfa Brava',
            cta: 'SEND_MESSAGE',
            machineId: 'm_brava',
            impressions: 0,
            clicks: 0,
          },
        ],
        ['Logística', 'Shopping centers', 'Limpeza profissional', 'Engenharia de manutenção'],
        ['instagram_reels', 'instagram_explore'],
      ),
      machineIds: ['m_s16', 'm_brava'],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_pilot_001',
      createdAt: belem('2026-10-19', '09:00'),
      statusChangedAt: belem('2026-10-19', '09:10'),
    },
    activeFrom: '2026-10-19',
    activeTo: null,
    cpc: [0.5, 1.0],
    ctr: [0.014, 0.024],
  },
  {
    base: {
      id: 'c_m_remarketing',
      platform: 'META',
      type: 'REMARKETING',
      name: 'Meta · Remarketing Site → WhatsApp',
      objective: 'Reengajar visitantes do site (30 dias)',
      targetModality: null,
      status: 'PAUSED',
      externalId: '120214558830042233',
      targetStates: ['PA', 'MA', 'AP'],
      dailyBudgetBRL: 3,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: META_TRACKING_TEMPLATE,
      finalUrl: 'https://wa.me/5591993801020',
      adGroups: [],
      negatives: [],
      meta: metaBase(
        [
          {
            id: 'cr_rmk_1',
            name: 'Imagem · Ainda procurando a máquina certa?',
            format: 'IMAGEM',
            primaryText: 'Ainda em dúvida sobre qual máquina serve para o seu espaço? Nosso consultor técnico dimensiona em minutos pelo WhatsApp.',
            headline: 'Dimensionamento gratuito',
            cta: 'WHATSAPP_MESSAGE',
            machineId: null,
            impressions: 0,
            clicks: 0,
          },
        ],
        ['Público personalizado: visitantes do site 30d'],
        ['facebook_feed', 'instagram_feed', 'instagram_stories'],
      ),
      machineIds: [],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_pilot_001',
      createdAt: belem('2026-10-12', '08:00'),
      statusChangedAt: belem('2026-10-12', '08:00'),
    },
    activeFrom: null,
    activeTo: null,
    cpc: [0.8, 1.4],
    ctr: [0.01, 0.016],
  },
  {
    base: {
      id: 'c_m_leadads',
      platform: 'META',
      type: 'LEAD_ADS',
      name: 'Meta · Lead Ads Prestadoras de Limpeza',
      objective: 'Formulário instantâneo (prestadoras B2B)',
      targetModality: 'LOCACAO',
      status: 'PAUSED',
      externalId: '120214558830049915',
      targetStates: ['PA', 'MA'],
      dailyBudgetBRL: 5,
      schedule: BUSINESS_SCHEDULE,
      trackingTemplate: META_TRACKING_TEMPLATE,
      finalUrl: 'https://vendas.maquinabel.com.br/locacao',
      adGroups: [],
      negatives: [],
      meta: metaBase(
        [
          {
            id: 'cr_lead_1',
            name: 'Imagem · Frota de locação para contratos',
            format: 'IMAGEM',
            primaryText: 'Ganhou um contrato novo? Alugue lavadoras e varredeiras Alfa Tennant por contrato, com manutenção inclusa.',
            headline: 'Locação para prestadoras',
            cta: 'SIGN_UP',
            machineId: 'm_a260',
            impressions: 0,
            clicks: 0,
          },
        ],
        ['Prestadoras de serviços de limpeza', 'Facilities', 'Terceirização'],
        ['facebook_feed', 'instagram_feed'],
      ),
      machineIds: ['m_a260', 'm_imop_lite', 'm_alfa_bizz'],
      createdBy: 'AI_BLUEPRINT',
      blueprintId: 'bp_2026_11_18',
      createdAt: belem('2026-11-18', '16:42'),
      statusChangedAt: belem('2026-11-18', '16:42'),
    },
    activeFrom: null,
    activeTo: null,
    cpc: [1, 1.8],
    ctr: [0.01, 0.015],
  },
]

// ───────────────────────── Metric generation ─────────────────────────

const SERIES_START = '2026-10-12'
const SERIES_END = '2026-11-20'

function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  let d = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 86_400_000)
  }
  return out
}

function distribute<T extends { impressions: number; clicks: number }>(items: T[], impressions: number, clicks: number, seed: number) {
  if (!items.length) return
  const rnd = seededRandom(seed)
  const w = items.map(() => 0.3 + rnd())
  const tw = w.reduce((a, b) => a + b, 0)
  items.forEach((it, i) => {
    it.impressions = Math.round((impressions * w[i]) / tw)
    it.clicks = Math.round((clicks * w[i]) / tw)
  })
}

function build(def: Def): AdCampaign {
  const rnd = seededRandom(hashString(def.base.id))
  const leads = seedLeads.filter((l) => l.campaignId === def.base.id)
  const daily: DailyMetric[] = []
  for (const day of daysBetween(SERIES_START, SERIES_END)) {
    const wd = belemWeekday(`${day}T12:00:00-03:00`)
    const active = def.activeFrom && day >= def.activeFrom && (!def.activeTo || day <= def.activeTo) && wd >= 1 && wd <= 5
    let spend = 0
    let clicks = 0
    let impressions = 0
    if (active) {
      const partial = day === SERIES_END ? 0.25 : 1
      // ramp-up in the first week of the pilot
      const ramp = day < '2026-10-17' ? 0.75 : 1
      spend = Math.round(def.base.dailyBudgetBRL * (0.82 + rnd() * 0.22) * partial * ramp * 100) / 100
      const cpc = def.cpc[0] + rnd() * (def.cpc[1] - def.cpc[0])
      clicks = Math.max(0, Math.round(spend / cpc))
      const ctr = def.ctr[0] + rnd() * (def.ctr[1] - def.ctr[0])
      impressions = Math.round(clicks / ctr)
    }
    const dayLeads = leads.filter((l) => belemDay(l.createdAt) === day).length
    const daySqls = leads.filter((l) => l.sqlAt && belemDay(l.sqlAt) === day).length
    if (def.activeFrom && day >= def.activeFrom) daily.push({ date: day, impressions, clicks, spend, leads: dayLeads, sqls: daySqls })
  }
  const sum = (k: keyof Omit<DailyMetric, 'date'>) => daily.reduce((a, d) => a + d[k], 0)
  const attrs = seedAttributions.filter((a) => leads.some((l) => l.id === a.leadId))
  const tracked = attrs.filter((a) => a.gclid || a.fbclid || a.igMediaId).length
  const metrics: CampaignMetrics = def.activeFrom
    ? {
        impressions: sum('impressions'),
        clicks: sum('clicks'),
        ctr: sum('impressions') ? sum('clicks') / sum('impressions') : 0,
        spend: Math.round(sum('spend') * 100) / 100,
        leads: leads.length,
        sqls: leads.filter((l) => l.sqlAt).length,
        wonBRL: leads.filter((l) => l.kanbanStage === 'WON').reduce((a, l) => a + (l.closedValueBRL ?? 0), 0),
        trackingCoverage: attrs.length ? tracked / attrs.length : 1,
      }
    : emptyMetrics()

  const campaign: AdCampaign = {
    ...def.base,
    tenantId: TENANT_ID,
    metrics,
    daily,
    lastSyncedAt: belem('2026-11-20', '10:15'),
  }
  for (const [i, g] of campaign.adGroups.entries()) {
    const share = 1 / campaign.adGroups.length
    distribute(g.keywords, Math.round(metrics.impressions * share), Math.round(metrics.clicks * share), hashString(g.id) + i)
  }
  if (campaign.meta) distribute(campaign.meta.creatives, metrics.impressions, metrics.clicks, hashString(campaign.id))
  return campaign
}

export const seedCampaigns: AdCampaign[] = DEFS.map(build)

// ───────────────────────── Monthly ad spend entries ─────────────────────────

export const seedAdSpendEntries: AdSpendEntry[] = []
for (const c of seedCampaigns) {
  const byMonth = new Map<string, number>()
  for (const d of c.daily) {
    const m = `${d.date.slice(0, 7)}-01`
    byMonth.set(m, (byMonth.get(m) ?? 0) + d.spend)
  }
  for (const [month, spend] of byMonth) {
    if (spend <= 0) continue
    seedAdSpendEntries.push({
      id: `sp_${c.id}_${month.slice(0, 7)}`,
      monthStart: month,
      channel: c.platform === 'GOOGLE' ? 'GOOGLE_ADS' : 'META_ADS',
      campaignId: c.id,
      campaignName: c.name,
      spendBRL: Math.round(spend * 100) / 100,
      source: 'API_SYNC',
      notes: month === '2026-11-01' ? 'Parcial até 20/11 (sincronizado às 10:15)' : null,
    })
  }
}
