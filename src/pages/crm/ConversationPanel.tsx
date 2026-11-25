import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Check, CheckCheck, CirclePause, CirclePlay, Clock, Info, LoaderCircle, Send, TriangleExclamationPoint } from 'lucide-react'
import type { Conversation, Lead, Message } from '@/types/domain'
import { Avatar, Button, Switch, Tooltip, toast } from '@/components/ui'
import { useLeadStore, useMessages } from '@/store'
import * as api from '@/mock/api'
import { CONV_CHANNEL_LABEL, formatDayMonth, formatMs, formatTime, formatWeekdayShort } from '@/lib/format'
import { belemDay, cn, now } from '@/lib/utils'

const QUICK_REPLIES = [
  { label: 'Apresentação', text: 'Olá! Aqui é o Vinicius Goés, da Maquinabel (Alfa Tennant). Já recebi o resumo do seu atendimento e vou cuidar pessoalmente da sua proposta.' },
  { label: 'Agendar visita', text: 'Podemos agendar uma visita técnica para avaliar o piso e fazer uma demonstração da máquina? Qual o melhor dia e horário para você?' },
  { label: 'Proposta por e-mail', text: 'Vou preparar a proposta formal com as condições de pagamento e envio ainda hoje por e-mail. Pode me confirmar o melhor e-mail?' },
  { label: 'Pedir CNPJ', text: 'Para gerar a proposta, você pode me enviar o CNPJ e a razão social da empresa?' },
  { label: 'Follow-up', text: 'Oi! Passando para saber se conseguiu avaliar a proposta. Fico à disposição para qualquer ajuste.' },
]

const LEAD_REPLIES = [
  'Oi Vinicius, obrigado pelo retorno! Pode ser sim.',
  'Perfeito, fico no aguardo então.',
  'Combinado! Amanhã de manhã fica bom pra mim.',
  'Show, vou te mandar as informações daqui a pouco.',
]

function dayLabel(iso: string): string {
  const d = belemDay(iso)
  const today = belemDay(now())
  const yest = belemDay(new Date(now().getTime() - 86_400_000))
  if (d === today) return 'Hoje'
  if (d === yest) return 'Ontem'
  return `${formatWeekdayShort(iso)}, ${formatDayMonth(iso)}`
}

function StatusTicks({ status }: { status: Message['status'] }) {
  if (status === 'FAILED') return <TriangleExclamationPoint className="size-3.5 text-danger-500" />
  if (status === 'SENT') return <Check className="size-3.5 text-ink-400" />
  return <CheckCheck className={cn('size-3.5', status === 'READ' ? 'text-sky-500' : 'text-ink-400')} />
}

function Bubble({ m, leadName }: { m: Message; leadName: string }) {
  if (m.senderType === 'SYSTEM')
    return (
      <div className="my-1 flex justify-center px-6">
        <span className="inline-flex max-w-full items-start gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-center text-[11.5px] leading-snug text-ink-600 shadow-xs ring-1 ring-line">
          <Info className="mt-px size-3 shrink-0 text-ink-400" />
          <span>
            {m.text}
            {m.template && <span className="ml-1 font-mono text-[10px] text-violet-600">[{m.template}]</span>}
          </span>
        </span>
      </div>
    )
  const out = m.senderType !== 'LEAD'
  const isAi = m.senderType === 'AI'
  return (
    <div className={cn('flex px-3', out ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[85%] rounded-xl px-3 py-1.5 text-sm leading-relaxed shadow-xs sm:max-w-[75%]',
          !out && 'rounded-tl-sm bg-white text-ink-800',
          isAi && 'rounded-tr-sm bg-violet-50 text-ink-800 ring-1 ring-violet-200',
          m.senderType === 'HUMAN_AGENT' && 'rounded-tr-sm bg-whatsapp-light text-ink-900',
        )}
      >
        <div className={cn('mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold', isAi ? 'text-violet-700' : out ? 'text-whatsapp-dark' : 'text-primary-700')}>
          {isAi ? (
            <Tooltip
              side="bottom"
              content={
                <span className="block">
                  {m.model ?? 'gpt-4o-mini'} · {m.llmTokensIn ?? 0} in / {m.llmTokensOut ?? 0} out tokens
                  <br />
                  custo US$ {(m.llmCostUsd ?? 0).toFixed(5)} · latência {formatMs(m.latencyMs)}
                </span>
              }
            >
              <span className="inline-flex cursor-help items-center gap-1 rounded bg-violet-600 px-1 py-px text-[9.5px] tracking-wide text-white">
                <Bot className="size-2.5" /> IA
              </span>
            </Tooltip>
          ) : null}
          {isAi ? 'SDR IA' : out ? 'Vinicius Goés' : leadName}
        </div>
        <p className="break-words whitespace-pre-wrap">{m.text}</p>
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-ink-400">
          {formatTime(m.createdAt)}
          {out && <StatusTicks status={m.status} />}
        </div>
      </div>
    </div>
  )
}

export function ConversationPanel({ lead, conv }: { lead: Lead; conv: Conversation | undefined }) {
  const messages = useMessages(conv?.id)
  const addMessage = useLeadStore((s) => s.addMessage)
  const markConversationRead = useLeadStore((s) => s.markConversationRead)
  const [text, setText] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [leadTyping, setLeadTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (conv && conv.unreadCount > 0) markConversationRead(conv.id)
  }, [conv, markConversationRead])
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, sending, leadTyping])

  const groups = useMemo(() => {
    const out: { day: string; items: Message[] }[] = []
    for (const m of messages) {
      const d = belemDay(m.createdAt)
      if (!out.length || out[out.length - 1].day !== d) out.push({ day: d, items: [] })
      out[out.length - 1].items.push(m)
    }
    return out
  }, [messages])

  if (!conv) return <div className="p-6 text-sm text-ink-500">Sem conversa vinculada.</div>

  const closed = conv.state === 'CLOSED' || conv.state === 'DISQUALIFIED_OUT_OF_REGION'

  const toggleAi = async (paused: boolean) => {
    setToggling(true)
    try {
      await api.toggleAi(conv.id, paused)
      toast.success(paused ? 'IA pausada' : 'IA retomada', paused ? 'Você assumiu a conversa (takeover humano).' : 'O SDR IA volta a responder automaticamente.')
    } catch {
      toast.error('Falha ao alternar a IA', 'Tente novamente.')
    } finally {
      setToggling(false)
    }
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(body)
    setText('')
    try {
      const wasActive = !conv.aiPaused
      await api.sendHumanReply(conv.id, body)
      if (wasActive) toast.info('IA pausada automaticamente', 'Mensagem humana = takeover da conversa.')
      // liveliness: lead "types" and replies
      const t1 = window.setTimeout(() => setLeadTyping(true), 2200)
      const t2 = window.setTimeout(() => {
        setLeadTyping(false)
        addMessage(conv.id, { senderType: 'LEAD', text: LEAD_REPLIES[Math.floor(Math.random() * LEAD_REPLIES.length)] })
      }, 5200)
      timers.current.push(t1, t2)
    } catch {
      setText(body)
      toast.error('Falha ao enviar via WhatsApp Cloud API', 'A mensagem não foi entregue. Tente novamente.')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* AI takeover bar */}
      <div className={cn('flex flex-wrap items-center gap-3 border-b px-4 py-2.5', conv.aiPaused ? 'border-warning-100 bg-warning-50' : 'border-success-100 bg-success-50')}>
        <div className={cn('flex size-8 items-center justify-center rounded-full', conv.aiPaused ? 'bg-warning-100 text-warning-700' : 'bg-success-100 text-success-700')}>
          {conv.aiPaused ? <CirclePause className="size-4" /> : <Bot className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-900">{conv.aiPaused ? 'IA pausada — atendimento humano' : 'SDR IA respondendo automaticamente'}</div>
          <div className="text-xs text-ink-500">
            {CONV_CHANNEL_LABEL[conv.channel]} · {conv.aiPaused ? 'A IA não responde enquanto pausada.' : 'Pause para assumir a conversa.'}
          </div>
        </div>
        <Button
          size="sm"
          variant={conv.aiPaused ? 'success' : 'outline'}
          loading={toggling}
          leftIcon={conv.aiPaused ? <CirclePlay /> : <CirclePause />}
          onClick={() => toggleAi(!conv.aiPaused)}
          disabled={closed}
        >
          {conv.aiPaused ? 'Retomar IA' : 'Pausar IA'}
        </Button>
        <Switch checked={!conv.aiPaused} onChange={(v) => toggleAi(!v)} tone="success" disabled={toggling || closed} className="hidden sm:inline-flex" />
      </div>

      {/* transcript */}
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-[#efeae2] py-3">
        {groups.length === 0 && <p className="py-10 text-center text-sm text-ink-500">Nenhuma mensagem ainda.</p>}
        <div className="flex flex-col gap-1.5">
          {groups.map((g) => (
            <Fragment key={g.day}>
              <div className="sticky top-0 z-10 my-2 flex justify-center">
                <span className="rounded-md bg-white/95 px-2.5 py-0.5 text-[11px] font-medium text-ink-500 shadow-xs">{dayLabel(g.items[0].createdAt)}</span>
              </div>
              {g.items.map((m) => (
                <Bubble key={m.id} m={m} leadName={lead.name} />
              ))}
            </Fragment>
          ))}
          {sending && (
            <div className="flex justify-end px-3">
              <div className="max-w-[75%] rounded-xl rounded-tr-sm bg-whatsapp-light/70 px-3 py-1.5 text-sm text-ink-700 shadow-xs">
                <p className="whitespace-pre-wrap">{sending}</p>
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-ink-500">
                  <LoaderCircle className="size-3 animate-spin" /> enviando via WhatsApp Cloud API…
                </div>
              </div>
            </div>
          )}
          {leadTyping && (
            <div className="flex px-3">
              <div className="flex items-center gap-2 rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs text-ink-500 shadow-xs">
                <span className="flex gap-0.5">
                  <span className="size-1.5 animate-bounce rounded-full bg-ink-400" />
                  <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:120ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:240ms]" />
                </span>
                {lead.name.split(' ')[0]} está digitando…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-line bg-white px-3 pt-2 pb-3">
        <div className="scrollbar-thin -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setText(q.text)}
              className="shrink-0 rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
            >
              {q.label}
            </button>
          ))}
        </div>
        {!conv.aiPaused && (
          <div className="mb-2 flex items-center gap-1.5 rounded-md bg-warning-50 px-2 py-1 text-xs text-warning-700">
            <TriangleExclamationPoint className="size-3.5" /> Enviar uma mensagem pausa a IA automaticamente (takeover humano).
          </div>
        )}
        <div className="flex items-end gap-2">
          <Avatar name="Vinicius Goés" size="sm" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            placeholder={closed ? 'Conversa encerrada — ainda é possível enviar follow-up' : 'Responder como Vinicius Goés… (Enter envia, Shift+Enter quebra linha)'}
            className="scrollbar-thin max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-line-strong px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
          />
          <Button onClick={send} disabled={!text.trim()} loading={!!sending} size="icon" variant="success" aria-label="Enviar">
            <Send />
          </Button>
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-400">
          <Clock className="size-3" /> Enviado via WhatsApp Cloud API · janela de 24h {conv.lastUserMessageAt ? 'aberta' : 'fechada (usar template)'}
        </div>
      </div>
    </div>
  )
}
