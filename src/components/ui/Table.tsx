import type { HTMLAttributes, ReactNode, TableHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** row hover highlight */
  hover?: boolean
  compact?: boolean
  /** wrapper classes (the scroll container) */
  wrapperClassName?: string
}

/**
 * Styled table (uses .data-table CSS). Wrapper scrolls horizontally on mobile.
 * <Table hover><thead><tr><th>…</th></tr></thead><tbody>…</tbody></Table>
 */
export function Table({ hover, compact, className, wrapperClassName, ...rest }: TableProps) {
  return (
    <div className={cn('scrollbar-thin w-full overflow-x-auto', wrapperClassName)}>
      <table className={cn('data-table', hover && 'is-hover', compact && 'is-compact', className)} {...rest} />
    </div>
  )
}

/** Numeric/right-aligned cell helper */
export function Num({ children, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span className={cn('num block text-right whitespace-nowrap', className)} {...rest}>
      {children}
    </span>
  )
}
