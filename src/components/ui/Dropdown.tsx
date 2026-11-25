import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pushOverlay } from './overlay'

export interface DropdownProps {
  /** trigger renderer; receives open state */
  trigger: (open: boolean) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
  width?: string
  className?: string
}

/** Click-to-open popover anchored to its trigger. Closes on outside click / ESC. */
export function Dropdown({ trigger, children, align = 'right', width = 'w-64', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    // topmost-only Escape via shared overlay stack (so a dropdown inside a drawer doesn't close the drawer)
    const pop = pushOverlay(() => setOpen(false))
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      pop()
    }
  }, [open])
  const close = () => setOpen(false)
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger(open)}</div>
      {open && (
        <div
          className={cn(
            'absolute top-full z-40 mt-2 max-w-[calc(100vw-2rem)] animate-scale-in rounded-xl border border-line bg-white p-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
            width,
            className,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}

export interface DropdownItemProps {
  icon?: ReactNode
  children: ReactNode
  description?: ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  right?: ReactNode
  danger?: boolean
}

export function DropdownItem({ icon, children, description, onClick, disabled, active, right, danger }: DropdownItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition [&_svg]:size-4',
        disabled ? 'cursor-not-allowed opacity-55' : 'hover:bg-ink-50',
        active && 'bg-primary-50 text-primary-700',
        danger && 'text-danger-600',
      )}
    >
      {icon && <span className="mt-0.5 text-ink-500">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{children}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
      {right}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-line" />
}
