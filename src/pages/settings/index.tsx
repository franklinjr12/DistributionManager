import { useCallback, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, Building, Clock, FlaskConical, Link, Plug, Route, ShieldCheck, TriangleExclamationPoint, Users } from 'lucide-react'
import { Badge, Button, Modal, PageHeader } from '@/components/ui'
import { useTenantStore, useUiStore } from '@/store'
import { cn } from '@/lib/utils'
import { DirtyContext } from './shared'
import { CompanySection } from './CompanySection'
import { CoverageSection } from './CoverageSection'
import { RoutingSection } from './RoutingSection'
import { AiSection } from './AiSection'
import { IntegrationsSection } from './IntegrationsSection'
import { WidgetSection } from './WidgetSection'
import { UsersSection } from './UsersSection'
import { SecuritySection } from './SecuritySection'
import { DemoSection } from './DemoSection'

type Key = 'empresa' | 'cobertura' | 'roteamento' | 'ia' | 'integracoes' | 'widget' | 'usuarios' | 'seguranca' | 'demo'

const SECTIONS: { key: Key; label: string; icon: ReactNode; render: () => ReactNode }[] = [
  { key: 'empresa', label: 'Empresa', icon: <Building />, render: () => <CompanySection /> },
  { key: 'cobertura', label: 'Cobertura & horário', icon: <Clock />, render: () => <CoverageSection /> },
  { key: 'roteamento', label: 'Roteamento & handoff', icon: <Route />, render: () => <RoutingSection /> },
  { key: 'ia', label: 'IA SDR', icon: <Bot />, render: () => <AiSection /> },
  { key: 'integracoes', label: 'Integrações', icon: <Plug />, render: () => <IntegrationsSection /> },
  { key: 'widget', label: 'Widget & links rastreados', icon: <Link />, render: () => <WidgetSection /> },
  { key: 'usuarios', label: 'Usuários', icon: <Users />, render: () => <UsersSection /> },
  { key: 'seguranca', label: 'Segurança & LGPD', icon: <ShieldCheck />, render: () => <SecuritySection /> },
  { key: 'demo', label: 'Modo demonstração', icon: <FlaskConical />, render: () => <DemoSection /> },
]

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('secao') as Key | null
  const current: Key = raw && SECTIONS.some((s) => s.key === raw) ? raw : 'empresa'
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<Key | null>(null)
  const integrations = useTenantStore((s) => s.tenant.integrations)
  const failure = useUiStore((s) => s.mockFailureRate)
  const issues = integrations.filter((i) => i.status === 'PENDING' || i.status === 'ERROR').length

  const go = useCallback(
    (k: Key) => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          n.set('secao', k)
          return n
        },
        { replace: true },
      )
      setDirty(false)
      window.scrollTo({ top: 0 })
    },
    [setParams],
  )
  const request = (k: Key) => {
    if (k === current) return
    if (dirty) setPending(k)
    else go(k)
  }

  const badgeFor = (k: Key) =>
    k === 'integracoes' && issues > 0 ? (
      <Badge tone="warning" size="sm">
        {issues}
      </Badge>
    ) : k === 'demo' && failure > 0 ? (
      <Badge tone="danger" size="sm">
        {Math.round(failure * 100)}%
      </Badge>
    ) : null

  const section = SECTIONS.find((s) => s.key === current)!

  return (
    <>
      <PageHeader eyebrow="Tenant Maquinabel" title="Configurações" description="Empresa, cobertura, roteamento, IA, integrações, widget, usuários, LGPD e modo demonstração." />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* mobile: horizontal scroll */}
        <nav className="scrollbar-thin -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 xl:hidden" aria-label="Seções">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => request(s.key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition [&_svg]:size-3.5',
                current === s.key ? 'bg-primary-600 text-white ring-primary-600' : 'bg-surface text-ink-600 ring-line',
              )}
            >
              {s.icon}
              {s.label}
              {badgeFor(s.key)}
            </button>
          ))}
        </nav>

        {/* desktop: vertical tabs */}
        <nav className="sticky top-4 hidden w-60 shrink-0 rounded-xl border border-line bg-surface p-2 shadow-card xl:block" aria-label="Seções">
          {SECTIONS.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => request(s.key)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition [&_svg]:size-4',
                current === s.key ? 'bg-primary-50 font-medium text-primary-700' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                i === 8 && 'mt-2 border-t border-line pt-3',
              )}
            >
              <span className={current === s.key ? 'text-primary-600' : 'text-ink-400'}>{s.icon}</span>
              <span className="flex-1">{s.label}</span>
              {badgeFor(s.key)}
              {current === s.key && dirty && <span className="size-2 rounded-full bg-warning-500" title="Alterações não salvas" />}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1" key={current}>
          <DirtyContext.Provider value={setDirty}>{section.render()}</DirtyContext.Provider>
        </div>
      </div>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Descartar alterações?"
        description={`Há alterações não salvas em “${section.label}”. Sair desta seção vai descartá-las.`}
        icon={<TriangleExclamationPoint />}
        iconTone="warning"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Continuar editando
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pending) go(pending)
                setPending(null)
              }}
            >
              Descartar e sair
            </Button>
          </>
        }
      />
    </>
  )
}
