import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Building, Check, ChevronDown, ChevronRight, LogOut, Menu, Settings, User } from 'lucide-react'
import type { NotificationType } from '@/types/domain'
import { cn } from '@/lib/utils'
import { formatRelative, formatWeekdayShort } from '@/lib/format'
import { now } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'
import { useTenantStore, useCurrentUser } from '@/store/tenantStore'
import { useNotificationStore, selectUnreadCount } from '@/store/notificationStore'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { toast } from '@/components/ui/Toast'
import { matchNav } from './nav'

const NOTIF_DOT: Record<NotificationType, string> = {
  LEAD_QUALIFIED: 'bg-violet-500',
  HUMAN_REQUESTED: 'bg-warning-500',
  OPTIMIZER: 'bg-primary-500',
  CONVERSION: 'bg-danger-500',
  CAMPAIGN: 'bg-info-500',
  OUTBOUND: 'bg-violet-brand',
  IG_COMMENT: 'bg-instagram',
  SLA_ALERT: 'bg-danger-500',
  DEAL_WON: 'bg-success-500',
  SYSTEM: 'bg-ink-400',
}

/** Deep-link generic /automacao notifications to the matching tab. */
const AUTOMATION_TAB: Partial<Record<NotificationType, string>> = {
  OPTIMIZER: 'otimizador',
  CONVERSION: 'capi',
  OUTBOUND: 'outbound',
  IG_COMMENT: 'instagram',
}
function notificationHref(type: NotificationType, href: string | null | undefined) {
  if (href === '/automacao' && AUTOMATION_TAB[type]) return `/automacao?tab=${AUTOMATION_TAB[type]}`
  return href
}

function TenantSwitcher() {
  const tenant = useTenantStore((s) => s.tenant)
  const others = useTenantStore((s) => s.otherTenants)
  return (
    <Dropdown
      align="left"
      width="w-72"
      trigger={(open) => (
        <button
          className={cn(
            'flex h-9 items-center gap-2 rounded-lg border border-line bg-white pr-2 pl-1.5 text-sm transition hover:border-line-strong',
            open && 'border-primary-300 ring-4 ring-primary-50',
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary-600 text-[11px] font-bold text-white">M</span>
          <span className="hidden font-medium text-ink-800 sm:inline">{tenant.name}</span>
          <span className="hidden text-ink-400 md:inline">({tenant.dealerOf})</span>
          <ChevronDown className="size-4 text-ink-400" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">Tenants</div>
          <DropdownItem
            icon={<span className="flex size-5 items-center justify-center rounded bg-primary-600 text-[10px] font-bold text-white">M</span>}
            description={`Concessionária ${tenant.dealerOf} · PA, MA, AP`}
            active
            right={<Check className="mt-0.5 text-primary-600" />}
            onClick={close}
          >
            {tenant.name} ({tenant.dealerOf})
          </DropdownItem>
          {others.map((o) => (
            <DropdownItem
              key={o.id}
              disabled
              icon={<Building />}
              description={`Revenda ${o.dealerOf}`}
              right={<Badge tone="neutral">em breve</Badge>}
            >
              {o.name}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <div className="px-2.5 py-1.5 text-xs text-ink-500">Multi-tenant SaaS: novos tenants em onboarding (v2).</div>
        </>
      )}
    </Dropdown>
  )
}

function Notifications() {
  const notifications = useNotificationStore((s) => s.notifications)
  const unread = useNotificationStore(selectUnreadCount)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const navigate = useNavigate()
  return (
    <Dropdown
      width="w-[360px]"
      className="p-0"
      trigger={(open) => (
        <button className={cn('relative flex size-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800', open && 'bg-ink-100 text-ink-800')} aria-label="Notificações">
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] leading-4 font-semibold text-white ring-2 ring-white">
              {unread}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="text-sm font-semibold text-ink-900">Notificações</div>
            {unread > 0 && (
              <button className="text-xs font-medium text-primary-600 hover:text-primary-700" onClick={markAllRead}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="scrollbar-thin max-h-[420px] overflow-y-auto p-1">
            {notifications.slice(0, 15).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id)
                  close()
                  const href = notificationHref(n.type, n.href)
                  if (href) navigate(href)
                }}
                className={cn('flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-ink-50', !n.read && 'bg-primary-50/50')}
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-ink-200' : NOTIF_DOT[n.type])} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm', n.read ? 'text-ink-700' : 'font-semibold text-ink-900')}>{n.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-ink-500">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-ink-400">{formatRelative(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Dropdown>
  )
}

function UserMenu() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  return (
    <Dropdown
      width="w-60"
      trigger={() => (
        <button className="flex items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 transition hover:bg-ink-100">
          <Avatar name={user.fullName} size="sm" status="online" />
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-sm font-medium text-ink-800">{user.fullName}</span>
            <span className="block text-[11px] text-ink-500">{user.title}</span>
          </span>
          <ChevronDown className="hidden size-4 text-ink-400 xl:block" />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-2.5 py-2">
            <div className="text-sm font-semibold text-ink-900">{user.fullName}</div>
            <div className="text-xs text-ink-500">{user.email}</div>
          </div>
          <DropdownSeparator />
          <DropdownItem
            icon={<User />}
            onClick={() => {
              close()
              navigate('/configuracoes')
            }}
          >
            Meu perfil
          </DropdownItem>
          <DropdownItem
            icon={<Settings />}
            onClick={() => {
              close()
              navigate('/configuracoes')
            }}
          >
            Configurações do tenant
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            icon={<LogOut />}
            onClick={() => {
              close()
              toast.info('Modo demonstração', 'O logout está desativado nesta demo.')
            }}
          >
            Sair
          </DropdownItem>
        </>
      )}
    </Dropdown>
  )
}

export function Topbar() {
  const setMobile = useUiStore((s) => s.setMobileNavOpen)
  const { pathname } = useLocation()
  const nav = matchNav(pathname)
  const tenant = useTenantStore((s) => s.tenant)
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <button onClick={() => setMobile(true)} className="-ml-1 rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden" aria-label="Abrir menu">
        <Menu className="size-5" />
      </button>
      <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link to="/" className="hidden text-ink-400 hover:text-ink-700 md:inline">
          {tenant.name}
        </Link>
        <ChevronRight className="hidden size-3.5 text-ink-300 md:inline" />
        {nav?.path === '/ads/blueprint' && (
          <>
            <Link to="/ads" className="hidden text-ink-400 hover:text-ink-700 sm:inline">
              Campanhas
            </Link>
            <ChevronRight className="hidden size-3.5 text-ink-300 sm:inline" />
          </>
        )}
        <span className="truncate font-semibold text-ink-900">{nav?.label ?? 'Página não encontrada'}</span>
      </nav>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-xs text-ink-500 ring-1 ring-line 2xl:flex">
          <span className="size-1.5 rounded-full bg-success-500" />
          {formatWeekdayShort(now())} · {now().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Belem' })} BRT
        </span>
        <TenantSwitcher />
        <Notifications />
        <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <UserMenu />
      </div>
    </header>
  )
}
