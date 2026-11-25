import { useState } from 'react'
import { PieChart } from 'lucide-react'
import { Card, CardHeader, ChannelIcon, Tabs, Tooltip } from '@/components/ui'
import { formatBRL, formatNumber, formatPercent } from '@/lib/format'
import { sum } from '@/lib/utils'
import { InfoHint } from './InfoHint'
import { SPLIT_CHANNEL_COLOR, SPLIT_CHANNEL_ICON, SPLIT_CHANNEL_LABEL, type ChannelSplitRow } from './usePeriodKpis'

type Metric = 'leads' | 'sqls' | 'spend'
const METRICS: { value: Metric; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'sqls', label: 'SQLs' },
  { value: 'spend', label: 'Invest.' },
]
const fmt = (m: Metric, v: number) => (m === 'spend' ? formatBRL(v, { decimals: 0 }) : formatNumber(v))

export function ChannelSplit({ rows }: { rows: ChannelSplitRow[] }) {
  const [metric, setMetric] = useState<Metric>('leads')
  const total = sum(rows.map((r) => r[metric]))
  const visible = rows.filter((r) => r[metric] > 0)

  return (
    <Card padding="none" className="flex min-w-0 flex-col">
      <CardHeader
        className="flex-wrap px-5 pt-4 [&>div.flex-1]:basis-48"
        icon={<PieChart />}
        title={
          <span className="flex items-center gap-1.5">
            Divisão por canal <InfoHint content="Meta Ads inclui Facebook e Instagram pagos (Click-to-WhatsApp e Reels). Orgânico IG = comentários e Direct sem mídia paga." />
          </span>
        }
        actions={<Tabs size="sm" variant="pills" items={METRICS} value={metric} onChange={(v) => setMetric(v as Metric)} />}
      />
      <div className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-5">
        {/* 100% stacked bar, 2px surface gaps between segments */}
        <div className="flex h-4 w-full gap-0.5 rounded-full bg-ink-100" role="img" aria-label={`Participação por canal (${METRICS.find((m) => m.value === metric)!.label})`}>
          {visible.map((r) => (
            <div key={r.channel} className="h-full transition-[width] duration-500 first:[&_[data-seg]]:rounded-l-full last:[&_[data-seg]]:rounded-r-full" style={{ width: `${(r[metric] / total) * 100}%`, minWidth: 4 }}>
              <Tooltip content={`${SPLIT_CHANNEL_LABEL[r.channel]}: ${fmt(metric, r[metric])} (${formatPercent(r[metric] / total, 0)})`} className="flex h-full w-full">
                <span data-seg className="block h-full w-full" style={{ background: SPLIT_CHANNEL_COLOR[r.channel] }} />
              </Tooltip>
            </div>
          ))}
        </div>

        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.channel} className="flex items-center gap-3 py-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: SPLIT_CHANNEL_COLOR[r.channel] }} aria-hidden />
              <ChannelIcon channel={SPLIT_CHANNEL_ICON[r.channel]} size="xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-700">{SPLIT_CHANNEL_LABEL[r.channel]}</p>
                <p className="num truncate text-[11px] text-ink-400">
                  {r.leads} leads · {r.sqls} SQL{r.sqls === 1 ? '' : 's'}
                  {r.wonBRL ? ` · ${formatBRL(r.wonBRL, { compact: true })} ganhos` : ''}
                </p>
              </div>
              <span className="num w-16 text-right text-sm font-semibold text-ink-900">{fmt(metric, r[metric])}</span>
              <span className="num w-10 text-right text-xs text-ink-500">{total ? formatPercent(r[metric] / total, 0) : '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
