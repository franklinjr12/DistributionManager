import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Check, Copy, Eye, EyeOff, Save, Undo2 } from 'lucide-react'
import { Button, Card, CardHeader, toast } from '@/components/ui'
import { cn } from '@/lib/utils'

// ───────────────────────── Dirty tracking ─────────────────────────

export const DirtyContext = createContext<(dirty: boolean) => void>(() => {})

/** Local draft of a section's values; `dirty` compares structurally against the source. */
export function useDraft<T>(source: T) {
  const [draft, setDraft] = useState<T>(source)
  const dirty = JSON.stringify(draft) !== JSON.stringify(source)
  const set = <K extends keyof T>(k: K, v: T[K]) => setDraft((d) => ({ ...d, [k]: v }))
  return { draft, setDraft, set, dirty, reset: () => setDraft(source) }
}

/** Runs a save with loading state + toasts. */
export function useSaver() {
  const [saving, setSaving] = useState(false)
  const run = async (fn: () => Promise<unknown>, success: string, description?: string) => {
    setSaving(true)
    try {
      await fn()
      toast.success(success, description)
      return true
    } catch (e) {
      toast.error('Não foi possível salvar', e instanceof Error ? e.message : 'Erro desconhecido')
      return false
    } finally {
      setSaving(false)
    }
  }
  return { saving, run }
}

export function SaveBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving?: boolean; onSave: () => void; onDiscard: () => void }) {
  const setDirty = useContext(DirtyContext)
  useEffect(() => {
    setDirty(dirty)
  }, [dirty, setDirty])
  useEffect(() => () => setDirty(false), [setDirty])
  if (!dirty) return null
  return (
    <div className="sticky bottom-3 z-20 mt-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-surface px-4 py-3 shadow-pop">
        <span className="size-2 rounded-full bg-warning-500" />
        <span className="text-sm font-medium text-ink-800">Alterações não salvas</span>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" leftIcon={<Undo2 />} onClick={onDiscard} disabled={saving}>
            Descartar
          </Button>
          <Button size="sm" leftIcon={<Save />} loading={saving} onClick={onSave}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────── Layout ─────────────────────────

export function Section({ title, description, icon, actions, children, className }: { title: string; description?: ReactNode; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card padding="none" className={className}>
      <CardHeader title={title} description={description} icon={icon} actions={actions} />
      <div className="space-y-4 p-5">{children}</div>
    </Card>
  )
}

export function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line pb-4 last:border-0 last:pb-0 xl:grid-cols-[200px_1fr] xl:gap-6">
      <div>
        <div className="text-sm font-medium text-ink-800">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-500">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Note({ tone = 'info', children, icon }: { tone?: 'info' | 'warning' | 'success' | 'violet'; children: ReactNode; icon?: ReactNode }) {
  const cls = {
    info: 'bg-info-50 text-info-700 ring-info-100',
    warning: 'bg-warning-50 text-warning-700 ring-warning-100',
    success: 'bg-success-50 text-success-700 ring-success-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  }[tone]
  return <div className={cn('flex gap-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed ring-1 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0', cls)}>{icon}<div>{children}</div></div>
}

// ───────────────────────── Copy / secrets ─────────────────────────

export async function copyText(text: string, label = 'Copiado para a área de transferência') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(label)
    return true
  } catch {
    toast.error('Não foi possível copiar', 'Permissão de área de transferência negada pelo navegador.')
    return false
  }
}

export function CopyButton({ text, label = 'Copiar', size = 'xs', variant = 'outline' }: { text: string; label?: string; size?: 'xs' | 'sm'; variant?: 'outline' | 'ghost' }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size={size}
      variant={variant}
      leftIcon={done ? <Check /> : <Copy />}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        }
      }}
    >
      {done ? 'Copiado' : label}
    </Button>
  )
}

export function mask(value: string) {
  if (value.length <= 8) return '•'.repeat(value.length)
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(16, value.length - 8))}${value.slice(-4)}`
}

/** Read-only credential field with reveal toggle (demo values only). */
export function SecretField({ label, value, secret = true }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow] = useState(!secret)
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium text-ink-500">{label}</div>
      <div className="flex h-8 items-center gap-1 rounded-md border border-line bg-ink-50 pr-1 pl-2.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-700">{show ? value : mask(value)}</span>
        {secret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label={show ? 'Ocultar' : 'Revelar'}
            title={show ? 'Ocultar' : 'Revelar'}
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
