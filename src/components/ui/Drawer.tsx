import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOverlay } from './overlay'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  /** extra header content (badges, actions) rendered right of the title */
  headerActions?: ReactNode
  footer?: ReactNode
  /** panel width (default 'md' = 480px) */
  width?: 'sm' | 'md' | 'lg' | 'xl'
  children?: ReactNode
  className?: string
  /** remove default body padding */
  flush?: boolean
}

const W = { sm: 'sm:max-w-sm', md: 'sm:max-w-[480px]', lg: 'sm:max-w-[640px]', xl: 'sm:max-w-[860px]' }

/** Right-side panel (inspector). Full-width on mobile. */
export function Drawer({ open, onClose, title, description, headerActions, footer, width = 'md', children, className, flush }: DrawerProps) {
  useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/35" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn('absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col bg-white shadow-pop', W[width], className)}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && <h2 className="truncate text-base font-semibold text-ink-900">{title}</h2>}
            {description && <div className="mt-0.5 text-sm text-ink-500">{description}</div>}
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          <button type="button" onClick={onClose} className="-mr-1.5 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className={cn('scrollbar-thin min-h-0 flex-1 overflow-y-auto', !flush && 'p-5')}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body,
  )
}
