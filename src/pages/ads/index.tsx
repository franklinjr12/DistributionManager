import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarRange, FilterX, Pause, Play, RefreshCw, Search, Sparkles, X } from 'lucide-react'
import type { AdCampaign } from '@/types/domain'
import * as api from '@/mock/api'
import { useCampaignStore, useLeadStore, useTenantStore } from '@/store'
import { Button, Card, EmptyState, Input, PageHeader, Select, Skeleton, Tabs, toast } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import { belemDay, now } from '@/lib/utils'
import { ConnectionBar } from './ConnectionBar'
import { KpiRow } from './KpiRow'
import { CampaignTable, type CampaignRow } from './CampaignTable'
import { CampaignInspector } from './inspector/CampaignInspector'
import { useStatusToggle } from './useStatusToggle'
import {
  RANGE_OPTIONS,
  campaignRangeMetrics,
  mergeDaily,
  rangeWindow,
  totalsRangeMetrics,
  type PlatformFilter,
  type RangeKey,
  type StatusFilter,
} from './lib'

export default function AdsPage() {
  const navigate = useNavigate()
  const campaigns = useCampaignStore((s) => s.campaigns)
  const leads = useLeadStore((s) => s.leads)
  const monthlyBudget = useTenantStore((s) => s.tenant.monthlyAdBudgetBRL)

  const [booting, setBooting] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [range, setRange] = useState<RangeKey>('pilot')
  const [platform, setPlatform] = useState<PlatformFilter>('ALL')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const toggle = useStatusToggle()

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 400)
    return () => clearTimeout(t)
  }, [])

  const live = useMemo(() => campaigns.filter((c) => c.status !== 'REMOVED'), [campaigns])
  const w = useMemo(() => rangeWindow(range), [range])
  const prevW = useMemo(() => (range === 'pilot' ? null : rangeWindow(range, 1)), [range])
  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)!.label.toLowerCase()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return live.filter(
      (c) =>
        (platform === 'ALL' || c.platform === platform) &&
        (status === 'ALL' || c.status === status) &&
        (!q || c.name.toLowerCase().includes(q) || c.objective.toLowerCase().includes(q) || c.externalId.includes(q)),
    )
  }, [live, platform, status, query])

  // KPIs follow platform filter (not status/search — paused campaigns still have history)
  const kpiScope = useMemo(() => live.filter((c) => platform === 'ALL' || c.platform === platform), [live, platform])
  const cur = useMemo(() => totalsRangeMetrics(kpiScope, leads, w), [kpiScope, leads, w])
  const prev = useMemo(() => (prevW ? totalsRangeMetrics(kpiScope, leads, prevW) : null), [kpiScope, leads, prevW])

  const today = now()
  const todayDay = belemDay(today)
  const monthPrefix = todayDay.slice(0, 7)
  const monthSpend = useMemo(
    () => live.reduce((a, c) => a + c.daily.filter((d) => d.date.startsWith(monthPrefix)).reduce((x, d) => x + d.spend, 0), 0),
    [live, monthPrefix],
  )
  const [yy, mm] = monthPrefix.split('-').map(Number)
  const daysInMonth = new Date(yy, mm, 0).getDate()
  const dayOfMonth = Number(todayDay.slice(8, 10))

  const rows: CampaignRow[] = useMemo(
    () =>
      filtered.map((c) => ({
        campaign: c,
        m: campaignRangeMetrics(c, leads, w),
        spark: mergeDaily([c], w).map((d) => ({ date: d.date, spend: d.spend, leads: d.leads })),
      })),
    [filtered, leads, w],
  )

  const lastSync = useMemo(() => live.reduce<string | null>((a, c) => (!a || c.lastSyncedAt > a ? c.lastSyncedAt : a), null), [live])

  const selectedLive = useMemo(() => live.filter((c) => selected.has(c.id)), [live, selected])
  const selPaused = selectedLive.filter((c) => c.status === 'PAUSED')
  const selEnabled = selectedLive.filter((c) => c.status === 'ENABLED')

  const sync = async () => {
    setSyncing(true)
    try {
      await api.syncCampaignMetrics()
      toast.success('Métricas sincronizadas', 'Dados atualizados via Google Ads API v26 e Meta Marketing API v26.0.')
    } catch (e) {
      toast.error('Falha na sincronização', e instanceof Error ? e.message : 'Tente novamente em instantes.')
    } finally {
      setSyncing(false)
    }
  }

  const onToggle = useCallback((c: AdCampaign, enable: boolean) => toggle.request([c.id], enable ? 'ENABLED' : 'PAUSED'), [toggle])
  const clearFilters = () => {
    setPlatform('ALL')
    setStatus('ALL')
    setQuery('')
  }
  const hasFilters = platform !== 'ALL' || status !== 'ALL' || query.trim() !== ''

  return (
    <>
      <PageHeader
        eyebrow="Google Ads & Meta Ads"
        title="Gerenciamento de Campanhas & Ativação 1-Clique"
        description="Acompanhe métricas ao vivo, edite orçamento, anúncios e negativas, e ative ou pause campanhas sem sair da plataforma."
        actions={
          <>
            <Button variant="outline" leftIcon={<RefreshCw className={syncing ? 'size-4 animate-spin' : 'size-4'} />} disabled={syncing} onClick={sync}>
              {syncing ? 'Sincronizando…' : 'Sincronizar métricas'}
            </Button>
            <Button leftIcon={<Sparkles className="size-4" />} onClick={() => navigate('/ads/blueprint')}>
              Gerar campanhas com IA
            </Button>
          </>
        }
      />

      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ConnectionBar lastSync={lastSync} />
          <div className="flex items-center gap-2">
            <CalendarRange className="size-4 shrink-0 text-ink-400" aria-hidden />
            <Select
              aria-label="Período"
              size="sm"
              className="w-60"
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              options={RANGE_OPTIONS.map((r) => ({ value: r.value, label: r.value === 'pilot' ? r.label : `Últimos ${r.label}` }))}
            />
          </div>
        </div>

        <KpiRow loading={booting} cur={cur} prev={prev} monthSpend={monthSpend} monthlyBudget={monthlyBudget} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />

        <Card padding="none">
          <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <Tabs
                variant="pills"
                size="sm"
                value={platform}
                onChange={(v) => setPlatform(v as PlatformFilter)}
                items={[
                  { value: 'ALL', label: 'Todas', count: live.length },
                  { value: 'GOOGLE', label: 'Google', count: live.filter((c) => c.platform === 'GOOGLE').length },
                  { value: 'META', label: 'Meta', count: live.filter((c) => c.platform === 'META').length },
                ]}
              />
              <Tabs
                variant="pills"
                size="sm"
                value={status}
                onChange={(v) => setStatus(v as StatusFilter)}
                items={[
                  { value: 'ALL', label: 'Todas' },
                  { value: 'ENABLED', label: 'Ativas', count: live.filter((c) => c.status === 'ENABLED').length },
                  { value: 'PAUSED', label: 'Pausadas', count: live.filter((c) => c.status === 'PAUSED').length },
                ]}
              />
            </div>
            <div className="lg:ml-auto lg:w-72">
              <Input
                size="sm"
                aria-label="Buscar campanhas"
                placeholder="Buscar por nome, objetivo ou ID…"
                leftIcon={<Search className="size-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                suffix={
                  query ? (
                    <button type="button" aria-label="Limpar busca" onClick={() => setQuery('')} className="text-ink-400 hover:text-ink-700">
                      <X className="size-3.5" />
                    </button>
                  ) : undefined
                }
              />
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-50/60 px-4 py-2.5 text-sm animate-fade-in" role="region" aria-label="Ações em massa">
              <span className="font-medium text-primary-800">
                {selected.size} selecionada{selected.size > 1 ? 's' : ''}
              </span>
              <span className="text-xs text-ink-500">· {formatBRL(selectedLive.reduce((a, c) => a + c.dailyBudgetBRL, 0))}/dia</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="xs" variant="success" leftIcon={<Play className="size-3.5" />} disabled={!selPaused.length} onClick={() => toggle.request(selPaused.map((c) => c.id), 'ENABLED')}>
                  Ativar ({selPaused.length})
                </Button>
                <Button size="xs" variant="outline" leftIcon={<Pause className="size-3.5" />} disabled={!selEnabled.length} onClick={() => toggle.request(selEnabled.map((c) => c.id), 'PAUSED')}>
                  Pausar ({selEnabled.length})
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
                  Limpar seleção
                </Button>
              </div>
            </div>
          )}

          {booting ? (
            <div className="space-y-3 p-4" aria-busy="true" aria-label="Carregando campanhas">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="hidden h-4 w-24 sm:block" />
                  <Skeleton className="hidden h-4 w-24 md:block" />
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          ) : rows.length ? (
            <CampaignTable
              rows={rows}
              selected={selected}
              activeId={openId}
              pending={toggle.pending}
              onToggle={onToggle}
              onOpen={setOpenId}
              onSelect={(id, on) =>
                setSelected((s) => {
                  const n = new Set(s)
                  if (on) n.add(id)
                  else n.delete(id)
                  return n
                })
              }
              onSelectAll={(on) => setSelected(on ? new Set(rows.map((r) => r.campaign.id)) : new Set())}
            />
          ) : (
            <EmptyState
              icon={<FilterX />}
              title="Nenhuma campanha encontrada"
              description={hasFilters ? 'Nenhuma campanha corresponde aos filtros aplicados.' : 'Gere as primeiras campanhas com IA a partir do catálogo e da cobertura PA/MA/AP.'}
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  <Button leftIcon={<Sparkles className="size-4" />} onClick={() => navigate('/ads/blueprint')}>
                    Gerar campanhas com IA
                  </Button>
                )
              }
            />
          )}

          {!booting && rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-xs text-ink-500">
              <span>
                {rows.length} de {live.length} campanhas · métricas: {rangeLabel}
              </span>
              <span>Clique numa linha para abrir o inspetor · Enter também funciona</span>
            </div>
          )}
        </Card>
      </div>

      <CampaignInspector campaignId={openId} onClose={() => setOpenId(null)} window={w} rangeLabel={rangeLabel} pending={toggle.pending} onToggle={onToggle} />
      {toggle.dialog}
    </>
  )
}
