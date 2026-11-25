import { forwardRef, type HTMLAttributes } from 'react'
import { Ban, Clock, MapPin, Moon, Ruler, TriangleExclamationPoint } from 'lucide-react'
import type { Conversation, Lead } from '@/types/domain'
import { Badge, ChannelIcon, Tooltip } from '@/components/ui'
import { LOSS_REASON_LABEL, MODALITY_LABEL, MODALITY_TONE, formatBRL, formatMinutes, originChannel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AI_STATUS_LABEL, AI_STATUS_TONE, ALLOWED_UF, aiStatus, isAfterHours, leadValue, shortAgo, slaInfo } from './helpers'

interface Props extends HTMLAttributes<HTMLDivElement> {
  lead: Lead
  conv: Conversation | undefined
  dragging?: boolean
  overlay?: boolean
}

export function OriginChip({ tag, className }: { tag: string; className?: string }) {
  return <span className={cn('inline-flex h-5 max-w-full items-center truncate rounded-md bg-ink-100 px-1.5 font-mono text-[10.5px] text-ink-600', className)}>{tag}</span>
}

export function AiStatusBadge({ conv }: { conv: Conversation | undefined }) {
  const s = aiStatus(conv)
  return (
    <Badge tone={AI_STATUS_TONE[s]} dot>
      {AI_STATUS_LABEL[s]}
    </Badge>
  )
}

export const LeadCard = forwardRef<HTMLDivElement, Props>(function LeadCard({ lead, conv, dragging, overlay, className, ...rest }, ref) {
  const sla = slaInfo(lead, conv)
  const value = leadValue(lead)
  const outOfRegion = lead.locationState && !ALLOWED_UF.includes(lead.locationState)
  return (
    <div
      ref={ref}
      {...rest}
      className={cn(
        'group relative cursor-grab touch-manipulation rounded-xl border bg-white p-3 text-left shadow-card outline-none select-none',
        'transition-[box-shadow,border-color] hover:border-primary-300 hover:shadow-md focus-visible:ring-4 focus-visible:ring-primary-100',
        sla.waiting && sla.breached ? 'border-danger-500/60' : 'border-line',
        dragging && 'opacity-35',
        overlay && 'rotate-[1.5deg] cursor-grabbing shadow-pop ring-2 ring-primary-300',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <ChannelIcon channel={originChannel(lead.originTag)} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink-900">{lead.name}</div>
          <div className="truncate text-xs text-ink-500">{lead.companyName ?? 'Empresa não informada'}</div>
        </div>
        {(conv?.unreadCount ?? 0) > 0 && <span className="mt-0.5 rounded-full bg-whatsapp px-1.5 text-[10px] leading-4 font-semibold text-white">{conv!.unreadCount}</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <OriginChip tag={lead.originTag} />
        {lead.modality && <Badge tone={MODALITY_TONE[lead.modality]}>{MODALITY_LABEL[lead.modality]}</Badge>}
        {lead.kanbanStage === 'DISQUALIFIED' && (
          <Badge tone="neutral" solid icon={<Ban />}>
            Desqualificado
          </Badge>
        )}
        {lead.kanbanStage === 'LOST' && <Badge tone="danger">Perdido</Badge>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
        {(lead.locationCity || lead.locationState) && (
          <span className={cn('inline-flex items-center gap-1', outOfRegion && 'text-danger-600')}>
            <MapPin className="size-3" />
            {lead.locationCity ?? '?'}/{lead.locationState ?? '?'}
          </span>
        )}
        {lead.areaM2 != null && (
          <span className="inline-flex items-center gap-1">
            <Ruler className="size-3" />
            <span className="num">{lead.areaM2.toLocaleString('pt-BR')} m²</span>
          </span>
        )}
      </div>

      {lead.recommendedModels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.recommendedModels.map((r) => (
            <span key={r.machineId} className="inline-flex h-5 items-center rounded-md bg-primary-50 px-1.5 text-[11px] font-medium text-primary-700 ring-1 ring-primary-100 ring-inset">
              {r.modelName}
            </span>
          ))}
        </div>
      )}

      {(lead.kanbanStage === 'LOST' || lead.kanbanStage === 'DISQUALIFIED') && lead.lossReason && (
        <div className="mt-2 text-xs text-ink-500">Motivo: {LOSS_REASON_LABEL[lead.lossReason]}</div>
      )}

      {value != null && (
        <div className={cn('num mt-2 text-sm font-semibold', lead.kanbanStage === 'WON' ? 'text-success-700' : 'text-warning-700')}>
          {formatBRL(value, { decimals: 0 })}
          {lead.kanbanStage === 'WON' && lead.closedModality === 'LOCACAO' && lead.rentalMonths && (
            <span className="ml-1 text-[11px] font-normal text-ink-500">
              ({formatBRL(lead.rentalMonthlyBRL, { decimals: 0 })} × {lead.rentalMonths})
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2">
        <AiStatusBadge conv={conv} />
        {sla.waiting && sla.breached && (
          <Tooltip content={`Handoff há ${formatMinutes(sla.minutes)} úteis sem resposta humana (meta 15 min)`}>
            <Badge tone="danger" solid icon={<TriangleExclamationPoint />}>
              SLA {formatMinutes(sla.minutes)}
            </Badge>
          </Tooltip>
        )}
        {sla.waiting && !sla.breached && (
          <Badge tone="warning" icon={<Clock />}>
            {formatMinutes(sla.minutes)}
          </Badge>
        )}
        {isAfterHours(lead) && (
          <Tooltip content="Lead chegou fora do horário comercial (seg–sex 08–18h)">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-sidebar text-white">
              <Moon className="size-3" />
            </span>
          </Tooltip>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-400">
          <Clock className="size-3" />
          {shortAgo(conv?.lastMessageAt ?? lead.updatedAt)}
        </span>
      </div>
    </div>
  )
})
