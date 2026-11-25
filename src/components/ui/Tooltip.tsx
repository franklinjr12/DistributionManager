import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const SIDE = {
  top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
  left: 'right-full top-1/2 mr-1.5 -translate-y-1/2',
  right: 'left-full top-1/2 ml-1.5 -translate-y-1/2',
}

/** CSS-only hover/focus tooltip. */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 hidden w-max max-w-64 animate-fade-in rounded-md bg-ink-900 px-2 py-1 text-xs leading-snug font-medium text-white shadow-pop group-hover/tt:block group-focus-within/tt:block',
          SIDE[side],
        )}
      >
        {content}
      </span>
    </span>
  )
}
