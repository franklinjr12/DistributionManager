import type {
  AttributionChannel,
  Conversation,
  ConversationChannel,
  ConversationState,
  DirtProfile,
  FloorType,
  HandoffEvent,
  KanbanStage,
  Lead,
  LeadAttribution,
  LossReason,
  Message,
  Modality,
  PowerPreference,
  RecommendedModel,
  Segment,
} from '@/types/domain'
import { addSeconds, belem, diffMinutes, isBusinessHours, seededRandom, hashString } from '@/lib/utils'
import { DIRT_LABEL, FLOOR_LABEL, MODALITY_LABEL, SEGMENT_LABEL } from '@/lib/format'
import { machines } from './catalog'
import { TENANT_ID, VINICIUS_ID } from './tenant'

// ───────────────────────── Seed helpers ─────────────────────────

/** [sender, text, timing?] — timing: minutes after previous message, or absolute ISO string */
type Sender = 'L' | 'A' | 'H' | 'S'
type Line = [Sender, string] | [Sender, string, number | string]

interface LeadSeed {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  ig?: string | null
  company?: string | null
  cnpj?: string | null
  isB2B?: boolean | null
  modality?: Modality | null
  segment?: Segment | null
  area?: number | null
  floor?: FloorType | null
  dirt?: DirtProfile | null
  power?: PowerPreference | null
  routine?: string | null
  city?: string | null
  uf?: string | null
  rec?: [string, string][]
  stage: KanbanStage
  origin: string
  campaignId?: string | null
  channel: ConversationChannel
  attrChannel: AttributionChannel
  createdAt: string
  /** reached HANDOFF via qualification → SQL */
  sql?: boolean
  humanRequested?: boolean
  proposal?: number | null
  proposalAt?: string | null
  closed?: number | null
  closedModality?: Modality | null
  rentalMonths?: number | null
  rentalMonthly?: number | null
  closedAt?: string | null
  loss?: LossReason | null
  lossNotes?: string | null
  notes?: string | null
  convState?: ConversationState
  /** override SLA minutes (business-hours SLA for after-hours handoffs) */
  slaOverride?: number
  noClickId?: boolean
  utmTerm?: string | null
  utmContent?: string | null
  igMediaId?: string | null
  prospectId?: string | null
  script: Line[]
}

const D = belem

// Campaign slugs used in UTMs
const CAMPAIGN_UTM: Record<string, { source: string; medium: string; campaign: string; landing: string }> = {
  c_g_locacao: { source: 'google', medium: 'cpc', campaign: 'search_locacao_lavadoras', landing: 'https://vendas.maquinabel.com.br/locacao' },
  c_g_compra: { source: 'google', medium: 'cpc', campaign: 'search_compra_varredeiras_t16amr', landing: 'https://vendas.maquinabel.com.br/compra' },
  c_g_pecas: { source: 'google', medium: 'cpc', campaign: 'search_pecas_manutencao', landing: 'https://maquinabel.com.br/manutencao/' },
  c_g_robotica: { source: 'google', medium: 'cpc', campaign: 'search_robotica_autonoma', landing: 'https://vendas.maquinabel.com.br/robotica-t16amr' },
  c_m_ctwa: { source: 'facebook', medium: 'paid_social', campaign: 'ctwa_brava_s16', landing: 'https://wa.me/5591993801020' },
  c_m_reels: { source: 'instagram', medium: 'paid_social', campaign: 'ig_reels_direct_s16_brava', landing: 'https://instagram.com/maquinabel' },
}

const SEED_LEADS: LeadSeed[] = [
  // ───────── WON ─────────
  {
    id: 'ld_001',
    name: 'Rafael Monteiro',
    phone: '+5591988214470',
    email: 'rafael.monteiro@lognorte.com.br',
    company: 'LogNorte Armazéns Gerais',
    cnpj: '23.418.556/0001-07',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'CD_LOGISTICA',
    area: 4500,
    floor: 'epoxi',
    dirt: 'misto',
    power: 'bateria',
    routine: '2 turnos · varrição contínua + lavagem diária no fim do turno',
    city: 'Belém',
    uf: 'PA',
    rec: [
      ['m_brava', 'Lavadora a bordo ~2.015 m²/h na prática: lava os 4.500 m² em ~2 h e passa em corredores de 70 cm.'],
      ['m_s16', 'Varredeira a bordo até 10.340 m²/h com filtragem multiestágio: recolhe pó de papelão e restos de pallet antes da lavagem.'],
    ],
    stage: 'WON',
    origin: 'Google_Ads_Locacao',
    campaignId: 'c_g_locacao',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-10-16', '09:12'),
    sql: true,
    proposal: 86400,
    proposalAt: D('2026-10-20', '17:10'),
    closed: 86400,
    closedModality: 'LOCACAO',
    rentalMonths: 12,
    rentalMonthly: 7200,
    closedAt: D('2026-10-29', '11:30'),
    utmTerm: 'aluguel lavadora de piso industrial belem',
    notes: 'Contrato de 12 meses: 1 Brava + 1 S16. Entrega realizada em 03/11. Avaliar T16AMR na renovação.',
    script: [
      ['L', 'Olá! Vim pelo site, código #MQ-4821. Preciso alugar máquina pra limpeza do nosso galpão'],
      ['A', 'Olá, Rafael! Sou o consultor técnico virtual da Maquinabel, concessionária Alfa Tennant. Para indicar o equipamento ideal: qual é a metragem aproximada do galpão e em qual cidade ele fica?'],
      ['L', 'Fica em Belém, perto da Arthur Bernardes. Uns 4.500 m², piso epóxi'],
      ['A', 'Perfeito, 4.500 m² em epóxi. Como é a sujeira no dia a dia: mais poeira fina de empilhadeira e paletes, ou também mancha de óleo? E a limpeza seria diária?'],
      ['L', 'Muita poeira, pó de papelão e às vezes pallet quebrado. Hoje a gente varre na vassoura e lava 1x por dia no fim do turno. Trabalhamos em 2 turnos'],
      [
        'A',
        'Entendi! Para o seu CD eu indicaria uma combinação:\n\n• S16 (varredeira a bordo): até 10.340 m²/h com filtragem de pó em múltiplos estágios — recolhe pó e restos de pallet antes da lavagem.\n• Brava (lavadora a bordo): ~2.015 m²/h na prática, lava os 4.500 m² em cerca de 2 h e passa em corredores estreitos.\n\nVou encaminhar agora seu perfil para o Vinicius Goés, nosso diretor comercial, que prepara o orçamento oficial de locação. Pode ser?',
      ],
      ['L', 'Pode sim, obrigado'],
      ['S', 'HANDOFF'],
      ['H', 'Bom dia, Rafael! Aqui é o Vinicius da Maquinabel. Recebi seu perfil — Brava + S16 é exatamente o que usamos em CDs desse porte. Posso passar aí segunda às 10h para uma demonstração no seu piso?', 7],
      ['L', 'Pode ser segunda às 10h. Endereço: Rod. Arthur Bernardes, galpão 7'],
      ['H', 'Combinado! Levo as duas máquinas para teste.', 3],
      ['H', 'Rafael, proposta de locação de 12 meses (Brava + S16) enviada no seu e-mail. Qualquer ajuste me avisa.', D('2026-10-20', '17:10')],
    ],
  },
  {
    id: 'ld_003',
    name: 'Dra. Patrícia Nunes',
    phone: '+5591991557302',
    email: 'adm@clinicavidaplena.com.br',
    company: 'Clínica Vida Plena',
    cnpj: '31.902.114/0001-60',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'HOSPITAL_HOTEL_ESCOLA',
    area: 350,
    floor: 'porcelanato',
    dirt: 'alto_trafego',
    power: 'bateria',
    routine: 'Limpeza 2x ao dia · corredores estreitos e consultórios',
    city: 'Ananindeua',
    uf: 'PA',
    rec: [
      ['m_imop_lite', 'Compacta com giro 360° (até 1.050 m²/h) e 16,5 kg — passa entre macas e cadeiras em 350 m².'],
      ['m_alfa_mini', 'Alternativa micro que lava com água limpa e substitui mop e balde.'],
    ],
    stage: 'WON',
    origin: 'Google_Ads_Compra',
    campaignId: 'c_g_compra',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-10-27', '10:40'),
    sql: true,
    proposal: 18500,
    proposalAt: D('2026-10-29', '16:00'),
    closed: 18500,
    closedModality: 'COMPRA',
    closedAt: D('2026-11-10', '14:20'),
    utmTerm: 'lavadora de piso para clinica',
    notes: 'Compra à vista de 1 i-mop Lite. Treinamento da equipe agendado.',
    script: [
      ['L', 'Bom dia, quero uma máquina para lavar o piso da clínica. Hoje usamos mop'],
      ['A', 'Bom dia! Ótimo, dá para ganhar muito em higiene trocando o mop. Qual a área aproximada da clínica e em qual cidade vocês estão?'],
      ['L', 'Ananindeua, Cidade Nova. Uns 350 m², tem muito corredor e consultório pequeno'],
      ['A', 'Entendi. O piso é porcelanato ou cerâmica? E a ideia é comprar ou alugar?'],
      ['L', 'Porcelanato. Queremos comprar. Limpamos 2 vezes por dia'],
      [
        'A',
        'Perfeito! Para 350 m² com corredores apertados eu indico a i-mop Lite: até 1.050 m²/h, giro 360° e só 16,5 kg — passa entre macas e cadeiras sem esforço. Como alternativa mais compacta, a Alfa Mini, que lava com água limpa e substitui o balde.\n\nVou encaminhar para o Vinicius preparar o orçamento oficial, tudo bem?',
      ],
      ['L', 'Pode encaminhar. Quanto fica mais ou menos?'],
      ['A', 'Os valores dependem da configuração e das condições de pagamento, então quem envia o orçamento oficial é o Vinicius, nosso diretor comercial. Ele já recebeu o seu perfil e te chama em instantes.'],
      ['S', 'HANDOFF'],
      ['H', 'Bom dia, Dra. Patrícia! Vinicius aqui. Já separei a ficha da i-mop Lite e te mando a proposta ainda hoje. Posso levar uma para demonstração na clínica amanhã?', 5],
      ['L', 'Pode sim, depois das 14h'],
    ],
  },
  // ───────── PROPOSAL_SENT ─────────
  {
    id: 'ld_002',
    name: 'Luciana Sá',
    phone: '+5598987103344',
    email: 'luciana.sa@ilhabelaatacado.com.br',
    company: 'Atacarejo Ilha Bela',
    cnpj: '12.775.908/0001-31',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'SUPERMERCADO_ATACAREJO',
    area: 8000,
    floor: 'granito',
    dirt: 'alto_trafego',
    power: 'bateria',
    routine: 'Loja aberta 7h–22h · lavagem noturna · falta de auxiliares de limpeza',
    city: 'São Luís',
    uf: 'MA',
    rec: [
      ['m_t16amr', 'Robô autônomo BrainOS® até 5.890 m²/h, 5,5 h de bateria: cobre os 8.000 m² na janela noturna sem operador.'],
      ['m_brava', 'Alternativa operada por pessoa para docas e corredores estreitos; elegível BNDES.'],
    ],
    stage: 'PROPOSAL_SENT',
    origin: 'Google_Ads_Robotica',
    campaignId: 'c_g_robotica',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-10-22', '14:03'),
    sql: true,
    proposal: 380000,
    proposalAt: D('2026-10-28', '18:05'),
    utmTerm: 'robo lavadora de piso autonomo',
    notes: 'Proposta T16AMR + 1 Brava. Aguardando aprovação da diretoria (reunião 25/11). Pediu condições de financiamento.',
    script: [
      ['L', 'Boa tarde. Vi o anúncio do robô de limpeza. Funciona mesmo sozinho? Temos uma loja grande em São Luís'],
      ['A', 'Boa tarde! Funciona sim: o T16AMR é uma lavadora autônoma com navegação BrainOS®, que aprende a rota uma vez e repete sozinha. Para eu confirmar se ele se encaixa: qual a área aproximada da loja e que tipo de piso vocês têm?'],
      ['L', 'Uns 8 mil m² de área de vendas, piso granilite. Somos atacarejo'],
      ['L', 'nosso problema é gente. Não consigo manter equipe de limpeza à noite', 0.1],
      ['A', 'Entendi, Luciana — esse é exatamente o cenário para robótica. A ideia é comprar ou avaliar locação? E qual o nome da empresa?'],
      ['L', 'Compra. Atacarejo Ilha Bela, na Cohama'],
      [
        'A',
        'Obrigado! Minha recomendação:\n\n• T16AMR (autônoma): até 5.890 m²/h, cabeçote cilíndrico de 910 mm e até 5,5 h de bateria Li-ion — cobre os 8.000 m² numa janela noturna sem depender de operador.\n• Brava como alternativa operada por pessoa, para docas e corredores mais estreitos.\n\nVou passar seu caso ao Vinicius Goés, que monta a proposta oficial de compra com você.',
      ],
      ['S', 'HANDOFF'],
      ['H', 'Olá, Luciana! Vinicius da Maquinabel. Nossa filial fica no Vinhais, pertinho da Cohama. Consigo levar um vídeo da operação num atacarejo parecido e a ficha técnica completa amanhã às 15h?', 11],
      ['L', 'Pode ser. Traz também opção de financiamento'],
      ['H', 'Combinado, levo as condições.', 2],
      ['H', 'Luciana, proposta do T16AMR + Brava enviada por e-mail, com as opções de financiamento. Fico à disposição para a reunião com a diretoria.', D('2026-10-28', '18:05')],
    ],
  },
  {
    id: 'ld_007',
    name: 'Fernando Costa',
    phone: '+5591984402218',
    email: 'fernando@polpaamazonia.ind.br',
    company: 'Polpa Amazônia Indústria de Alimentos',
    cnpj: '08.665.231/0001-90',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'ALIMENTOS_BEBIDAS',
    area: 1800,
    floor: 'epoxi',
    dirt: 'graxa_oleo',
    power: 'bateria',
    routine: 'Higienização diária da produção · exigência da vigilância sanitária',
    city: 'Castanhal',
    uf: 'PA',
    rec: [['m_t600e', 'Construção industrial para sujeira pesada + ec-H2O NanoClean™ sem químicos, ideal para auditorias sanitárias.']],
    stage: 'PROPOSAL_SENT',
    origin: 'Google_Ads_Compra',
    campaignId: 'c_g_compra',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-14', '14:00'),
    sql: true,
    proposal: 62000,
    proposalAt: D('2026-11-17', '15:40'),
    slaOverride: 9,
    utmTerm: 'lavadora de piso industria alimenticia',
    notes: 'Lead de sábado (fora do horário). Proposta T600e + kit ec-H2O enviada. Retornar na segunda 23/11.',
    script: [
      ['L', 'Boa tarde, sei que hoje é sábado mas queria adiantar um orçamento de lavadora pra fábrica'],
      ['A', 'Boa tarde, Fernando! Sem problema, eu atendo 24h para adiantar o dimensionamento. Qual o tipo de operação da fábrica e a área aproximada a ser lavada?'],
      ['L', 'Fábrica de polpa de fruta em Castanhal. Área de produção uns 1.800 m², piso epóxi'],
      ['A', 'Ótimo. A sujeira é mais resíduo de fruta e açúcar, ou tem também gordura/óleo das máquinas? E vocês têm exigência de higienização sem químicos?'],
      ['L', 'Resíduo de polpa grudado e um pouco de gordura das máquinas. A vigilância pega no pé sim. Queremos comprar'],
      [
        'A',
        'Para esse perfil eu indico a T600e: construção industrial robusta para sujeira pesada e opção ec-H2O NanoClean™, que limpa só com água eletricamente convertida, sem químicos — ótimo para auditorias sanitárias.\n\nNosso atendimento comercial funciona de segunda a sexta, das 8h às 18h. Já deixei tudo registrado e o Vinicius vai te enviar o orçamento oficial na segunda-feira a partir das 8h.',
      ],
      ['L', 'Perfeito, obrigado'],
      ['S', 'HANDOFF_AFTER_HOURS'],
      ['H', 'Bom dia, Fernando! Vinicius da Maquinabel. Vi seu atendimento de sábado. Posso te ligar às 9h para alinhar a T600e com ec-H2O?', D('2026-11-16', '08:09')],
      ['L', 'Pode ligar', 11],
      ['H', 'Fernando, proposta enviada no seu e-mail com a T600e + kit ec-H2O e condições de pagamento. Qualquer dúvida estou à disposição.', D('2026-11-17', '15:40')],
    ],
  },
  // ───────── HANDOFF ─────────
  {
    id: 'ld_005',
    name: 'Jorge Almeida',
    phone: '+5596991348812',
    email: null,
    company: 'Limpa Amapá Serviços Gerais',
    cnpj: '19.004.377/0001-52',
    isB2B: true,
    modality: 'MANUTENCAO_PECAS',
    segment: 'PRESTADORA_LIMPEZA',
    area: 1200,
    floor: 'ceramica',
    dirt: 'alto_trafego',
    power: 'bateria',
    routine: 'A260 a bateria com 2 anos de uso diário em supermercado · nunca fez preventiva',
    city: 'Macapá',
    uf: 'AP',
    rec: [['m_a260', 'Equipamento do cliente: troca da borracha do rodo traseiro (772 mm) + manutenção preventiva completa.']],
    stage: 'HANDOFF',
    origin: 'Google_Ads_Pecas',
    campaignId: 'c_g_pecas',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-20', '10:09'),
    sql: true,
    utmTerm: 'borracha rodo lavadora a260',
    script: [
      ['L', 'Bom dia. Tenho uma lavadora A260 e a borracha do rodo tá rasgando. Vocês vendem a peça?'],
      ['A', 'Bom dia, Jorge! Trabalhamos sim com peças originais e manutenção autorizada Alfa Tennant. Em qual cidade está o equipamento? E além da borracha, ele precisa de revisão?'],
      ['L', 'Macapá. Seria bom uma preventiva também, ela tem 2 anos e nunca fez'],
      ['A', 'Atendemos Macapá, sim. Para o técnico já ir preparado: a sua é a A260 a bateria ou a A260c com cabo? E qual o nome da empresa?'],
      ['L', 'Bateria. Limpa Amapá Serviços Gerais. Usamos ela todo dia num supermercado de uns 1.200 m²'],
      ['A', 'Perfeito, Jorge. Registrei: A260 a bateria, uso diário, troca da borracha do rodo traseiro (772 mm) + manutenção preventiva completa em Macapá-AP. Vou passar agora para o Vinicius, que confirma a disponibilidade da peça e agenda o técnico.'],
      ['S', 'HANDOFF', D('2026-11-20', '10:18')],
      ['L', 'Show, fico no aguardo', D('2026-11-20', '10:24')],
    ],
  },
  {
    id: 'ld_006',
    name: 'Antônio Ribeiro',
    phone: '+5596981124409',
    company: 'Supermercado Ribeiro',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'SUPERMERCADO_ATACAREJO',
    area: 2800,
    floor: null,
    city: 'Santana',
    uf: 'AP',
    rec: [['m_brava', 'Lavadora a bordo para 2.800 m² com depósito; passa entre gôndolas (corpo de 70 cm).']],
    stage: 'HANDOFF',
    origin: 'Meta_CTWA_Brava',
    campaignId: 'c_m_ctwa',
    channel: 'WHATSAPP',
    attrChannel: 'META_AD',
    createdAt: D('2026-11-19', '16:05'),
    humanRequested: true,
    utmContent: 'video_brava_supermercado',
    notes: 'Pediu para falar direto com o Vinicius. Visita em Santana na terça 24/11.',
    script: [
      ['L', 'Quero falar direto com o Vinicius'],
      ['A', 'Claro! Já estou chamando o Vinicius Goés, nosso diretor comercial. Ele continua o atendimento por aqui em instantes.'],
      ['S', 'HUMAN_REQUESTED'],
      ['H', 'Boa tarde, seu Antônio! Vinicius aqui. Em que posso ajudar?', 6],
      ['L', 'Vinicius, vi o vídeo da Brava. Tenho o supermercado em Santana e quero trocar a lavadora velha. Você vem pra cá quando?'],
      ['H', 'Estou em Macapá na terça que vem. Passo aí e levo a Brava para testar no seu piso. Qual a área da loja, mais ou menos?', 4],
      ['L', 'Uns 2.800 m² com o depósito'],
    ],
  },
  {
    id: 'ld_008',
    name: 'Thiago Lima',
    phone: '+5594991773020',
    ig: '@thiago.carajaslog',
    company: 'Carajás Log Transportes',
    cnpj: '27.330.145/0001-88',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'CD_LOGISTICA',
    area: 6000,
    floor: 'cimento_queimado',
    dirt: 'detritos_solidos',
    power: 'bateria',
    routine: 'Pátio de manobra + galpão · varrição diária · terra vermelha e restos de carga',
    city: 'Marabá',
    uf: 'PA',
    rec: [['m_s16', 'Varredeira a bordo com reservatório de 150 L e filtragem multiestágio: 6.000 m² de pátio em menos de 1 h.']],
    stage: 'HANDOFF',
    origin: 'IG_Reels_S16',
    campaignId: 'c_m_reels',
    channel: 'INSTAGRAM',
    attrChannel: 'IG_COMMENT',
    createdAt: D('2026-11-19', '11:20'),
    sql: true,
    igMediaId: '18044327716129903',
    utmContent: 'reels_s16_patio',
    script: [
      ['S', 'Comentário no Reels S16: “Quanto custa alugar?” — resposta pública enviada e Direct iniciado (IG_Reels_S16).'],
      ['A', 'Oi, Thiago! Vi seu comentário no vídeo da S16. Ela é uma varredeira a bordo que limpa até 10.340 m²/h com controle de pó. Para eu te passar a configuração certa: qual o tamanho da área e em qual cidade?'],
      ['L', 'Marabá. Pátio de transportadora + galpão, uns 6 mil m² no total', 9],
      ['A', 'Boa! O piso do pátio é asfalto ou concreto? E a sujeira é mais poeira/terra ou também restos de carga?'],
      ['L', 'Concreto. Muita terra vermelha e resto de palete, lona…'],
      ['A', 'Entendi, perfil clássico de S16: reservatório de 150 L e filtragem em múltiplos estágios, segura bem a poeira de terra. A ideia é locação mesmo? Se puder, me passa seu WhatsApp que envio a ficha técnica completa por lá.'],
      ['L', 'Locação. 94 99177-3020'],
      ['A', 'Anotado! Encaminhei seu perfil para o Vinicius Goés, que vai te mandar o orçamento oficial de locação pelo WhatsApp.'],
      ['S', 'HANDOFF'],
      ['S', 'Contato do Instagram unificado ao WhatsApp +55 94 99177-3020 (card único · origem IG_Reels_S16).'],
      ['H', 'Opa, Thiago! Vinicius da Maquinabel. Recebi aqui seu pedido da S16 para o pátio em Marabá. Locação mensal ou por período fechado?', 9],
      ['L', 'Uns 6 meses pra começar'],
    ],
  },
  // ───────── LOST ─────────
  {
    id: 'ld_009',
    name: 'Sandra Melo',
    phone: '+5599988016651',
    email: 'compras@supertocantins.com.br',
    company: 'Supermercados Tocantins',
    cnpj: '05.442.870/0001-14',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'SUPERMERCADO_ATACAREJO',
    area: 3200,
    floor: 'ceramica',
    dirt: 'alto_trafego',
    power: 'bateria',
    routine: 'Lavagem de madrugada após o fechamento · 2 lojas',
    city: 'Imperatriz',
    uf: 'MA',
    rec: [['m_brava', 'Faixa de 870 mm, ~2.015 m²/h na prática e corpo de 70 cm entre gôndolas; elegível BNDES.']],
    stage: 'LOST',
    origin: 'Meta_CTWA_Brava',
    campaignId: 'c_m_ctwa',
    channel: 'WHATSAPP',
    attrChannel: 'META_AD',
    createdAt: D('2026-10-19', '09:35'),
    sql: true,
    proposal: 145000,
    proposalAt: D('2026-10-23', '11:00'),
    closedAt: D('2026-11-12', '16:45'),
    loss: 'CONCORRENTE',
    lossNotes: 'Fechou com distribuidor de outra marca em Teresina — prazo de entrega menor.',
    utmContent: 'video_brava_supermercado',
    script: [
      ['L', 'Olá! Quero saber mais sobre a lavadora do anúncio'],
      ['A', 'Olá, Sandra! É a Brava, nossa lavadora operada a bordo. Para ver se ela é a ideal: qual o tipo de estabelecimento e a área aproximada?'],
      ['L', 'Supermercado em Imperatriz, 2 lojas, a maior tem 3.200 m². Piso cerâmico'],
      ['A', 'Ótimo. A intenção é comprar ou alugar? E hoje a limpeza é feita em qual horário?'],
      ['L', 'Comprar. Lavamos de madrugada depois que fecha'],
      ['A', 'Para 3.200 m² de cerâmica com lavagem noturna, a Brava é a escolha: faixa de 870 mm, ~2.015 m²/h na prática e corpo de 70 cm que passa entre gôndolas. E por ser fabricada no Brasil é elegível a financiamento BNDES. Vou encaminhar ao Vinicius para a proposta oficial.'],
      ['S', 'HANDOFF'],
      ['H', 'Bom dia, Sandra! Vinicius da Maquinabel. Te mando hoje a proposta para 2 Brava (uma por loja). Posso incluir a condição BNDES?', 14],
      ['L', 'Pode sim'],
      ['L', 'Vinicius, decidimos fechar com outro fornecedor que entrega esta semana. Obrigada pela atenção', D('2026-11-12', '16:30')],
      ['H', 'Sandra, entendi a decisão. Fico à disposição para manutenção e peças sempre que precisar.', 15],
    ],
  },
  {
    id: 'ld_022',
    name: 'Cláudio Moraes',
    phone: '+5591982270915',
    company: 'Hotel Beira Rio Belém',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'HOSPITAL_HOTEL_ESCOLA',
    area: null,
    floor: 'carpete_estofado',
    city: 'Belém',
    uf: 'PA',
    rec: [['m_ext52', 'Extração de sólidos e líquidos com baixo ruído para carpetes de quartos e corredores.']],
    stage: 'LOST',
    origin: 'Google_Ads_Locacao',
    campaignId: 'c_g_locacao',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-10-21', '15:12'),
    closedAt: D('2026-11-06', '09:00'),
    loss: 'SEM_RETORNO',
    lossNotes: 'Sem resposta após 2 follow-ups automáticos.',
    utmTerm: 'aluguel extratora de carpete',
    script: [
      ['L', 'Boa tarde, preciso limpar carpete dos quartos e corredores do hotel'],
      ['A', 'Boa tarde, Cláudio! Para carpetes, a Extratora Alfa Ext52 extrai sujeira sólida e líquida com baixo ruído — ideal para hotel ocupado. Quantos quartos ou m² de carpete vocês têm, e em qual cidade?'],
      ['L', 'Belém, uns 60 quartos. Vou ver com o gerente e retorno'],
      ['A', 'Combinado! Fico à disposição.'],
      ['S', 'Follow-up automático enviado (D+7) — sem resposta.', D('2026-10-28', '09:00')],
      ['S', 'Follow-up automático enviado (D+14) — sem resposta. Card movido para Perdido (Sem Retorno).', D('2026-11-04', '09:00')],
    ],
  },
  {
    id: 'ld_023',
    name: 'Sérgio Matos',
    phone: '+5591985531207',
    isB2B: false,
    city: 'Belém',
    uf: 'PA',
    stage: 'LOST',
    origin: 'Site_Organico',
    channel: 'WIDGET',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-03', '19:42'),
    closedAt: D('2026-11-04', '08:30'),
    loss: 'CURIOSO_RESIDENCIAL',
    lossNotes: 'Uso doméstico (calçada e carro).',
    script: [
      ['L', 'Oi, quanto custa a lavadora de alta pressão? É pra lavar a calçada e o carro aqui de casa'],
      ['A', 'Oi, Sérgio! Nossos equipamentos Alfa Tennant são profissionais e industriais, pensados para empresas — para uso doméstico eles acabam ficando superdimensionados. Se tiver alguma demanda de empresa ou condomínio, posso te ajudar a dimensionar!'],
      ['L', 'Ah não, é só pra casa mesmo. Valeu'],
      ['A', 'Imagina! Se precisar no futuro, é só chamar.'],
    ],
  },
  {
    id: 'ld_024',
    name: 'Kátia Ramos',
    phone: '+5591983349016',
    company: 'Buffet Estrela Eventos',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'OUTRO',
    area: 900,
    floor: 'porcelanato',
    dirt: 'alto_trafego',
    city: 'Ananindeua',
    uf: 'PA',
    rec: [['m_a260', 'A260 até 2.000 m²/h: lava os 900 m² do salão em menos de 30 min.']],
    stage: 'LOST',
    origin: 'Google_Ads_Compra',
    campaignId: 'c_g_compra',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-05', '16:48'),
    closedAt: D('2026-11-05', '17:40'),
    loss: 'PRAZO',
    lossNotes: 'Precisava da máquina no dia seguinte às 6h; frota de A260 toda alocada.',
    utmTerm: 'lavadora de piso porcelanato',
    script: [
      ['L', 'Preciso alugar uma lavadora pra amanhã cedo, evento grande no salão'],
      ['A', 'Oi, Kátia! Vamos ver isso. Qual a área do salão e o tipo de piso? E fica em qual cidade?'],
      ['L', 'Ananindeua, 900 m² porcelanato'],
      ['A', 'Para 900 m² de porcelanato, a A260 resolve bem (até 2.000 m²/h). Prazos de entrega são confirmados pela equipe comercial — vou pedir ao Vinicius para verificar a disponibilidade para amanhã cedo.'],
      ['H', 'Kátia, boa tarde! Vinicius aqui. Infelizmente nossa frota de A260 está toda alocada até sexta. Se tiver outro evento, me chama com antecedência que reservo para você.', 22],
      ['L', 'Que pena. Obrigada'],
    ],
  },
  {
    id: 'ld_025',
    name: 'Rodrigo Pantoja',
    phone: '+5596984410077',
    company: 'Macapá Center Shopping',
    isB2B: true,
    segment: 'SHOPPING',
    floor: 'externo_asfalto',
    dirt: 'detritos_solidos',
    city: 'Macapá',
    uf: 'AP',
    stage: 'LOST',
    origin: 'WhatsApp_Direto',
    channel: 'WHATSAPP',
    attrChannel: 'WHATSAPP_DIRECT',
    createdAt: D('2026-10-14', '10:22'),
    closedAt: D('2026-10-30', '09:00'),
    loss: 'SEM_RETORNO',
    lossNotes: 'Ficou de enviar a planta do estacionamento.',
    script: [
      ['L', 'Olá, trabalho na manutenção de um shopping em Macapá, queria ver máquina pra estacionamento'],
      ['A', 'Olá, Rodrigo! Para estacionamento normalmente indicamos varredeira. Qual a área aproximada e se é coberto ou descoberto?'],
      ['L', 'Descoberto, grande. Vou pegar a planta'],
      ['A', 'Perfeito! Com a metragem eu já indico o modelo ideal (Alfa Bizz ou S16, dependendo do tamanho).'],
      ['S', 'Follow-up automático enviado (D+7) — sem resposta.', D('2026-10-21', '09:00')],
    ],
  },
  // ───────── QUALIFYING ─────────
  {
    id: 'ld_010',
    name: 'Paulo Henrique Batista',
    phone: '+5593991820476',
    company: 'Rede Tapajós Hotéis',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'HOSPITAL_HOTEL_ESCOLA',
    city: 'Santarém',
    uf: 'PA',
    stage: 'QUALIFYING',
    origin: 'Meta_CTWA_Brava',
    campaignId: 'c_m_ctwa',
    channel: 'WHATSAPP',
    attrChannel: 'META_AD',
    createdAt: D('2026-11-20', '08:55'),
    utmContent: 'carrossel_brava_s16',
    notes: 'Insistiu em preço (guardrail ativo). Aguardando metragem.',
    script: [
      ['L', 'Bom dia. Quanto é o aluguel da Brava por mês?'],
      ['A', 'Bom dia, Paulo! O valor da locação depende do período e da configuração, por isso o orçamento oficial é feito pela equipe comercial. Para eu já deixar tudo dimensionado: qual o tipo de espaço e a área que precisa limpar?'],
      ['L', 'Me fala pelo menos o valor aproximado do aluguel da Brava'],
      ['A', 'Entendo a pressa! Não consigo passar valores, nem aproximados, porque cada proposta é personalizada pelo Vinicius Goés conforme prazo e uso. Me conta só a metragem e a cidade que eu agilizo o orçamento oficial para você ainda hoje.'],
      ['L', 'É um hotel em Santarém. Lobby, restaurante e área de eventos'],
      ['A', 'Ótimo, hotel em Santarém — atendemos sim. Somando lobby, restaurante e eventos, qual a área aproximada em m²? E o piso é porcelanato, granito ou tem carpete?'],
    ],
  },
  {
    id: 'ld_011',
    name: 'Camila Duarte',
    phone: '+5598991604432',
    email: 'facilities@litoraneashopping.com.br',
    company: 'Litorânea Shopping Center',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'SHOPPING',
    floor: 'porcelanato',
    dirt: 'alto_trafego',
    routine: 'Manutenção diurna + lavagem pesada de madrugada',
    city: 'São Luís',
    uf: 'MA',
    stage: 'QUALIFYING',
    origin: 'Google_Ads_Locacao',
    campaignId: 'c_g_locacao',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-18', '15:10'),
    utmTerm: 'locação lavadora shopping',
    script: [
      ['L', 'Olá, somos da administração de um shopping em São Luís e queremos cotar locação de lavadora para os corredores'],
      ['A', 'Olá, Camila! Que ótimo. Qual a área aproximada dos corredores e da praça de alimentação? E o piso é porcelanato ou granito?'],
      ['L', 'Porcelanato. A metragem exata vou pegar com a equipe de facilities'],
      ['A', 'Combinado! Só com uma estimativa já consigo dimensionar (ex.: 5 mil, 10 mil m²). A lavagem pesada é feita com o shopping fechado, de madrugada?'],
      ['L', 'Sim, de madrugada. Te retorno amanhã com a metragem'],
      ['A', 'Perfeito, Camila. Fico no aguardo!'],
    ],
  },
  {
    id: 'ld_012',
    name: 'Rosângela Pinheiro',
    phone: '+5591992081123',
    email: 'rosangela@brilhonorte.com.br',
    company: 'Brilho Norte Facilities',
    cnpj: '14.209.663/0001-40',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'PRESTADORA_LIMPEZA',
    floor: 'porcelanato',
    dirt: 'alto_trafego',
    routine: '3 prédios comerciais (~800 m²/andar, limpeza diária) + 1 hospital (vinílico)',
    city: 'Belém',
    uf: 'PA',
    stage: 'QUALIFYING',
    origin: 'Outbound_CNAE',
    channel: 'WHATSAPP',
    attrChannel: 'OUTBOUND',
    createdAt: D('2026-11-17', '10:05'),
    prospectId: 'pr_004',
    script: [
      ['S', 'Lead originado da sequência de prospecção (e-mail 2/4) — Brilho Norte Facilities, CNAE 8121-4/00.'],
      ['L', 'Bom dia, recebi o e-mail de vocês. Temos contratos de limpeza em 3 prédios comerciais e um hospital. Vocês alugam máquinas por contrato?'],
      ['A', 'Bom dia, Rosângela! Sim, a Maquinabel faz locação de curto e longo prazo, com equipamentos revisados e higienizados antes da entrega. Para dimensionar: qual a área aproximada de cada local e que tipo de piso predomina?'],
      ['L', 'Os prédios têm uns 800 m² por andar, piso porcelanato. O hospital é maior, vinílico, ainda vou ver a área'],
      ['A', 'Ótimo. Nos prédios a limpeza é diária por andar? E no hospital há áreas de carpete ou só vinílico?'],
      ['L', 'Diária. Hospital só vinílico. Te mando a área do hospital amanhã'],
      ['A', 'Perfeito! Com a área do hospital eu fecho o dimensionamento dos 4 contratos e já encaminho ao Vinicius.'],
    ],
  },
  {
    id: 'ld_013',
    name: 'Edson Farias',
    phone: '+5591987650034',
    company: 'MetalBar Usinagem',
    isB2B: true,
    segment: 'INDUSTRIA',
    area: 1500,
    floor: 'cimento_queimado',
    dirt: 'graxa_oleo',
    city: 'Barcarena',
    uf: 'PA',
    rec: [['m_t600e', 'Construção robusta para óleo de usinagem e cavaco em 1.500 m² de piso industrial.']],
    stage: 'QUALIFYING',
    origin: 'Google_Ads_Compra',
    campaignId: 'c_g_compra',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-19', '14:30'),
    utmTerm: 'maquina para limpar oleo do chao fabrica',
    script: [
      ['L', 'Boa tarde. Preciso de uma máquina que tire óleo do chão de fábrica'],
      ['A', 'Boa tarde, Edson! Temos opções robustas para isso. Qual a área aproximada e o tipo de piso?'],
      ['L', 'Uns 1.500 m², cimento queimado. Óleo de usinagem e cavaco'],
      ['A', 'Entendi, sujeira pesada. Em qual cidade fica a fábrica? E vocês pensam em comprar ou alugar?'],
      ['L', 'Barcarena. Ainda não sei, depende do valor'],
      ['A', 'Faz sentido. Conseguimos montar as duas opções (compra e locação) no orçamento oficial. Para esse perfil, a tendência é a T600e, construída para pisos industriais severos. Prefere que o Vinicius já prepare as duas propostas?'],
    ],
  },
  {
    id: 'ld_014',
    name: 'Márcia Lopes',
    ig: '@colegiointegrado.itz',
    company: 'Colégio Integrado Imperatriz',
    isB2B: true,
    segment: 'HOSPITAL_HOTEL_ESCOLA',
    area: 2200,
    floor: 'externo_asfalto',
    dirt: 'detritos_solidos',
    power: 'manual',
    city: 'Imperatriz',
    uf: 'MA',
    rec: [['m_alfa_bizz', 'Varredeira manual silenciosa (sem bateria/cabo), até 3.400 m²/h para 2.200 m² de pátio.']],
    stage: 'QUALIFYING',
    origin: 'IG_Direct',
    channel: 'INSTAGRAM',
    attrChannel: 'IG_DM',
    createdAt: D('2026-11-18', '09:20'),
    script: [
      ['L', 'Oi! Vocês têm varredeira para pátio de escola?'],
      ['A', 'Oi, Márcia! Temos sim. Qual o tamanho aproximado do pátio e em qual cidade fica a escola?'],
      ['L', 'Imperatriz. Uns 2.200 m², piso de concreto e uma parte de quadra'],
      ['A', 'Para esse tamanho, a Alfa Bizz é ótima: varredeira manual silenciosa (não usa bateria nem cabo), até 3.400 m²/h. A escola pensa em comprar ou alugar?'],
    ],
  },
  {
    id: 'ld_015',
    name: 'Gilberto Sousa',
    phone: '+5598988427710',
    company: 'Panificadora Pão Dourado',
    isB2B: true,
    segment: 'ALIMENTOS_BEBIDAS',
    area: 180,
    floor: 'ceramica',
    dirt: 'graxa_oleo',
    city: 'São Luís',
    uf: 'MA',
    rec: [
      ['m_imop_lite', 'Compacta para cozinha + salão de 180 m² com gordura; giro 360°.'],
      ['m_alfa_mini', 'Micro lavadora com água limpa, substitui mop e balde.'],
    ],
    stage: 'QUALIFYING',
    origin: 'Site_Organico',
    channel: 'WIDGET',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-19', '19:40'),
    script: [
      ['L', 'Boa noite, tenho uma padaria e quero melhorar a limpeza da cozinha, o chão fica muito engordurado'],
      ['A', 'Boa noite, Gilberto! Cozinha engordurada pede uma lavadora compacta. Qual o tamanho aproximado da cozinha + salão e em qual cidade?'],
      ['L', 'São Luís, no Turu. Cozinha uns 80 m² e salão 100 m², cerâmica'],
      ['A', 'Obrigado! Para 180 m² com gordura, a i-mop Lite ou a Alfa Mini resolvem bem por serem compactas e lavarem com água limpa. Vocês preferem comprar ou alugar?'],
    ],
  },
  {
    id: 'ld_016',
    name: 'Ricardo Bastos',
    phone: '+5591984127765',
    company: 'Auto Posto Rota 010',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'OUTRO',
    floor: 'externo_asfalto',
    dirt: 'graxa_oleo',
    power: 'cabo',
    city: 'Paragominas',
    uf: 'PA',
    rec: [['m_alfa_pressure_400', 'Lavagem pesada de pista e troca de óleo: 2.320 lbs máx., 600 L/h, INMETRO.']],
    stage: 'QUALIFYING',
    origin: 'Google_Ads_Compra',
    campaignId: 'c_g_compra',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-20', '07:52'),
    utmTerm: 'lavadora alta pressao profissional posto',
    script: [
      ['L', 'Bom dia, vocês têm lavadora de alta pressão pra posto?'],
      ['A', 'Bom dia, Ricardo! Temos a Alfa Pressure 400: 2.320 lbs de pressão máxima, 600 L/h e certificação INMETRO, feita para lavagem pesada de pista e frota. Em qual cidade fica o posto? E seria compra ou locação?'],
      ['L', 'Paragominas, compra. Quero lavar a pista e a área da troca de óleo'],
      ['A', 'Perfeito. Qual o tamanho aproximado da pista e da área de troca de óleo? Assim confirmo se uma unidade dá conta.'],
    ],
  },
  // ───────── NEW ─────────
  {
    id: 'ld_017',
    name: 'Ana Beatriz Rocha',
    phone: '+5591996302281',
    city: 'Belém',
    uf: 'PA',
    stage: 'NEW',
    origin: 'Site_Brava',
    channel: 'WIDGET',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-20', '10:05'),
    script: [
      ['L', 'Olá, gostaria de informações sobre a lavadora Brava'],
      ['A', 'Olá, Ana Beatriz! Fico feliz em ajudar. A Brava é para empresa ou condomínio? E qual a área aproximada a ser lavada?'],
    ],
  },
  {
    id: 'ld_018',
    name: 'Wesley Cardoso',
    phone: '+5591981770442',
    stage: 'NEW',
    origin: 'Google_Ads_Locacao',
    campaignId: 'c_g_locacao',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-20', '10:21'),
    utmTerm: 'aluguel de lavadora de piso',
    script: [
      ['L', 'Bom dia, vcs alugam lavadora de piso?'],
      ['A', 'Bom dia, Wesley! Alugamos sim — por dia, mês ou contratos longos, com a máquina revisada e higienizada. Para qual tipo de espaço seria e em qual cidade?'],
    ],
  },
  {
    id: 'ld_019',
    name: 'Leonardo Prado',
    ig: '@leoprado.eng',
    stage: 'NEW',
    origin: 'IG_Reels_Brava',
    campaignId: 'c_m_reels',
    channel: 'INSTAGRAM',
    attrChannel: 'IG_COMMENT',
    createdAt: D('2026-11-20', '09:48'),
    igMediaId: '18051190834470021',
    utmContent: 'reels_brava_shopping',
    script: [
      ['S', 'Comentário no Reels Brava: “preço?” — resposta pública enviada e Direct iniciado (IG_Reels_Brava).'],
      ['A', 'Oi, Leonardo! Vi seu interesse na Brava. O orçamento é personalizado conforme o espaço — me conta: é para qual tipo de ambiente e qual a área aproximada?'],
    ],
  },
  {
    id: 'ld_020',
    name: 'Francisco Viana',
    phone: '+5599984115590',
    company: 'Atacadão do Povo',
    isB2B: true,
    segment: 'SUPERMERCADO_ATACAREJO',
    city: 'Bacabal',
    uf: 'MA',
    stage: 'NEW',
    origin: 'Outbound_Places',
    channel: 'WHATSAPP',
    attrChannel: 'OUTBOUND',
    createdAt: D('2026-11-20', '08:31'),
    prospectId: 'pr_011',
    script: [
      ['S', 'Resposta ao template de prospecção (WhatsApp 1/3) — Atacadão do Povo, Bacabal-MA (Google Places, nota 4,3).'],
      ['L', 'Bom dia. Tenho interesse sim, quem fala?'],
      ['A', 'Bom dia, Francisco! Aqui é o consultor técnico virtual da Maquinabel, concessionária Alfa Tennant com filial em São Luís. Hoje a limpeza do piso da loja é feita com máquina ou manualmente?'],
    ],
  },
  {
    id: 'ld_021',
    name: 'Joelma Freitas',
    phone: '+5591993308871',
    city: 'Abaetetuba',
    uf: 'PA',
    stage: 'NEW',
    origin: 'Meta_CTWA_Brava',
    campaignId: 'c_m_ctwa',
    channel: 'WHATSAPP',
    attrChannel: 'META_AD',
    createdAt: D('2026-11-20', '10:27'),
    noClickId: true,
    script: [
      ['L', 'Olá! Quero mais informações'],
      ['A', 'Olá, Joelma! Obrigado pelo contato. Você procura uma máquina para compra, locação ou manutenção? E para qual tipo de espaço?'],
    ],
  },
  // ───────── DISQUALIFIED ─────────
  {
    id: 'ld_004',
    name: 'Marcos Teixeira',
    phone: '+5511987342210',
    company: 'Galpão Paulista Logística',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'CD_LOGISTICA',
    area: 3000,
    city: 'Guarulhos',
    uf: 'SP',
    stage: 'DISQUALIFIED',
    origin: 'Site_Organico',
    channel: 'WIDGET',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-10-30', '15:22'),
    loss: 'FORA_REGIAO',
    script: [
      ['L', 'Olá, preciso de locação de lavadora para galpão de 3.000 m²'],
      ['A', 'Olá, Marcos! Posso ajudar a dimensionar. Em qual cidade e estado fica o galpão?'],
      ['L', 'Guarulhos, SP'],
      ['A', 'Obrigado pela informação! A Maquinabel atende Pará, Maranhão e Amapá, então infelizmente não conseguimos atender Guarulhos com locação e assistência técnica local. Recomendo procurar um distribuidor Tennant autorizado em São Paulo. Se tiver alguma operação no PA, MA ou AP, conte com a gente!'],
      ['L', 'Ah ok, obrigado'],
      ['S', 'DISQUALIFIED'],
    ],
  },
  {
    id: 'ld_026',
    name: 'Hélio Bezerra',
    phone: '+5585988102274',
    company: 'Distribuidora Ceará Frios',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'ALIMENTOS_BEBIDAS',
    city: 'Fortaleza',
    uf: 'CE',
    stage: 'DISQUALIFIED',
    origin: 'Meta_CTWA_Brava',
    campaignId: 'c_m_ctwa',
    channel: 'WHATSAPP',
    attrChannel: 'META_AD',
    createdAt: D('2026-10-26', '11:05'),
    loss: 'FORA_REGIAO',
    script: [
      ['L', 'Bom dia, tenho interesse na Brava para minha câmara fria'],
      ['A', 'Bom dia, Hélio! Ótima escolha para áreas grandes. Em qual cidade e estado fica a operação?'],
      ['L', 'Fortaleza-CE'],
      ['A', 'Obrigado! A Maquinabel atende Pará, Maranhão e Amapá, por isso não conseguimos oferecer entrega e assistência técnica em Fortaleza. Vale procurar o distribuidor Alfa Tennant do Ceará. Se tiver alguma unidade no PA, MA ou AP, estamos à disposição!'],
      ['S', 'DISQUALIFIED'],
    ],
  },
  {
    id: 'ld_027',
    name: 'Priscila Andrade',
    phone: '+5592991450038',
    company: 'Amazon Log Armazéns',
    isB2B: true,
    modality: 'LOCACAO',
    segment: 'CD_LOGISTICA',
    area: 7000,
    city: 'Manaus',
    uf: 'AM',
    stage: 'DISQUALIFIED',
    origin: 'Google_Ads_Locacao',
    campaignId: 'c_g_locacao',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-09', '14:47'),
    loss: 'FORA_REGIAO',
    utmTerm: 'aluguel varredeira industrial',
    script: [
      ['L', 'Boa tarde! Vocês alugam varredeira industrial para Manaus?'],
      ['A', 'Boa tarde, Priscila! No momento a Maquinabel atende Pará, Maranhão e Amapá, então não conseguimos atender Manaus com locação e assistência técnica. Se tiver alguma operação nesses estados, me avise que dimensiono para você!'],
      ['L', 'Entendi, obrigada'],
      ['S', 'DISQUALIFIED'],
    ],
  },
  {
    id: 'ld_028',
    name: 'Valdir Nogueira',
    phone: '+5586994408812',
    company: 'Clean Piauí Serviços',
    isB2B: true,
    modality: 'MANUTENCAO_PECAS',
    segment: 'PRESTADORA_LIMPEZA',
    city: 'Teresina',
    uf: 'PI',
    stage: 'DISQUALIFIED',
    origin: 'Google_Ads_Pecas',
    campaignId: 'c_g_pecas',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-11-11', '09:16'),
    loss: 'FORA_REGIAO',
    utmTerm: 'peças lavadora tennant',
    script: [
      ['L', 'Bom dia, preciso de escova para lavadora A260, vocês enviam para Teresina?'],
      ['A', 'Bom dia, Valdir! Nossa assistência técnica e venda de peças atende Pará, Maranhão e Amapá. Para Teresina, o ideal é o distribuidor autorizado Alfa Tennant do Piauí, que consegue dar suporte local.'],
      ['L', 'Ok'],
      ['S', 'DISQUALIFIED'],
    ],
  },
  {
    id: 'ld_029',
    name: 'João Vitor',
    ig: '@joaovitor_92',
    isB2B: false,
    city: 'Belém',
    uf: 'PA',
    stage: 'DISQUALIFIED',
    origin: 'IG_Direct',
    channel: 'INSTAGRAM',
    attrChannel: 'IG_DM',
    createdAt: D('2026-11-13', '13:12'),
    loss: 'CURIOSO_RESIDENCIAL',
    convState: 'CLOSED',
    notes: 'Busca de emprego (operador de máquinas).',
    script: [
      ['L', 'Boa tarde, vocês estão contratando operador de máquina?'],
      ['A', 'Boa tarde, João! Este canal é dedicado ao atendimento comercial. Para oportunidades de trabalho, envie seu currículo para comercial@maquinabel.com.br com o assunto “Trabalhe conosco”. Boa sorte!'],
      ['L', 'Valeu!'],
    ],
  },
  {
    id: 'ld_030',
    name: 'Felipe Arantes',
    phone: '+5562982217754',
    company: 'Atacadista Centro-Oeste',
    isB2B: true,
    modality: 'COMPRA',
    segment: 'SUPERMERCADO_ATACAREJO',
    area: 12000,
    city: 'Goiânia',
    uf: 'GO',
    stage: 'DISQUALIFIED',
    origin: 'Google_Ads_Robotica',
    campaignId: 'c_g_robotica',
    channel: 'WHATSAPP',
    attrChannel: 'WEB_WIDGET',
    createdAt: D('2026-10-29', '10:58'),
    loss: 'FORA_REGIAO',
    utmTerm: 'robo de limpeza industrial',
    script: [
      ['L', 'Bom dia, quero cotar o robô T16AMR para um atacado de 12 mil m²'],
      ['A', 'Bom dia, Felipe! O T16AMR é ideal para esse porte. Em qual cidade e estado fica a loja?'],
      ['L', 'Goiânia'],
      ['A', 'Obrigado! A Maquinabel atende Pará, Maranhão e Amapá, então para Goiânia o ideal é o distribuidor Tennant da sua região, que garante implantação e assistência técnica local.'],
      ['S', 'DISQUALIFIED'],
    ],
  },
]

// ───────────────────────── Builder ─────────────────────────

function clickId(prefix: string, seed: string, len = 38): string {
  const rnd = seededRandom(hashString(seed))
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
  let s = prefix
  while (s.length < len) s += chars[Math.floor(rnd() * chars.length)]
  return s
}

function buildSummary(l: LeadSeed, recs: RecommendedModel[]): [string, string, string, string] {
  const phone = l.phone ? `wa.me/${l.phone.replace('+', '')}` : l.ig ?? '—'
  const line1 = `${l.name} · ${l.company ?? 'Empresa não informada'} · ${phone} · ${l.city ?? '?'}-${l.uf ?? '?'}`
  const line2 = `${l.modality ? MODALITY_LABEL[l.modality] : 'Modalidade a confirmar'} · Origem: ${l.origin}`
  const tech = [
    l.segment ? SEGMENT_LABEL[l.segment] : null,
    l.area ? `${l.area.toLocaleString('pt-BR')} m²` : null,
    l.floor ? FLOOR_LABEL[l.floor] : null,
    l.dirt ? DIRT_LABEL[l.dirt] : null,
    l.routine,
  ]
    .filter(Boolean)
    .join(' · ')
  const line3 = tech || 'Perfil técnico a levantar (lead pediu atendimento humano)'
  const line4 = recs.length
    ? `${recs.map((r) => r.modelName).join(' + ')} — ${recs[0].reason} → /crm?lead=${l.id}`
    : `Sem recomendação ainda → /crm?lead=${l.id}`
  return [line1, line2, line3, line4]
}

const systemText: Record<string, (l: LeadSeed) => string> = {
  HANDOFF: () => 'Lead qualificado. Resumo de 4 linhas enviado ao Vinicius Goés via WhatsApp (template novo_lead_qualificado). IA pausada automaticamente.',
  HANDOFF_AFTER_HOURS: () =>
    'Lead qualificado fora do horário comercial. Resumo enviado ao Vinicius Goés (template novo_lead_qualificado); retorno previsto para o próximo dia útil às 08:00. IA pausada.',
  HUMAN_REQUESTED: () => 'Lead pediu atendimento humano (HUMAN_REQUESTED). IA pausada e Vinicius Goés notificado via template novo_lead_qualificado.',
  DISQUALIFIED: (l) => `Lead fora da área de cobertura (${l.uf}). Marcado como DISQUALIFIED_OUT_OF_REGION — Vinicius não foi notificado.`,
}

export const seedLeads: Lead[] = []
export const seedConversations: Conversation[] = []
export const seedMessages: Message[] = []
export const seedAttributions: LeadAttribution[] = []
export const seedHandoffEvents: HandoffEvent[] = []

for (const l of SEED_LEADS) {
  const rnd = seededRandom(hashString(l.id))
  const convId = `cv_${l.id.slice(3)}`
  const msgs: Message[] = []
  let t = l.createdAt
  let handoffAt: string | null = null
  let humanFirst: string | null = null
  let firstLead: string | null = null
  let firstAi: string | null = null
  let aiTurn = 0

  for (const [i, line] of l.script.entries()) {
    const [sender, rawText, timing] = line
    if (i > 0 || timing !== undefined) {
      if (typeof timing === 'string') t = timing
      else if (typeof timing === 'number') t = addSeconds(t, Math.round(timing * 60))
      else if (sender === 'A') t = addSeconds(t, Math.round(3.5 + rnd() * 5))
      else if (sender === 'S') t = addSeconds(t, 3)
      else if (sender === 'L') t = addSeconds(t, Math.round(50 + rnd() * 170))
      else t = addSeconds(t, Math.round(120 + rnd() * 240))
    }
    let text = rawText
    if (sender === 'S' && systemText[rawText]) {
      text = systemText[rawText](l)
      if (rawText.startsWith('HANDOFF') || rawText === 'HUMAN_REQUESTED') handoffAt = t
    }
    const base: Message = {
      id: `${convId}_m${String(i + 1).padStart(2, '0')}`,
      conversationId: convId,
      direction: sender === 'L' ? 'INBOUND' : 'OUTBOUND',
      senderType: sender === 'L' ? 'LEAD' : sender === 'A' ? 'AI' : sender === 'H' ? 'HUMAN_AGENT' : 'SYSTEM',
      text,
      createdAt: t,
      status: sender === 'L' ? 'READ' : 'READ',
      metaMessageId: sender === 'S' ? null : `wamid.HBgM${hashString(convId + i).toString(36).toUpperCase()}`,
    }
    if (sender === 'A') {
      aiTurn += 1
      const prev = msgs[msgs.length - 1]
      const latencyMs = prev ? new Date(t).getTime() - new Date(prev.createdAt).getTime() : 4200
      const tokensIn = 2650 + aiTurn * 140 + Math.round(rnd() * 80)
      const tokensOut = Math.ceil(text.length / 3.6) + 60
      Object.assign(base, {
        llmTokensIn: tokensIn,
        llmTokensOut: tokensOut,
        llmCostUsd: Number(((tokensIn * 0.15 + tokensOut * 0.6) / 1_000_000).toFixed(6)),
        latencyMs: Math.max(2800, latencyMs),
        model: 'gpt-4o-mini',
      })
      if (!firstAi) firstAi = t
    }
    if (sender === 'H') {
      base.authorUserId = VINICIUS_ID
      if (!humanFirst) humanFirst = t
    }
    if (sender === 'S' && (rawText.startsWith('HANDOFF') || rawText === 'HUMAN_REQUESTED')) base.template = 'novo_lead_qualificado'
    if (sender === 'L' && !firstLead) firstLead = t
    msgs.push(base)
  }

  // last messages from lead in active convs are not yet read
  const last = msgs[msgs.length - 1]
  let unread = 0
  if (['NEW', 'QUALIFYING', 'HANDOFF'].includes(l.stage)) {
    for (let k = msgs.length - 1; k >= 0 && msgs[k].senderType === 'LEAD'; k--) {
      msgs[k].status = 'DELIVERED'
      unread++
    }
  }
  seedMessages.push(...msgs)

  const recs: RecommendedModel[] = (l.rec ?? []).map(([machineId, reason]) => {
    const m = machines.find((x) => x.id === machineId)!
    return { machineId, modelName: m.model, reason, productivityM2h: m.practicalM2h ?? m.productivityM2h ?? undefined }
  })

  const handedOff = !!handoffAt
  const summary = handedOff ? buildSummary(l, recs) : null
  const aiPaused = ['HANDOFF', 'PROPOSAL_SENT', 'WON', 'LOST'].includes(l.stage) && (handedOff || !!humanFirst)

  const convState: ConversationState =
    l.convState ??
    (l.stage === 'NEW'
      ? 'NEW'
      : l.stage === 'QUALIFYING'
        ? 'QUALIFYING'
        : l.stage === 'HANDOFF'
          ? humanFirst
            ? 'HUMAN_ACTIVE'
            : l.humanRequested
              ? 'HUMAN_REQUESTED'
              : 'QUALIFIED_HANDOFF'
          : l.stage === 'PROPOSAL_SENT'
            ? 'HUMAN_ACTIVE'
            : l.stage === 'DISQUALIFIED'
              ? 'DISQUALIFIED_OUT_OF_REGION'
              : 'CLOSED')

  const sla = l.slaOverride ?? (handoffAt && humanFirst ? Math.round(diffMinutes(humanFirst, handoffAt) * 10) / 10 : null)

  const lastLead = [...msgs].reverse().find((m) => m.senderType === 'LEAD')
  const lastAi = [...msgs].reverse().find((m) => m.senderType === 'AI')

  seedConversations.push({
    id: convId,
    leadId: l.id,
    channel: l.channel,
    state: convState,
    aiPaused,
    lastUserMessageAt: lastLead?.createdAt ?? null,
    lastAiResponseAt: lastAi?.createdAt ?? null,
    lastMessageAt: last.createdAt,
    firstResponseMs: firstAi
      ? new Date(firstAi).getTime() - new Date(firstLead && firstLead < firstAi ? firstLead : l.createdAt).getTime() - 600 + Math.round(rnd() * 900)
      : null,
    handoffAt,
    humanFirstResponseAt: handedOff ? humanFirst : null,
    humanSlaMinutes: sla,
    unreadCount: unread,
    createdAt: l.createdAt,
    updatedAt: last.createdAt,
  })

  // Attribution
  const utm = l.campaignId ? CAMPAIGN_UTM[l.campaignId] : null
  const isGoogle = l.origin.startsWith('Google')
  const isMeta = l.origin.startsWith('Meta') || l.origin.startsWith('IG_Reels')
  const attrId = `at_${l.id.slice(3)}`
  const sessionCode = `MQ-${4000 + (hashString(l.id) % 5999)}`
  const landing =
    l.origin === 'Site_Brava'
      ? 'https://vendas.maquinabel.com.br/brava'
      : l.origin === 'Site_Organico'
        ? 'https://maquinabel.com.br/maquinas/'
        : utm?.landing ?? null
  seedAttributions.push({
    id: attrId,
    leadId: l.id,
    sessionCode: l.id === 'ld_001' ? 'MQ-4821' : sessionCode,
    channel: l.attrChannel,
    landingUrl: landing,
    referrer: isGoogle ? 'https://www.google.com/' : l.origin === 'Site_Organico' ? 'https://www.google.com/' : isMeta ? 'https://l.instagram.com/' : null,
    utmSource: utm?.source ?? (l.origin.startsWith('Site') ? 'organic' : l.origin.startsWith('Outbound') ? (l.origin === 'Outbound_CNAE' ? 'resend' : 'whatsapp_template') : null),
    utmMedium: utm?.medium ?? (l.origin.startsWith('Outbound') ? 'outbound' : null),
    utmCampaign: utm?.campaign ?? (l.origin.startsWith('Outbound') ? 'prospeccao_icp_pa_ma_ap' : null),
    utmTerm: l.utmTerm ?? null,
    utmContent: l.utmContent ?? null,
    gclid: isGoogle && !l.noClickId ? clickId('Cj0KCQiA', l.id) : null,
    fbclid: l.origin.startsWith('Meta') && !l.noClickId ? clickId('IwAR', l.id, 40) : null,
    igMediaId: l.igMediaId ?? null,
    createdAt: l.createdAt,
  })

  const stageChangedAt = l.closedAt ?? l.proposalAt ?? handoffAt ?? last.createdAt
  seedLeads.push({
    id: l.id,
    tenantId: TENANT_ID,
    name: l.name,
    phoneE164: l.phone ?? null,
    email: l.email ?? null,
    igUsername: l.ig ?? null,
    companyName: l.company ?? null,
    cnpj: l.cnpj ?? null,
    isB2B: l.isB2B ?? null,
    modality: l.modality ?? null,
    segment: l.segment ?? null,
    areaM2: l.area ?? null,
    floorType: l.floor ?? null,
    dirtProfile: l.dirt ?? null,
    powerPreference: l.power ?? null,
    usageRoutine: l.routine ?? null,
    locationCity: l.city ?? null,
    locationState: l.uf ?? null,
    recommendedModels: recs,
    handoffSummary: summary,
    kanbanStage: l.stage,
    proposalValueBRL: l.proposal ?? null,
    closedValueBRL: l.closed ?? null,
    closedModality: l.closedModality ?? null,
    rentalMonths: l.rentalMonths ?? null,
    rentalMonthlyBRL: l.rentalMonthly ?? null,
    lossReason: l.loss ?? null,
    lossNotes: l.lossNotes ?? null,
    originTag: l.origin,
    campaignId: l.campaignId ?? null,
    conversationId: convId,
    attributionId: attrId,
    prospectId: l.prospectId ?? null,
    notes: l.notes ?? null,
    lgpdConsentAt: l.channel === 'WIDGET' || l.attrChannel === 'WEB_WIDGET' ? l.createdAt : null,
    sqlAt: l.sql ? handoffAt : null,
    handoffAt,
    proposalAt: l.proposalAt ?? null,
    closedAt: l.closedAt ?? null,
    stageChangedAt,
    createdAt: l.createdAt,
    updatedAt: last.createdAt,
  })

  if (handoffAt) {
    seedHandoffEvents.push({
      id: `ho_${l.id.slice(3)}`,
      leadId: l.id,
      conversationId: convId,
      assignedUserId: VINICIUS_ID,
      triggerReason: l.humanRequested ? 'HUMAN_REQUESTED' : 'QUALIFIED',
      summaryLines: summary ?? [],
      whatsappDeliveryStatus: humanFirst ? 'READ' : 'DELIVERED',
      notifiedAt: addSeconds(handoffAt, 2),
      acknowledgedAt: humanFirst,
      afterHours: !isBusinessHours(handoffAt),
    })
  }
}

seedLeads.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
