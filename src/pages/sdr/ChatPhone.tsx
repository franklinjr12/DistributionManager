import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Bot, Check, CheckCheck, EllipsisVertical, Heart, Mic, Paperclip, Phone, Send, ShieldCheck, Timer, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/format'
import type { SdrSim, ChatItem } from './useSdrSim'
import type { SimChannel } from './scenarios'

/** Renders **bold** and line breaks. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i} className="block min-h-[0.6em]">
          {line.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>))}
        </span>
      ))}
    </>
  )
}

interface Theme {
  header: string
  headerText: string
  sub: string
  bg: string
  leadBubble: string
  aiBubble: string
  composer: string
  sendBtn: string
}

const THEMES: Record<SimChannel, Theme> = {
  WHATSAPP: {
    header: 'bg-whatsapp-dark',
    headerText: 'text-white',
    sub: 'text-white/75',
    bg: 'bg-[#efeae2] [background-image:radial-gradient(rgba(0,0,0,0.035)_1px,transparent_1px)] [background-size:14px_14px]',
    leadBubble: 'bg-[#d9fdd3] text-ink-900',
    aiBubble: 'bg-white text-ink-900',
    composer: 'bg-[#f0f2f5]',
    sendBtn: 'bg-whatsapp-dark text-white',
  },
  INSTAGRAM: {
    header: 'bg-white border-b border-line',
    headerText: 'text-ink-900',
    sub: 'text-ink-500',
    bg: 'bg-white',
    leadBubble: 'bg-gradient-to-br from-[#7b3ff2] to-[#c13584] text-white',
    aiBubble: 'bg-ink-100 text-ink-900',
    composer: 'bg-white border-t border-line',
    sendBtn: 'ig-gradient text-white',
  },
  WIDGET: {
    header: 'bg-primary-600',
    headerText: 'text-white',
    sub: 'text-white/75',
    bg: 'bg-ink-50',
    leadBubble: 'bg-primary-600 text-white',
    aiBubble: 'bg-white text-ink-900 border border-line',
    composer: 'bg-white border-t border-line',
    sendBtn: 'bg-primary-600 text-white',
  },
}

function DebounceBar({ debounce, count }: { debounce: { start: number; end: number }; count: number }) {
  const [, force] = useState(0)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      force((x) => x + 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const total = debounce.end - debounce.start
  const left = Math.max(0, debounce.end - Date.now())
  const pct = total > 0 ? (left / total) * 100 : 0
  return (
    <div className="mx-3 mb-2 rounded-lg border border-warning-500/30 bg-warning-50 px-3 py-2 text-[11px] text-warning-700 shadow-card animate-fade-in">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-medium">
          <Timer className="size-3.5" /> Agrupando mensagens (debounce {Math.round(total / 1000)}s)…
        </span>
        <span className="num">
          {count} bolha{count > 1 ? 's' : ''} · {(left / 1000).toFixed(1)}s
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-warning-100">
        <div className="h-full rounded-full bg-warning-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-full bg-current opacity-60" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  )
}

function IgCommentCard({ item, reply }: { item: ChatItem; reply?: ChatItem }) {
  return (
    <div className="mx-auto w-full max-w-[290px] overflow-hidden rounded-xl border border-line bg-white shadow-card animate-scale-in">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="ig-gradient rounded-full p-[2px]">
          <span className="flex size-6 items-center justify-center rounded-full bg-white text-[9px] font-bold">MQ</span>
        </span>
        <span className="text-xs font-semibold">maquinabel</span>
        <span className="ml-auto rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600">Reels · S16</span>
      </div>
      <div className="relative flex h-28 items-end bg-gradient-to-br from-ink-800 via-ink-700 to-primary-900 p-2.5 text-[10px] text-white/90">
        <span className="absolute inset-0 flex items-center justify-center text-3xl text-white/70">▶</span>
        <span className="relative">Varredeira S16: até 13.490 m²/h 💨 #AlfaTennant</span>
      </div>
      <div className="space-y-2 px-3 py-2.5 text-xs">
        <div className="flex gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[9px] font-bold text-violet-700">AF</span>
          <div>
            <span className="font-semibold">{item.meta}</span> {item.text}
            <div className="mt-0.5 flex gap-3 text-[10px] text-ink-400">
              <span>agora</span>
              <span>Responder</span>
              <Heart className="size-3" />
            </div>
          </div>
        </div>
        {reply && (
          <div className="ml-8 flex gap-2 animate-fade-in">
            <span className="ig-gradient flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white">MQ</span>
            <div>
              <span className="font-semibold">maquinabel</span> {reply.text}
              <div className="mt-0.5 text-[10px] font-medium text-violet-600">↻ {reply.meta}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Bubble({ item, theme, channel }: { item: ChatItem; theme: Theme; channel: SimChannel }) {
  const lead = item.kind === 'lead'
  return (
    <div className={cn('flex animate-fade-in', lead ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[82%] rounded-2xl px-3 py-1.5 text-[13px] leading-snug shadow-sm',
          lead ? theme.leadBubble : theme.aiBubble,
          channel === 'WHATSAPP' && (lead ? 'rounded-tr-sm' : 'rounded-tl-sm'),
        )}
      >
        {item.priceGuard && (
          <span className="mb-1 flex w-fit items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-semibold text-danger-700 ring-1 ring-danger-500/20">
            <ShieldCheck className="size-3" /> Guardrail de preço acionado
          </span>
        )}
        <RichText text={item.text} />
        <span className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px]', lead && channel !== 'WHATSAPP' ? 'text-white/70' : 'text-ink-400')}>
          {formatTime(item.at)}
          {lead && (item.read ? <CheckCheck className={cn('size-3.5', channel === 'WHATSAPP' ? 'text-[#53bdeb]' : '')} /> : <Check className="size-3.5" />)}
        </span>
      </div>
    </div>
  )
}

export function ChatPhone({ sim }: { sim: SdrSim }) {
  const theme = THEMES[sim.channel]
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [sim.items.length, sim.phase, sim.leadTyping])

  const submit = () => {
    if (!draft.trim()) return
    sim.sendLead(draft)
    setDraft('')
  }

  const title = sim.channel === 'WIDGET' ? 'Consultor Maquinabel' : sim.channel === 'INSTAGRAM' ? 'maquinabel' : 'Maquinabel · Alfa Tennant'
  const status =
    sim.phase === 'typing' ? (
      <span className="flex items-center gap-1">
        digitando <TypingDots />
      </span>
    ) : sim.channel === 'WIDGET' ? (
      'Responde em segundos · IA'
    ) : sim.channel === 'INSTAGRAM' ? (
      'Conta comercial · IA SDR'
    ) : (
      'online · conta comercial'
    )

  const commentItem = sim.items.find((i) => i.kind === 'ig_comment')
  const publicReply = sim.items.find((i) => i.kind === 'ig_public_reply')
  const dmStarted = sim.items.some((i) => i.kind === 'ai' || i.kind === 'lead')

  let content: ReactNode
  if (!sim.items.length && sim.phase === 'idle') {
    content = (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <span className={cn('flex size-12 items-center justify-center rounded-full', sim.channel === 'INSTAGRAM' ? 'ig-gradient text-white' : 'bg-white text-whatsapp-dark shadow-card')}>
          <Bot className="size-6" />
        </span>
        <p className="text-sm font-medium text-ink-800">Converse como se fosse o lead</p>
        <p className="text-xs text-ink-500">Envie várias mensagens seguidas para ver o debounce agrupando tudo em uma única inferência — ou escolha um cenário dourado ao lado.</p>
      </div>
    )
  } else {
    content = (
      <div className="space-y-1.5 px-3 py-3">
        {commentItem && (
          <div className="pb-2">
            <IgCommentCard item={commentItem} reply={publicReply} />
            {dmStarted && <div className="mt-3 text-center text-[10px] font-medium uppercase tracking-wide text-ink-400">Direct · conversa privada iniciada</div>}
          </div>
        )}
        {sim.items
          .filter((i) => i.kind !== 'ig_comment' && i.kind !== 'ig_public_reply')
          .map((it) =>
            it.kind === 'system' ? (
              <div key={it.id} className="flex justify-center py-1 animate-fade-in">
                <span className="max-w-[90%] rounded-lg bg-[#fff3c4] px-2.5 py-1 text-center text-[10.5px] font-medium text-ink-700 shadow-sm">{it.text}</span>
              </div>
            ) : (
              <Bubble key={it.id} item={it} theme={theme} channel={sim.channel} />
            ),
          )}
        {sim.phase === 'typing' && (
          <div className="flex justify-start animate-fade-in">
            <span className={cn('rounded-2xl px-3 py-2.5 text-ink-500 shadow-sm', theme.aiBubble)}>
              <TypingDots />
            </span>
          </div>
        )}
        {sim.leadTyping && (
          <div className="flex justify-end">
            <span className="rounded-2xl bg-white/70 px-3 py-1 text-[10px] italic text-ink-500">lead digitando…</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[680px] w-full max-w-[400px] flex-col overflow-hidden rounded-[2.2rem] border-[10px] border-ink-900 bg-ink-900 shadow-pop">
      <div className="flex justify-center bg-ink-900 pb-1">
        <span className="h-4 w-24 rounded-b-xl bg-black" />
      </div>
      <div className={cn('flex items-center gap-2.5 px-3 py-2.5', theme.header, theme.headerText)}>
        <ArrowLeft className="size-4 opacity-80" />
        {sim.channel === 'INSTAGRAM' ? (
          <span className="ig-gradient rounded-full p-[2px]">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-[10px] font-bold text-ink-900">MQ</span>
          </span>
        ) : (
          <span className={cn('flex size-9 items-center justify-center rounded-full text-xs font-bold', sim.channel === 'WIDGET' ? 'bg-white/20' : 'bg-white text-whatsapp-dark')}>MQ</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className={cn('truncate text-[11px]', theme.sub)}>{status}</p>
        </div>
        {sim.channel === 'WHATSAPP' && (
          <>
            <Video className="size-4 opacity-80" />
            <Phone className="size-4 opacity-80" />
          </>
        )}
        <EllipsisVertical className="size-4 opacity-80" />
      </div>
      <div ref={scroller} className={cn('relative flex-1 overflow-y-auto scrollbar-thin', theme.bg)}>
        {content}
      </div>
      <div className={cn(theme.bg)}>{sim.phase === 'debouncing' && sim.debounce && <DebounceBar debounce={sim.debounce} count={sim.debounce.count} />}</div>
      <form
        className={cn('flex items-center gap-2 px-2.5 py-2', theme.composer)}
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Paperclip className="size-4 shrink-0 text-ink-400" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={sim.channel === 'INSTAGRAM' ? 'Mensagem…' : 'Digite como o lead…'}
          className="min-w-0 flex-1 rounded-full border border-line bg-white px-3.5 py-2 text-sm outline-none focus:border-primary-400"
        />
        <button type="submit" className={cn('flex size-9 shrink-0 items-center justify-center rounded-full transition hover:opacity-90', theme.sendBtn)} aria-label="Enviar">
          {draft.trim() ? <Send className="size-4" /> : <Mic className="size-4" />}
        </button>
      </form>
    </div>
  )
}
