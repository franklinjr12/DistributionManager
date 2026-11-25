import { Globe, MessageCircle, Send } from 'lucide-react'
import type { ChannelKind } from '@/types/domain'
import { cn } from '@/lib/utils'
import { CHANNEL_KIND_LABEL } from '@/lib/format'

export interface ChannelIconProps {
  channel: ChannelKind
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** 'chip' = colored rounded tile (default), 'plain' = glyph only */
  variant?: 'chip' | 'plain'
  /** show label next to icon */
  withLabel?: boolean
  label?: string
  className?: string
}

const BOX = { xs: 'size-4 rounded', sm: 'size-5 rounded-md', md: 'size-7 rounded-lg', lg: 'size-9 rounded-xl' }
const GLYPH = { xs: 'size-2.5', sm: 'size-3', md: 'size-4', lg: 'size-5' }

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}
function MetaGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M3 15.5c0-4 2-8 4.6-8 3.6 0 5.6 9 8.8 9 1.9 0 2.6-1.8 2.6-3.8 0-3.2-1.6-6.2-3.8-6.2-3.3 0-5.2 9-8.6 9C4.3 15.5 3 15.5 3 15.5z" />
    </svg>
  )
}
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}

const CHIP: Record<ChannelKind, string> = {
  google: 'bg-white ring-1 ring-line',
  meta: 'bg-meta text-white',
  whatsapp: 'bg-whatsapp text-white',
  instagram: 'ig-gradient text-white',
  site: 'bg-ink-700 text-white',
  outbound: 'bg-violet-brand text-white',
}
const PLAIN: Record<ChannelKind, string> = {
  google: '',
  meta: 'text-meta',
  whatsapp: 'text-whatsapp-dark',
  instagram: 'text-instagram',
  site: 'text-ink-600',
  outbound: 'text-violet-brand',
}

/** Brand chip for google / meta / whatsapp / instagram / site / outbound. */
export function ChannelIcon({ channel, size = 'sm', variant = 'chip', withLabel, label, className }: ChannelIconProps) {
  const g = GLYPH[size]
  const glyph =
    channel === 'google' ? (
      <GoogleGlyph className={g} />
    ) : channel === 'meta' ? (
      <MetaGlyph className={g} />
    ) : channel === 'instagram' ? (
      <InstagramGlyph className={g} />
    ) : channel === 'whatsapp' ? (
      <WhatsAppGlyph className={g} />
    ) : channel === 'site' ? (
      <Globe className={g} />
    ) : (
      <Send className={g} />
    )
  const icon =
    variant === 'chip' ? (
      <span className={cn('inline-flex shrink-0 items-center justify-center', BOX[size], CHIP[channel])} title={CHANNEL_KIND_LABEL[channel]}>
        {glyph}
      </span>
    ) : (
      <span className={cn('inline-flex shrink-0', PLAIN[channel])}>{glyph}</span>
    )
  if (!withLabel) return <span className={cn('inline-flex', className)}>{icon}</span>
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-ink-700', className)}>
      {icon}
      {label ?? CHANNEL_KIND_LABEL[channel]}
    </span>
  )
}

/** Fallback generic chat icon */
export const ChatIcon = MessageCircle
