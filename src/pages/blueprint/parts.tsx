import { useState, type ReactNode } from 'react'
import { Bot, Brush, Check, Copy, Droplets, Gauge, Sofa, Sparkles, Truck, Wind, type LucideIcon } from 'lucide-react'
import type { Machine } from '@/types/domain'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui'

const ICONS: Record<Machine['icon'], LucideIcon> = { Droplets, Sparkles, Bot, Wind, Gauge, Sofa, Truck, Brush }

export function MachineIcon({ machine, className }: { machine: Pick<Machine, 'icon'>; className?: string }) {
  const Icon = ICONS[machine.icon] ?? Sparkles
  return <Icon className={className} />
}

export function SectionTitle({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-2', className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{children}</h4>
      {right}
    </div>
  )
}

export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          /* clipboard may be blocked — still give feedback */
        }
        setCopied(true)
        toast.success('Copiado para a área de transferência')
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      aria-label={label}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

/** Pill-style toggle button (aria-pressed) */
export function ToggleChip({ pressed, onClick, children, className }: { pressed: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
        pressed ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-line-strong bg-white text-ink-500 hover:bg-ink-50',
        className,
      )}
    >
      {pressed && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  )
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max
  return <span className={cn('num shrink-0 text-[11px] tabular-nums', over ? 'font-semibold text-danger-600' : value.length > max - 4 ? 'text-warning-600' : 'text-ink-400')}>{value.length}/{max}</span>
}

export const WEEKDAYS = [
  { d: 1, label: 'Seg' },
  { d: 2, label: 'Ter' },
  { d: 3, label: 'Qua' },
  { d: 4, label: 'Qui' },
  { d: 5, label: 'Sex' },
  { d: 6, label: 'Sáb' },
  { d: 0, label: 'Dom' },
]

export function daysLabel(days: number[]): string {
  const sorted = WEEKDAYS.filter((w) => days.includes(w.d))
  if (!sorted.length) return 'nenhum dia'
  const idx = sorted.map((w) => WEEKDAYS.indexOf(w))
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1)
  if (contiguous && sorted.length > 2) return `${sorted[0].label.toLowerCase()}–${sorted[sorted.length - 1].label.toLowerCase()}`
  return sorted.map((w) => w.label.toLowerCase()).join(', ')
}

export const PLACEMENT_LABEL: Record<string, string> = {
  facebook_feed: 'Feed do Facebook',
  instagram_feed: 'Feed do Instagram',
  instagram_stories: 'Stories',
  instagram_reels: 'Reels',
  instagram_explore: 'Explorar',
}
