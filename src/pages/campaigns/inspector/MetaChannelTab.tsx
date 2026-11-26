import { Clapperboard, GalleryHorizontal, Image as ImageIcon, MessageCircle, Play, Users } from 'lucide-react'
import type { MetaCreative } from '@/types/domain'
import { Badge, Card } from '@/components/ui'
import { formatNumber, formatPercent } from '@/lib/format'
import { useCatalogStore } from '@/store'
import { cn } from '@/lib/utils'
import { ALL_PLACEMENTS, PLACEMENT_LABEL } from '../lib'
import type { Draft, SetDraft } from './draft'

const FORMAT_LABEL: Record<MetaCreative['format'], string> = { REELS: 'Reels', IMAGEM: 'Imagem', CARROSSEL: 'Carrossel', VIDEO: 'Vídeo' }
const FORMAT_ICON = { REELS: Clapperboard, IMAGEM: ImageIcon, CARROSSEL: GalleryHorizontal, VIDEO: Play }
const CTA_LABEL: Record<MetaCreative['cta'], string> = {
  WHATSAPP_MESSAGE: 'Fale com Especialista',
  SEND_MESSAGE: 'Enviar mensagem',
  LEARN_MORE: 'Saiba mais',
  SIGN_UP: 'Cadastre-se',
}

function CreativeCard({ cr }: { cr: MetaCreative }) {
  const machines = useCatalogStore((s) => s.machines)
  const machine = machines.find((m) => m.id === cr.machineId)
  const Icon = FORMAT_ICON[cr.format]
  const vertical = cr.format === 'REELS'
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">M</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-xs font-semibold text-ink-900">maquinabel</div>
          <div className="text-[11px] text-ink-500">Patrocinado</div>
        </div>
        <Badge tone="neutral" icon={<Icon className="size-3" />}>
          {FORMAT_LABEL[cr.format]}
        </Badge>
      </div>
      <div
        className={cn(
          'relative flex items-end justify-start bg-gradient-to-br from-sidebar via-primary-800 to-primary-500 p-3 text-white',
          vertical ? 'aspect-[4/5]' : 'aspect-[16/10]',
        )}
      >
        {cr.format === 'CARROSSEL' && (
          <div className="absolute top-2 right-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('size-1.5 rounded-full', i === 0 ? 'bg-white' : 'bg-white/40')} />
            ))}
          </div>
        )}
        {(cr.format === 'REELS' || cr.format === 'VIDEO') && (
          <span className="absolute inset-0 m-auto flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Play className="size-5 fill-white" />
          </span>
        )}
        <div className="relative">
          <div className="text-[11px] tracking-wide uppercase opacity-80">{machine ? `${machine.brand} ${machine.model}` :'Alfa Tennant'}</div>
          <div className="text-sm leading-tight font-semibold">{cr.headline}</div>
        </div>
      </div>
      <p className="line-clamp-3 px-3 pt-2.5 text-xs text-ink-700">{cr.primaryText}</p>
      <div className="mt-auto space-y-2 p-3">
        <div className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-whatsapp py-2 text-xs font-semibold text-white">
          <MessageCircle className="size-3.5" /> {CTA_LABEL[cr.cta]}
        </div>
        <div className="flex justify-between text-[11px] text-ink-500">
          <span>{cr.name}</span>
          <span className="num">
            {formatNumber(cr.impressions, { compact: true })} impr. · CTR {formatPercent(cr.impressions ? cr.clicks / cr.impressions : 0, 1)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function MetaAdsTab({ draft, setDraft }: { draft: Draft; setDraft: SetDraft }) {
  const meta = draft.meta
  if (!meta) return <p className="py-10 text-center text-sm text-ink-500">Sem configurações Meta para esta campanha.</p>
  const togglePlacement = (p: string) =>
    setDraft((d) => {
      if (!d.meta) return d
      const on = d.meta.placements.includes(p)
      if (on && d.meta.placements.length === 1) return d
      return { ...d, meta: { ...d.meta, placements: on ? d.meta.placements.filter((x) => x !== p) : [...d.meta.placements, p] } }
    })

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Criativos</h3>
          <span className="text-xs text-ink-500">CTA abre o WhatsApp {meta.whatsappNumber ?? ''} com a IA SDR</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meta.creatives.map((cr) => (
            <CreativeCard key={cr.id} cr={cr} />
          ))}
        </div>
      </section>

      <Card padding="md" className="space-y-3">
        <h3 className="text-sm font-semibold text-ink-900">Posicionamentos</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Posicionamentos">
          {ALL_PLACEMENTS.map((p) => {
            const on = meta.placements.includes(p)
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                onClick={() => togglePlacement(p)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:ring-4 focus-visible:ring-primary-100 focus-visible:outline-none',
                  on ? 'border-meta bg-meta-light text-meta' : 'border-line-strong bg-white text-ink-500 hover:bg-ink-50',
                )}
              >
                {PLACEMENT_LABEL[p]}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-ink-500">Ao menos um posicionamento deve permanecer ativo.</p>
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Users className="size-4 text-primary-600" /> Público
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-500">Idade</dt>
            <dd className="font-medium text-ink-800">
              {meta.ageMin}–{meta.ageMax} anos
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Localização</dt>
            <dd className="font-medium text-ink-800">{draft.targetStates.join(', ') || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Tipo</dt>
            <dd className="font-medium text-ink-800">B2B · interesses profissionais</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-1.5">
          {meta.interests.map((i) => (
            <Badge key={i} tone="info">
              {i}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  )
}
