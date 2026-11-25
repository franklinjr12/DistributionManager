import { Bot, LayoutDashboard, Megaphone, Package, Settings, Sparkles, SquareKanban, Workflow, type LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  /** short label for collapsed tooltip / breadcrumb */
  short: string
  icon: LucideIcon
  section: 'Aquisição' | 'Vendas' | 'Operação'
  description: string
}

/** Sidebar order (DEMO_PLAN routes). */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Painel ROI', short: 'Painel', icon: LayoutDashboard, section: 'Aquisição', description: 'ROI em 3 níveis e stop-loss do piloto' },
  { path: '/ads', label: 'Campanhas (Ads Manager)', short: 'Campanhas', icon: Megaphone, section: 'Aquisição', description: 'Google Ads & Meta Ads' },
  { path: '/ads/blueprint', label: 'Gerador de Campanhas IA', short: 'Gerador IA', icon: Sparkles, section: 'Aquisição', description: 'Blueprint com gpt-4o-mini' },
  { path: '/crm', label: 'Kanban CRM', short: 'CRM', icon: SquareKanban, section: 'Vendas', description: 'Pipeline e handoff' },
  { path: '/sdr', label: 'Simulador SDR IA', short: 'SDR IA', icon: Bot, section: 'Vendas', description: 'Consultor técnico virtual' },
  { path: '/automacao', label: 'Automação & CAPI', short: 'Automação', icon: Workflow, section: 'Operação', description: 'Otimizador, conversões e outbound' },
  { path: '/catalogo', label: 'Catálogo Alfa Tennant', short: 'Catálogo', icon: Package, section: 'Operação', description: 'Máquinas e regras de dimensionamento' },
  { path: '/configuracoes', label: 'Configurações', short: 'Config.', icon: Settings, section: 'Operação', description: 'Tenant, IA e integrações' },
]

/** Best nav match for a pathname (longest prefix). */
export function matchNav(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS].sort((a, b) => b.path.length - a.path.length).find((n) => (n.path === '/' ? pathname === '/' : pathname === n.path || pathname.startsWith(`${n.path}/`)))
}
