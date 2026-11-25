import type { ReactNode } from 'react'
import { Tooltip } from '@/components/ui'

/** Small "?" bubble that explains a metric on hover. */
export function InfoHint({ content, side }: { content: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip content={<span className="block max-w-64 text-left font-normal whitespace-normal">{content}</span>} side={side}>
      <span tabIndex={0} aria-label="Ajuda" className="flex size-4 cursor-help items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-500 hover:bg-ink-200 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none">
        ?
      </span>
    </Tooltip>
  )
}
