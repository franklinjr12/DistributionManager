import { cn } from '@/lib/utils'

export interface SkeletonProps {
  className?: string
  /** render N stacked text lines */
  lines?: number
  circle?: boolean
}

export function Skeleton({ className, lines, circle }: SkeletonProps) {
  if (lines)
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-ink-200/70" style={{ width: `${i === lines - 1 ? 60 : 100 - ((i * 13) % 25)}%` }} />
        ))}
      </div>
    )
  return <div className={cn('animate-pulse bg-ink-200/70', circle ? 'rounded-full' : 'rounded-lg', className ?? 'h-4 w-full')} />
}
