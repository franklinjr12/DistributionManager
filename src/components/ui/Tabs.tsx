import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  value: string
  label: ReactNode
  icon?: ReactNode
  /** small count badge */
  count?: number
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  /** 'underline' (default, page-level) or 'pills' (segmented control) */
  variant?: 'underline' | 'pills'
  size?: 'sm' | 'md'
  className?: string
}

/** Controlled tabs header. Render the active panel yourself: {tab === 'x' && <Panel/>} */
export function Tabs({ items, value, onChange, variant = 'underline', size = 'md', className }: TabsProps) {
  if (variant === 'pills')
    return (
      <div role="tablist" className={cn('inline-flex items-center gap-0.5 rounded-lg bg-ink-100 p-0.5', className)}>
        {items.map((t) => (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={t.value === value}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition [&_svg]:size-3.5',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              t.value === value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
              t.disabled && 'opacity-50',
            )}
          >
            {t.icon}
            {t.label}
            {t.count != null && <span className="rounded-full bg-ink-200/70 px-1.5 text-[10px] text-ink-600">{t.count}</span>}
          </button>
        ))}
      </div>
    )
  return (
    <div role="tablist" className={cn('scrollbar-thin flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-line', className)}>
      {items.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={t.value === value}
          disabled={t.disabled}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-3 font-medium whitespace-nowrap transition [&_svg]:size-4',
            size === 'sm' ? 'h-9 text-xs' : 'h-10 text-sm',
            t.value === value ? 'border-primary-600 text-primary-700' : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800',
            t.disabled && 'opacity-50',
          )}
        >
          {t.icon}
          {t.label}
          {t.count != null && (
            <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', t.value === value ? 'bg-primary-100 text-primary-700' : 'bg-ink-100 text-ink-500')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
