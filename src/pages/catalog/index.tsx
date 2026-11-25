import { useMemo, useState } from 'react'
import { Bot, Calculator, Database, FileText, Layers, LayoutGrid, Ruler, Search, Zap } from 'lucide-react'
import type { MachineCategory } from '@/types/domain'
import { Badge, Card, EmptyState, Input, KpiCard, PageHeader, Select, Tabs } from '@/components/ui'
import { formatNumber, formatPercent } from '@/lib/format'
import { useCatalogStore, useTenantStore } from '@/store'
import { cn } from '@/lib/utils'
import { MachineCard } from './MachineCard'
import { MachineDrawer } from './MachineDrawer'
import { SizingMatrix } from './SizingMatrix'
import { QuickCalculator } from './QuickCalculator'
import { ContextPreview } from './ContextPreview'
import { CACHE_HIT_RATE, CACHE_TOKEN_TARGET, CATEGORY_ORDER, CATEGORY_SHORT, catalogMarkdown, estimateTokens, OPERATION_LABEL, operationKind, systemPrompt, type OperationKind } from './lib'

type View = 'maquinas' | 'matriz' | 'calculadora' | 'contexto'

export default function CatalogPage() {
  const machines = useCatalogStore((s) => s.machines)
  const rules = useCatalogStore((s) => s.sizingRules)
  const tenant = useTenantStore((s) => s.tenant)
  const [view, setView] = useState<View>('maquinas')
  const [category, setCategory] = useState<MachineCategory | 'ALL'>('ALL')
  const [operation, setOperation] = useState<OperationKind | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const active = machines.filter((m) => m.active)
  const categories = new Set(active.map((m) => m.category)).size
  const tokens = useMemo(
    () =>
      estimateTokens(
        `${tenant.aiSettings.systemPromptOverride?.trim() || systemPrompt(tenant, tenant.aiSettings.maxQuestionsPerTurn)}\n\n${catalogMarkdown(machines, rules)}`,
      ),
    [tenant, machines, rules],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return machines.filter(
      (m) =>
        (category === 'ALL' || m.category === category) &&
        (operation === 'ALL' || operationKind(m) === operation) &&
        (!q || [m.model, m.categoryLabel, m.application, ...m.keySpecs].join(' ').toLowerCase().includes(q)),
    )
  }, [machines, category, operation, query])

  const countBy = (c: MachineCategory) => machines.filter((m) => m.category === c).length

  return (
    <>
      <PageHeader
        eyebrow="Base de conhecimento da IA"
        title="Catálogo Alfa Tennant"
        description="Modelos verificados, matriz de dimensionamento e o contexto exato que o SDR IA recebe via Prompt Caching."
        actions={
          <Badge tone="success" dot size="md">
            Cache sincronizado
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Máquinas ativas p/ IA" value={`${active.length}/${machines.length}`} icon={<Bot />} iconTone="primary" caption="Modelos no contexto do LLM" />
        <KpiCard label="Categorias" value={categories} icon={<Layers />} iconTone="violet" caption="Lavadoras, varredeiras, robótica…" />
        <KpiCard
          label="Catálogo cacheado"
          value={`~${formatNumber(tokens)} tokens`}
          icon={<Database />}
          iconTone={tokens < CACHE_TOKEN_TARGET ? 'success' : 'danger'}
          caption={tokens < CACHE_TOKEN_TARGET ? `Dentro da meta < ${formatNumber(CACHE_TOKEN_TARGET)}` : `Acima da meta de ${formatNumber(CACHE_TOKEN_TARGET)}`}
        />
        <KpiCard label="Prompt caching hit rate" value={formatPercent(CACHE_HIT_RATE)} icon={<Zap />} iconTone="warning" caption="Últimos 7 dias · gpt-4o-mini" />
      </div>

      <div className="mt-6">
        <Tabs
          value={view}
          onChange={(v) => setView(v as View)}
          items={[
            { value: 'maquinas', label: 'Máquinas', icon: <LayoutGrid />, count: machines.length },
            { value: 'matriz', label: 'Matriz de dimensionamento', icon: <Ruler /> },
            { value: 'calculadora', label: 'Calculadora rápida', icon: <Calculator /> },
            { value: 'contexto', label: 'Prévia do contexto LLM', icon: <FileText /> },
          ]}
        />
        <div className="pt-5" key={view}>
          {view === 'maquinas' && (
            <>
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="scrollbar-thin -mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 xl:pb-0">
                  {(['ALL', ...CATEGORY_ORDER] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition',
                        category === c ? 'bg-primary-600 text-white ring-primary-600' : 'bg-surface text-ink-600 ring-line hover:bg-ink-50',
                      )}
                    >
                      {c === 'ALL' ? 'Todas' : CATEGORY_SHORT[c]}
                      <span className={cn('ml-1.5 num', category === c ? 'text-white/80' : 'text-ink-400')}>{c === 'ALL' ? machines.length : countBy(c)}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 xl:ml-auto">
                  <Select
                    size="sm"
                    wrapperClassName="w-44"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value as OperationKind | 'ALL')}
                    options={[{ value: 'ALL', label: 'Toda operação' }, ...(Object.keys(OPERATION_LABEL) as OperationKind[]).map((k) => ({ value: k, label: OPERATION_LABEL[k] }))]}
                  />
                  <Input size="sm" wrapperClassName="flex-1 xl:w-60" leftIcon={<Search />} placeholder="Buscar modelo ou spec…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              </div>
              {filtered.length === 0 ? (
                <Card>
                  <EmptyState icon={<Search />} title="Nenhuma máquina encontrada" description="Ajuste os filtros ou a busca." />
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((m) => (
                    <MachineCard key={m.id} machine={m} onOpen={() => setOpenId(m.id)} />
                  ))}
                </div>
              )}
            </>
          )}
          {view === 'matriz' && <SizingMatrix />}
          {view === 'calculadora' && <QuickCalculator />}
          {view === 'contexto' && <ContextPreview />}
        </div>
      </div>

      <MachineDrawer machineId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}
