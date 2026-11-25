import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader } from '@/components/ui'
import { STAGE_LABEL, formatPercent } from '@/lib/format'
import type { Kpis } from '@/store'
import type { KanbanStage } from '@/types/domain'
import { AXIS_TICK, ChartTooltip } from './ChartTooltip'
import { InfoHint } from './InfoHint'

const STAGE_COLOR: Record<KanbanStage, string> = {
  NEW: 'var(--color-chart-1)',
  QUALIFYING: 'var(--color-chart-1)',
  HANDOFF: 'var(--color-chart-1)',
  PROPOSAL_SENT: 'var(--color-chart-1)',
  WON: 'var(--color-chart-2)',
  LOST: 'var(--color-ink-300)',
  DISQUALIFIED: 'var(--color-ink-300)',
}

export function FunnelChart({ funnel, total }: { funnel: Kpis['funnel']; total: number }) {
  const data = funnel.map((f) => ({ ...f, label: STAGE_LABEL[f.stage], share: total ? f.count / total : 0 }))
  return (
    <Card padding="none" className="flex min-w-0 flex-col">
      <CardHeader
        className="flex-wrap px-5 pt-4 [&>div.flex-1]:basis-48"
        icon={<Filter />}
        title={
          <span className="flex items-center gap-1.5">
            Funil por etapa do Kanban <InfoHint content="Quantidade de leads do período em cada coluna do Kanban CRM hoje. Cinza = encerrados sem venda." />
          </span>
        }
        description={`${total} leads no período`}
        actions={
          <Link to="/crm" className="text-xs font-medium text-primary-600 hover:underline">
            Abrir Kanban
          </Link>
        }
      />
      <div className="h-64 flex-1 px-2 pb-3 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, left: 4, bottom: 0 }} barCategoryGap={4}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} width={128} />
            <Tooltip
              cursor={{ fill: 'var(--color-ink-100)' }}
              content={<ChartTooltip valueFormatter={(v) => `${v} leads`} footer={(p) => `${formatPercent((p[0]?.payload as { share: number }).share)} do total`} />}
            />
            <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((d) => (
                <Cell key={d.stage} fill={STAGE_COLOR[d.stage]} />
              ))}
              <LabelList dataKey="count" position="right" className="num" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--color-ink-700)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
