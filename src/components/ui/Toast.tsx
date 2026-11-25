import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { create } from 'zustand'
import { CircleCheck, CircleExclamationPoint, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  kind: ToastKind
  title: ReactNode
  description?: ReactNode
  duration: number
}

interface ToastState {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string
  dismiss: (id: string) => void
}

let seq = 0
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = `t${++seq}`
    const item: ToastItem = { duration: 4000, ...t, id }
    set((s) => ({ toasts: [...s.toasts.slice(-4), item] }))
    if (item.duration > 0) setTimeout(() => get().dismiss(id), item.duration)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

type Opts = { duration?: number }
/**
 * Imperative toasts — usable anywhere (no hook needed):
 *   toast.success('Campanha ativada', 'Google Ads confirmou em 1,2 s')
 *   toast.error('Falha ao enviar', err.message)
 */
export const toast = {
  success: (title: ReactNode, description?: ReactNode, o?: Opts) => useToastStore.getState().push({ kind: 'success', title, description, ...o }),
  error: (title: ReactNode, description?: ReactNode, o?: Opts) => useToastStore.getState().push({ kind: 'error', title, description, duration: 6000, ...o }),
  info: (title: ReactNode, description?: ReactNode, o?: Opts) => useToastStore.getState().push({ kind: 'info', title, description, ...o }),
  warning: (title: ReactNode, description?: ReactNode, o?: Opts) => useToastStore.getState().push({ kind: 'warning', title, description, ...o }),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
}

/** Hook form: const { toast } = useToast() */
export const useToast = () => ({ toast })

const ICON = {
  success: <CircleCheck className="text-success-500" />,
  error: <CircleExclamationPoint className="text-danger-500" />,
  warning: <CircleExclamationPoint className="text-warning-500" />,
  info: <Info className="text-primary-500" />,
}

/** Mounted once in AppShell. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return createPortal(
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn('pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-pop sm:w-96')}
          role="status"
        >
          <span className="mt-0.5 [&_svg]:size-5">{ICON[t.kind]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">{t.title}</p>
            {t.description && <p className="mt-0.5 text-sm text-ink-500">{t.description}</p>}
          </div>
          <button type="button" onClick={() => dismiss(t.id)} className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Fechar">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
