import { useCallback, useEffect, useRef, useState } from 'react'
import { useCatalogStore, useLeadStore } from '@/store'
import { hashString, now, toBelemISO, uid } from '@/lib/utils'
import { toast } from '@/components/ui'
import type { AttributionChannel } from '@/types/domain'
import {
  IG_TRIGGER_RE,
  type EngineContext,
  type StructuredOutput,
  type TurnResult,
  initialContext,
  isTerminal,
  norm,
  pickPublicReply,
  runTurn,
} from './engine'
import { SCENARIOS, originByTag, type ClockMode, type Scenario, type SimChannel } from './scenarios'

export type ChatKind = 'lead' | 'ai' | 'system' | 'ig_comment' | 'ig_public_reply'

export interface ChatItem {
  id: string
  kind: ChatKind
  text: string
  at: Date
  read?: boolean
  turnId?: string
  priceGuard?: boolean
  meta?: string
}

export interface TurnRecord {
  id: string
  index: number
  userText: string
  result: TurnResult
  at: Date
}

export type Phase = 'idle' | 'debouncing' | 'typing'

const SATURDAY = new Date('2026-11-21T14:00:00-03:00')

function randomWaPhone() {
  const ddd = ['91', '98', '96', '94'][Math.floor(Math.random() * 4)]
  return `+55${ddd}9${String(Math.floor(80000000 + Math.random() * 19999999))}`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useSdrSim() {
  const machines = useCatalogStore((s) => s.machines)
  const [channel, setChannelState] = useState<SimChannel>('WHATSAPP')
  const [originTag, setOriginTag] = useState('Google_Ads_Locacao')
  const [clock, setClockState] = useState<ClockMode>('business')
  const [debounceMs, setDebounceMs] = useState(5000)
  const [items, setItems] = useState<ChatItem[]>([])
  const [turns, setTurns] = useState<TurnRecord[]>([])
  const [ctx, setCtx] = useState<EngineContext>(() => initialContext())
  const [phase, setPhase] = useState<Phase>('idle')
  const [debounce, setDebounce] = useState<{ start: number; end: number; count: number } | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [leadTyping, setLeadTyping] = useState(false)
  const [persistedLeadId, setPersistedLeadId] = useState<string | null>(null)
  const [igUsername, setIgUsername] = useState<string | null>(null)
  const [visited, setVisited] = useState<string[]>(['NEW'])

  // refs for async logic
  const ctxRef = useRef(ctx)
  const bufferRef = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const runRef = useRef(0)
  const clockBase = useRef({ base: now(), started: Date.now() })
  const cfgRef = useRef({ channel, originTag, clock, debounceMs, machines })
  cfgRef.current = { channel, originTag, clock, debounceMs, machines }
  const pausedNoteRef = useRef(false)
  const waPhoneRef = useRef(randomWaPhone())
  const igUserRef = useRef<string | null>(null)

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const simNow = useCallback(() => new Date(clockBase.current.base.getTime() + (Date.now() - clockBase.current.started)), [])

  const resetClock = (mode: ClockMode) => {
    clockBase.current = { base: mode === 'business' ? now() : SATURDAY, started: Date.now() }
  }

  const push = useCallback((it: Omit<ChatItem, 'id' | 'at'> & { at?: Date }) => {
    const item: ChatItem = { id: uid('ci'), at: it.at ?? new Date(clockBase.current.base.getTime() + (Date.now() - clockBase.current.started)), ...it }
    setItems((s) => [...s, item])
    return item
  }, [])

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    if (phaseRef.current === 'typing') return
    const bubbles = bufferRef.current
    if (!bubbles.length) {
      setPhaseBoth('idle')
      setDebounce(null)
      return
    }
    bufferRef.current = []
    setDebounce(null)
    const run = runRef.current
    setPhaseBoth('typing')
    setItems((s) => s.map((i) => (i.kind === 'lead' ? { ...i, read: true } : i)))
    const cfg = cfgRef.current
    const text = bubbles.join('\n')
    const { ctx: nextCtx, result } = runTurn(ctxRef.current, {
      text,
      bubbles: bubbles.length,
      channel: cfg.channel,
      originTag: cfg.originTag,
      businessHours: cfg.clock === 'business',
      catalog: cfg.machines,
      waPhone: waPhoneRef.current,
      leadLabel: igUserRef.current ? `@${igUserRef.current}` : null,
    })
    await sleep(result.metrics.latencyMs)
    if (run !== runRef.current) return
    ctxRef.current = nextCtx
    setCtx(nextCtx)
    const turnId = uid('turn')
    setTurns((t) => [...t, { id: turnId, index: t.length + 1, userText: text, result, at: simNow() }])
    push({ kind: 'ai', text: result.output.reply_text, turnId, priceGuard: result.priceProbe })
    setVisited((v) => {
      const n = [...v]
      for (const k of ['QUALIFYING', nextCtx.state]) if (!n.includes(k)) n.push(k)
      return n
    })
    if (result.phoneCaptured && cfg.channel === 'INSTAGRAM') {
      push({ kind: 'system', text: `WhatsApp ${result.phoneCaptured} capturado no Direct — conversa unificada no mesmo card (origem ${cfg.originTag}).` })
    }
    const st = nextCtx.state
    if (st === 'QUALIFIED_HANDOFF' || st === 'HUMAN_REQUESTED') {
      push({
        kind: 'system',
        text:
          st === 'HUMAN_REQUESTED'
            ? 'HUMAN_REQUESTED · IA pausada · Vinicius notificado (template novo_lead_qualificado)'
            : 'QUALIFIED_HANDOFF · IA pausada · resumo de 4 linhas enviado ao Vinicius',
      })
      toast.success(st === 'HUMAN_REQUESTED' ? 'Lead pediu humano' : 'Lead qualificado!', 'Resumo de 4 linhas enviado ao Vinicius via WhatsApp.')
    } else if (st === 'DISQUALIFIED_OUT_OF_REGION') {
      push({ kind: 'system', text: 'DISQUALIFIED_OUT_OF_REGION · Vinicius não notificado' })
      toast.info('Lead fora da região', 'Marcado como DISQUALIFIED_OUT_OF_REGION, sem alerta ao Vinicius.')
    }
    setPhaseBoth('idle')
    // messages that arrived while the AI was "typing"
    if (bufferRef.current.length && !isTerminal(st)) scheduleRef.current()
  }, [push, simNow])

  const schedule = useCallback(() => {
    const ms = cfgRef.current.debounceMs
    if (timerRef.current) clearTimeout(timerRef.current)
    if (ms <= 0) {
      void flush()
      return
    }
    const start = Date.now()
    setDebounce({ start, end: start + ms, count: bufferRef.current.length })
    setPhaseBoth('debouncing')
    timerRef.current = setTimeout(() => void flush(), ms)
  }, [flush])
  const scheduleRef = useRef(schedule)
  scheduleRef.current = schedule

  const sendLead = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      push({ kind: 'lead', text: t, read: false })
      if (isTerminal(ctxRef.current.state)) {
        if (!pausedNoteRef.current) {
          pausedNoteRef.current = true
          push({
            kind: 'system',
            text:
              ctxRef.current.state === 'DISQUALIFIED_OUT_OF_REGION'
                ? 'Conversa encerrada (fora da região). Mensagem registrada sem nova inferência.'
                : 'IA pausada após handoff — mensagem encaminhada ao Vinicius, sem resposta automática.',
          })
        }
        return
      }
      bufferRef.current.push(t)
      if (phaseRef.current === 'typing') return
      schedule()
    },
    [push, schedule],
  )

  const reset = useCallback(
    () => {
      runRef.current++
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      bufferRef.current = []
      pausedNoteRef.current = false
      waPhoneRef.current = randomWaPhone()
      const c = initialContext()
      ctxRef.current = c
      setCtx(c)
      setItems([])
      setTurns([])
      setDebounce(null)
      setPhaseBoth('idle')
      setPlaying(null)
      setLeadTyping(false)
      setPersistedLeadId(null)
      setIgUsername(null)
      igUserRef.current = null
      setVisited(['NEW'])
      resetClock(cfgRef.current.clock)
    },
    [],
  )

  const setClock = (m: ClockMode) => {
    setClockState(m)
    cfgRef.current.clock = m
    resetClock(m)
  }
  const setChannel = (c: SimChannel) => {
    setChannelState(c)
    cfgRef.current.channel = c
  }

  const waitIdle = async (run: number) => {
    while (run === runRef.current && (phaseRef.current !== 'idle' || bufferRef.current.length)) await sleep(150)
  }

  const playScenario = useCallback(
    async (sc: Scenario) => {
      reset()
      const run = runRef.current
      setChannel(sc.channel)
      setOriginTag(sc.originTag)
      cfgRef.current.originTag = sc.originTag
      setClock(sc.clock)
      setPlaying(sc.id)
      await sleep(400)
      if (sc.ig) {
        const ig = sc.ig
        setIgUsername(ig.username)
        igUserRef.current = ig.username
        push({ kind: 'ig_comment', text: ig.comment, meta: ig.username })
        await sleep(1300)
        if (run !== runRef.current) return
        const matched = norm(ig.comment).match(IG_TRIGGER_RE)?.[0] ?? 'intenção comercial'
        const pr = pickPublicReply(hashString(`${ig.username}${Date.now()}`))
        push({ kind: 'ig_public_reply', text: pr.text, meta: `Variação ${pr.index + 1}/5 · gatilho «${matched}» · < 5 s` })
        await sleep(1200)
        if (run !== runRef.current) return
        setPhaseBoth('typing')
        await sleep(1400)
        if (run !== runRef.current) return
        const seeded: EngineContext = { ...initialContext(sc.seed), greeted: true, state: 'QUALIFYING', priceProbes: 1 }
        ctxRef.current = seeded
        setCtx(seeded)
        const out: StructuredOutput = {
          reply_text: ig.dmOpening,
          next_state: 'QUALIFYING',
          extracted_fields: seeded.fields,
          recommended_models: [],
          handoff_summary_4_lines: null,
        }
        const result: TurnResult = {
          output: out,
          newlyExtracted: ['modality'],
          recommended: [],
          guardrails: { price: 'triggered', catalog: 'ok', region: 'pending', hours: sc.clock === 'business' ? 'business' : 'after_hours' },
          metrics: { latencyMs: 1380, tokensIn: 3268, cachedTokens: 2944, tokensOut: 212, cacheHitPct: 2944 / 3268, costUsd: (324 * 0.15 + 2944 * 0.075 + 212 * 0.6) / 1e6 },
          priceProbe: true,
          bubbles: 1,
          phoneCaptured: null,
        }
        const turnId = uid('turn')
        setTurns([{ id: turnId, index: 1, userText: `[Comentário IG em ${ig.mediaTag}] ${ig.comment}`, result, at: simNow() }])
        push({ kind: 'ai', text: ig.dmOpening, turnId, priceGuard: true })
        setVisited(['NEW', 'QUALIFYING'])
        setPhaseBoth('idle')
        await sleep(1500)
      }
      for (const turn of sc.turns) {
        for (const bubble of turn) {
          if (run !== runRef.current) return
          setLeadTyping(true)
          await sleep(Math.min(1500, 450 + bubble.length * 14))
          if (run !== runRef.current) return
          setLeadTyping(false)
          sendLead(bubble)
        }
        await sleep(200)
        await waitIdle(run)
        if (run !== runRef.current) return
        if (isTerminal(ctxRef.current.state)) break
        await sleep(1300)
      }
      if (run === runRef.current) setPlaying(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reset, push, sendLead, simNow],
  )

  const stopScenario = () => {
    runRef.current++
    setPlaying(null)
    setLeadTyping(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    bufferRef.current = []
    setDebounce(null)
    setPhaseBoth('idle')
  }

  useEffect(
    () => () => {
      runRef.current++
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  /** Persist the simulated lead + conversation + messages into the CRM store. */
  const persistToCrm = useCallback(() => {
    const store = useLeadStore.getState()
    const c = ctxRef.current
    const f = c.fields
    const origin = originByTag(cfgRef.current.originTag)
    const ch = cfgRef.current.channel
    const attributionChannel: AttributionChannel =
      ch === 'INSTAGRAM'
        ? 'IG_COMMENT'
        : ch === 'WIDGET'
          ? 'WEB_WIDGET'
          : origin.originTag.startsWith('Google')
            ? 'GOOGLE_AD'
            : origin.originTag.startsWith('Meta')
              ? 'META_AD'
              : 'WHATSAPP_DIRECT'
    const recs = turns.length ? turns[turns.length - 1].result.recommended.filter((r) => r.machineId !== 'owned') : []
    const name = f.lead_name ?? (igUsername ? `@${igUsername}` : SCENARIOS.find((s) => s.id === playing)?.leadDisplayName ?? 'Lead simulado (SDR)')
    const lead = store.createLead({
      name: f.company_name && !f.lead_name ? `Contato ${f.company_name}` : name,
      originTag: origin.originTag,
      channel: ch === 'INSTAGRAM' && c.flags.phone ? 'WHATSAPP' : ch,
      attributionChannel,
      attribution: {
        utmSource: origin.utmSource,
        utmMedium: origin.utmMedium,
        utmCampaign: origin.utmCampaign,
        utmTerm: origin.utmTerm ?? null,
        gclid: origin.gclid ?? null,
        fbclid: origin.fbclid ?? null,
        igMediaId: origin.igMediaId ?? null,
        landingUrl: origin.landingUrl ?? null,
      },
      campaignId: origin.campaignId,
      companyName: f.company_name,
      isB2B: f.company_name ? true : null,
      modality: f.modality,
      segment: f.segment,
      areaM2: f.area_m2,
      floorType: f.floor_type,
      dirtProfile: f.dirt_profile,
      powerPreference: f.power_preference,
      usageRoutine: [f.usage_routine, c.flags.ownedModel ? `Possui ${c.flags.ownedModel}` : null].filter(Boolean).join(' · ') || null,
      locationCity: f.location_city,
      locationState: f.location_state,
      recommendedModels: recs,
      phoneE164: c.flags.phone,
      igUsername,
      lgpdConsentAt: toBelemISO(simNow()),
      notes: 'Criado pelo Simulador SDR IA (demo).',
    })
    const turnById = new Map(turns.map((t) => [t.id, t]))
    for (const it of items) {
      if (it.kind === 'ig_comment' || it.kind === 'ig_public_reply') continue
      const tr = it.turnId ? turnById.get(it.turnId) : undefined
      store.addMessage(lead.conversationId, {
        senderType: it.kind === 'lead' ? 'LEAD' : it.kind === 'ai' ? 'AI' : 'SYSTEM',
        text: it.text.replace(/\*\*/g, ''),
        createdAt: toBelemISO(it.at),
        status: it.kind === 'lead' ? 'READ' : it.kind === 'ai' ? 'READ' : 'SENT',
        ...(tr
          ? {
              llmTokensIn: tr.result.metrics.tokensIn,
              llmTokensOut: tr.result.metrics.tokensOut,
              llmCostUsd: tr.result.metrics.costUsd,
              latencyMs: tr.result.metrics.latencyMs,
              model: 'gpt-4o-mini',
            }
          : {}),
      })
    }
    const st = c.state
    if (st === 'QUALIFIED_HANDOFF') store.moveLeadStage(lead.id, 'HANDOFF', { trigger: 'QUALIFIED' })
    else if (st === 'HUMAN_REQUESTED') store.handoffLead(lead.id, 'HUMAN_REQUESTED')
    else if (st === 'DISQUALIFIED_OUT_OF_REGION') store.moveLeadStage(lead.id, 'DISQUALIFIED', { lossReason: 'FORA_REGIAO', lossNotes: `Fora da cobertura PA/MA/AP (${f.location_state}).` })
    else if (useLeadStore.getState().leads.find((l) => l.id === lead.id)?.kanbanStage === 'NEW' && turns.length) store.moveLeadStage(lead.id, 'QUALIFYING', { silent: true })
    setPersistedLeadId(lead.id)
    toast.success('Card criado no Kanban', `${lead.name} · ${origin.originTag}`)
    return lead.id
  }, [items, turns, igUsername, playing, simNow])

  return {
    channel,
    setChannel,
    originTag,
    setOriginTag: (t: string) => {
      setOriginTag(t)
      cfgRef.current.originTag = t
    },
    clock,
    setClock,
    debounceMs,
    setDebounceMs: (ms: number) => {
      setDebounceMs(ms)
      cfgRef.current.debounceMs = ms
    },
    items,
    turns,
    ctx,
    phase,
    debounce,
    playing,
    leadTyping,
    persistedLeadId,
    igUsername,
    visited,
    simNow,
    sendLead,
    reset,
    playScenario,
    stopScenario,
    persistToCrm,
  }
}

export type SdrSim = ReturnType<typeof useSdrSim>
