import type { ExtractedFields } from './engine'

export type SimChannel = 'WHATSAPP' | 'INSTAGRAM' | 'WIDGET'
export type ClockMode = 'business' | 'saturday'

export interface OriginContext {
  originTag: string
  campaignId: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm?: string | null
  gclid?: string | null
  fbclid?: string | null
  igMediaId?: string | null
  landingUrl?: string | null
}

export const ORIGINS: OriginContext[] = [
  {
    originTag: 'Google_Ads_Locacao',
    campaignId: 'c_g_locacao',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'locacao_lavadoras_pa_ma_ap',
    utmTerm: 'aluguel lavadora de piso industrial',
    gclid: 'Cj0KCQiA7sim_SDRdemo4500BwE',
    landingUrl: 'https://vendas.maquinabel.com.br/locacao',
  },
  {
    originTag: 'Google_Ads_Compra',
    campaignId: 'c_g_compra',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'compra_lavadoras_alfa_tennant',
    utmTerm: 'lavadora de piso alfa tennant',
    gclid: 'Cj0KCQiA9sim_SDRcompra71BwE',
    landingUrl: 'https://vendas.maquinabel.com.br/compra',
  },
  {
    originTag: 'Google_Ads_Pecas',
    campaignId: 'c_g_pecas',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'pecas_manutencao_tennant',
    utmTerm: 'borracha rodo a260',
    gclid: 'Cj0KCQiA2sim_SDRpecas260BwE',
    landingUrl: 'https://maquinabel.com.br/pecas',
  },
  {
    originTag: 'Google_Ads_Robotica',
    campaignId: 'c_g_robotica',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'robotica_t16amr',
    utmTerm: 'lavadora autonoma robo',
    gclid: 'Cj0KCQiA5sim_SDRt16amrBwE',
    landingUrl: 'https://vendas.maquinabel.com.br/t16amr',
  },
  {
    originTag: 'Meta_CTWA_Brava',
    campaignId: 'c_m_ctwa',
    utmSource: 'meta',
    utmMedium: 'paid_social',
    utmCampaign: 'ctwa_brava',
    fbclid: 'IwAR3sim_SDR_ctwa_brava',
  },
  {
    originTag: 'IG_Reels_S16',
    campaignId: 'c_m_reels',
    utmSource: 'instagram',
    utmMedium: 'reels',
    utmCampaign: 'reels_s16_varredeira',
    igMediaId: '17984512_s16_reel',
  },
  { originTag: 'Site_Brava', campaignId: null, utmSource: 'site', utmMedium: 'widget', utmCampaign: 'pagina_brava', landingUrl: 'https://maquinabel.com.br/maquinas/brava' },
  { originTag: 'WhatsApp_Direto', campaignId: null, utmSource: null, utmMedium: null, utmCampaign: null },
]

export function originByTag(tag: string): OriginContext {
  return ORIGINS.find((o) => o.originTag === tag) ?? ORIGINS[ORIGINS.length - 1]
}

export interface IgIntro {
  username: string
  mediaTag: string
  caption: string
  comment: string
  dmOpening: string
}

export interface Scenario {
  id: string
  title: string
  subtitle: string
  expected: string
  channel: SimChannel
  originTag: string
  clock: ClockMode
  /** each turn = burst of bubbles sent before the AI replies */
  turns: string[][]
  ig?: IgIntro
  /** fields already known before the first DM turn (e.g. from IG comment) */
  seed?: Partial<ExtractedFields>
  leadDisplayName: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'galpao_belem',
    title: 'Galpão Belém 4.500 m²',
    subtitle: 'Locação · epóxi · poeira + lavagem diária · rajada de 5 bolhas',
    expected: 'Brava / S16 → QUALIFIED_HANDOFF',
    channel: 'WHATSAPP',
    originTag: 'Google_Ads_Locacao',
    clock: 'business',
    leadDisplayName: 'Carlos',
    turns: [
      ['Bom dia!', 'Aqui é o Carlos, da Norte Log', 'Tenho um galpão logístico em Belém', 'uns 4.500 m² de piso epóxi', 'muita poeira, precisamos lavar todo dia'],
      ['Seria aluguel mesmo, locação'],
    ],
  },
  {
    id: 'atacarejo_sao_luis',
    title: 'Atacarejo São Luís 8.000 m²',
    subtitle: 'Compra · robótica · falta de mão de obra',
    expected: 'T16AMR (+ Brava) → QUALIFIED_HANDOFF',
    channel: 'WIDGET',
    originTag: 'Google_Ads_Robotica',
    clock: 'business',
    leadDisplayName: 'Fernanda',
    turns: [
      ['Olá! Me chamo Fernanda, falo da Super Ilha Atacarejo', 'Queremos comprar uma lavadora autônoma, robô mesmo'],
      ['Loja de 8 mil metros em São Luís, piso de granitina', 'Temos falta de mão de obra no turno da noite'],
    ],
  },
  {
    id: 'clinica_ananindeua',
    title: 'Clínica Ananindeua 350 m²',
    subtitle: 'Compra · porcelanato · corredores apertados',
    expected: 'i-mop Lite / Alfa Mini → QUALIFIED_HANDOFF',
    channel: 'WHATSAPP',
    originTag: 'Meta_CTWA_Brava',
    clock: 'business',
    leadDisplayName: 'Paula',
    turns: [
      ['Oi! Preciso de uma máquina pequena para a minha clínica'],
      ['É para comprar. Fica em Ananindeua-PA', 'São uns 350 m² de porcelanato, corredores apertados, limpeza diária'],
    ],
  },
  {
    id: 'fora_sp',
    title: 'Fora de região (SP)',
    subtitle: 'Galpão 3.000 m² em São Paulo-SP',
    expected: 'DISQUALIFIED_OUT_OF_REGION · Vinicius não notificado',
    channel: 'WHATSAPP',
    originTag: 'Google_Ads_Compra',
    clock: 'business',
    leadDisplayName: 'Marcos',
    turns: [['Boa tarde, preciso de uma lavadora para um galpão de 3.000 m² em São Paulo', 'Seria compra']],
  },
  {
    id: 'sondagem_preco',
    title: 'Sondagem de preço',
    subtitle: 'Insiste no valor do aluguel da Brava',
    expected: 'Guardrail de preço 3× → depois QUALIFIED_HANDOFF',
    channel: 'WHATSAPP',
    originTag: 'Google_Ads_Locacao',
    clock: 'business',
    leadDisplayName: 'Lead (preço)',
    turns: [
      ['Quanto custa o aluguel da Brava?'],
      ['Me fala pelo menos o valor aproximado do aluguel da Brava'],
      ['Só uma média, preciso levar pro meu chefe hoje'],
      ['Tá bom. É um supermercado de 3.000 m² em Imperatriz-MA, piso cerâmico'],
    ],
  },
  {
    id: 'manutencao_macapa',
    title: 'Manutenção Macapá A260',
    subtitle: 'Borracha do rodo + preventiva',
    expected: 'MANUTENCAO_PECAS · AP ok → QUALIFIED_HANDOFF',
    channel: 'WHATSAPP',
    originTag: 'Google_Ads_Pecas',
    clock: 'business',
    leadDisplayName: 'Lead (Macapá)',
    turns: [['Olá, tenho uma lavadora Alfa A260 aqui em Macapá'], ['Preciso trocar a borracha do rodo e fazer uma preventiva']],
  },
  {
    id: 'quero_vinicius',
    title: '"Quero falar com o Vinicius"',
    subtitle: 'Pedido de humano no 1º turno',
    expected: 'HUMAN_REQUESTED imediato · IA pausada',
    channel: 'WHATSAPP',
    originTag: 'Site_Brava',
    clock: 'business',
    leadDisplayName: 'Lead (humano)',
    turns: [['Quero falar direto com o Vinicius']],
  },
  {
    id: 'sabado',
    title: 'Sábado fora do horário',
    subtitle: 'Sáb 14:00 · prestadora de limpeza em Castanhal',
    expected: 'QUALIFIED_HANDOFF · retorno segunda 08:00',
    channel: 'WHATSAPP',
    originTag: 'Meta_CTWA_Brava',
    clock: 'saturday',
    leadDisplayName: 'Roberto',
    turns: [
      ['Boa tarde! Sou o Roberto da Limpa Norte Serviços, somos prestadora de limpeza em Castanhal-PA'],
      ['Queremos alugar uma lavadora para um cliente de 1.200 m², piso cerâmico, alto tráfego'],
    ],
  },
  {
    id: 'ig_reels_s16',
    title: 'Comentário IG Reels S16 → DM',
    subtitle: '"Quanto custa alugar?" → resposta pública + Direct',
    expected: 'S16 → QUALIFIED_HANDOFF · origem IG_Reels_S16',
    channel: 'INSTAGRAM',
    originTag: 'IG_Reels_S16',
    clock: 'business',
    leadDisplayName: '@ana.facilities',
    seed: { modality: 'LOCACAO' },
    ig: {
      username: 'ana.facilities',
      mediaTag: 'IG_Reels_S16',
      caption: 'Varredeira S16: até 13.490 m²/h com filtragem multiestágio 💨 #AlfaTennant #Maquinabel',
      comment: 'Quanto custa alugar?',
      dmOpening:
        'Oi, @ana.facilities! 👋 Vi seu comentário no nosso Reels da varredeira **S16**. Sobre valores: o orçamento de locação é personalizado pela nossa equipe comercial, conforme a sua operação — por isso não passo preços por aqui.\n\nPara indicar a configuração ideal: qual é o tipo de ambiente e a metragem aproximada (m²)?',
    },
    turns: [
      ['Oi! É para o pátio do nosso centro de distribuição', 'uns 6 mil m², muita areia e poeira'],
      ['Marabá-PA. Meu WhatsApp é (94) 98877-1234'],
    ],
  },
]
