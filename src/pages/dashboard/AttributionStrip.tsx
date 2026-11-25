import type { ReactNode } from 'react'
import { BadgeDollarSign, ChevronRight, Handshake, Megaphone } from 'lucide-react'
import type { Kpis } from '@/store'
import { formatBRL, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { InfoHint } from './InfoHint'

interface Metric {
  label: string
  value: string
  hint: string
  emphasis?: boolean
}

function LevelCard({ level, title, icon, accent, metrics, footnote }: { level: number; title: string; icon: ReactNode; accent: string; metrics: Metric[]; footnote: ReactNode }) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col rounded-xl border border-line bg-surface p-4 shadow-card">
      <span className={cn('absolute inset-x-0 top-0 h-1 rounded-t-xl', accent)} aria-hidden />
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-ink-100 text-ink-600 [&_svg]:size-4">{icon}</span>
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-ink-400 uppercase">Nível {level}</p>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
        {metrics.map((m, i) => (
          <div key={m.label} className="min-w-0">
            <dt className="flex items-center gap-1 text-[11px] text-ink-500">
              <span className="truncate">{m.label}</span>
              <InfoHint content={m.hint} side={i === metrics.length - 1 ? 'left' : 'top'} />
            </dt>
            <dd className={cn('num mt-0.5 truncate font-semibold text-ink-900', m.emphasis ? 'text-lg text-primary-700' : 'text-base')}>{m.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto pt-3 text-[11px] text-ink-400">{footnote}</p>
    </div>
  )
}

function Connector() {
  return (
    <div className="flex shrink-0 items-center justify-center text-ink-300 xl:w-6" aria-hidden>
      <ChevronRight className="size-5 rotate-90 xl:rotate-0" />
    </div>
  )
}

export function AttributionStrip({ kpis }: { kpis: Kpis }) {
  return (
    <section aria-label="Atribuição em 3 níveis" className="flex flex-col gap-2 xl:flex-row xl:items-stretch xl:gap-0">
      <LevelCard
        level={1}
        title="Mídia → Leads"
        icon={<Megaphone />}
        accent="bg-chart-1"
        metrics={[
          { label: 'Investimento', value: formatBRL(kpis.totalSpend), hint: 'Soma do investimento em mídia (Google Ads + Meta Ads) no período, via sincronização de API, lançamento manual ou CSV.' },
          { label: 'Leads', value: formatNumber(kpis.totalLeads), hint: `Todos os leads que entraram no período. ${kpis.paidLeads} vieram de origens pagas (usadas no CPL).` },
          { label: 'CPL', value: formatBRL(kpis.cpl), hint: 'Custo por lead = investimento ÷ leads de origens pagas.', emphasis: true },
        ]}
        footnote={`${kpis.paidLeads} leads pagos · ${kpis.totalLeads - kpis.paidLeads} orgânicos/outbound`}
      />
      <Connector />
      <LevelCard
        level={2}
        title="Leads → SQLs"
        icon={<Handshake />}
        accent="bg-chart-4"
        metrics={[
          { label: 'SQLs', value: formatNumber(kpis.sqlCount), hint: 'Leads qualificados pela IA (4 campos obrigatórios) e enviados ao Vinicius. Pedidos diretos de humano só contam ao virar proposta.', emphasis: true },
          { label: 'Lead→SQL', value: formatPercent(kpis.leadToSqlRate), hint: 'SQLs ÷ total de leads do período.' },
          { label: 'Custo/SQL', value: formatBRL(kpis.costPerSql), hint: 'Investimento total ÷ SQLs. Principal métrica de eficiência do piloto.' },
        ]}
        footnote={`${kpis.disqualifiedCount} desqualificados (fora de PA/MA/AP ou residencial)`}
      />
      <Connector />
      <LevelCard
        level={3}
        title="SQLs → Receita"
        icon={<BadgeDollarSign />}
        accent="bg-chart-2"
        metrics={[
          { label: 'Pipeline', value: formatBRL(kpis.pipelineBRL, { compact: kpis.pipelineBRL >= 100_000, decimals: 0 }), hint: 'Soma dos valores estimados dos cards em "Proposta Enviada".' },
          { label: 'Receita', value: formatBRL(kpis.closedBRL, { compact: kpis.closedBRL >= 100_000, decimals: 0 }), hint: 'Receita fechada: valor de contrato dos negócios ganhos (venda ou locação mensal × meses).', emphasis: true },
          { label: 'ROAS', value: kpis.roas ? `${formatNumber(kpis.roas, { maxDecimals: 1 })}x` : '—', hint: 'Retorno sobre investimento em mídia = receita fechada ÷ investimento.' },
        ]}
        footnote={`${kpis.wonCount} ganho${kpis.wonCount === 1 ? '' : 's'} · ${kpis.lostCount} perdido${kpis.lostCount === 1 ? '' : 's'}`}
      />
    </section>
  )
}
