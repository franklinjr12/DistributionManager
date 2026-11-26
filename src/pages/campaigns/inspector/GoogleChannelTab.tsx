import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { AdGroup, KeywordMatchType } from '@/types/domain'
import { Badge, Button, Card, Select, Tabs } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { cn, uid } from '@/lib/utils'
import { DESCRIPTION_MAX, HEADLINE_MAX } from '../lib'
import type { Draft, SetDraft } from './draft'
import { SearchAdPreview } from './SearchPreview'

const MATCH_LABEL: Record<KeywordMatchType, string> = { EXACT: 'Exata', PHRASE: 'Frase', BROAD: 'Ampla' }
const MATCH_TONE = { EXACT: 'primary', PHRASE: 'violet', BROAD: 'neutral' } as const
const fmtKw = (t: string, m: KeywordMatchType) => (m === 'EXACT' ? `[${t}]` : m === 'PHRASE' ? `"${t}"` : t)

function CountedField({
  value,
  max,
  onChange,
  multiline,
  label,
}: {
  value: string
  max: number
  onChange: (v: string) => void
  multiline?: boolean
  label: string
}) {
  const over = value.length > max
  const cls = cn(
    'w-full rounded-lg border bg-white px-3 py-1.5 pr-14 text-sm text-ink-900 outline-none transition focus:ring-4',
    over ? 'border-danger-500 focus:ring-danger-100' : 'border-line-strong focus:border-primary-400 focus:ring-primary-100',
  )
  return (
    <div className="relative">
      {multiline ? (
        <textarea aria-label={label} rows={2} className={cn(cls, 'resize-none')} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input aria-label={label} className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      <span className={cn('num pointer-events-none absolute top-2 right-2.5 text-[11px]', over ? 'font-semibold text-danger-600' : 'text-ink-400')} aria-live="polite">
        {value.length}/{max}
      </span>
    </div>
  )
}

export function GoogleAdsTab({ draft, setDraft }: { draft: Draft; setDraft: SetDraft }) {
  const [groupId, setGroupId] = useState(draft.adGroups[0]?.id ?? '')
  const [kwText, setKwText] = useState('')
  const [kwMatch, setKwMatch] = useState<KeywordMatchType>('PHRASE')
  const [kwErr, setKwErr] = useState<string | null>(null)
  const group = draft.adGroups.find((g) => g.id === groupId) ?? draft.adGroups[0]
  if (!group) return <p className="py-10 text-center text-sm text-ink-500">Nenhum grupo de anúncios nesta campanha.</p>

  const patchGroup = (fn: (g: AdGroup) => AdGroup) => setDraft((d) => ({ ...d, adGroups: d.adGroups.map((g) => (g.id === group.id ? fn(g) : g)) }))

  const addKw = () => {
    const text = kwText.trim().toLowerCase()
    if (!text) return
    if (group.keywords.some((k) => k.text === text && k.matchType === kwMatch)) {
      setKwErr('Palavra-chave já existe com esse tipo de correspondência.')
      return
    }
    if (draft.negatives.includes(text)) {
      setKwErr('Termo está na lista de negativas desta campanha.')
      return
    }
    patchGroup((g) => ({ ...g, keywords: [...g.keywords, { id: uid('kw'), text, matchType: kwMatch, impressions: 0, clicks: 0 }] }))
    setKwText('')
    setKwErr(null)
  }

  const hOver = group.headlines.filter((h) => h.length > HEADLINE_MAX).length
  const dOver = group.descriptions.filter((h) => h.length > DESCRIPTION_MAX).length

  return (
    <div className="space-y-5">
      {draft.adGroups.length > 1 && (
        <Tabs
          variant="pills"
          size="sm"
          value={group.id}
          onChange={setGroupId}
          items={draft.adGroups.map((g) => ({ value: g.id, label: g.name, count: g.keywords.length }))}
        />
      )}

      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Palavras-chave</h3>
          <span className="text-xs text-ink-500">{group.keywords.length} no grupo</span>
        </div>
        <ul className="flex flex-wrap gap-2">
          {group.keywords.map((k) => (
            <li key={k.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-50/60 py-1 pr-1 pl-2 text-sm">
              <Badge tone={MATCH_TONE[k.matchType]} size="sm">
                {MATCH_LABEL[k.matchType]}
              </Badge>
              <span className="text-ink-800">{fmtKw(k.text, k.matchType)}</span>
              {k.impressions > 0 && (
                <span className="num text-[11px] text-ink-400" title="Impressões · cliques">
                  {formatNumber(k.impressions, { compact: true })}·{k.clicks}
                </span>
              )}
              <button
                type="button"
                aria-label={`Remover ${k.text}`}
                onClick={() => patchGroup((g) => ({ ...g, keywords: g.keywords.filter((x) => x.id !== k.id) }))}
                className="rounded p-0.5 text-ink-400 hover:bg-ink-200 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            addKw()
          }}
        >
          <input
            aria-label="Nova palavra-chave"
            placeholder="Nova palavra-chave, ex: aluguel lavadora de piso"
            value={kwText}
            onChange={(e) => {
              setKwText(e.target.value)
              setKwErr(null)
            }}
            className="h-9 flex-1 rounded-lg border border-line-strong bg-white px-3 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
          />
          <Select
            aria-label="Tipo de correspondência"
            className="sm:w-36"
            value={kwMatch}
            onChange={(e) => setKwMatch(e.target.value as KeywordMatchType)}
            options={(['EXACT', 'PHRASE', 'BROAD'] as const).map((m) => ({ value: m, label: MATCH_LABEL[m] }))}
          />
          <Button type="submit" variant="outline" leftIcon={<Plus className="size-4" />} disabled={!kwText.trim()}>
            Adicionar
          </Button>
        </form>
        {kwErr && <p className="text-xs text-danger-600">{kwErr}</p>}
      </Card>

      <div>
        <SearchAdPreview group={group} />
        <p className="mt-2 text-xs text-ink-500">O Google combina até 3 títulos e 2 descrições automaticamente. A prévia atualiza enquanto você edita.</p>
      </div>
      <div className="space-y-5">
        <div className="space-y-5">
          <Card padding="md" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Títulos (RSA)</h3>
              <span className={cn('text-xs', hOver ? 'text-danger-600' : 'text-ink-500')}>
                {group.headlines.length}/15 · máx. {HEADLINE_MAX} caracteres{hOver ? ` · ${hOver} acima do limite` : ''}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.headlines.map((h, i) => (
                <CountedField
                  key={i}
                  label={`Título ${i + 1}`}
                  value={h}
                  max={HEADLINE_MAX}
                  onChange={(v) => patchGroup((g) => ({ ...g, headlines: g.headlines.map((x, j) => (j === i ? v : x)) }))}
                />
              ))}
            </div>
          </Card>
          <Card padding="md" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Descrições (RSA)</h3>
              <span className={cn('text-xs', dOver ? 'text-danger-600' : 'text-ink-500')}>
                {group.descriptions.length}/4 · máx. {DESCRIPTION_MAX} caracteres
              </span>
            </div>
            {group.descriptions.map((d, i) => (
              <CountedField
                key={i}
                multiline
                label={`Descrição ${i + 1}`}
                value={d}
                max={DESCRIPTION_MAX}
                onChange={(v) => patchGroup((g) => ({ ...g, descriptions: g.descriptions.map((x, j) => (j === i ? v : x)) }))}
              />
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
