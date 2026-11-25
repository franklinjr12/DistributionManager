import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  size?: 'sm' | 'md'
  /** color when on (default primary) */
  tone?: 'primary' | 'success' | 'warning'
  className?: string
  id?: string
}

const ON = { primary: 'bg-primary-600', success: 'bg-success-500', warning: 'bg-warning-500' }

export function Switch({ checked, onChange, label, description, disabled, size = 'md', tone = 'primary', className, id }: SwitchProps) {
  const track = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9'
  const knob = size === 'sm' ? 'size-3 data-[on=true]:translate-x-3' : 'size-4 data-[on=true]:translate-x-4'
  const btn = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-primary-100 disabled:opacity-50',
        track,
        checked ? ON[tone] : 'bg-ink-300',
      )}
    >
      <span data-on={checked} className={cn('rounded-full bg-white shadow-sm transition-transform', knob)} />
    </button>
  )
  if (!label && !description) return <span className={className}>{btn}</span>
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed', className)}>
      <span className="mt-0.5">{btn}</span>
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-ink-800">{label}</span>}
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  )
}
