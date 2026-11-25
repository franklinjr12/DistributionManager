import type { HTMLAttributes, ReactNode } from 'react'
import type { CampaignStatus, ConversationState, ConversionStatus, KanbanStage, Tone } from '@/types/domain'
import { cn } from '@/lib/utils'
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  CONV_STATE_LABEL,
  CONV_STATE_TONE,
  CONVERSION_STATUS_LABEL,
  CONVERSION_STATUS_TONE,
  STAGE_LABEL,
  STAGE_TONE,
  TONE_DOT,
  TONE_SOFT,
} from '@/lib/format'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  size?: 'sm' | 'md'
  /** show colored dot before label */
  dot?: boolean
  icon?: ReactNode
  /** solid filled style instead of soft */
  solid?: boolean
}

const SOLID: Record<Tone, string> = {
  neutral: 'bg-ink-600 text-white',
  primary: 'bg-primary-600 text-white',
  success: 'bg-success-600 text-white',
  warning: 'bg-warning-500 text-white',
  danger: 'bg-danger-600 text-white',
  info: 'bg-info-500 text-white',
  violet: 'bg-violet-600 text-white',
}

export function Badge({ tone = 'neutral', size = 'sm', dot, icon, solid, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap [&_svg]:size-3',
        solid ? SOLID[tone] : cn('ring-1 ring-inset', TONE_SOFT[tone]),
        size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('size-1.5 rounded-full', solid ? 'bg-white/80' : TONE_DOT[tone])} />}
      {icon}
      {children}
    </span>
  )
}

type StatusPillProps =
  | { kind: 'campaign'; value: CampaignStatus; size?: 'sm' | 'md'; className?: string }
  | { kind: 'stage'; value: KanbanStage; size?: 'sm' | 'md'; className?: string }
  | { kind: 'conversation'; value: ConversationState; size?: 'sm' | 'md'; className?: string }
  | { kind: 'conversion'; value: ConversionStatus; size?: 'sm' | 'md'; className?: string }

/** Pre-mapped pt-BR label + tone for campaign / Kanban stage / conversation state / conversion status. */
export function StatusPill(props: StatusPillProps) {
  let label: string
  let tone: Tone
  switch (props.kind) {
    case 'campaign':
      label = CAMPAIGN_STATUS_LABEL[props.value]
      tone = CAMPAIGN_STATUS_TONE[props.value]
      break
    case 'stage':
      label = STAGE_LABEL[props.value]
      tone = STAGE_TONE[props.value]
      break
    case 'conversation':
      label = CONV_STATE_LABEL[props.value]
      tone = CONV_STATE_TONE[props.value]
      break
    case 'conversion':
      label = CONVERSION_STATUS_LABEL[props.value]
      tone = CONVERSION_STATUS_TONE[props.value]
      break
  }
  const pulse = (props.kind === 'campaign' && props.value === 'ENABLED') || (props.kind === 'conversion' && props.value === 'PENDING')
  return (
    <Badge tone={tone} size={props.size ?? 'sm'} className={props.className}>
      <span className="relative flex size-1.5">
        {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', TONE_DOT[tone])} />}
        <span className={cn('relative inline-flex size-1.5 rounded-full', TONE_DOT[tone])} />
      </span>
      {label}
    </Badge>
  )
}
