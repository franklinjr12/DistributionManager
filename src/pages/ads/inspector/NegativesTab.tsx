import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Plus, Search, Sparkles, X } from 'lucide-react'
import type { AdCampaign } from '@/types/domain'
import { Button, Card, EmptyState, Input } from '@/components/ui'
import { useAutomationStore } from '@/store'
import { formatBRL, formatDate } from '@/lib/format'
import type { Draft, SetDraft } from './draft'

export function NegativesTab({ c, draft, setDraft }: { c: AdCampaign; draft: Draft; setDraft: SetDraft }) {
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('')
  const runs = useAutomationStore((s) => s.optimizationRuns)
  const negativeKeywords = useAutomationStore((s) => s.negativeKeywords)
  const lastRun = useMemo(() => [...runs].sort((a, b) => b.runDate.localeCompare(a.runDate))[0], [runs])
  const fromOptimizer = useMemo(() => {
    const set = new Set(negativeKeywords.filter((n) => n.source === 'AI_OPTIMIZER' && (n.campaignId === c.id || n.scope === 'ACCOUNT')).map((n) => n.text))
    return set
  }, [negativeKeywords, c.id])

  const original = new Set(c.negatives)
  const list = draft.negatives.filter((n) => n.includes(filter.trim().toLowerCase()))

  const add = () => {
    const terms = text
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    if (!terms.length) return
    setDraft((d) => ({ ...d, negatives: Array.from(new Set([...d.negatives, ...terms])) }))
    setText('')
  }

  return (
    <div className="space-y-5">
      {c.platform === 'GOOGLE' && (
        <div className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-4 sm:flex-row sm:items-center">
          <Sparkles className="size-5 shrink-0 text-violet-600" />
          <div className="flex-1 text-sm text-ink-700">
            <strong className="text-ink-900">Otimizador semanal de termos de pesquisa</strong> roda toda segunda-feira e injeta negativas automaticamente.
            {lastRun && (
              <span className="block text-xs text-ink-500">
                Última execução {formatDate(lastRun.runDate)}: {lastRun.negativesAdded} negativas · economia estimada {formatBRL(lastRun.wastedSpendSavedBRL)}
              </span>
            )}
          </div>
          <Link to="/automacao" className="text-sm font-medium text-violet-700 hover:underline">
            Ver otimizador →
          </Link>
        </div>
      )}

      <Card padding="md" className="space-y-3">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <Input
            wrapperClassName="flex-1"
            aria-label="Adicionar negativas"
            placeholder="Adicionar termos (separe por vírgula), ex: residencial, usada"
            value={text}
            onChange={(e) => setText(e.target.value)}
            leftIcon={<Ban className="size-4" />}
          />
          <Button type="submit" variant="outline" leftIcon={<Plus className="size-4" />} disabled={!text.trim()}>
            Adicionar
          </Button>
        </form>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-500">{draft.negatives.length} negativas nesta campanha</span>
          {draft.negatives.length > 8 && (
            <Input size="sm" wrapperClassName="w-48" aria-label="Filtrar negativas" placeholder="Filtrar…" leftIcon={<Search className="size-3.5" />} value={filter} onChange={(e) => setFilter(e.target.value)} />
          )}
        </div>
        {list.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {list.map((n) => (
              <li
                key={n}
                className={
                  'inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2.5 text-xs ' +
                  (original.has(n) ? 'border-line bg-ink-50 text-ink-700' : 'border-success-500/40 bg-success-50 text-success-700')
                }
              >
                {fromOptimizer.has(n) && <Sparkles className="size-3 text-violet-500" aria-label="Adicionada pelo otimizador IA" />}
                {n}
                <button
                  type="button"
                  aria-label={`Remover negativa ${n}`}
                  onClick={() => setDraft((d) => ({ ...d, negatives: d.negatives.filter((x) => x !== n) }))}
                  className="rounded-full p-0.5 text-ink-400 hover:bg-ink-200 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={<Ban />} title={filter ? 'Nenhuma negativa encontrada' : 'Sem negativas'} description={c.platform === 'META' ? 'Campanhas Meta usam exclusões de público em vez de palavras negativas.' : undefined} />
        )}
      </Card>
    </div>
  )
}
