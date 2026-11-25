import { BadgeDollarSign, Eye, MousePointerClick, Target, Trophy, UserPlus, Wallet } from 'lucide-react'
import { KpiCard, ProgressBar } from '@/components/ui'
import { formatBRL, formatNumber, formatPercent } from '@/lib/format'
import type { RangeMetrics } from './lib'
import { ratioDelta } from './lib'

interface Props {
  cur: RangeMetrics
  prev: RangeMetrics | null
  monthSpend: number
  monthlyBudget: number
  dayOfMonth: number
  daysInMonth: number
  loading?: boolean
}

export function KpiRow({ cur, prev, monthSpend, monthlyBudget, dayOfMonth, daysInMonth, loading }: Props) {
  const d = (a: number | null, b: number | null | undefined) => (prev ? ratioDelta(a, b ?? null) : null)
  const deltaLabel = prev ? 'vs período anterior' : undefined
  const pacing = monthlyBudget ? monthSpend / monthlyBudget : 0
  const expected = dayOfMonth / daysInMonth
  const tone = pacing > expected * 1.1 ? 'warning' : 'success'
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        loading={loading}
        className="sm:col-span-2"
        label="Investimento"
        icon={<Wallet className="size-4" />}
        value={formatBRL(cur.spend)}
        delta={d(cur.spend, prev?.spend)}
        deltaLabel={deltaLabel}
        footer={
          <ProgressBar
            size="sm"
            tone={tone}
            value={monthSpend}
            max={monthlyBudget}
            marker={expected * monthlyBudget}
            markerLabel="Ritmo esperado"
            label="Novembro"
            valueLabel={`${formatBRL(monthSpend, { decimals: 0 })} / ${formatBRL(monthlyBudget, { decimals: 0 })}`}
          />
        }
      />
      <KpiCard
        loading={loading}
        label="Impressões"
        icon={<Eye className="size-4" />}
        iconTone="neutral"
        value={formatNumber(cur.impressions)}
        delta={d(cur.impressions, prev?.impressions)}
        deltaLabel={deltaLabel}
      />
      <KpiCard
        loading={loading}
        label="Cliques · CTR"
        icon={<MousePointerClick className="size-4" />}
        iconTone="info"
        value={formatNumber(cur.clicks)}
        caption={`CTR ${formatPercent(cur.ctr, 2)}`}
        delta={d(cur.clicks, prev?.clicks)}
        deltaLabel={deltaLabel}
      />
      <KpiCard
        loading={loading}
        label="Leads"
        icon={<UserPlus className="size-4" />}
        iconTone="violet"
        value={formatNumber(cur.leads)}
        delta={d(cur.leads, prev?.leads)}
        deltaLabel={deltaLabel}
      />
      <KpiCard
        loading={loading}
        label="SQLs"
        icon={<Target className="size-4" />}
        iconTone="success"
        value={formatNumber(cur.sqls)}
        caption={cur.leads ? `${formatPercent(cur.sqls / cur.leads, 0)} dos leads` : undefined}
        delta={d(cur.sqls, prev?.sqls)}
        deltaLabel={deltaLabel}
      />
      <KpiCard
        loading={loading}
        label="CPL"
        icon={<BadgeDollarSign className="size-4" />}
        iconTone="warning"
        value={formatBRL(cur.cpl)}
        invertDelta
        delta={d(cur.cpl, prev?.cpl)}
        deltaLabel={deltaLabel}
      />
      <KpiCard
        loading={loading}
        label="Receita ganha · ROAS"
        icon={<Trophy className="size-4" />}
        iconTone="success"
        value={formatBRL(cur.wonBRL, { compact: cur.wonBRL >= 100_000 })}
        caption={cur.roas != null && cur.wonBRL > 0 ? `ROAS ${formatNumber(cur.roas, { maxDecimals: 1 })}x` : 'Sem fechamentos no período'}
      />
    </div>
  )
}
