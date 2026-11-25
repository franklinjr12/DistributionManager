import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import NotFound from '@/components/misc/NotFound'
import DashboardPage from '@/pages/dashboard'
import AdsPage from '@/pages/ads'
import BlueprintPage from '@/pages/blueprint'
import CrmPage from '@/pages/crm'
import SdrPage from '@/pages/sdr'
import AutomationPage from '@/pages/automation'
import CatalogPage from '@/pages/catalog'
import SettingsPage from '@/pages/settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'ads', element: <AdsPage /> },
      { path: 'ads/blueprint', element: <BlueprintPage /> },
      { path: 'crm', element: <CrmPage /> },
      { path: 'sdr', element: <SdrPage /> },
      { path: 'automacao', element: <AutomationPage /> },
      { path: 'catalogo', element: <CatalogPage /> },
      { path: 'configuracoes', element: <SettingsPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
