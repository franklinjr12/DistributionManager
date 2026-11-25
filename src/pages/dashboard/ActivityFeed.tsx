import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Handshake, RadioTower, Sparkles, Trophy } from 'lucide-react'
import { Card, CardHeader, Tabs } from '@/components/ui'
import { useAutomationStore, useLeadStore } from '@/store'
import { CONVERSION_STATUS_LABEL, formatBRL, formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Tone } from '@/types/domain'

type Kind = 'handoff' | 'win' | 'optimizer' | 'capi'

interface Item {
  id: string
  kind: Kind
  at: string
  title: ReactNode
  body: ReactNode
  href: string
  hrefLabel: string
  tone: Tone
}

const ICON: Record<Kind, ReactNode> = {
  handoff: <Handshake />,
  win: <Trophy />,
  optimizer: <Sparkles />,
  capi: <RadioTower />,
}
const ICON_CLASS: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-info-700',
  violet: 'bg-violet-50 text-violet-600',
}

const FILTERS = [
  { value: 'all', label: 'Tudo' },
  { value: 'handoff', label: 'Handoffs' },
  { value: 'win', label: 'Vendas' },
  { value: 'optimizer', label: 'Otimizador' },
  { value: 'capi', label: 'Conversões' },
]

export function ActivityFeed() {
  const leads = useLeadStore((s) => s.leads)
  const handoffs = useLeadStore((s) => s.handoffEvents)
  const runs = useAutomationStore((s) => s.optimizationRuns)
  const conversions = useAutomationStore((s) => s.conversionEvents)
  const [filter, setFilter] = useState('all')

  const items = useMemo(() => {
    const leadName = (id: string) => leads.find((l) => l.id === id)
    const out: Item[] = []
    for (const h of handoffs) {
      const l = leadName(h.leadId)
      out.push({
        id: h.id,
        kind: 'handoff',
        at: h.notifiedAt,
        tone: h.triggerReason === 'QUALIFIED' ? 'primary' : 'warning',
        title: (
          <>
            {h.triggerReason === 'QUALIFIED' ? 'SQL enviado ao Vinicius' : 'Lead pediu atendimento humano'} · <span className="font-semibold">{l?.companyName ?? l?.name ?? 'Lead'}</span>
          </>
        ),
        body: h.acknowledgedAt ? 'Respondido pelo vendedor' : h.afterHours ? 'Fora do horário comercial · aguardando' : 'Aguardando primeira resposta humana',
        href: `/crm?lead=${h.leadId}`,
        hrefLabel: 'Abrir card',
      })
    }
    for (const l of leads) {
      if (l.kanbanStage === 'WON' && l.closedAt)
        out.push({
          id: `win_${l.id}`,
          kind: 'win',
          at: l.closedAt,
          tone: 'success',
          title: (
            <>
              Negócio ganho · <span className="font-semibold">{l.companyName ?? l.name}</span>
            </>
          ),
          body: `${formatBRL(l.closedValueBRL)}${l.rentalMonths ? ` · locação ${l.rentalMonths} meses` : ''}`,
          href: `/crm?lead=${l.id}`,
          hrefLabel: 'Ver no CRM',
        })
    }
    for (const r of runs)
      out.push({
        id: r.id,
        kind: 'optimizer',
        at: r.runDate,
        tone: 'violet',
        title: (
          <>
            Otimizador de termos de busca · <span className="font-semibold">{r.negativesAdded} negativas</span>
          </>
        ),
        body: `${r.termsAnalyzed} termos analisados · economia estimada ${formatBRL(r.wastedSpendSavedBRL)}`,
        href: '/ads',
        hrefLabel: 'Ver campanhas',
      })
    for (const c of conversions)
      out.push({
        id: c.id,
        kind: 'capi',
        at: c.sentAt ?? c.createdAt,
        tone: c.status === 'FAILED' ? 'danger' : c.status === 'SENT' ? 'info' : 'neutral',
        title: (
          <>
            Conversão offline {c.event === 'WON' ? 'Venda' : 'SQL'} · {c.platform === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta CAPI'}
          </>
        ),
        body: `${c.leadName} · ${CONVERSION_STATUS_LABEL[c.status]}${c.status === 'FAILED' && c.responseCode ? ` (${c.responseCode})` : ''}${c.valueBRL ? ` · ${formatBRL(c.valueBRL)}` : ''}`,
        href: '/automacao',
        hrefLabel: c.status === 'FAILED' ? 'Reenviar' : 'Ver eventos',
      })
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }, [leads, handoffs, runs, conversions])

  const shown = items.filter((i) => filter === 'all' || i.kind === filter).slice(0, 8)

  return (
    <Card padding="none" className="flex min-w-0 flex-col">
      <CardHeader className="flex-wrap px-5 pt-4 [&>div.flex-1]:basis-48" icon={<Activity />} title="Atividade recente" description="Handoffs, vendas, otimizador e conversões offline (Google Ads + Meta CAPI)" />
      <div className="scrollbar-thin overflow-x-auto px-5 pt-1">
        <Tabs size="sm" variant="pills" items={FILTERS} value={filter} onChange={setFilter} />
      </div>
      <ol className="flex-1 divide-y divide-line px-5 py-2">
        {shown.map((i) => (
          <li key={i.id} className="flex gap-3 py-3">
            <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4', ICON_CLASS[i.tone])}>{ICON[i.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-800">{i.title}</p>
              <p className="truncate text-xs text-ink-500">{i.body}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <time className="text-[11px] whitespace-nowrap text-ink-400" dateTime={i.at} title={formatDateTime(i.at)}>
                {formatRelative(i.at)}
              </time>
              <Link to={i.href} className="inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:underline">
                {i.hrefLabel} <ArrowRight className="size-3" />
              </Link>
            </div>
          </li>
        ))}
        {!shown.length && <li className="py-6 text-center text-sm text-ink-400">Nenhuma atividade nesta categoria.</li>}
      </ol>
    </Card>
  )
}
