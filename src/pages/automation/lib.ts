import type { OptimizationLog, OptimizationRun, OutboundProspect, SearchTermClass } from '@/types/domain'
import * as api from '@/mock/api'
import { useAutomationStore, useCampaignStore, useNotificationStore } from '@/store'
import { addMinutes, addSeconds, belem, fakeSha256, nowISO, seededRandom, uid } from '@/lib/utils'

export type OnStep = (index: number, step: api.ProgressStep | null, pct: number) => void

export type TabKey = 'otimizador' | 'capi' | 'outbound' | 'instagram' | 'webhooks'

// ───────────────────────── Search-term optimizer (local runner w/ scenario 12) ─────────────────────────

export const OPTIMIZER_STEPS = [
  'GoogleAdsService.SearchStream · baixando relatório de termos (últimos 7 dias)',
  'gpt-4o-mini · classificando intenção (ICP B2B × residencial/varejo)',
  'CampaignCriterionService · injetando negativas nas campanhas ativas',
  'Gravando ad_optimization_logs',
  'WhatsApp Cloud API · enviando digest ao Vinicius',
]

type TermDef = [term: string, cls: SearchTermClass, negative: string | null, reason: string, campaignId: string]

/** Golden scenario 12 terms are always present in a manual run. */
const SCENARIO_12: TermDef[] = [
  ['lavadora de alta pressão residencial karcher', 'RESIDENCIAL', 'residencial karcher', 'Intenção doméstica: lavadora residencial de marca de varejo (Kärcher).', 'c_g_compra'],
  ['varredeira industrial tennant', 'ICP_B2B', null, 'Termo de marca + "industrial": alta intenção B2B, alinhado ao catálogo Alfa Tennant.', 'c_g_compra'],
]

const TERM_POOL: TermDef[] = [
  ['lavadora de piso residencial pequena', 'RESIDENCIAL', 'residencial pequena', 'Uso residencial, ticket incompatível.', 'c_g_compra'],
  ['aluguel lavadora brava belem', 'ICP_B2B', null, 'Locação Brava dentro da cobertura (PA) — ICP.', 'c_g_locacao'],
  ['karcher fc3 preço', 'RESIDENCIAL', 'karcher fc3', 'Mop elétrico doméstico.', 'c_g_compra'],
  ['varredeira para estacionamento shopping', 'ICP_B2B', null, 'Shopping com área externa — perfil S16 / Alfa Bizz.', 'c_g_locacao'],
  ['lavadora de piso recife', 'IRRELEVANTE', 'recife', 'Cidade fora da cobertura PA/MA/AP.', 'c_g_compra'],
  ['vaga operador de maquinas limpeza', 'IRRELEVANTE', 'vaga operador de maquinas', 'Busca de emprego, sem intenção comercial.', 'c_g_locacao'],
  ['nilfisk sc401 preço', 'CONCORRENTE', 'nilfisk', 'Marca concorrente com conversão nula no período.', 'c_g_compra'],
  ['aspirador de pó vertical sem fio', 'VAREJO', 'aspirador vertical', 'Eletrodoméstico de varejo.', 'c_g_compra'],
  ['locação robo limpeza t16amr', 'ICP_B2B', null, 'Interesse em robótica — ICP de alto ticket.', 'c_g_locacao'],
  ['enceradeira usada olx', 'VAREJO', 'usada olx', 'Marketplace de usados, ticket baixo.', 'c_g_compra'],
  ['peças lavadora tennant t300 são luís', 'ICP_B2B', null, 'Peças/manutenção em São Luís (MA) — dentro da cobertura.', 'c_g_pecas'],
]

export interface OptimizerResult {
  run: OptimizationRun
  logs: OptimizationLog[]
}

export async function runOptimizerLocal(onStep?: OnStep): Promise<OptimizerResult> {
  await api.withProgress(
    OPTIMIZER_STEPS.map((label, i) => ({ label, ms: [1000, 1500, 800, 500, 600][i] })),
    onStep,
  )
  api.maybeFail('optimize-negative-keywords')
  const runId = uid('run')
  const t = nowISO()
  const campaigns = useCampaignStore.getState().campaigns
  const nameOf = (id: string) => campaigns.find((c) => c.id === id)?.name ?? id
  const picked = [...SCENARIO_12, ...[...TERM_POOL].sort(() => Math.random() - 0.5).slice(0, 6)]
  const logs: OptimizationLog[] = picked.map(([term, cls, neg, reason, cid], i) => {
    const clicks = cls === 'ICP_B2B' ? 2 + Math.floor(Math.random() * 6) : 1 + Math.floor(Math.random() * 3)
    return {
      id: `${runId}_t${i + 1}`,
      runId,
      searchTerm: term,
      campaignId: cid,
      campaignName: nameOf(cid),
      impressions: 12 + Math.floor(Math.random() * 90),
      clicks,
      cost: Math.round(clicks * (2.1 + Math.random() * 2.4) * 100) / 100,
      classification: cls,
      action: neg ? 'NEGATIVE_ADDED' : 'KEPT',
      reason,
      negativeKeyword: neg,
      createdAt: t,
    }
  })
  const negatives = logs.filter((l) => l.negativeKeyword)
  const store = useAutomationStore.getState()
  store.addNegatives(
    negatives.map((l) => l.negativeKeyword!),
    { source: 'AI_OPTIMIZER', runId, listName: 'Negativas IA · Otimizador semanal', matchType: 'PHRASE', scope: 'ACCOUNT' },
  )
  const saved = Math.round(negatives.reduce((a, l) => a + l.cost, 0) * 4 * 100) / 100
  const run: OptimizationRun = {
    id: runId,
    runDate: t,
    provider: 'GOOGLE_ADS',
    actionType: 'NEGATIVE_KEYWORDS_PRUNING',
    termsAnalyzed: 34 + Math.floor(Math.random() * 20),
    negativesAdded: negatives.length,
    keptCount: logs.length - negatives.length,
    wastedSpendSavedBRL: saved,
    summaryText: `Execução manual: ${negatives.length} negativas adicionadas e ${logs.length - negatives.length} termos B2B mantidos. Digest enviado ao Vinicius no WhatsApp.`,
    digestSentAt: t,
    trigger: 'MANUAL',
  }
  store.addOptimizationRun(run, logs)
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

// ───────────────────────── Outbound helpers ─────────────────────────

export type ProspectBucket = 'NOVO' | 'SEQUENCIA' | 'RESPONDEU' | 'CONVERTIDO' | 'DESCADASTRADO'

export const BUCKET_LABEL: Record<ProspectBucket, string> = {
  NOVO: 'Novo',
  SEQUENCIA: 'Em sequência',
  RESPONDEU: 'Respondeu',
  CONVERTIDO: 'Convertido em lead',
  DESCADASTRADO: 'Descadastrado',
}
export const BUCKET_TONE = {
  NOVO: 'neutral',
  SEQUENCIA: 'info',
  RESPONDEU: 'violet',
  CONVERTIDO: 'success',
  DESCADASTRADO: 'danger',
} as const

export function prospectBucket(p: OutboundProspect): ProspectBucket {
  switch (p.status) {
    case 'PENDING':
      return 'NOVO'
    case 'SENT_EMAIL':
    case 'SENT_WA':
      return 'SEQUENCIA'
    case 'REPLIED':
      return 'RESPONDEU'
    case 'CONVERTED':
      return 'CONVERTIDO'
    default:
      return 'DESCADASTRADO'
  }
}

export interface SequenceStep {
  id: string
  channel: 'EMAIL' | 'WHATSAPP'
  day: number
  subject: string
  body: string
}

export const DEFAULT_SEQUENCE: SequenceStep[] = [
  {
    id: 's1',
    channel: 'EMAIL',
    day: 0,
    subject: '{{nome_fantasia}}: limpeza de {{segmento}} com menos mão de obra',
    body:
      'Olá, tudo bem?\n\nSou da Maquinabel, concessionária oficial Alfa Tennant no Pará, Maranhão e Amapá. Ajudamos operações como a de vocês em {{cidade}} a reduzir custo de limpeza com lavadoras e varredeiras industriais — compra, locação ou manutenção.\n\nPosso te enviar uma recomendação técnica para o tamanho da sua área?',
  },
  {
    id: 's2',
    channel: 'WHATSAPP',
    day: 2,
    subject: 'Template utility · prospeccao_b2b_v1',
    body: 'Olá! Aqui é da Maquinabel (Alfa Tennant). Enviamos um e-mail para {{nome_fantasia}} sobre limpeza industrial em {{cidade}}. Quer receber a ficha técnica da máquina ideal para sua área?',
  },
  {
    id: 's3',
    channel: 'EMAIL',
    day: 5,
    subject: 'Caso real: CD em Belém lavando 4.500 m² com 1 operador',
    body: 'Olá novamente!\n\nUm centro de distribuição em Belém passou a lavar 4.500 m² de piso epóxi por turno com uma Brava + S16. Se fizer sentido, respondo com um dimensionamento sem compromisso para {{nome_fantasia}}.',
  },
  {
    id: 's4',
    channel: 'EMAIL',
    day: 9,
    subject: 'Encerrando por aqui, {{nome_fantasia}}',
    body: 'Não quero lotar sua caixa de entrada. Se em algum momento precisar de locação ou manutenção de lavadoras de piso em {{uf}}, é só responder este e-mail.\n\nPara não receber mais mensagens, clique em descadastrar.',
  },
]

// ───────────────────────── Webhooks & queues mock (local) ─────────────────────────

export type WebhookSource = 'WHATSAPP' | 'INSTAGRAM' | 'WIDGET'
export type WebhookStatus = 'PROCESSED' | 'DUPLICATE' | 'FAILED' | 'RETRYING'

export interface WebhookLog {
  id: string
  source: WebhookSource
  endpoint: string
  eventType: string
  metaMessageId: string
  hmacValid: boolean
  ackMs: number
  status: WebhookStatus
  httpStatus: number
  receivedAt: string
  note: string | null
}

export interface DeadLetter {
  id: string
  queue: string
  jobName: string
  error: string
  attempts: number
  failedAt: string
  payloadPreview: string
}

export interface DebounceJob {
  id: string
  conversationId: string
  leadName: string
  bufferedMessages: string[]
  windowEndsInMs: number
}

const WH_TEMPLATES: [WebhookSource, string, string][] = [
  ['WHATSAPP', '/webhooks/meta/whatsapp', 'messages.text'],
  ['WHATSAPP', '/webhooks/meta/whatsapp', 'statuses.delivered'],
  ['WHATSAPP', '/webhooks/meta/whatsapp', 'statuses.read'],
  ['INSTAGRAM', '/webhooks/meta/instagram', 'comments'],
  ['INSTAGRAM', '/webhooks/meta/instagram', 'messages'],
  ['WIDGET', '/api/v1/widget/lead', 'typebot.lead'],
  ['WHATSAPP', '/webhooks/meta/whatsapp', 'messages.audio'],
]

export function buildWebhookLogs(count = 28): WebhookLog[] {
  const rnd = seededRandom(20261120)
  let t = belem('2026-11-20', '10:29', 48)
  const out: WebhookLog[] = []
  for (let i = 0; i < count; i++) {
    const [source, endpoint, eventType] = WH_TEMPLATES[Math.floor(rnd() * WH_TEMPLATES.length)]
    let status: WebhookStatus = 'PROCESSED'
    let hmacValid = true
    let httpStatus = 200
    let note: string | null = null
    if (i === 3 || i === 17) {
      status = 'DUPLICATE'
      note = 'meta_message_id já processado — entrega duplicada ignorada'
    } else if (i === 9) {
      status = 'FAILED'
      hmacValid = false
      httpStatus = 401
      note = 'Assinatura X-Hub-Signature-256 inválida — requisição rejeitada'
    } else if (i === 12 || i === 22) {
      status = 'RETRYING'
      httpStatus = 200
      note = 'Ack OK; job falhou no worker (Graph API 500) — retry 2/3 agendado'
    }
    if (eventType === 'messages.audio' && status === 'PROCESSED') note = 'Áudio recebido → fallback "No momento leio apenas texto..." enviado'
    const prefix = source === 'WIDGET' ? 'wgt.' : source === 'INSTAGRAM' ? 'ig.' : 'wamid.'
    out.push({
      id: `wh_${String(i + 1).padStart(3, '0')}`,
      source,
      endpoint,
      eventType,
      metaMessageId: `${prefix}${fakeSha256(`m${i}`).slice(0, 22).toUpperCase()}`,
      hmacValid: source === 'WIDGET' ? true : hmacValid,
      ackMs: Math.round(28 + rnd() * 120 + (i === 9 ? 4 : 0)),
      status,
      httpStatus,
      receivedAt: t,
      note,
    })
    t = addSeconds(t, -Math.round(40 + rnd() * 620))
  }
  return out
}

export function buildDeadLetters(): DeadLetter[] {
  return [
    {
      id: 'dlq_001',
      queue: 'ig-comment-dm',
      jobName: 'send-private-reply',
      error: 'Graph API 500 · (#1) An unknown error occurred',
      attempts: 3,
      failedAt: belem('2026-11-20', '08:12'),
      payloadPreview: '{"comment_id":"17986551203","media_tag":"IG_Reels_Brava","username":"@supermix.belem"}',
    },
    {
      id: 'dlq_002',
      queue: 'whatsapp-outbound',
      jobName: 'send-template:novo_lead_qualificado',
      error: 'WhatsApp Cloud API 131047 · Re-engagement message (fora da janela de 24h)',
      attempts: 3,
      failedAt: belem('2026-11-19', '18:40'),
      payloadPreview: '{"to":"+5596981••••12","template":"novo_lead_qualificado","lang":"pt_BR"}',
    },
    {
      id: 'dlq_003',
      queue: 'offline-conversions',
      jobName: 'meta-capi:Purchase',
      error: 'Meta CAPI 504 · Gateway Timeout',
      attempts: 3,
      failedAt: belem('2026-11-18', '15:02'),
      payloadPreview: '{"event_name":"Purchase","value":18500,"currency":"BRL","fbc":"fb.1.1731…"}',
    },
  ]
}

export function buildDebounceJobs(): DebounceJob[] {
  return [
    { id: 'dbn_1', conversationId: 'conv_005', leadName: 'Macapá · A260', bufferedMessages: ['bom dia', 'é sobre a A260', 'preciso da borracha do rodo'], windowEndsInMs: 3200 },
    { id: 'dbn_2', conversationId: 'conv_014', leadName: '+55 91 9••••-4410', bufferedMessages: ['oi', 'vcs alugam lavadora?'], windowEndsInMs: 1400 },
    { id: 'dbn_3', conversationId: 'conv_022', leadName: '@logistica.maraba (IG)', bufferedMessages: ['área de 2.000 m²'], windowEndsInMs: 4600 },
  ]
}

// ───────────────────────── Misc helpers ─────────────────────────

export function truncHash(h: string | null | undefined, n = 10) {
  if (!h) return '—'
  return `${h.slice(0, n)}…${h.slice(-4)}`
}

export function truncId(s: string | null | undefined, n = 14) {
  if (!s) return '—'
  return s.length > n + 4 ? `${s.slice(0, n)}…` : s
}

export function latencySeconds(createdAt: string, sentAt: string | null): number | null {
  if (!sentAt) return null
  return Math.max(0, (new Date(sentAt).getTime() - new Date(createdAt).getTime()) / 1000)
}

export function formatLatency(sec: number | null | undefined): string {
  if (sec == null) return '—'
  if (sec < 60) return `${sec.toFixed(1).replace('.', ',')} s`
  if (sec < 3600) return `${Math.round(sec / 60)} min`
  if (sec < 86400) return `${Math.round(sec / 3600)} h`
  return `${Math.round(sec / 86400)} d`
}

export function nextMondayAt7(): string {
  // Demo now: sex 20/11/2026 → next Monday 23/11 07:00
  return belem('2026-11-23', '07:00')
}

export { addMinutes }
