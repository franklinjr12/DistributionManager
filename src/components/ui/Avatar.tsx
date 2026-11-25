import { cn, hashString, initials } from '@/lib/utils'

export interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** image url (optional) */
  src?: string
  className?: string
  /** small status dot (online) */
  status?: 'online' | 'away' | null
}

const SIZE = { xs: 'size-6 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base' }
const COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
  'bg-violet-100 text-violet-700',
  'bg-info-100 text-info-700',
  'bg-danger-100 text-danger-700',
  'bg-ink-200 text-ink-700',
]

/** Initials avatar with deterministic color per name. */
export function Avatar({ name, size = 'sm', src, className, status }: AvatarProps) {
  const color = COLORS[hashString(name) % COLORS.length]
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img src={src} alt={name} className={cn('rounded-full object-cover', SIZE[size])} />
      ) : (
        <span className={cn('inline-flex items-center justify-center rounded-full font-semibold', SIZE[size], color)}>{initials(name)}</span>
      )}
      {status && (
        <span className={cn('absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-white', status === 'online' ? 'bg-success-500' : 'bg-warning-500')} />
      )}
    </span>
  )
}
