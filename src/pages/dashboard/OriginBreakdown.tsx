import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownWideNarrow, Tags } from 'lucide-react'
import { Badge, Card, CardHeader, ChannelIcon, Num, Table, Tabs } from '@/components/ui'
import { formatBRL, formatPercent } from '@/lib/format'
import { cn, sum } from '@/lib/utils'
import type { OriginBreakdown as Row } from '@/store'
import { AXIS_TICK, ChartTooltip, GRID_STROKE, LegendDot } from './ChartTooltip'
import { InfoHint } from './InfoHint'

const C_LEADS = 'var(--color-chart-6)'
const C_SQLS = 'var(--color-chart-4)'

type SortKey = 'sqls' | 'leads' | 'cpl' | 'sqlRate' | 'wonBRL'
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'sqls', label: 'SQLs' },
  { value: 'leads', label: 'Leads' },
  { value: 'sqlRate', label: 'Taxa SQL' },
  { value: 'cpl', label: 'CPL' },
  { value: 'wonBRL', label: 'Ganho R$' },
]

export function OriginBreakdown({ rows }: { rows: Row[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('sqls')
  const sorted = useMemo(() => {
    const list = rows.filter((r) => r.leads > 0 || r.spend > 0)
    return [...list].sort((a, b) => {
      if (sortBy === 'cpl') return (a.cpl ?? Infinity) - (b.cpl ?? Infinity)
      return (b[sortBy] as number) - (a[sortBy] as number) || b.leads - a.leads
    })
  }, [rows, sortBy])
  const chartRows = sorted.filter((r) => r.leads > 0)
  const totals = {
    leads: sum(sorted.map((r) => r.leads)),
    sqls: sum(sorted.map((r) => r.sqls)),
    spend: sum(sorted.map((r) => r.spend)),
    wonBRL: sum(sorted.map((r) => r.wonBRL)),
    pipelineBRL: sum(sorted.map((r) => r.pipelineBRL)),
  }

  return (
    <Card padding="none" className="min-w-0">
      <CardHeader
        className="flex-wrap px-5 pt-4 [&>div.flex-1]:basis-48"
        icon={<Tags />}
        title={
          <span className="flex items-center gap-1.5">
            Desempenho por tag de origem <InfoHint content="Cada lead carrega uma tag de origem (ex.: Google_Ads_Locacao, IG_Reels_S16). O investimento de cada campanha é rateado entre as tags dos leads que ela gerou." />
          </span>
        }
        description="Leads, SQLs, CPL, taxa de SQL e receita ganha por origem"
        actions={
          <div className="flex items-center gap-2">
            <ArrowDownWideNarrow className="hidden size-4 text-ink-400 sm:block" aria-hidden />
            <Tabs size="sm" variant="pills" items={SORTS} value={sortBy} onChange={(v) => setSortBy(v as SortKey)} />
          </div>
        }
      />
      <div className="grid gap-4 p-4 pt-2 xl:grid-cols-[minmax(0,360px)_1fr]">
        <div>
          <div className="flex gap-4 px-1 pb-1">
            <LegendDot color={C_LEADS} label="Leads" />
            <LegendDot color={C_SQLS} label="SQLs" />
          </div>
          <div style={{ height: Math.max(180, chartRows.length * 34 + 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2} barCategoryGap={6}>
                <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={130} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
                <Tooltip
                  cursor={{ fill: 'var(--color-ink-100)' }}
                  content={
                    <ChartTooltip
                      footer={(p) => {
                        const r = p[0]?.payload as Row
                        return `Taxa SQL ${formatPercent(r.sqlRate)} · CPL ${r.cpl != null ? formatBRL(r.cpl) : '—'}`
                      }}
                    />
                  }
                />
                <Bar dataKey="leads" name="Leads" fill={C_LEADS} radius={[0, 3, 3, 0]} maxBarSize={10} />
                <Bar dataKey="sqls" name="SQLs" fill={C_SQLS} radius={[0, 3, 3, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Table compact hover className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap" wrapperClassName="rounded-lg border border-line">
          <thead>
            <tr>
              <th>Origem</th>
              <th className="text-right">Leads</th>
              <th className="text-right">SQLs</th>
              <th className="text-right">Taxa SQL</th>
              <th className="text-right">Invest.</th>
              <th className="text-right">CPL</th>
              <th className="text-right">Pipeline</th>
              <th className="text-right">Ganho R$</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.originTag}>
                <td>
                  <div className="flex min-w-48 items-center gap-2">
                    <ChannelIcon channel={r.channel} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink-800">{r.label}</p>
                      <p className="truncate font-mono text-[10px] text-ink-400">{r.originTag}</p>
                    </div>
                    {r.paid && (
                      <Badge size="sm" tone="primary" className="ml-auto">
                        Pago
                      </Badge>
                    )}
                  </div>
                </td>
                <td><Num>{r.leads}</Num></td>
                <td><Num className={cn(r.sqls > 0 && 'font-semibold text-ink-900')}>{r.sqls}</Num></td>
                <td><Num>{r.leads ? formatPercent(r.sqlRate, 0) : '—'}</Num></td>
                <td><Num>{r.spend ? formatBRL(r.spend, { decimals: 0 }) : '—'}</Num></td>
                <td><Num>{r.cpl != null ? formatBRL(r.cpl, { decimals: 0 }) : '—'}</Num></td>
                <td><Num>{r.pipelineBRL ? formatBRL(r.pipelineBRL, { decimals: 0 }) : '—'}</Num></td>
                <td><Num className={cn(r.wonBRL > 0 && 'font-semibold text-success-700')}>{r.wonBRL ? formatBRL(r.wonBRL, { decimals: 0 }) : '—'}</Num></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-ink-50 font-semibold">
              <td className="text-xs text-ink-700">Total</td>
              <td><Num>{totals.leads}</Num></td>
              <td><Num>{totals.sqls}</Num></td>
              <td><Num>{totals.leads ? formatPercent(totals.sqls / totals.leads, 0) : '—'}</Num></td>
              <td><Num>{formatBRL(totals.spend, { decimals: 0 })}</Num></td>
              <td><Num>—</Num></td>
              <td><Num>{formatBRL(totals.pipelineBRL, { decimals: 0 })}</Num></td>
              <td><Num>{formatBRL(totals.wonBRL, { decimals: 0 })}</Num></td>
            </tr>
          </tfoot>
        </Table>
      </div>
    </Card>
  )
}
