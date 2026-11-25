import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LineChart as LineChartIcon } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui'
import { formatBRL, formatDayMonth, formatNumber, formatWeekdayShort } from '@/lib/format'
import { sum } from '@/lib/utils'
import type { Kpis } from '@/store'
import { AXIS_TICK, ChartTooltip, GRID_STROKE, LegendDot } from './ChartTooltip'
import { InfoHint } from './InfoHint'

const C_SPEND = 'var(--color-chart-1)'
const C_LEADS = 'var(--color-chart-6)'
const C_SQLS = 'var(--color-chart-4)'

const dayLabel = (d: unknown) => {
  const s = String(d)
  return `${formatWeekdayShort(`${s}T12:00:00-03:00`)}, ${formatDayMonth(`${s}T12:00:00-03:00`)}`
}

/**
 * Spend and leads/SQLs live on different scales → two aligned small multiples
 * sharing the x axis (syncId) instead of a dual-axis chart.
 */
export function DailyTrendChart({ daily }: { daily: Kpis['daily'] }) {
  const tick = (d: string) => formatDayMonth(`${d}T12:00:00-03:00`)
  const interval = daily.length > 20 ? Math.ceil(daily.length / 8) - 1 : 0
  const totalSpend = sum(daily.map((d) => d.spend))
  const totalLeads = sum(daily.map((d) => d.leads))
  const totalSqls = sum(daily.map((d) => d.sqls))

  return (
    <Card padding="none" className="min-w-0">
      <CardHeader
        className="flex-wrap px-5 pt-4 [&>div.flex-1]:basis-48"
        icon={<LineChartIcon />}
        title={
          <span className="flex items-center gap-1.5">
            Investimento diário vs leads e SQLs <InfoHint content="Gráficos alinhados pelo mesmo eixo de datas. Passe o mouse para ver o dia nos dois painéis. Fins de semana costumam ter investimento zero (campanhas programadas seg–sex)." />
          </span>
        }
        description={`${formatBRL(totalSpend)} investidos · ${totalLeads} leads · ${totalSqls} SQLs`}
      />
      <div className="px-2 pb-4 sm:px-4">
        <div className="flex items-center justify-between px-2 pt-2">
          <LegendDot color={C_SPEND} label="Investimento (R$)" />
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} syncId="dash-daily" margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="date" hide />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => formatBRL(v, { decimals: 0 })} />
              <Tooltip cursor={{ fill: 'var(--color-ink-100)' }} content={<ChartTooltip labelFormatter={dayLabel} valueFormatter={(v) => formatBRL(v)} />} />
              <Bar dataKey="spend" name="Investimento" fill={C_SPEND} radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-2 pt-3">
          <LegendDot color={C_LEADS} label="Leads" />
          <LegendDot color={C_SQLS} label="SQLs" line />
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={daily} syncId="dash-daily" margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={tick} axisLine={{ stroke: GRID_STROKE }} tickLine={false} interval={interval} minTickGap={8} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'var(--color-ink-100)' }} content={<ChartTooltip labelFormatter={dayLabel} valueFormatter={(v) => formatNumber(v)} />} />
              <Bar dataKey="leads" name="Leads" fill={C_LEADS} radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Line dataKey="sqls" name="SQLs" type="monotone" stroke={C_SQLS} strokeWidth={2} dot={(p: { cx?: number; cy?: number; index?: number; payload?: { sqls: number } }) =>
                  p.payload && p.payload.sqls > 0 ? <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill={C_SQLS} stroke="var(--color-surface)" strokeWidth={2} /> : <g key={p.index} />
                } activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}
