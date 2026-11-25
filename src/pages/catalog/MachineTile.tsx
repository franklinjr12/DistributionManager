import { Bot, Brush, Droplets, Gauge, Sofa, Sparkles, Truck, Wind, type LucideIcon } from 'lucide-react'
import type { Machine } from '@/types/domain'
import { cn } from '@/lib/utils'

const ICONS: Record<Machine['icon'], LucideIcon> = { Droplets, Sparkles, Bot, Wind, Gauge, Sofa, Truck, Brush }

export function MachineTile({ machine, size = 'md', className }: { machine: Machine; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const Icon = ICONS[machine.icon] ?? Droplets
  const dim = size === 'sm' ? 'size-8 rounded-lg [&_svg]:size-4' : size === 'lg' ? 'size-14 rounded-2xl [&_svg]:size-7' : 'size-11 rounded-xl [&_svg]:size-5'
  return (
    <div
      className={cn('flex shrink-0 items-center justify-center text-white shadow-sm', dim, !machine.active && 'grayscale', className)}
      style={{ background: `linear-gradient(135deg, ${machine.color}, ${machine.color}cc)` }}
    >
      <Icon />
    </div>
  )
}
