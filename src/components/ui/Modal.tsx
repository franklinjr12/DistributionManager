import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOverlay } from './overlay'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  /** icon shown in a tinted circle next to the title */
  icon?: ReactNode
  iconTone?: 'primary' | 'success' | 'warning' | 'danger'
  /** footer slot (buttons). Put the primary action last. */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** disable closing by overlay click */
  persistent?: boolean
  children?: ReactNode
  className?: string
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
const ICON_TONE = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
}

/** Centered dialog (portal). Also exported as Dialog. */
export function Modal({ open, onClose, title, description, icon, iconTone = 'primary', footer, size = 'md', persistent, children, className }: ModalProps) {
  useOverlay(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/45 backdrop-blur-[2px]" onClick={persistent ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[92vh] w-full animate-scale-in flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl',
          SIZES[size],
          className,
        )}
      >
        {(title || icon) && (
          <div className="flex items-start gap-3 px-6 pt-5 pb-3">
            {icon && <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5', ICON_TONE[iconTone])}>{icon}</div>}
            <div className="min-w-0 flex-1 pt-0.5">
              {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
              {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-2 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-3">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export const Dialog = Modal
