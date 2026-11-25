import { useState, type FormEvent } from 'react'
import { ChevronDown, Link, Plus, X } from 'lucide-react'
import type { AdGroup, BlueprintCampaign, KeywordMatchType } from '@/types/domain'
import { Badge } from '@/components/ui'
import { cn, uid } from '@/lib/utils'
import { DESCRIPTION_MAX, HEADLINE_MAX } from './mockGenerator'
import { CharCount, CopyButton, SectionTitle } from './parts'

const MATCH_NEXT: Record<KeywordMatchType, KeywordMatchType> = { BROAD: 'PHRASE', PHRASE: 'EXACT', EXACT: 'BROAD' }
const MATCH_LABEL: Record<KeywordMatchType, string> = { BROAD: 'Ampla', PHRASE: 'Frase', EXACT: 'Exata' }
const MATCH_STYLE: Record<KeywordMatchType, string> = {
  EXACT: 'border-primary-100 bg-primary-50 text-primary-700',
  PHRASE: 'border-violet-200 bg-violet-50 text-violet-700',
  BROAD: 'border-line bg-ink-50 text-ink-600',
}
const fmtKw = (t: string, m: KeywordMatchType) => (m === 'EXACT' ? `[${t}]` : m === 'PHRASE' ? `"${t}"` : t)

interface Props {
  campaign: BlueprintCampaign
  onChange: (patch: Partial<BlueprintCampaign>) => void
}

export function GoogleCampaignBody({ campaign: c, onChange }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(c.adGroups[0]?.id ?? null)
  const patchGroup = (gid: string, patch: Partial<AdGroup>) => onChange({ adGroups: c.adGroups.map((g) => (g.id === gid ? { ...g, ...patch } : g)) })

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle right={<span className="text-xs text-ink-400">{c.adGroups.length} grupos temáticos</span>}>Grupos de anúncios</SectionTitle>
        <div className="space-y-2">
          {c.adGroups.map((g) => (
            <AdGroupPanel key={g.id} group={g} open={openGroup === g.id} onToggle={() => setOpenGroup(openGroup === g.id ? null : g.id)} onPatch={(p) => patchGroup(g.id, p)} />
          ))}
        </div>
      </div>

      <NegativesEditor negatives={c.negatives} onChange={(negatives) => onChange({ negatives })} />

      <div>
        <SectionTitle right={<CopyButton text={c.trackingTemplate} />}>
          <span className="inline-flex items-center gap-1"><Link className="h-3 w-3" /> Modelo de rastreamento</span>
        </SectionTitle>
        <code className="block break-all rounded-lg bg-ink-900 px-3 py-2 font-mono text-[11px] leading-relaxed text-success-100">{c.trackingTemplate}</code>
        <p className="mt-1 text-xs text-ink-400">URL final: <span className="text-ink-600">{c.finalUrl}</span> · auto-tagging gclid ativo</p>
      </div>
    </div>
  )
}

function AdGroupPanel({ group: g, open, onToggle, onPatch }: { group: AdGroup; open: boolean; onToggle: () => void; onPatch: (p: Partial<AdGroup>) => void }) {
  const [kwText, setKwText] = useState('')
  const overCount = g.headlines.filter((h) => h.length > HEADLINE_MAX).length + g.descriptions.filter((d) => d.length > DESCRIPTION_MAX).length
  const addKw = (e: FormEvent) => {
    e.preventDefault()
    const t = kwText.trim().toLowerCase()
    if (!t || g.keywords.some((k) => k.text === t)) return
    onPatch({ keywords: [...g.keywords, { id: uid('kw'), text: t, matchType: 'PHRASE', impressions: 0, clicks: 0 }] })
    setKwText('')
  }
  return (
    <div className="rounded-lg border border-line">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded-lg">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-800">{g.name}</span>
          <span className="block text-xs text-ink-500">{g.keywords.length} palavras-chave · {g.headlines.length} títulos · {g.descriptions.length} descrições</span>
        </span>
        {overCount > 0 && <Badge tone="danger" size="sm">{overCount} acima do limite</Badge>}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-3 py-3 animate-fade-in">
          {/* Keywords */}
          <div>
            <SectionTitle right={<span className="text-[11px] text-ink-400">clique no tipo para alternar</span>}>Cluster de palavras-chave</SectionTitle>
            <ul className="flex flex-wrap gap-1.5">
              {g.keywords.map((k) => (
                <li key={k.id} className={cn('inline-flex items-center overflow-hidden rounded-md border text-xs', MATCH_STYLE[k.matchType])}>
                  <button
                    type="button"
                    onClick={() => onPatch({ keywords: g.keywords.map((x) => (x.id === k.id ? { ...x, matchType: MATCH_NEXT[x.matchType] } : x)) })}
                    className="border-r border-current/20 px-1.5 py-1 font-semibold uppercase tracking-wide hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                    style={{ fontSize: 10 }}
                    aria-label={`Tipo de correspondência ${MATCH_LABEL[k.matchType]} — alternar`}
                  >
                    {MATCH_LABEL[k.matchType]}
                  </button>
                  <span className="px-1.5 py-1 font-mono">{fmtKw(k.text, k.matchType)}</span>
                  <button type="button" onClick={() => onPatch({ keywords: g.keywords.filter((x) => x.id !== k.id) })} className="px-1 py-1 opacity-60 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300" aria-label={`Remover ${k.text}`}>
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
              <li>
                <form onSubmit={addKw} className="flex items-center">
                  <input value={kwText} onChange={(e) => setKwText(e.target.value)} placeholder="+ palavra-chave" aria-label="Nova palavra-chave" className="h-7 w-36 rounded-md border border-dashed border-line-strong px-2 text-xs focus:border-primary-500 focus:outline-none" />
                </form>
              </li>
            </ul>
          </div>

          {/* Headlines */}
          <div>
            <SectionTitle right={<span className="text-xs text-ink-400 num">{g.headlines.length}/15 · máx. {HEADLINE_MAX} caracteres</span>}>Títulos RSA</SectionTitle>
            <div className="grid gap-1.5 md:grid-cols-2">
              {g.headlines.map((h, i) => (
                <div key={i} className={cn('flex items-center gap-1.5 rounded-md border bg-white px-2 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100', h.length > HEADLINE_MAX ? 'border-danger-500 bg-danger-50' : 'border-line')}>
                  <span className="w-4 shrink-0 text-[10px] text-ink-400 num">{i + 1}</span>
                  <input
                    value={h}
                    onChange={(e) => onPatch({ headlines: g.headlines.map((x, j) => (j === i ? e.target.value : x)) })}
                    aria-label={`Título ${i + 1}`}
                    aria-invalid={h.length > HEADLINE_MAX}
                    className="h-8 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <CharCount value={h} max={HEADLINE_MAX} />
                  <button type="button" onClick={() => onPatch({ headlines: g.headlines.filter((_, j) => j !== i) })} className="rounded p-0.5 text-ink-300 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300" aria-label={`Remover título ${i + 1}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {g.headlines.length < 15 && (
                <button type="button" onClick={() => onPatch({ headlines: [...g.headlines, ''] })} className="flex h-9 items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-xs font-medium text-ink-500 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
                  <Plus className="h-3.5 w-3.5" /> Adicionar título
                </button>
              )}
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <SectionTitle right={<span className="text-xs text-ink-400 num">{g.descriptions.length}/4 · máx. {DESCRIPTION_MAX} caracteres</span>}>Descrições</SectionTitle>
            <div className="space-y-1.5">
              {g.descriptions.map((d, i) => (
                <div key={i} className={cn('flex items-start gap-1.5 rounded-md border bg-white px-2 py-1 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100', d.length > DESCRIPTION_MAX ? 'border-danger-500 bg-danger-50' : 'border-line')}>
                  <span className="mt-1.5 w-4 shrink-0 text-[10px] text-ink-400 num">{i + 1}</span>
                  <textarea
                    value={d}
                    rows={2}
                    onChange={(e) => onPatch({ descriptions: g.descriptions.map((x, j) => (j === i ? e.target.value : x)) })}
                    aria-label={`Descrição ${i + 1}`}
                    className="min-w-0 flex-1 resize-none bg-transparent py-0.5 text-sm leading-snug focus:outline-none"
                  />
                  <span className="mt-1"><CharCount value={d} max={DESCRIPTION_MAX} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NegativesEditor({ negatives, onChange }: { negatives: string[]; onChange: (n: string[]) => void }) {
  const [text, setText] = useState('')
  const add = (e: FormEvent) => {
    e.preventDefault()
    const terms = text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    if (!terms.length) return
    onChange(Array.from(new Set([...negatives, ...terms])))
    setText('')
  }
  return (
    <div>
      <SectionTitle right={<span className="text-xs text-ink-400">{negatives.length} termos · nível campanha</span>}>Palavras-chave negativas</SectionTitle>
      <ul className="flex flex-wrap gap-1.5">
        {negatives.map((n) => (
          <li key={n} className="inline-flex items-center gap-1 rounded-full border border-danger-100 bg-danger-50 py-0.5 pl-2.5 pr-1 text-xs text-danger-700">
            −{n}
            <button type="button" onClick={() => onChange(negatives.filter((x) => x !== n))} className="rounded-full p-0.5 hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500" aria-label={`Remover negativa ${n}`}>
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
        <li>
          <form onSubmit={add}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="+ negativa (Enter)" aria-label="Adicionar palavra-chave negativa" className="h-6 w-40 rounded-full border border-dashed border-line-strong px-2.5 text-xs focus:border-primary-500 focus:outline-none" />
          </form>
        </li>
      </ul>
    </div>
  )
}
