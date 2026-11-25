import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  /** compact variant for inside cards/tables */
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-16', className)}>
      <div className={cn('flex items-center justify-center rounded-2xl bg-primary-50 text-primary-500', compact ? 'size-10 [&_svg]:size-5' : 'size-14 [&_svg]:size-7')}>
        {icon ?? <Inbox />}
      </div>
      <div>
        <h3 className={cn('font-semibold text-ink-900', compact ? 'text-sm' : 'text-base')}>{title}</h3>
        {description && <p className={cn('mx-auto mt-1 max-w-md text-ink-500', compact ? 'text-xs' : 'text-sm')}>{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
