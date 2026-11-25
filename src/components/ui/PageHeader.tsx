import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** right-side actions (buttons) */
  actions?: ReactNode
  /** small label above title */
  eyebrow?: ReactNode
  className?: string
}

/** Standard page heading used at the top of each page's content. */
export function PageHeader({ title, description, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-semibold tracking-wide text-primary-600 uppercase">{eyebrow}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
