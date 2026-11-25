import { CalendarClock, Info, MapPin, Wallet } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import type { AdCampaign, AllowedState } from '@/types/domain'
import { Card, Input } from '@/components/ui'
import { TONE_HEX, UF_NAME, formatBRL, formatDayMonth, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BUSINESS_DAYS_MONTH, MAX_DAILY_BUDGET, MIN_DAILY_BUDGET, WEEKDAY_SHORT, type RangeMetrics } from '../lib'
import { budgetError, parseBudget, type Draft, type SetDraft } from './draft'

const ALL_STATES: AllowedState[] = ['PA', 'MA', 'AP']

interface Props {
  c: AdCampaign
  m: RangeMetrics
  rangeLabel: string
  series: { date: string; spend: number; leads: number; sqls: number }[]
  draft: Draft
  setDraft: SetDraft
  otherEnabledDaily: number
  monthlyBudget: number
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="num mt-0.5 text-lg font-semibold text-ink-900">{value}</div>
      {sub && <div className="text-xs text-ink-500">{sub}</div>}
    </div>
  )
}

export function OverviewTab({ c, m, rangeLabel, series, draft, setDraft, otherEnabledDaily, monthlyBudget }: Props) {
  const err = budgetError(draft.budget)
  const budget = parseBudget(draft.budget)
  const projected = Number.isNaN(budget) ? null : budget * BUSINESS_DAYS_MONTH
  const accountProjected = Number.isNaN(budget) ? null : (otherEnabledDaily + (c.status === 'ENABLED' ? budget : 0)) * BUSINESS_DAYS_MONTH
  const overAccount = accountProjected != null && accountProjected > monthlyBudget

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Desempenho · {rangeLabel}</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Metric label="Investimento" value={formatBRL(m.spend)} sub={`${formatNumber(m.clicks)} cliques · CTR ${formatPercent(m.ctr, 2)}`} />
          <Metric label="Leads" value={formatNumber(m.leads)} sub={`CPL ${formatBRL(m.cpl)}`} />
          <Metric label="SQLs" value={formatNumber(m.sqls)} sub={m.sqls ? `Custo/SQL ${formatBRL(m.spend / m.sqls)}` : 'Nenhum SQL ainda'} />
          <Metric label="Impressões" value={formatNumber(m.impressions)} />
          <Metric label="Receita ganha" value={formatBRL(m.wonBRL, { decimals: 0 })} sub={m.roas && m.wonBRL ? `ROAS ${formatNumber(m.roas, { maxDecimals: 1 })}x` : undefined} />
          <Metric label="Rastreamento" value={c.metrics.leads ? formatPercent(c.metrics.trackingCoverage, 0) : '—'} sub={c.platform === 'GOOGLE' ? 'leads com gclid' : 'leads com fbclid'} />
        </div>
      </section>

      <Card padding="md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Investimento × leads por dia</h3>
          <span className="text-xs text-ink-500">dias úteis</span>
        </div>
        {series.length ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDayMonth(`${d}T12:00:00-03:00`)} tick={{ fontSize: 11, fill: '#667085' }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: '#667085' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `R$${v}`} />
                <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: '#667085' }} tickLine={false} axisLine={false} />
                <RTooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e4e7ec', fontSize: 12 }}
                  labelFormatter={(d) => formatDayMonth(`${String(d)}T12:00:00-03:00`)}
                  formatter={(v, name) => (name === 'Investimento' ? [formatBRL(Number(v)), name] : [formatNumber(Number(v)), name])}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="spend" name="Investimento" fill={TONE_HEX.primary} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Line yAxisId="r" dataKey="leads" name="Leads" stroke={TONE_HEX.violet} strokeWidth={2} dot={false} type="monotone" />
                <Line yAxisId="r" dataKey="sqls" name="SQLs" stroke={TONE_HEX.success} strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-ink-500">Campanha ainda não veiculou neste período.</p>
        )}
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Wallet className="size-4 text-primary-600" /> Orçamento diário
          </div>
          <Input
            label="Valor por dia"
            prefix="R$"
            inputMode="decimal"
            value={draft.budget}
            error={err}
            hint={projected != null ? `≈ ${formatBRL(projected, { decimals: 0 })}/mês (${BUSINESS_DAYS_MONTH} dias úteis)` : undefined}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.,]/g, '')
              setDraft((d) => ({ ...d, budget: v }))
            }}
          />
          <p className="text-xs text-ink-500">
            Limites do piloto: {formatBRL(MIN_DAILY_BUDGET)} a {formatBRL(MAX_DAILY_BUDGET)} por dia.
          </p>
          {overAccount && !err && (
            <div className="flex gap-2 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Campanhas ativas projetam {formatBRL(accountProjected, { decimals: 0 })}/mês — acima do orçamento de mídia de {formatBRL(monthlyBudget, { decimals: 0 })}.
            </div>
          )}
        </Card>

        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <MapPin className="size-4 text-primary-600" /> Segmentação geográfica
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Estados atendidos">
            {ALL_STATES.map((s) => {
              const on = draft.targetStates.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setDraft((d) => ({ ...d, targetStates: on ? d.targetStates.filter((x) => x !== s) : ALL_STATES.filter((x) => x === s || d.targetStates.includes(x)) }))
                  }
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-left text-sm transition focus-visible:ring-4 focus-visible:ring-primary-100 focus-visible:outline-none',
                    on ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-line-strong bg-white text-ink-500 hover:bg-ink-50',
                  )}
                >
                  <span className="font-semibold">{s}</span> <span className="text-xs">{UF_NAME[s]}</span>
                </button>
              )
            })}
          </div>
          {draft.targetStates.length === 0 ? (
            <p className="text-xs text-danger-600">Selecione ao menos um estado.</p>
          ) : (
            <p className="text-xs text-ink-500">Cobertura comercial da Maquinabel: apenas PA, MA e AP.</p>
          )}
        </Card>

        <Card padding="md" className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <CalendarClock className="size-4 text-primary-600" /> Programação de anúncios
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const on = c.schedule.days.includes(d)
              return (
                <span
                  key={d}
                  className={cn('flex h-8 w-11 items-center justify-center rounded-lg text-xs font-medium', on ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-400')}
                >
                  {WEEKDAY_SHORT[d]}
                </span>
              )
            })}
            <span className="ml-2 text-sm font-medium text-ink-800">
              {c.schedule.start}–{c.schedule.end}
            </span>
            <span className="text-xs text-ink-500">({c.schedule.timezone})</span>
          </div>
          <p className="text-xs text-ink-500">Herdado do horário comercial do tenant — anúncios só rodam quando o Vinicius pode atender. Altere em Configurações.</p>
        </Card>
      </section>
    </div>
  )
}
