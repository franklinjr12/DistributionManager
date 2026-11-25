import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleCheck, CornerDownRight, Film, Image, MessageCircle, Plus, Save, Send, ShieldX, Timer, X, Zap } from 'lucide-react'
import type { IgCommentClass, IgCommentEvent } from '@/types/domain'
import * as api from '@/mock/api'
import { useAutomationStore, useTenantStore } from '@/store'
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select, Switch, Tabs, Textarea, Tooltip, toast } from '@/components/ui'
import { formatChatStamp, formatMs } from '@/lib/format'
import { cn } from '@/lib/utils'
import { TableSkeleton, useBoot } from './shared'

const CLASS_LABEL: Record<IgCommentClass, string> = { COMMERCIAL_INQUIRY: 'Intenção comercial', ELOGIO: 'Elogio', SPAM: 'Spam', OUTRO: 'Outro' }
const CLASS_TONE = { COMMERCIAL_INQUIRY: 'success', ELOGIO: 'info', SPAM: 'danger', OUTRO: 'neutral' } as const

const MEDIA = [
  { tag: 'IG_Reels_S16', caption: 'S16 varrendo 6 mil m² de pátio em menos de 1h 🚛 #limpezaindustrial', kind: 'reel' },
  { tag: 'IG_Reels_Brava', caption: 'Brava passando em portas de 70 cm no shopping ✨', kind: 'reel' },
  { tag: 'IG_Post_T16AMR', caption: 'Conheça o T16AMR: o robô que lava sozinho até 5.890 m²/h', kind: 'post' },
  { tag: 'IG_Post_A260', caption: 'Manutenção preventiva da sua A260 com peças originais', kind: 'post' },
] as const

const OWN_ACCOUNT = '@maquinabel'
const SPAM_RE = /seguidores|link na bio|ganhe|promo|sorteio/i
const EMOJI_ONLY_RE = /^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+$/u

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchKeywords(text: string, kws: string[]) {
  const lower = text.toLowerCase()
  return kws.filter((k) => lower.includes(k.toLowerCase()))
}

function Highlight({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length) return <>{text}</>
  const re = new RegExp(`(${keywords.map(escapeRe).join('|')})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-warning-100 px-0.5 font-semibold text-warning-700">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}

function MediaTile({ tag, small }: { tag: string; small?: boolean }) {
  const isReel = tag.includes('Reels')
  const model = tag.split('_').pop()
  return (
    <div className={cn('ig-gradient relative flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg text-white', small ? 'size-12' : 'size-16')}>
      {isReel ? <Film className="size-5 opacity-90" /> : <Image className="size-5 opacity-90" />}
      <span className="mt-0.5 text-[10px] font-bold tracking-wide">{model}</span>
    </div>
  )
}

export function InstagramTab() {
  const events = useAutomationStore((s) => s.igEvents)
  const keywords = useTenantStore((s) => s.tenant.aiSettings.igTriggerKeywords)
  const variations = useTenantStore((s) => s.tenant.aiSettings.publicReplyVariations)
  const booting = useBoot()
  const [filter, setFilter] = useState<'ALL' | IgCommentClass>('ALL')
  const [ignoreRules, setIgnoreRules] = useState({ spam: true, emojiOnly: true, ownReplies: true })

  const sorted = useMemo(() => [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [events])
  const filtered = useMemo(() => sorted.filter((e) => filter === 'ALL' || e.classification === filter), [sorted, filter])

  const stats = useMemo(() => {
    const com = events.filter((e) => e.classification === 'COMMERCIAL_INQUIRY')
    const lat = com.map((e) => e.latencyMs).filter((x): x is number => x != null)
    return {
      total: events.length,
      commercial: com.length,
      dms: events.filter((e) => e.dmSent).length,
      leads: events.filter((e) => e.leadId).length,
      avgLatency: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : null,
    }
  }, [events])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MiniStat label="Comentários recebidos" value={String(stats.total)} />
        <MiniStat label="Com intenção comercial" value={String(stats.commercial)} tone="text-success-700" />
        <MiniStat label="DMs enviadas" value={String(stats.dms)} />
        <MiniStat label="Viraram lead" value={String(stats.leads)} tone="text-primary-700" />
        <MiniStat label="Latência média (reply + DM)" value={formatMs(stats.avgLatency)} hint="meta < 5 s" className="col-span-2 md:col-span-1" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card padding="none" className="min-w-0 self-start">
          <CardHeader title="Eventos de comentário" description="Webhook /webhooks/meta/instagram · campo comments" />
          <div className="scrollbar-thin overflow-x-auto border-b border-line px-4 py-3">
            <Tabs
              variant="pills"
              size="sm"
              value={filter}
              onChange={(v) => setFilter(v as typeof filter)}
              items={[
                { value: 'ALL', label: 'Todos', count: events.length },
                ...(Object.keys(CLASS_LABEL) as IgCommentClass[]).map((c) => ({ value: c, label: CLASS_LABEL[c], count: events.filter((e) => e.classification === c).length })),
              ]}
            />
          </div>
          {booting ? (
            <TableSkeleton rows={5} />
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={<MessageCircle />} title="Nenhum comentário nesta categoria" />
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((e) => (
                <EventRow key={e.id} e={e} keywords={keywords} variations={variations} />
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Simulator keywords={keywords} ignoreRules={ignoreRules} />
          <ConfigPanel keywords={keywords} variations={variations} ignoreRules={ignoreRules} setIgnoreRules={setIgnoreRules} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone, hint, className }: { label: string; value: string; tone?: string; hint?: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-line bg-surface p-3 shadow-card', className)}>
      <div className="text-xs text-ink-500">{label}</div>
      <div className={cn('num mt-1 text-xl font-semibold text-ink-900', tone)}>{value}</div>
      {hint && <div className="text-[11px] text-ink-400">{hint}</div>}
    </div>
  )
}

function EventRow({ e, keywords, variations }: { e: IgCommentEvent; keywords: string[]; variations: string[] }) {
  const matched = matchKeywords(e.commentText, keywords)
  const variantIdx = e.publicReply ? variations.indexOf(e.publicReply) : -1
  return (
    <li className="flex gap-3 p-4">
      <Tooltip content={e.mediaCaption}>
        <div>
          <MediaTile tag={e.mediaTag} />
        </div>
      </Tooltip>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-ink-900">{e.username}</span>
          <Badge tone="violet" className="font-mono">
            {e.mediaTag}
          </Badge>
          <Badge tone={CLASS_TONE[e.classification]}>{CLASS_LABEL[e.classification]}</Badge>
          <span className="ml-auto text-xs text-ink-400">{formatChatStamp(e.createdAt)}</span>
        </div>
        <p className="mt-1 text-sm text-ink-700">
          <Highlight text={e.commentText} keywords={matched} />
        </p>
        {e.publicReply && (
          <div className="mt-2 flex gap-1.5 rounded-lg bg-ink-50 px-2.5 py-2 text-xs text-ink-600">
            <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
            <span className="min-w-0">
              <span className="font-semibold text-ink-800">@maquinabel</span> {e.publicReply}
              <span className="ml-1.5 text-[10px] text-ink-400">variação #{variantIdx >= 0 ? variantIdx + 1 : '?'}</span>
            </span>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {e.dmSent ? (
            <Tooltip content={e.dmText ?? ''}>
              <span className="inline-flex items-center gap-1 text-success-700">
                <CircleCheck className="size-3.5" /> DM enviada
              </span>
            </Tooltip>
          ) : (
            <span className="inline-flex items-center gap-1 text-ink-400">
              <ShieldX className="size-3.5" /> Ignorado (sem DM)
            </span>
          )}
          {e.latencyMs != null && (
            <span className={cn('inline-flex items-center gap-1', e.latencyMs < 5000 ? 'text-ink-500' : 'text-danger-600')}>
              <Timer className="size-3.5" /> {formatMs(e.latencyMs)}
            </span>
          )}
          {e.leadId && (
            <Link to={`/crm?lead=${e.leadId}`} className="inline-flex items-center gap-0.5 font-medium text-primary-600 hover:underline">
              Lead {e.leadId} <ArrowUpRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}

// ───────────────────────── Simulator ─────────────────────────

type IgnoreRules = { spam: boolean; emojiOnly: boolean; ownReplies: boolean }

function predict(text: string, username: string, keywords: string[], rules: IgnoreRules): { kind: 'ignore' | 'reply' | 'none'; reason: string; matched: string[] } {
  const matched = matchKeywords(text, keywords)
  if (!text.trim()) return { kind: 'none', reason: 'Digite um comentário para testar o matcher.', matched }
  const u = username.trim().toLowerCase().replace(/^@?/, '@')
  if (rules.ownReplies && u === OWN_ACCOUNT) return { kind: 'ignore', reason: 'Comentário da própria conta — ignorado para evitar loop.', matched }
  if (rules.spam && SPAM_RE.test(text)) return { kind: 'ignore', reason: 'Padrão de spam detectado — sem resposta.', matched }
  if (rules.emojiOnly && EMOJI_ONLY_RE.test(text.trim())) return { kind: 'ignore', reason: 'Somente emojis — sem intenção comercial.', matched }
  if (matched.length) return { kind: 'reply', reason: 'Intenção comercial → resposta pública rotacionada + DM privada com contexto do post.', matched }
  return { kind: 'none', reason: 'Nenhuma palavra-gatilho — comentário apenas registrado.', matched }
}

function Simulator({ keywords, ignoreRules }: { keywords: string[]; ignoreRules: IgnoreRules }) {
  const [media, setMedia] = useState<string>(MEDIA[0].tag)
  const [username, setUsername] = useState('@galpao.ananindeua')
  const [text, setText] = useState('Quanto custa alugar?')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<IgCommentEvent | null>(null)
  const pred = predict(text, username, keywords, ignoreRules)

  const simulate = async () => {
    setResult(null)
    if (pred.kind === 'ignore') {
      toast.info('Comentário ignorado', pred.reason)
      return
    }
    setSending(true)
    try {
      const m = MEDIA.find((x) => x.tag === media)!
      const ev = await api.simulateIgComment({ mediaTag: m.tag, mediaCaption: m.caption, username, text })
      setResult(ev)
      if (ev.dmSent) toast.success('Resposta pública + DM enviadas', `${ev.username} · ${formatMs(ev.latencyMs)}`)
      else toast.info('Comentário registrado', 'Sem intenção comercial — nenhuma DM enviada.')
    } catch (e) {
      toast.error('Falha no webhook', (e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const tone: Record<typeof pred.kind, string> = {
    reply: 'border-success-100 bg-success-50 text-success-700',
    ignore: 'border-danger-100 bg-danger-50 text-danger-700',
    none: 'border-line bg-ink-50 text-ink-600',
  }

  return (
    <Card padding="none">
      <CardHeader icon={<Zap />} title="Simular comentário" description="Roda o matcher ao vivo e dispara o webhook simulado" />
      <div className="space-y-3 p-5">
        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
          <MediaTile tag={media} small />
          <Select size="sm" value={media} onChange={(e) => setMedia(e.target.value)} options={MEDIA.map((m) => ({ value: m.tag, label: m.tag }))} />
        </div>
        <Input size="sm" label="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Textarea label="Comentário" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {['Quanto custa alugar?', 'Tem ficha técnica?', '🔥🔥', 'Ganhe seguidores, link na bio', 'Que máquina linda'].map((s) => (
            <button key={s} type="button" onClick={() => setText(s)} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-600 hover:border-primary-300 hover:text-primary-700">
              {s}
            </button>
          ))}
        </div>
        <div className={cn('rounded-lg border p-3 text-xs', tone[pred.kind])}>
          <div className="font-semibold">{pred.kind === 'reply' ? 'Vai responder + enviar DM' : pred.kind === 'ignore' ? 'Será ignorado' : 'Sem ação'}</div>
          <div className="mt-0.5">{pred.reason}</div>
          {text.trim() && (
            <div className="mt-2 text-ink-700">
              <Highlight text={text} keywords={pred.matched} />
            </div>
          )}
          {pred.matched.length > 0 && <div className="mt-1.5 text-[11px]">Palavras-gatilho: {pred.matched.join(', ')}</div>}
        </div>
        <Button fullWidth leftIcon={<Send />} loading={sending} onClick={simulate} disabled={!text.trim()}>
          Enviar webhook simulado
        </Button>
        {result && (
          <div className="animate-fade-in space-y-2 rounded-lg border border-line p-3 text-xs">
            <ResultLine ok label="Webhook recebido · HMAC válido · ack 64 ms" />
            <ResultLine ok={result.classification === 'COMMERCIAL_INQUIRY'} label={`Classificação: ${CLASS_LABEL[result.classification]}`} />
            {result.publicReply && <ResultLine ok label={`Resposta pública: “${result.publicReply}”`} />}
            {result.dmText && <ResultLine ok label={`DM: “${result.dmText}”`} />}
            {result.latencyMs != null && <ResultLine ok={result.latencyMs < 5000} label={`Latência total ${formatMs(result.latencyMs)} (meta < 5 s)`} />}
          </div>
        )}
      </div>
    </Card>
  )
}

function ResultLine({ ok, label }: { ok: boolean; label: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      {ok ? <CircleCheck className="mt-px size-3.5 shrink-0 text-success-600" /> : <X className="mt-px size-3.5 shrink-0 text-ink-400" />}
      <span className="min-w-0 text-ink-700">{label}</span>
    </div>
  )
}

// ───────────────────────── Config ─────────────────────────

function ConfigPanel({
  keywords,
  variations,
  ignoreRules,
  setIgnoreRules,
}: {
  keywords: string[]
  variations: string[]
  ignoreRules: IgnoreRules
  setIgnoreRules: (r: IgnoreRules) => void
}) {
  const updateAiSettings = useTenantStore((s) => s.updateAiSettings)
  const [newKw, setNewKw] = useState('')
  const [drafts, setDrafts] = useState<string[]>(variations)
  const [saving, setSaving] = useState(false)
  const dirty = drafts.some((d, i) => d !== variations[i])

  const addKw = () => {
    const k = newKw.trim().toLowerCase()
    if (!k) return
    if (keywords.includes(k)) {
      toast.info('Palavra já cadastrada', k)
      return
    }
    updateAiSettings({ igTriggerKeywords: [...keywords, k] })
    setNewKw('')
  }

  const saveVariations = async () => {
    setSaving(true)
    await api.delay(300, 800)
    updateAiSettings({ publicReplyVariations: drafts.map((d) => d.trim()).filter(Boolean) })
    setSaving(false)
    toast.success('Variações salvas', 'A rotação usa as 5 respostas para evitar bloqueio por repetição.')
  }

  return (
    <Card padding="none">
      <CardHeader icon={<MessageCircle />} title="Configuração Comentário → DM" />
      <div className="space-y-5 p-5">
        <div>
          <div className="mb-2 text-xs font-semibold text-ink-700">Palavras-gatilho ({keywords.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs text-primary-700 ring-1 ring-primary-200">
                {k}
                <button
                  type="button"
                  aria-label={`Remover ${k}`}
                  className="rounded-full p-0.5 hover:bg-primary-100"
                  onClick={() => updateAiSettings({ igTriggerKeywords: keywords.filter((x) => x !== k) })}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input size="sm" placeholder="Nova palavra…" value={newKw} onChange={(e) => setNewKw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addKw()} wrapperClassName="flex-1" />
            <Button size="sm" variant="outline" leftIcon={<Plus />} onClick={addKw} disabled={!newKw.trim()}>
              Adicionar
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-ink-700">Respostas públicas (rotação)</div>
          <div className="space-y-2">
            {drafts.map((d, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-2 w-5 shrink-0 text-right text-[11px] font-semibold text-ink-400">#{i + 1}</span>
                <Textarea rows={2} value={d} onChange={(e) => setDrafts(drafts.map((x, j) => (j === i ? e.target.value : x)))} className="text-xs" />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <Button size="sm" leftIcon={<Save />} loading={saving} disabled={!dirty} onClick={saveVariations}>
              Salvar variações
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-ink-700">Regras de exclusão</div>
          <Switch size="sm" checked={ignoreRules.spam} onChange={(v) => setIgnoreRules({ ...ignoreRules, spam: v })} label="Ignorar spam" description="“ganhe seguidores”, “link na bio”, promoções" />
          <Switch size="sm" checked={ignoreRules.emojiOnly} onChange={(v) => setIgnoreRules({ ...ignoreRules, emojiOnly: v })} label="Ignorar comentários só com emojis" />
          <Switch size="sm" checked={ignoreRules.ownReplies} onChange={(v) => setIgnoreRules({ ...ignoreRules, ownReplies: v })} label="Ignorar respostas da própria conta" description={`${OWN_ACCOUNT} — evita loop de auto-resposta`} />
        </div>
      </div>
    </Card>
  )
}
