import type {
  IgCommentEvent,
  NegativeKeyword,
  Notification,
  OfflineConversionEvent,
  OptimizationLog,
  OptimizationRun,
  OutboundProspect,
  ProspectStatus,
  SearchTermClass,
  Segment,
  AllowedState,
} from '@/types/domain'
import { addMinutes, addSeconds, belem, fakeSha256, hashString, seededRandom } from '@/lib/utils'
import { seedAttributions, seedLeads } from './leads'
import { seedCampaigns } from './campaigns'

// ───────────────────────── Weekly search-term optimizer ─────────────────────────

type TermSeed = [term: string, campaignId: string, cls: SearchTermClass, negative: string | null, reason: string, review?: boolean]

const RUNS: { id: string; date: string; analyzed: number; terms: TermSeed[] }[] = [
  {
    id: 'run_2026_10_19',
    date: belem('2026-10-19', '06:00'),
    analyzed: 64,
    terms: [
      ['lavadora de alta pressão residencial karcher', 'c_g_compra', 'RESIDENCIAL', 'residencial karcher', 'Intenção doméstica: lavadora residencial de marca de varejo.'],
      ['varredeira industrial tennant', 'c_g_compra', 'ICP_B2B', null, 'Termo de marca + "industrial": alta intenção B2B, alinhado ao catálogo.'],
      ['aluguel lavadora de roupa', 'c_g_locacao', 'IRRELEVANTE', 'lavadora de roupa', 'Eletrodoméstico de lavanderia, fora do catálogo.'],
      ['lavadora de piso mercado livre', 'c_g_compra', 'VAREJO', 'mercado livre', 'Busca por marketplace de varejo focada em preço baixo.'],
      ['vaga operador de lavadora de piso belem', 'c_g_locacao', 'EMPREGO', 'vaga operador', 'Busca de emprego, sem intenção de compra.'],
      ['locação lavadora de piso industrial ananindeua', 'c_g_locacao', 'ICP_B2B', null, 'Locação industrial dentro da área de cobertura (PA).'],
      ['mop giratório', 'c_g_compra', 'VAREJO', 'mop giratório', 'Utensílio doméstico de baixo ticket.'],
      ['robo aspirador xiaomi', 'c_g_robotica', 'VAREJO', 'robo aspirador', 'Robô doméstico — não é robótica industrial.'],
      ['manutenção lavadora tennant', 'c_g_pecas', 'ICP_B2B', null, 'Cliente com equipamento Tennant buscando assistência.'],
      ['lava jato aluguel maquina', 'c_g_locacao', 'IRRELEVANTE', null, 'Ambíguo: lava-jato pode ser cliente da Alfa Pressure 400. Mantido para revisão manual.', true],
    ],
  },
  {
    id: 'run_2026_10_26',
    date: belem('2026-10-26', '06:00'),
    analyzed: 58,
    terms: [
      ['karcher k3 preço', 'c_g_compra', 'RESIDENCIAL', 'karcher k3', 'Modelo doméstico de lavadora de alta pressão.'],
      ['varredeira de calçada manual casa', 'c_g_compra', 'RESIDENCIAL', 'calçada casa', 'Uso residencial.'],
      ['lavadora de piso usada olx', 'c_g_compra', 'VAREJO', 'olx', 'Marketplace de usados, ticket baixo.'],
      ['aluguel varredeira industrial belem', 'c_g_locacao', 'ICP_B2B', null, 'Locação industrial em Belém — ICP.'],
      ['curso operador de empilhadeira', 'c_g_locacao', 'EMPREGO', 'curso operador', 'Busca por curso/capacitação.'],
      ['lavadora de piso a bateria tennant t300', 'c_g_compra', 'CONCORRENTE', null, 'Modelo Tennant fora do catálogo Maquinabel: manter e monitorar conversão.', true],
      ['nilfisk lavadora de piso', 'c_g_compra', 'CONCORRENTE', 'nilfisk', 'Marca concorrente com baixa taxa de conversão no período.'],
      ['t16amr preço', 'c_g_robotica', 'ICP_B2B', null, 'Interesse direto no robô T16AMR.'],
    ],
  },
  {
    id: 'run_2026_11_02',
    date: belem('2026-11-02', '06:00'),
    analyzed: 51,
    terms: [
      ['lavadora de piso para casa', 'c_g_compra', 'RESIDENCIAL', 'para casa', 'Uso residencial explícito.'],
      ['aspirador de pó industrial barato', 'c_g_compra', 'VAREJO', 'barato', 'Foco em preço baixo, perfil varejo.'],
      ['manual lavadora a260 pdf', 'c_g_pecas', 'IRRELEVANTE', 'pdf', 'Busca informacional por documento.'],
      ['borracha rodo lavadora a260', 'c_g_pecas', 'ICP_B2B', null, 'Peça original de máquina do catálogo — ICP.'],
      ['lavadora de piso para clinica', 'c_g_compra', 'ICP_B2B', null, 'Segmento saúde, gerou SQL (Clínica Vida Plena).'],
      ['enceradeira residencial', 'c_g_compra', 'RESIDENCIAL', 'enceradeira residencial', 'Equipamento doméstico.'],
      ['varredeira de brinquedo', 'c_g_compra', 'VAREJO', 'varredeira de brinquedo', 'Brinquedo infantil.'],
    ],
  },
  {
    id: 'run_2026_11_09',
    date: belem('2026-11-09', '06:00'),
    analyzed: 47,
    terms: [
      ['lavadora de piso shopee', 'c_g_compra', 'VAREJO', 'shopee', 'Marketplace de varejo.'],
      ['aluguel de lavadora para lavar tapete em casa', 'c_g_locacao', 'RESIDENCIAL', 'tapete em casa', 'Uso residencial.'],
      ['emprego auxiliar de limpeza ananindeua', 'c_g_locacao', 'EMPREGO', 'auxiliar de limpeza', 'Busca de emprego.'],
      ['maquina para limpar oleo do chao fabrica', 'c_g_compra', 'ICP_B2B', null, 'Indústria com graxa/óleo — perfil T600e.'],
      ['locação lavadora shopping', 'c_g_locacao', 'ICP_B2B', null, 'Segmento shopping — ICP.'],
      ['lavadora alta pressão wap', 'c_g_compra', 'RESIDENCIAL', 'wap', 'Marca de lavadoras domésticas.'],
    ],
  },
  {
    id: 'run_2026_11_16',
    date: belem('2026-11-16', '06:00'),
    analyzed: 55,
    terms: [
      ['lavadora de alta pressao residencial karcher k5', 'c_g_compra', 'RESIDENCIAL', 'karcher k5', 'Modelo doméstico de alta pressão.'],
      ['limpador de piso elétrico casa', 'c_g_compra', 'RESIDENCIAL', 'piso elétrico casa', 'Uso residencial.'],
      ['lavadora de piso industrial preço manaus', 'c_g_compra', 'IRRELEVANTE', 'manaus', 'Cidade fora da cobertura PA/MA/AP.'],
      ['varredeira industrial tennant s16', 'c_g_compra', 'ICP_B2B', null, 'Modelo do catálogo + intenção industrial.'],
      ['aluguel lavadora brava sao luis', 'c_g_locacao', 'ICP_B2B', null, 'Locação Brava na filial São Luís — ICP.'],
      ['lavadora de piso 110v pequena para apartamento', 'c_g_compra', 'RESIDENCIAL', 'apartamento', 'Uso residencial.'],
      ['vaga tecnico manutencao maquinas', 'c_g_pecas', 'EMPREGO', 'vaga técnico', 'Busca de emprego.'],
      ['lavadora de piso fortaleza', 'c_g_compra', 'IRRELEVANTE', 'fortaleza', 'Cidade fora da cobertura PA/MA/AP.'],
      ['mop a vapor', 'c_g_compra', 'VAREJO', 'mop a vapor', 'Utensílio doméstico.'],
      ['robô limpeza piso supermercado', 'c_g_compra', 'ICP_B2B', null, 'Supermercado com interesse em robótica — ICP.'],
    ],
  },
]

const campaignName = (id: string) => seedCampaigns.find((c) => c.id === id)?.name ?? id

export const seedOptimizationLogs: OptimizationLog[] = []
export const seedOptimizationRuns: OptimizationRun[] = []
export const seedNegativeKeywords: NegativeKeyword[] = []

for (const run of RUNS) {
  const rnd = seededRandom(hashString(run.id))
  let saved = 0
  run.terms.forEach(([term, cid, cls, neg, reason, review], i) => {
    const impressions = Math.round(8 + rnd() * 90)
    const clicks = cls === 'ICP_B2B' ? Math.round(2 + rnd() * 7) : Math.round(rnd() * 4)
    const cost = Math.round(clicks * (2.2 + rnd() * 2.4) * 100) / 100
    if (neg) saved += cost
    seedOptimizationLogs.push({
      id: `${run.id}_t${i + 1}`,
      runId: run.id,
      searchTerm: term,
      campaignId: cid,
      campaignName: campaignName(cid),
      impressions,
      clicks,
      cost,
      classification: cls,
      action: neg ? 'NEGATIVE_ADDED' : review ? 'REVIEW' : 'KEPT',
      reason,
      negativeKeyword: neg,
      createdAt: run.date,
    })
    if (neg)
      seedNegativeKeywords.push({
        id: `neg_${run.id.slice(4)}_${i + 1}`,
        text: neg,
        matchType: 'PHRASE',
        scope: 'ACCOUNT',
        campaignId: null,
        listName: 'Negativas IA · Otimizador semanal',
        source: 'AI_OPTIMIZER',
        runId: run.id,
        addedAt: addMinutes(run.date, 2),
      })
  })
  const added = run.terms.filter((t) => t[3]).length
  const kept = run.terms.filter((t) => !t[3]).length
  seedOptimizationRuns.push({
    id: run.id,
    runDate: run.date,
    provider: 'GOOGLE_ADS',
    actionType: 'NEGATIVE_KEYWORDS_PRUNING',
    termsAnalyzed: run.analyzed,
    negativesAdded: added,
    keptCount: kept,
    wastedSpendSavedBRL: Math.round(saved * 4 * 100) / 100,
    summaryText: `${run.analyzed} termos analisados via GoogleAdsService.SearchStream. ${added} negativas adicionadas (residencial/varejo/emprego/fora da região) e ${kept} termos B2B mantidos. Digest enviado ao Vinicius no WhatsApp.`,
    digestSentAt: addMinutes(run.date, 3),
    trigger: 'CRON',
  })
}
seedOptimizationRuns.reverse()

// Blueprint-level negatives (account list)
;['residencial', 'doméstica', 'casa', 'karcher k2', 'mercado livre', 'shopee', 'usada barata', 'emprego', 'vaga', 'curso', 'manual pdf', 'brinquedo'].forEach((t, i) =>
  seedNegativeKeywords.push({
    id: `neg_bp_${i + 1}`,
    text: t,
    matchType: 'BROAD',
    scope: 'ACCOUNT',
    campaignId: null,
    listName: 'Negativas base · Blueprint IA',
    source: 'BLUEPRINT',
    runId: null,
    addedAt: belem('2026-10-12', '08:00'),
  }),
)
seedNegativeKeywords.push(
  {
    id: 'neg_man_1',
    text: 'lava jato residencial',
    matchType: 'PHRASE',
    scope: 'CAMPAIGN',
    campaignId: 'c_g_locacao',
    listName: 'Manual · Vinicius',
    source: 'MANUAL',
    runId: null,
    addedAt: belem('2026-10-20', '18:12'),
  },
  {
    id: 'neg_man_2',
    text: 'robo aspirador',
    matchType: 'PHRASE',
    scope: 'CAMPAIGN',
    campaignId: 'c_g_robotica',
    listName: 'Manual · Vinicius',
    source: 'MANUAL',
    runId: null,
    addedAt: belem('2026-10-15', '12:40'),
  },
)

// ───────────────────────── Offline conversions (Google Ads API + Meta CAPI) ─────────────────────────

export const seedConversionEvents: OfflineConversionEvent[] = []
for (const lead of [...seedLeads].sort((a, b) => (a.sqlAt ?? '').localeCompare(b.sqlAt ?? ''))) {
  if (!lead.sqlAt) continue
  const attr = seedAttributions.find((a) => a.leadId === lead.id)
  const platform = lead.originTag.startsWith('Google') ? 'GOOGLE_ADS' : 'META_CAPI'
  const matchKey = {
    gclid: attr?.gclid ?? null,
    fbclid: attr?.fbclid ?? null,
    emailSha256: lead.email ? fakeSha256(lead.email) : null,
    phoneSha256: lead.phoneE164 ? fakeSha256(lead.phoneE164) : null,
  }
  const retried = lead.id === 'ld_009'
  seedConversionEvents.push({
    id: `oc_${lead.id.slice(3)}_sql`,
    leadId: lead.id,
    leadName: lead.name,
    event: 'SQL',
    platform,
    conversionAction: platform === 'GOOGLE_ADS' ? 'SQL - Lead Qualificado (offline)' : 'Lead (CAPI · QualifiedLead)',
    matchKey,
    status: 'SENT',
    responseCode: 200,
    responseMessage: platform === 'GOOGLE_ADS' ? 'UploadClickConversions OK · partial_failure_error: null' : '{"events_received":1,"messages":[],"fbtrace_id":"A' + hashString(lead.id).toString(36).toUpperCase() + '"}',
    valueBRL: 0,
    attempts: retried ? 2 : 1,
    createdAt: addSeconds(lead.sqlAt, 4),
    sentAt: addSeconds(lead.sqlAt, retried ? 95 : 21),
  })
  if (lead.kanbanStage === 'WON' && lead.closedAt) {
    const failed = lead.id === 'ld_003'
    seedConversionEvents.push({
      id: `oc_${lead.id.slice(3)}_won`,
      leadId: lead.id,
      leadName: lead.name,
      event: 'WON',
      platform,
      conversionAction: platform === 'GOOGLE_ADS' ? 'Venda Fechada (offline · valor BRL)' : 'Purchase (CAPI)',
      matchKey,
      status: failed ? 'FAILED' : 'SENT',
      responseCode: failed ? 504 : 200,
      responseMessage: failed ? 'DEADLINE_EXCEEDED: UploadClickConversions excedeu o tempo limite (3 tentativas). Reenvio manual disponível.' : 'UploadClickConversions OK · partial_failure_error: null',
      valueBRL: lead.closedValueBRL ?? 0,
      attempts: failed ? 3 : 1,
      createdAt: addSeconds(lead.closedAt, 5),
      sentAt: failed ? null : addSeconds(lead.closedAt, 26),
    })
  }
}
seedConversionEvents.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

// ───────────────────────── Outbound prospects (CNAE / Google Places) ─────────────────────────

type P = [
  razao: string,
  fantasia: string,
  cnae: string,
  cnaeDesc: string,
  segment: Segment,
  city: string,
  uf: AllowedState,
  source: 'CNAE' | 'GOOGLE_PLACES',
  employees: string,
  fit: number,
  step: number,
  status: ProspectStatus,
  lastTouch: 'EMAIL' | 'WHATSAPP' | null,
  lastAt: string | null,
  rating?: number,
]

const PROSPECTS: P[] = [
  ['Armazéns Guamá Logística Ltda', 'Armazéns Guamá', '5211-7/99', 'Depósitos de mercadorias para terceiros', 'CD_LOGISTICA', 'Belém', 'PA', 'CNAE', '50–99', 92, 2, 'SENT_EMAIL', 'EMAIL', belem('2026-11-18', '09:00')],
  ['Transportes Rio Capim Ltda', 'Rio Capim Transportes', '4930-2/02', 'Transporte rodoviário de carga intermunicipal', 'CD_LOGISTICA', 'Paragominas', 'PA', 'CNAE', '100–249', 84, 1, 'SENT_EMAIL', 'EMAIL', belem('2026-11-19', '09:00')],
  ['Supermercado Pague Bem Marabá Ltda', 'Pague Bem', '4711-3/02', 'Comércio varejista — supermercados', 'SUPERMERCADO_ATACAREJO', 'Marabá', 'PA', 'GOOGLE_PLACES', '50–99', 88, 2, 'SENT_WA', 'WHATSAPP', belem('2026-11-17', '10:00'), 4.4],
  ['Brilho Norte Facilities Ltda', 'Brilho Norte', '8121-4/00', 'Limpeza em prédios e em domicílios', 'PRESTADORA_LIMPEZA', 'Belém', 'PA', 'CNAE', '250–499', 95, 2, 'CONVERTED', 'EMAIL', belem('2026-11-16', '09:00')],
  ['Polpas Tropicais do Pará Ind. Ltda', 'Polpas Tropicais', '1031-7/00', 'Fabricação de conservas de frutas', 'ALIMENTOS_BEBIDAS', 'Castanhal', 'PA', 'CNAE', '100–249', 90, 3, 'SENT_WA', 'WHATSAPP', belem('2026-11-19', '14:00')],
  ['Frigorífico Mearim Alimentos S.A.', 'Frigomearim', '1011-2/01', 'Frigorífico — abate de bovinos', 'ALIMENTOS_BEBIDAS', 'Bacabal', 'MA', 'CNAE', '250–499', 86, 1, 'PENDING', null, null],
  ['Shopping Tocantins Center Ltda', 'Tocantins Center', '6822-6/00', 'Gestão e administração da propriedade imobiliária', 'SHOPPING', 'Imperatriz', 'MA', 'GOOGLE_PLACES', '20–49', 81, 2, 'REPLIED', 'EMAIL', belem('2026-11-19', '16:20'), 4.6],
  ['Atacadão Maranhense Distribuidora Ltda', 'Atacadão Maranhense', '4639-7/01', 'Comércio atacadista de produtos alimentícios em geral', 'SUPERMERCADO_ATACAREJO', 'São Luís', 'MA', 'CNAE', '250–499', 93, 1, 'SENT_EMAIL', 'EMAIL', belem('2026-11-20', '09:00')],
  ['Cervejaria Amazônica do Norte Ltda', 'Cervejaria Amazônica', '1113-5/02', 'Fabricação de cervejas e chopes', 'ALIMENTOS_BEBIDAS', 'Ananindeua', 'PA', 'CNAE', '50–99', 87, 2, 'SENT_WA', 'WHATSAPP', belem('2026-11-18', '11:00')],
  ['Hospital Regional Santa Luzia Ltda', 'Hospital Santa Luzia', '8610-1/01', 'Atividades de atendimento hospitalar', 'HOSPITAL_HOTEL_ESCOLA', 'Santarém', 'PA', 'CNAE', '250–499', 78, 1, 'SENT_EMAIL', 'EMAIL', belem('2026-11-19', '09:00')],
  ['Atacadão do Povo Comércio Ltda', 'Atacadão do Povo', '4711-3/01', 'Comércio varejista — hipermercados', 'SUPERMERCADO_ATACAREJO', 'Bacabal', 'MA', 'GOOGLE_PLACES', '50–99', 89, 1, 'CONVERTED', 'WHATSAPP', belem('2026-11-19', '15:00'), 4.3],
  ['Porto Santana Armazenagem Ltda', 'Porto Santana Log', '5211-7/99', 'Depósitos de mercadorias para terceiros', 'CD_LOGISTICA', 'Santana', 'AP', 'CNAE', '20–49', 83, 1, 'PENDING', null, null],
  ['Limpeza Total Macapá Serviços Ltda', 'Limpeza Total', '8121-4/00', 'Limpeza em prédios e em domicílios', 'PRESTADORA_LIMPEZA', 'Macapá', 'AP', 'GOOGLE_PLACES', '100–249', 85, 2, 'SENT_EMAIL', 'EMAIL', belem('2026-11-17', '09:00'), 4.1],
  ['Indústria de Palmito Marajó Ltda', 'Palmito Marajó', '1031-7/00', 'Fabricação de conservas de frutas', 'ALIMENTOS_BEBIDAS', 'Abaetetuba', 'PA', 'CNAE', '20–49', 72, 1, 'PENDING', null, null],
  ['Mix Mateense Supermercados Ltda', 'Mix Mateense', '4711-3/02', 'Comércio varejista — supermercados', 'SUPERMERCADO_ATACAREJO', 'Timon', 'MA', 'CNAE', '50–99', 64, 1, 'DISQUALIFIED', null, null],
  ['Hotel Fazenda Ilha Bela Ltda', 'Ilha Bela Resort', '5510-8/01', 'Hotéis', 'HOSPITAL_HOTEL_ESCOLA', 'Salinópolis', 'PA', 'GOOGLE_PLACES', '20–49', 70, 2, 'SENT_WA', 'WHATSAPP', belem('2026-11-16', '10:30'), 4.5],
  ['Metalúrgica Vale do Tocantins Ltda', 'MetalVale', '2512-8/00', 'Fabricação de esquadrias de metal', 'INDUSTRIA', 'Marabá', 'PA', 'CNAE', '100–249', 80, 3, 'REPLIED', 'WHATSAPP', belem('2026-11-18', '17:05')],
  ['Distribuidora Ilha do Amor Bebidas Ltda', 'Ilha do Amor Bebidas', '4635-4/02', 'Comércio atacadista de cerveja, chope e refrigerante', 'CD_LOGISTICA', 'São Luís', 'MA', 'CNAE', '100–249', 88, 2, 'SENT_EMAIL', 'EMAIL', belem('2026-11-18', '09:00')],
  ['Conservadora Amapaense Ltda', 'Conservadora Amapaense', '8121-4/00', 'Limpeza em prédios e em domicílios', 'PRESTADORA_LIMPEZA', 'Macapá', 'AP', 'CNAE', '50–99', 82, 4, 'DISQUALIFIED', 'EMAIL', belem('2026-11-11', '09:00')],
  ['Supermercados Econômico Imperatriz Ltda', 'Econômico', '4711-3/02', 'Comércio varejista — supermercados', 'SUPERMERCADO_ATACAREJO', 'Imperatriz', 'MA', 'GOOGLE_PLACES', '100–249', 91, 1, 'SENT_WA', 'WHATSAPP', belem('2026-11-20', '09:30'), 4.2],
  ['Laticínios Bragantina Ltda', 'Laticínios Bragantina', '1052-0/00', 'Fabricação de laticínios', 'ALIMENTOS_BEBIDAS', 'Bragança', 'PA', 'CNAE', '50–99', 79, 1, 'PENDING', null, null],
  ['Centro Logístico BR-316 Ltda', 'CL BR-316', '5211-7/99', 'Depósitos de mercadorias para terceiros', 'CD_LOGISTICA', 'Marituba', 'PA', 'CNAE', '50–99', 94, 3, 'REPLIED', 'EMAIL', belem('2026-11-20', '08:47')],
  ['Faculdade Integrada do Maranhão Ltda', 'FIMA', '8532-5/00', 'Educação superior — graduação e pós', 'HOSPITAL_HOTEL_ESCOLA', 'São Luís', 'MA', 'GOOGLE_PLACES', '250–499', 61, 1, 'DISQUALIFIED', null, null, 3.9],
  ['Pescados Norte Ind. e Com. Ltda', 'Pescados Norte', '1020-1/01', 'Preservação de peixes, crustáceos e moluscos', 'ALIMENTOS_BEBIDAS', 'Belém', 'PA', 'CNAE', '100–249', 87, 1, 'SENT_EMAIL', 'EMAIL', belem('2026-11-20', '09:00')],
  ['Mercantil Santarém Atacarejo Ltda', 'Mercantil Santarém', '4639-7/01', 'Comércio atacadista de produtos alimentícios em geral', 'SUPERMERCADO_ATACAREJO', 'Santarém', 'PA', 'CNAE', '100–249', 90, 1, 'PENDING', null, null],
]

const DDD: Record<string, string> = {
  Belém: '91', Ananindeua: '91', Marituba: '91', Castanhal: '91', Abaetetuba: '91', Bragança: '91', Salinópolis: '91', Paragominas: '91',
  Marabá: '94', Santarém: '93', 'São Luís': '98', Bacabal: '99', Imperatriz: '99', Timon: '99', Macapá: '96', Santana: '96',
}

export const seedProspects: OutboundProspect[] = PROSPECTS.map((p, i) => {
  const [razao, fantasia, cnae, cnaeDesc, segment, city, uf, source, employees, fit, step, status, lastTouch, lastAt, rating] = p
  const rnd = seededRandom(hashString(razao))
  const n = () => Math.floor(rnd() * 10)
  const cnpj = `${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}/0001-${n()}${n()}`
  const id = `pr_${String(i + 1).padStart(3, '0')}`
  const leadId = id === 'pr_004' ? 'ld_012' : id === 'pr_011' ? 'ld_020' : null
  const slug = fantasia
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
  return {
    id,
    cnpj,
    razaoSocial: razao,
    nomeFantasia: fantasia,
    cnae,
    cnaeDescription: cnaeDesc,
    segment,
    city,
    state: uf,
    phoneE164: `+55${DDD[city] ?? '91'}9${String(80000000 + Math.floor(rnd() * 19999999))}`,
    email: source === 'CNAE' || i % 2 === 0 ? `contato@${slug}.com.br` : null,
    source,
    employeesRange: employees,
    googleRating: rating ?? null,
    fitScore: fit,
    sequenceStep: step,
    sequenceTotal: 4,
    status,
    lastTouchChannel: lastTouch,
    lastContactedAt: lastAt,
    nextTouchAt: ['SENT_EMAIL', 'SENT_WA', 'PENDING'].includes(status) && step < 4 ? (lastAt ? addMinutes(lastAt, 3 * 24 * 60) : belem('2026-11-23', '09:00')) : null,
    leadId,
    createdAt: belem(i < 12 ? '2026-11-09' : '2026-11-16', '05:30'),
  }
})

// ───────────────────────── Instagram comment events ─────────────────────────

const IG_MEDIA = {
  s16: { id: '18044327716129903', tag: 'IG_Reels_S16', caption: 'S16 varrendo 6 mil m² de pátio em menos de 1h 🚛 #limpezaindustrial' },
  brava: { id: '18051190834470021', tag: 'IG_Reels_Brava', caption: 'Brava passando em portas de 70 cm no shopping ✨' },
  t16: { id: '18039912087734410', tag: 'IG_Post_T16AMR', caption: 'Conheça o T16AMR: o robô que lava sozinho até 5.890 m²/h' },
  a260: { id: '18047755120098812', tag: 'IG_Post_A260', caption: 'Manutenção preventiva da sua A260 com peças originais' },
}

type IgSeed = [keyof typeof IG_MEDIA, string, string, IgCommentEvent['classification'], string | null, string | null, number | null]

const IG: IgSeed[] = [
  ['s16', '@thiago.carajaslog', 'Quanto custa alugar?', 'COMMERCIAL_INQUIRY', 'alugar', 'ld_008', 3400],
  ['brava', '@leoprado.eng', 'preço?', 'COMMERCIAL_INQUIRY', 'preço', 'ld_019', 2900],
  ['s16', '@marcos_galpoes', 'Funciona em piso de terra batida?', 'COMMERCIAL_INQUIRY', 'funciona', null, 3100],
  ['brava', '@facilities.slz', 'Vocês fazem locação em São Luís?', 'COMMERCIAL_INQUIRY', 'locação', null, 2700],
  ['t16', '@supermercado.nazare', 'Qual o valor desse robô?', 'COMMERCIAL_INQUIRY', 'valor', null, 3800],
  ['s16', '@ana.limpezapro', 'Que máquina top 👏👏', 'ELOGIO', null, null, null],
  ['brava', '@ganhe_seguidores_br', 'Ganhe 10k seguidores agora! Link na bio', 'SPAM', null, null, null],
  ['a260', '@jorge.limpaamapa', 'Tem a borracha do rodo da A260?', 'COMMERCIAL_INQUIRY', 'manutenção', null, 3300],
  ['t16', '@eng.rafaelsouza', 'Show demais, tecnologia pura', 'ELOGIO', null, null, null],
  ['s16', '@transp.amazonas', 'Manda a ficha técnica', 'COMMERCIAL_INQUIRY', 'ficha', null, 2600],
  ['brava', '@cleber_s', '🔥🔥🔥', 'OUTRO', null, null, null],
  ['t16', '@logistica.maraba', 'Faz orçamento pra Marabá?', 'COMMERCIAL_INQUIRY', 'orçamento', null, 3500],
]
const IG_TIMES = [
  belem('2026-11-19', '11:20'),
  belem('2026-11-20', '09:48'),
  belem('2026-11-18', '20:14'),
  belem('2026-11-17', '12:33'),
  belem('2026-11-16', '19:02'),
  belem('2026-11-16', '08:41'),
  belem('2026-11-15', '23:10'),
  belem('2026-11-13', '10:05'),
  belem('2026-11-12', '18:22'),
  belem('2026-11-11', '15:47'),
  belem('2026-11-10', '13:30'),
  belem('2026-11-06', '17:58'),
]
const REPLIES = [
  'Olá! Acabamos de enviar os detalhes técnicos e opções para sua operação no seu Direct!',
  'Oi! Te chamamos no Direct com as informações dessa máquina 😉',
  'Olá! Enviamos no seu Direct a ficha técnica e como funciona a locação/compra.',
  'Olá! Confere seu Direct, enviamos as opções ideais para o seu espaço.',
]

export const seedIgEvents: IgCommentEvent[] = IG.map(([media, user, text, cls, kw, leadId, latency], i) => {
  const m = IG_MEDIA[media]
  const commercial = cls === 'COMMERCIAL_INQUIRY'
  return {
    id: `ig_${String(i + 1).padStart(3, '0')}`,
    mediaId: m.id,
    mediaTag: m.tag,
    mediaCaption: m.caption,
    username: user,
    commentText: text,
    classification: cls,
    matchedKeyword: kw,
    publicReply: commercial ? REPLIES[i % REPLIES.length] : null,
    dmSent: commercial,
    dmText: commercial ? `Oi! Vi seu comentário no post da ${m.tag.split('_').pop()}. Para eu te indicar a configuração certa: qual o tamanho da área e em qual cidade?` : null,
    leadId,
    latencyMs: latency,
    createdAt: IG_TIMES[i],
  }
})

// ───────────────────────── Notifications ─────────────────────────

export const seedNotifications: Notification[] = [
  {
    id: 'nt_001',
    type: 'LEAD_QUALIFIED',
    title: 'Novo lead qualificado: Jorge Almeida',
    body: 'Limpa Amapá · Macapá-AP · Manutenção/Peças A260. Aguardando seu primeiro contato (SLA 15 min).',
    createdAt: belem('2026-11-20', '10:18'),
    read: false,
    href: '/crm?lead=ld_005',
  },
  {
    id: 'nt_002',
    type: 'IG_COMMENT',
    title: 'Comentário com intenção no Reels Brava',
    body: '@leoprado.eng comentou “preço?” — resposta pública + Direct enviados em 2,9 s.',
    createdAt: belem('2026-11-20', '09:48'),
    read: false,
    href: '/automacao',
  },
  {
    id: 'nt_003',
    type: 'OUTBOUND',
    title: 'Prospect respondeu: CL BR-316',
    body: 'Centro Logístico BR-316 (Marituba-PA) respondeu ao e-mail 3/4 da sequência.',
    createdAt: belem('2026-11-20', '08:47'),
    read: false,
    href: '/automacao',
  },
  {
    id: 'nt_004',
    type: 'LEAD_QUALIFIED',
    title: 'Novo lead qualificado: Thiago Lima',
    body: 'Carajás Log · Marabá-PA · Locação S16 · origem IG_Reels_S16.',
    createdAt: belem('2026-11-19', '11:33'),
    read: true,
    href: '/crm?lead=ld_008',
  },
  {
    id: 'nt_005',
    type: 'HUMAN_REQUESTED',
    title: 'Antônio Ribeiro quer falar com você',
    body: 'Supermercado Ribeiro · Santana-AP pediu atendimento humano no 1º turno. IA pausada.',
    createdAt: belem('2026-11-19', '16:05'),
    read: true,
    href: '/crm?lead=ld_006',
  },
  {
    id: 'nt_006',
    type: 'OPTIMIZER',
    title: 'Otimizador semanal adicionou 7 negativas',
    body: '55 termos analisados. Ex.: “karcher k5”, “apartamento”, “manaus”. 3 termos B2B mantidos.',
    createdAt: belem('2026-11-16', '06:03'),
    read: true,
    href: '/automacao',
  },
  {
    id: 'nt_007',
    type: 'CAMPAIGN',
    title: 'Blueprint gerou 1 campanha nova (PAUSADA)',
    body: '“Meta · Lead Ads Prestadoras de Limpeza” aguarda sua aprovação para ativar.',
    createdAt: belem('2026-11-18', '16:42'),
    read: false,
    href: '/ads',
  },
  {
    id: 'nt_008',
    type: 'CONVERSION',
    title: 'Falha ao enviar conversão offline',
    body: 'Venda Clínica Vida Plena (R$ 18.500) — Google Ads retornou DEADLINE_EXCEEDED. Reenvie em Automação.',
    createdAt: belem('2026-11-10', '14:21'),
    read: true,
    href: '/automacao',
  },
  {
    id: 'nt_009',
    type: 'DEAL_WON',
    title: 'Negócio ganho: Clínica Vida Plena',
    body: 'Compra de 1 i-mop Lite · R$ 18.500,00.',
    createdAt: belem('2026-11-10', '14:20'),
    read: true,
    href: '/crm?lead=ld_003',
  },
  {
    id: 'nt_010',
    type: 'SYSTEM',
    title: 'Piloto: 7 de 10 SQLs no dia 39',
    body: 'Ritmo acima do necessário para bater o stop-loss de 10 SQLs em 60 dias.',
    createdAt: belem('2026-11-20', '08:00'),
    read: false,
    href: '/',
  },
]
