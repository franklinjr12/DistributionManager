import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** padding preset (default 'md'); use 'none' when composing CardHeader/CardBody */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}

const PAD = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function Card({ padding = 'md', interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface shadow-card',
        interactive && 'cursor-pointer transition hover:border-primary-200 hover:shadow-pop',
        PAD[padding],
        className,
      )}
      {...rest}
    />
  )
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** right-side slot (buttons, badges) */
  actions?: ReactNode
}

export function CardHeader({ title, description, icon, actions, className, children, ...rest }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3 border-b border-line px-5 py-4', className)} {...rest}>
      {icon && <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 [&_svg]:size-4">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && <h3 className="text-sm font-semibold text-ink-900">{title}</h3>}
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...rest} />
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 border-t border-line px-5 py-3', className)} {...rest} />
}
