import type { ReactNode } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import type { BlueprintCampaign } from '@/types/domain'
import { Badge, Button, Skeleton, Tooltip } from '@/components/ui'
import { formatBRL, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { WORKDAYS_PER_MONTH } from './mockGenerator'

interface Props {
  campaign: BlueprintCampaign
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<BlueprintCampaign>) => void
  onRegenerate: () => void
  regenerating: boolean
  issueCount: number
  icon: ReactNode
  children: ReactNode
}

export function CampaignShell({ campaign: c, expanded, onToggle, onChange, onRegenerate, regenerating, issueCount, icon, children }: Props) {
  const panelId = `bp-panel-${c.tempId}`
  return (
    <div
      id={`bp-campaign-${c.tempId}`}
      className={cn(
        'scroll-mt-24 rounded-xl border bg-white shadow-card transition-all duration-200',
        c.included ? 'border-line' : 'border-dashed border-line-strong bg-ink-50/60',
        issueCount > 0 && c.included && 'border-danger-500/40 ring-1 ring-danger-100',
      )}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <input
          type="checkbox"
          className="mt-1.5 h-4 w-4 shrink-0 accent-primary-600"
          checked={c.included}
          onChange={(e) => onChange({ included: e.target.checked })}
          aria-label={`Incluir campanha ${c.name}`}
        />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={panelId} className="group flex w-full items-start gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="min-w-0 flex-1">
              <span className={cn('block text-sm font-semibold leading-snug', c.included ? 'text-ink-900' : 'text-ink-500 line-through decoration-ink-300')}>{c.name}</span>
              <span className="mt-0.5 block text-xs text-ink-500">{c.objective}</span>
            </span>
            <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 group-hover:text-ink-700', expanded && 'rotate-180')} />
          </button>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge tone="neutral" size="sm">Pausada ao implantar</Badge>
            {issueCount > 0 && c.included && <Badge tone="danger" size="sm">{issueCount} {issueCount === 1 ? 'problema' : 'problemas'}</Badge>}
            <span className="text-xs text-ink-400 num">~{formatNumber(c.estimatedClicksMonth)} cliques · ~{c.estimatedLeadsMonth} leads/mês</span>
            <div className="ml-auto flex items-center gap-1.5">
              <label htmlFor={`bud-${c.tempId}`} className="text-xs text-ink-500">Diário</label>
              <div className="flex h-8 items-center rounded-lg border border-line-strong bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
                <span className="pl-2 text-xs text-ink-400">R$</span>
                <input
                  id={`bud-${c.tempId}`}
                  type="number"
                  min={1}
                  step={0.5}
                  value={c.dailyBudgetBRL}
                  disabled={!c.included}
                  onChange={(e) => onChange({ dailyBudgetBRL: Math.max(0, Number(e.target.value) || 0) })}
                  className="num h-full w-16 bg-transparent px-1.5 text-sm focus:outline-none disabled:opacity-50"
                />
              </div>
              <Tooltip side="left" content={`${formatBRL(c.dailyBudgetBRL * WORKDAYS_PER_MONTH)}/mês (${WORKDAYS_PER_MONTH} dias úteis)`}>
                <span className="hidden text-xs text-ink-400 num sm:inline">{formatBRL(c.dailyBudgetBRL * WORKDAYS_PER_MONTH)}/mês</span>
              </Tooltip>
              <Tooltip content="Regenerar variações desta campanha" side="left">
                <Button size="icon-sm" variant="ghost" onClick={onRegenerate} disabled={regenerating || !c.included} aria-label={`Regenerar ${c.name}`}>
                  <RefreshCw className={cn('h-4 w-4', regenerating && 'animate-spin')} />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      <div id={panelId} hidden={!expanded} className="border-t border-line">
        {expanded && (
          <div className="relative animate-fade-in p-3 sm:p-4">
            {regenerating ? (
              <div className="space-y-3" aria-busy>
                <p className="flex items-center gap-2 text-xs font-medium text-violet-600"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> gpt-4o-mini gerando novas variações…</p>
                <Skeleton lines={3} />
                <Skeleton className="h-20" />
                <Skeleton lines={2} />
              </div>
            ) : (
              <div className={cn(!c.included && 'pointer-events-none opacity-50')}>{children}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
