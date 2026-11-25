import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { n: 1, label: 'Configurar', hint: 'Tenant, orçamento e catálogo' },
  { n: 2, label: 'Revisar blueprint', hint: 'Editar campanhas geradas' },
  { n: 3, label: 'Implantar (PAUSED)', hint: 'Google Ads + Meta' },
]

export function Stepper({ current, done }: { current: 1 | 2 | 3; done?: boolean }) {
  return (
    <nav aria-label="Etapas do gerador" className="mb-5">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((s, i) => {
          const complete = s.n < current || (done && s.n === current)
          const active = s.n === current && !done
          return (
            <li key={s.n} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-all duration-300',
                  complete && 'bg-success-500 text-white',
                  active && 'bg-primary-600 text-white ring-4 ring-primary-100',
                  !complete && !active && 'bg-ink-100 text-ink-500',
                )}
              >
                {complete ? <Check className="h-4 w-4" /> : s.n}
              </span>
              <span className="min-w-0">
                <span className={cn('block truncate text-sm font-semibold', active ? 'text-ink-900' : complete ? 'text-ink-700' : 'text-ink-400')}>{s.label}</span>
                <span className="hidden truncate text-xs text-ink-400 md:block">{s.hint}</span>
              </span>
              {i < STEPS.length - 1 && (
                <span className="hidden h-0.5 flex-1 overflow-hidden rounded bg-ink-100 sm:block" aria-hidden>
                  <span className={cn('block h-full bg-success-500 transition-all duration-500', s.n < current || done ? 'w-full' : 'w-0')} />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
