import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CirclePause, ListTodo, MessageSquareWarning } from 'lucide-react'
import { Badge, Card, CardHeader, ChannelIcon } from '@/components/ui'
import { useCampaignStore, useLeadStore } from '@/store'
import { CAMPAIGN_TYPE_LABEL, formatBRL, formatDate, originChannel, originLabel } from '@/lib/format'
import { diffMinutes, now } from '@/lib/utils'

const SLA_TARGET = 15

/** Re-renders every 30s so SLA timers stay live. */
function useTick(ms = 30_000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

export function NextActions() {
  useTick()
  const leads = useLeadStore((s) => s.leads)
  const conversations = useLeadStore((s) => s.conversations)
  const campaigns = useCampaignStore((s) => s.campaigns)

  const waiting = useMemo(
    () =>
      leads
        .filter((l) => l.kanbanStage === 'HANDOFF')
        .map((l) => ({ lead: l, conv: conversations.find((c) => c.id === l.conversationId) }))
        .filter(({ conv }) => conv && !conv.humanFirstResponseAt)
        .map(({ lead, conv }) => ({ lead, since: conv!.handoffAt ?? lead.handoffAt ?? lead.stageChangedAt }))
        .sort((a, b) => a.since.localeCompare(b.since)),
    [leads, conversations],
  )
  const paused = useMemo(() => campaigns.filter((c) => c.status === 'PAUSED'), [campaigns])
  const nowD = now()

  return (
    <Card padding="none" className="flex min-w-0 flex-col">
      <CardHeader className="flex-wrap px-5 pt-4 [&>div.flex-1]:basis-48" icon={<ListTodo />} title="Próximas ações" description="O que precisa da sua atenção agora" actions={<Badge tone={waiting.length ? 'warning' : 'success'}>{waiting.length + paused.length}</Badge>} />
      <div className="flex-1 space-y-4 px-5 pt-2 pb-5">
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
            <MessageSquareWarning className="size-3.5" /> Aguardando resposta humana
          </h3>
          {waiting.length ? (
            <ul className="space-y-2">
              {waiting.map(({ lead, since }) => {
                const mins = Math.max(0, Math.round(diffMinutes(nowD.toISOString(), since)))
                const breached = mins > SLA_TARGET
                const atRisk = !breached && mins >= SLA_TARGET - 5
                return (
                  <li key={lead.id}>
                    <Link to={`/crm?lead=${lead.id}`} className="group flex items-center gap-3 rounded-lg border border-line p-2.5 transition-colors hover:border-primary-200 hover:bg-primary-50/40">
                      <ChannelIcon channel={originChannel(lead.originTag)} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800">{lead.companyName ?? lead.name}</p>
                        <p className="truncate text-[11px] text-ink-500">
                          {lead.locationCity ? `${lead.locationCity}/${lead.locationState} · ` : ''}
                          {originLabel(lead.originTag)}
                        </p>
                      </div>
                      <Badge tone={breached ? 'danger' : atRisk ? 'warning' : 'info'} dot>
                        {breached ? `SLA estourado · ${mins} min` : `${mins} min · faltam ${SLA_TARGET - mins}`}
                      </Badge>
                      <ArrowRight className="size-4 text-ink-300 group-hover:text-primary-600" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="rounded-lg bg-success-50 px-3 py-2 text-xs text-success-700">Nenhum lead aguardando — SLA em dia.</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-500 uppercase">
            <CirclePause className="size-3.5" /> Campanhas pausadas pendentes de ativação
          </h3>
          {paused.length ? (
            <ul className="space-y-2">
              {paused.map((c) => (
                <li key={c.id}>
                  <Link to="/ads" className="group flex items-center gap-3 rounded-lg border border-line p-2.5 transition-colors hover:border-primary-200 hover:bg-primary-50/40">
                    <ChannelIcon channel={c.platform === 'GOOGLE' ? 'google' : 'meta'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">{c.name}</p>
                      <p className="truncate text-[11px] text-ink-500">
                        {CAMPAIGN_TYPE_LABEL[c.type]} · {formatBRL(c.dailyBudgetBRL, { decimals: 0 })}/dia · pausada desde {formatDate(c.statusChangedAt)}
                      </p>
                    </div>
                    <Badge tone="warning">Pausada</Badge>
                    <ArrowRight className="size-4 text-ink-300 group-hover:text-primary-600" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">Todas as campanhas estão ativas.</p>
          )}
        </section>
      </div>
    </Card>
  )
}
