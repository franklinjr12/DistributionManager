import { CalendarClock, ChevronRight, Info } from 'lucide-react'
import type { CampaignBlueprint } from '@/types/domain'
import { Badge, Card, CardHeader } from '@/components/ui'
import { formatBRL, formatDateTime } from '@/lib/format'

/** Pre-pilot blueprint that produced the seed campaigns (not in store; display only). */
const LEGACY = [
  { id: 'legacy_1', at: '2026-10-09T15:42:00-03:00', campaigns: 8, budget: 1000, tokens: 6914, note: 'Blueprint inicial do piloto' },
]

interface Props {
  blueprints: CampaignBlueprint[]
  onOpen: (bp: CampaignBlueprint) => void
}

export function BlueprintHistory({ blueprints, onOpen }: Props) {
  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4" title="Histórico de blueprints" icon={<CalendarClock className="h-4 w-4" />} />
      <ul className="mt-2 divide-y divide-line">
        {blueprints.map((bp) => {
          const included = bp.campaigns.filter((c) => c.included).length
          const draft = bp.status === 'DRAFT'
          const content = (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-800 num">{formatDateTime(bp.generatedAt)}</span>
                  <Badge size="sm" tone={draft ? 'warning' : 'success'} dot>{draft ? 'Rascunho' : 'Implantado'}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-500 num">
                  {included} campanhas · {formatBRL(bp.config.monthlyBudgetBRL)}/mês · {(bp.tokensIn + bp.tokensOut).toLocaleString('pt-BR')} tokens
                </p>
              </div>
              {draft && <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
            </>
          )
          return (
            <li key={bp.id}>
              {draft ? (
                <button type="button" onClick={() => onOpen(bp)} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-ink-50 focus-visible:bg-ink-50 focus-visible:outline-none" aria-label="Abrir rascunho para revisão">
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3">{content}</div>
              )}
            </li>
          )
        })}
        {LEGACY.map((l) => (
          <li key={l.id} className="flex items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-800 num">{formatDateTime(l.at)}</span>
                <Badge size="sm" tone="success" dot>Implantado</Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-500 num">{l.note} · {l.campaigns} campanhas · {formatBRL(l.budget)}/mês</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-1.5 border-t border-line px-4 py-3 text-xs text-ink-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Rascunhos ficam salvos e podem ser reabertos para revisão.
      </p>
    </Card>
  )
}
