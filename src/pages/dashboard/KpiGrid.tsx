import { Bot, CircleDollarSign, Crosshair, Percent, Timer, UserRoundCheck, Users, Wallet } from 'lucide-react'
import { KpiCard, ProgressBar } from '@/components/ui'
import { formatBRL, formatMinutes, formatMs, formatNumber, formatPercent } from '@/lib/format'
import { deltaOf, type PeriodKpis } from './usePeriodKpis'

const usd = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('US$', 'US$ ')

export function KpiGrid({ data, loading, prevLabel }: { data: PeriodKpis; loading: boolean; prevLabel: string }) {
  const { kpis, prev, monthSpend, monthLabel } = data
  const budget = kpis.monthlyBudget
  const budgetPct = budget ? monthSpend / budget : 0
  const aiOk = kpis.medianAiResponseMs != null && kpis.medianAiResponseMs < 10_000
  const slaOk = kpis.medianHumanSlaMin != null && kpis.medianHumanSlaMin <= 15
  const d = (c: number | null | undefined, p: number | null | undefined) => (prev ? deltaOf(c, p) : null)
  const dl = prev ? prevLabel : undefined

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        loading={loading}
        label="Investimento vs orçamento"
        icon={<Wallet />}
        iconTone={budgetPct > 1 ? 'danger' : budgetPct > 0.9 ? 'warning' : 'primary'}
        value={formatBRL(monthSpend)}
        caption={`de ${formatBRL(budget, { decimals: 0 })}/mês · ${monthLabel}`}
        hint="Investimento registrado no mês corrente (API, manual ou CSV) comparado ao orçamento de mídia do piloto de R$ 1.000/mês."
        footer={<ProgressBar size="sm" value={monthSpend} max={budget} tone={budgetPct > 1 ? 'danger' : budgetPct > 0.9 ? 'warning' : 'primary'} valueLabel={formatPercent(budgetPct, 0)} label="Consumo do orçamento" />}
      />
      <KpiCard
        loading={loading}
        label="Leads totais"
        icon={<Users />}
        iconTone="info"
        value={formatNumber(kpis.totalLeads)}
        delta={d(kpis.totalLeads, prev?.totalLeads)}
        deltaLabel={dl}
        caption={!prev ? `${kpis.paidLeads} de mídia paga` : undefined}
        hint="Todos os leads que entraram no período, de qualquer origem (Google, Meta, Instagram, site, WhatsApp e outbound)."
      />
      <KpiCard
        loading={loading}
        label="Taxa lead → SQL"
        icon={<Percent />}
        iconTone="violet"
        value={formatPercent(kpis.leadToSqlRate)}
        delta={d(kpis.leadToSqlRate, prev?.leadToSqlRate)}
        deltaLabel={dl}
        caption={!prev ? `${kpis.sqlCount} SQLs de ${kpis.totalLeads} leads` : undefined}
        hint="Percentual dos leads que a IA qualificou e entregou ao Vinicius como SQL."
      />
      <KpiCard
        loading={loading}
        label="Mediana resposta IA"
        icon={<Bot />}
        iconTone={aiOk ? 'success' : 'warning'}
        value={formatMs(kpis.medianAiResponseMs)}
        caption={aiOk ? 'Meta < 10 s · dentro' : 'Meta < 10 s · acima'}
        hint="Tempo mediano entre a primeira mensagem do lead e a primeira resposta da IA (site, Instagram Direct e WhatsApp). Meta do piloto: menos de 10 segundos."
      />
      <KpiCard
        loading={loading}
        label="Mediana SLA humano"
        icon={<Timer />}
        iconTone={slaOk ? 'success' : 'warning'}
        value={formatMinutes(kpis.medianHumanSlaMin)}
        caption={`Meta ≤ 15 min · ${kpis.humanSlaWithinTargetRate != null ? formatPercent(kpis.humanSlaWithinTargetRate, 0) : '—'} dentro`}
        hint="Minutos entre o handoff para o Vinicius e a primeira resposta humana, em horário comercial (seg–sex 08h–18h). Meta: até 15 minutos."
        footer={kpis.humanSlaWithinTargetRate != null ? <ProgressBar size="xs" value={kpis.humanSlaWithinTargetRate * 100} tone={kpis.humanSlaWithinTargetRate >= 0.8 ? 'success' : 'warning'} /> : undefined}
      />
      <KpiCard
        loading={loading}
        label="Cobertura de rastreamento"
        icon={<Crosshair />}
        iconTone={kpis.trackingCoverage >= 1 ? 'success' : 'warning'}
        value={formatPercent(kpis.trackingCoverage, 0)}
        caption="Meta 100% · UTM, gclid, fbclid"
        hint="Percentual dos leads de mídia paga com identificador de clique capturado (gclid, fbclid ou mídia do Instagram). Necessário para enviar conversões offline ao Google Ads e Meta CAPI."
        footer={<ProgressBar size="xs" value={kpis.trackingCoverage * 100} tone={kpis.trackingCoverage >= 1 ? 'success' : 'warning'} />}
      />
      <KpiCard
        loading={loading}
        label="Custo IA (gpt-4o-mini)"
        icon={<CircleDollarSign />}
        iconTone="neutral"
        value={usd(kpis.aiCostUsd)}
        caption={kpis.totalLeads ? `${usd(kpis.aiCostUsd / kpis.totalLeads)} por lead` : undefined}
        hint="Custo de tokens da IA SDR (gpt-4o-mini) somado em todas as conversas do período."
      />
      <KpiCard
        loading={loading}
        label="Negócios ganhos"
        icon={<UserRoundCheck />}
        iconTone="success"
        value={formatNumber(kpis.wonCount)}
        caption={formatBRL(kpis.closedBRL)}
        hint="Cards movidos para Fechado (Ganho) com valor de contrato informado."
      />
    </div>
  )
}
