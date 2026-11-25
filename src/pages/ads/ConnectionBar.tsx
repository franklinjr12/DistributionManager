import { RefreshCw } from 'lucide-react'
import { useTenantStore } from '@/store'
import { Tooltip } from '@/components/ui'
import type { IntegrationKey } from '@/types/domain'
import { formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

const CHIPS: { key: IntegrationKey; label: string; okLabel: string }[] = [
  { key: 'GOOGLE_ADS', label: 'Google Ads API v26', okLabel: 'conectado' },
  { key: 'META_ADS', label: 'Meta Marketing API v26.0', okLabel: 'conectado' },
  { key: 'META_CAPI', label: 'Meta CAPI', okLabel: 'ativo' },
]

const STATUS_TXT = { CONNECTED: '', PENDING: 'pendente', ERROR: 'erro', DISCONNECTED: 'desconectado' } as const

export function ConnectionBar({ lastSync }: { lastSync: string | null }) {
  const integrations = useTenantStore((s) => s.tenant.integrations)
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Status das integrações">
      {CHIPS.map((chip) => {
        const status = integrations.find((i) => i.key === chip.key)?.status ?? 'CONNECTED'
        const ok = status === 'CONNECTED'
        return (
          <span
            key={chip.key}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink-700 shadow-xs"
          >
            {chip.key === 'GOOGLE_ADS' ? <GoogleDot /> : <MetaDot />}
            {chip.label}
            <span className={cn('inline-flex items-center gap-1', ok ? 'text-success-600' : 'text-warning-600')}>
              <span className={cn('size-1.5 rounded-full', ok ? 'bg-success-500' : 'bg-warning-500')} aria-hidden />
              {ok ? chip.okLabel : STATUS_TXT[status]}
            </span>
          </span>
        )
      })}
      <Tooltip content={lastSync ? `Última sincronização: ${formatDateTime(lastSync)}` : 'Nunca sincronizado'}>
        <span className="inline-flex items-center gap-1.5 px-1 text-xs text-ink-500" tabIndex={0}>
          <RefreshCw className="size-3.5" />
          Sincronizado {formatRelative(lastSync)}
        </span>
      </Tooltip>
    </div>
  )
}

export function GoogleDot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-3.5', className)} aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h6c-.3 1.4-1 2.5-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-7.9z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8C3.9 20.5 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.1C1.4 8.6 1 10.3 1 12s.4 3.4 1.1 4.9l3.6-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.5 2.1 7.1l3.6 2.8c.9-2.6 3.4-4.5 6.3-4.5z" />
    </svg>
  )
}

export function MetaDot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-3.5', className)} aria-hidden>
      <path
        fill="#0866FF"
        d="M6.9 5C4 5 2 8.6 2 12.3 2 15 3.3 17 5.5 17c1.7 0 2.9-1 4.6-3.8l1.1-1.9.4.6 1.4 2.3C14.6 16.1 15.9 17 17.8 17 20.6 17 22 14.5 22 11.9 22 8 19.9 5 17.1 5c-1.7 0-3 1.1-4.4 3.1L12 9.1l-.6-.9C10 6 8.7 5 6.9 5zm.1 2.3c1 0 1.8.7 3 2.6l.6.9-1.2 2c-1.2 1.9-1.9 2.5-2.8 2.5-1.1 0-1.8-1.1-1.8-3 0-2.6 1-5 2.2-5zm10 0c1.4 0 2.3 2 2.3 4.6 0 1.9-.7 2.9-1.7 2.9-.9 0-1.6-.6-2.8-2.6l-1.5-2.5c1.3-1.8 2.4-2.4 3.7-2.4z"
      />
    </svg>
  )
}
