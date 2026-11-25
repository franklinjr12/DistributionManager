import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronUp, Inbox, Moon, TriangleExclamationPoint } from 'lucide-react'
import type { Conversation, Lead } from '@/types/domain'
import { Badge, ChannelIcon, EmptyState, StatusPill, Table } from '@/components/ui'
import { MODALITY_LABEL, MODALITY_TONE, STAGE_ORDER, formatBRL, formatMinutes, originChannel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isAfterHours, leadValue, shortAgo, slaInfo, aiStatus, AI_STATUS_LABEL } from './helpers'
import { AiStatusBadge, OriginChip } from './LeadCard'

type SortKey = 'name' | 'origin' | 'modality' | 'city' | 'area' | 'stage' | 'ai' | 'value' | 'last'

interface Props {
  leads: Lead[]
  convByLead: Map<string, Conversation>
  onOpen: (id: string) => void
}

export function LeadTable({ leads, convByLead, onOpen }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'last', dir: -1 })

  const rows = useMemo(() => {
    const val = (l: Lead): string | number => {
      const c = convByLead.get(l.id)
      switch (sort.key) {
        case 'name':
          return l.name.toLowerCase()
        case 'origin':
          return l.originTag
        case 'modality':
          return l.modality ?? 'zz'
        case 'city':
          return `${l.locationState ?? 'zz'}${l.locationCity ?? ''}`
        case 'area':
          return l.areaM2 ?? -1
        case 'stage':
          return STAGE_ORDER.indexOf(l.kanbanStage)
        case 'ai':
          return AI_STATUS_LABEL[aiStatus(c)]
        case 'value':
          return leadValue(l) ?? -1
        case 'last':
          return c?.lastMessageAt ?? l.updatedAt
      }
    }
    return [...leads].sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
    })
  }, [leads, convByLead, sort])

  const th = (key: SortKey, label: string, right?: boolean) => (
    <th className={cn(right && 'text-right')}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'last' || key === 'value' || key === 'area' ? -1 : 1 }))}
        className={cn('inline-flex items-center gap-1 hover:text-ink-900', sort.key === key && 'text-ink-900')}
      >
        {label}
        {sort.key === key ? sort.dir === 1 ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
      </button>
    </th>
  )

  if (!leads.length)
    return (
      <div className="rounded-2xl border border-line bg-white">
        <EmptyState icon={<Inbox />} title="Nenhum lead encontrado" description="Ajuste a busca ou os filtros." compact />
      </div>
    )

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <Table hover>
        <thead>
          <tr>
            {th('name', 'Lead')}
            {th('origin', 'Origem')}
            {th('modality', 'Modalidade')}
            {th('city', 'Cidade/UF')}
            {th('area', 'Área', true)}
            <th>Recomendação</th>
            {th('stage', 'Etapa')}
            {th('ai', 'Atendimento')}
            {th('value', 'Valor', true)}
            {th('last', 'Última msg', true)}
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const c = convByLead.get(l.id)
            const sla = slaInfo(l, c)
            const v = leadValue(l)
            return (
              <tr key={l.id} className="cursor-pointer" onClick={() => onOpen(l.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(l.id)}>
                <td>
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={originChannel(l.originTag)} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-medium text-ink-900">
                        {l.name}
                        {isAfterHours(l) && <Moon className="size-3 text-ink-400" aria-label="Fora do horário" />}
                      </div>
                      <div className="max-w-[200px] truncate text-xs text-ink-500">{l.companyName ?? '—'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <OriginChip tag={l.originTag} />
                </td>
                <td>{l.modality ? <Badge tone={MODALITY_TONE[l.modality]}>{MODALITY_LABEL[l.modality]}</Badge> : <span className="text-ink-400">—</span>}</td>
                <td className="whitespace-nowrap">{l.locationCity ? `${l.locationCity}/${l.locationState ?? '?'}` : '—'}</td>
                <td className="num text-right whitespace-nowrap">{l.areaM2 ? `${l.areaM2.toLocaleString('pt-BR')} m²` : '—'}</td>
                <td className="text-xs whitespace-nowrap text-primary-700">{l.recommendedModels.map((r) => r.modelName).join(' + ') || '—'}</td>
                <td>
                  <StatusPill kind="stage" value={l.kanbanStage} />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <AiStatusBadge conv={c} />
                    {sla.waiting && sla.breached && (
                      <Badge tone="danger" solid icon={<TriangleExclamationPoint />}>
                        {formatMinutes(sla.minutes)}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className={cn('num text-right font-medium whitespace-nowrap', l.kanbanStage === 'WON' ? 'text-success-700' : 'text-ink-800')}>{v != null ? formatBRL(v, { decimals: 0 }) : '—'}</td>
                <td className="text-right text-xs whitespace-nowrap text-ink-500">{shortAgo(c?.lastMessageAt ?? l.updatedAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </Table>
    </div>
  )
}
