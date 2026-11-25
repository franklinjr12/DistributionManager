import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'
import { Toaster } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/** App frame: sidebar + topbar + routed content (max-w 1600px, padded). */
export function AppShell() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return (
    <div className="min-h-full bg-canvas">
      <Sidebar />
      <div className={cn('flex min-h-screen min-w-0 flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Topbar />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<Skeleton lines={6} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
