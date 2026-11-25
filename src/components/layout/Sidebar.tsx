import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, Target, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'
import { useLeadStore } from '@/store/leadStore'
import { useStopLoss } from '@/store/selectors'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useOverlay } from '@/components/ui/overlay'
import { NAV_ITEMS } from './nav'

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shadow-lg shadow-primary-900/40">
        M
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-white">Central de Aquisição</div>
          <div className="truncate text-[11px] text-sidebar-muted">Ads · SDR IA · CRM</div>
        </div>
      )}
    </div>
  )
}

function PilotCard({ collapsed }: { collapsed: boolean }) {
  const sl = useStopLoss()
  if (collapsed)
    return (
      <div title={`Piloto dia ${sl.dayOfPilot}/${sl.totalDays} · ${sl.current}/${sl.target} SQLs`} className="flex size-10 items-center justify-center rounded-xl bg-sidebar-2 text-xs font-semibold text-white ring-1 ring-sidebar-line">
        {sl.current}/{sl.target}
      </div>
    )
  return (
    <div className="rounded-xl bg-sidebar-2 p-3 ring-1 ring-sidebar-line">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Target className="size-3.5 text-primary-400" />
          Piloto 60 dias
        </span>
        <span className="text-[11px] text-sidebar-muted">
          dia {sl.dayOfPilot}/{sl.totalDays}
        </span>
      </div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-sidebar-text">SQLs (stop-loss)</span>
        <span className="num text-sm font-semibold text-white">
          {sl.current}
          <span className="text-sidebar-muted">/{sl.target}</span>
        </span>
      </div>
      <ProgressBar value={sl.current} max={sl.target} size="sm" tone={sl.onTrack ? 'success' : 'warning'} marker={sl.expectedByNow} markerLabel="Ritmo esperado" className="[&>div]:bg-sidebar-hover" />
      <div className={cn('mt-2 text-[11px]', sl.onTrack ? 'text-success-500' : 'text-warning-500')}>
        {sl.onTrack ? 'No ritmo para bater a meta' : 'Abaixo do ritmo esperado'} · {sl.daysLeft} dias restantes
      </div>
    </div>
  )
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggle = useUiStore((s) => s.toggleSidebar)
  const mobileOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobile = useUiStore((s) => s.setMobileNavOpen)
  // mobile drawer: Escape closes (topmost-only) + body scroll lock
  useOverlay(mobileOpen, () => setMobile(false))
  const unreadHandoffs = useLeadStore((s) => s.conversations.filter((c) => c.unreadCount > 0 && (c.state === 'QUALIFIED_HANDOFF' || c.state === 'HUMAN_REQUESTED')).length)

  const content = (isMobile: boolean) => {
    const c = collapsed && !isMobile
    let lastSection = ''
    return (
      <div className="flex h-full flex-col">
        <div className={cn('flex h-16 items-center border-b border-sidebar-line', c ? 'justify-center px-2' : 'justify-between px-4')}>
          <Logo collapsed={c} />
          {isMobile && (
            <button onClick={() => setMobile(false)} className="rounded-lg p-1.5 text-sidebar-text hover:bg-sidebar-hover hover:text-white" aria-label="Fechar menu">
              <X className="size-5" />
            </button>
          )}
        </div>
        <nav className="sidebar-scroll flex-1 overflow-x-hidden overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const showSection = item.section !== lastSection
            lastSection = item.section
            const Icon = item.icon
            const link = (
              <NavLink
                to={item.path}
                end={item.path === '/' || item.path === '/ads'}
                onClick={() => isMobile && setMobile(false)}
                title={c ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                    c ? 'size-10 justify-center' : 'h-9 px-3',
                    isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r bg-primary-400" />}
                    <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-primary-300' : 'text-sidebar-muted group-hover:text-white')} />
                    {!c && <span className="truncate">{item.label}</span>}
                    {item.path === '/crm' && unreadHandoffs > 0 && (
                      <span className={cn('rounded-full bg-danger-500 text-[10px] font-semibold text-white', c ? 'absolute top-1 right-1 size-2' : 'ml-auto px-1.5')}>
                        {!c && unreadHandoffs}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
            return (
              <div key={item.path}>
                {showSection &&
                  (c ? (
                    <div className="mx-auto my-3 h-px w-6 bg-sidebar-line first:mt-0" />
                  ) : (
                    <div className="mt-5 mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-sidebar-muted uppercase first:mt-0">{item.section}</div>
                  ))}
                <div className="mb-0.5">
                  {link}
                </div>
              </div>
            )
          })}
        </nav>
        <div className={cn('border-t border-sidebar-line p-3', c && 'flex flex-col items-center gap-2')}>
          <PilotCard collapsed={c} />
          {!isMobile && (
            <button
              onClick={toggle}
              className={cn('mt-2 flex items-center gap-2 rounded-lg text-xs text-sidebar-muted hover:bg-sidebar-hover hover:text-white', c ? 'size-10 justify-center' : 'h-8 w-full px-3')}
              aria-label={c ? 'Expandir menu' : 'Recolher menu'}
            >
              {c ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
              {!c && 'Recolher menu'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden bg-sidebar transition-[width] duration-200 lg:block', collapsed ? 'w-[72px]' : 'w-64')}>{content(false)}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/50" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-in-left bg-sidebar shadow-pop">{content(true)}</aside>
        </div>
      )}
    </>
  )
}
