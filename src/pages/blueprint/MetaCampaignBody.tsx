import { useState, type FormEvent } from 'react'
import { Link, MessageCircle, Play, Send, ShieldCheck, Users, X } from 'lucide-react'
import type { BlueprintCampaign, Machine, MetaCreative, MetaSettings } from '@/types/domain'
import { Badge, ChannelIcon } from '@/components/ui'
import { cn } from '@/lib/utils'
import { META_HEADLINE_MAX } from './mockGenerator'
import { CharCount, CopyButton, MachineIcon, PLACEMENT_LABEL, SectionTitle } from './parts'

const ALL_PLACEMENTS = ['facebook_feed', 'instagram_feed', 'instagram_stories', 'instagram_reels', 'instagram_explore']

interface Props {
  campaign: BlueprintCampaign
  machines: Machine[]
  onChange: (patch: Partial<BlueprintCampaign>) => void
}

export function MetaCampaignBody({ campaign: c, machines, onChange }: Props) {
  const meta = c.meta
  const [interest, setInterest] = useState('')
  if (!meta) return null
  const patchMeta = (p: Partial<MetaSettings>) => onChange({ meta: { ...meta, ...p } })
  const patchCreative = (id: string, p: Partial<MetaCreative>) => patchMeta({ creatives: meta.creatives.map((cr) => (cr.id === id ? { ...cr, ...p } : cr)) })
  const isReels = c.type === 'IG_REELS_DIRECT'
  const addInterest = (e: FormEvent) => {
    e.preventDefault()
    const t = interest.trim()
    if (!t || meta.interests.includes(t)) return
    patchMeta({ interests: [...meta.interests, t] })
    setInterest('')
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle right={<span className="text-xs text-ink-400">{meta.creatives.length} criativos · {isReels ? 'Reels 9:16' : 'Vídeo + Carrossel'}</span>}>Prévia dos criativos</SectionTitle>
        <div className="scrollbar-thin -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {meta.creatives.map((cr) => {
            const m = machines.find((x) => x.id === cr.machineId)
            return isReels ? (
              <ReelsCard key={cr.id} creative={cr} machine={m} onPatch={(p) => patchCreative(cr.id, p)} />
            ) : (
              <CtwaCard key={cr.id} creative={cr} machine={m} onPatch={(p) => patchCreative(cr.id, p)} />
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <SectionTitle>Posicionamentos</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {ALL_PLACEMENTS.map((p) => {
              const on = meta.placements.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patchMeta({ placements: on ? meta.placements.filter((x) => x !== p) : [...meta.placements, p] })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                    on ? 'border-meta/40 bg-meta-light text-meta' : 'border-line bg-white text-ink-400 hover:bg-ink-50',
                  )}
                >
                  {PLACEMENT_LABEL[p] ?? p}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <SectionTitle right={<span className="text-xs text-ink-400 num">{meta.ageMin}–{meta.ageMax} anos</span>}>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Segmentação</span>
          </SectionTitle>
          <ul className="flex flex-wrap gap-1.5">
            {meta.interests.map((it) => (
              <li key={it} className="inline-flex items-center gap-1 rounded-full bg-ink-100 py-0.5 pl-2.5 pr-1 text-xs text-ink-700">
                {it}
                <button type="button" onClick={() => patchMeta({ interests: meta.interests.filter((x) => x !== it) })} className="rounded-full p-0.5 hover:bg-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300" aria-label={`Remover interesse ${it}`}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
            <li>
              <form onSubmit={addInterest}>
                <input value={interest} onChange={(e) => setInterest(e.target.value)} placeholder="+ interesse" aria-label="Adicionar interesse" className="h-6 w-28 rounded-full border border-dashed border-line-strong px-2.5 text-xs focus:border-primary-500 focus:outline-none" />
              </form>
            </li>
          </ul>
          <p className="mt-1.5 text-xs text-ink-400">Geo: {c.targetStates.join(', ')} · raio por estado</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-lg border border-success-100 bg-success-50 px-3 py-2 text-xs text-success-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span><strong>Meta CAPI ativo</strong> · Lead, SQL e Purchase com fbclid + SHA-256</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-50 px-3 py-2 text-xs text-ink-600">
          <ChannelIcon channel={isReels ? 'instagram' : 'whatsapp'} size="xs" />
          <span>{isReels ? 'Destino: Instagram Direct (Comment-to-DM)' : `Destino: WhatsApp ${meta.whatsappNumber ?? ''}`}</span>
        </div>
      </div>

      <div>
        <SectionTitle right={<CopyButton text={c.trackingTemplate} />}>
          <span className="inline-flex items-center gap-1"><Link className="h-3 w-3" /> Parâmetros de URL (UTM)</span>
        </SectionTitle>
        <code className="block break-all rounded-lg bg-ink-900 px-3 py-2 font-mono text-[11px] leading-relaxed text-success-100">{c.trackingTemplate}</code>
      </div>
    </div>
  )
}

function CtwaCard({ creative: cr, machine: m, onPatch }: { creative: MetaCreative; machine?: Machine; onPatch: (p: Partial<MetaCreative>) => void }) {
  return (
    <article className="w-60 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <header className="flex items-center gap-2 px-2.5 py-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary-700 text-[10px] font-bold text-white">M</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-xs font-semibold text-ink-800">Maquinabel</span>
          <span className="block text-[10px] text-ink-400">Patrocinado · {cr.format === 'VIDEO' ? 'Vídeo' : 'Carrossel'}</span>
        </span>
      </header>
      <p className="line-clamp-3 px-2.5 pb-2 text-[11px] leading-snug text-ink-700">{cr.primaryText}</p>
      <div className="relative grid aspect-square place-items-center text-white" style={{ background: `linear-gradient(135deg, ${m?.color ?? '#1e3a8a'}, #0f172a)` }}>
        {m && <MachineIcon machine={m} className="h-16 w-16 opacity-90" />}
        {cr.format === 'VIDEO' && (
          <span className="absolute grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur"><Play className="h-5 w-5 fill-white" /></span>
        )}
        <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">{m?.model ?? 'Alfa Tennant'}</span>
        {cr.format === 'CARROSSEL' && <span className="absolute right-2 top-2 rounded-full bg-black/40 px-1.5 text-[10px]">1/3</span>}
      </div>
      <div className="space-y-1.5 border-t border-line bg-ink-50 p-2.5">
        <div className="flex items-center gap-1">
          <input value={cr.headline} onChange={(e) => onPatch({ headline: e.target.value })} aria-label={`Título do criativo ${cr.name}`} className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs font-semibold text-ink-800 hover:border-line focus:border-primary-500 focus:bg-white focus:outline-none" />
          <CharCount value={cr.headline} max={META_HEADLINE_MAX} />
        </div>
        <span className="flex w-full items-center justify-center gap-1.5 rounded-md bg-whatsapp px-2 py-1.5 text-xs font-semibold text-white">
          <MessageCircle className="h-3.5 w-3.5" /> Fale com Especialista
        </span>
      </div>
    </article>
  )
}

function ReelsCard({ creative: cr, machine: m, onPatch }: { creative: MetaCreative; machine?: Machine; onPatch: (p: Partial<MetaCreative>) => void }) {
  return (
    <article className="w-44 shrink-0 snap-start">
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(160deg, ${m?.color ?? '#7c3aed'}, #111827 75%)` }}>
        <div className="absolute inset-0 grid place-items-center">
          {m && <MachineIcon machine={m} className="h-14 w-14 opacity-80" />}
        </div>
        <span className="ig-gradient absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">Reels</span>
        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/30"><Play className="h-3.5 w-3.5 fill-white" /></span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
          <p className="text-[11px] font-semibold">@maquinabel</p>
          <p className="line-clamp-3 text-[10px] leading-snug text-white/90">{cr.primaryText}</p>
          <span className="mt-1.5 flex items-center justify-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-ink-900">
            <Send className="h-3 w-3" /> Enviar mensagem
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <input value={cr.headline} onChange={(e) => onPatch({ headline: e.target.value })} aria-label={`Título do criativo ${cr.name}`} className="min-w-0 flex-1 rounded border border-line bg-white px-1.5 py-1 text-xs focus:border-primary-500 focus:outline-none" />
        <CharCount value={cr.headline} max={META_HEADLINE_MAX} />
      </div>
      <Badge tone="violet" size="sm" className="mt-1">{m?.model ?? 'Institucional'}</Badge>
    </article>
  )
}
