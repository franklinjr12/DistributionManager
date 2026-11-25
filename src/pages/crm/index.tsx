import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeDollarSign, Columns3, LayoutList, Plus, Search, Target, Users, X } from 'lucide-react'
import type { ChannelKind, Conversation, Modality } from '@/types/domain'
import { Button, PageHeader, Select, Tabs } from '@/components/ui'
import { useLeadStore } from '@/store'
import { CHANNEL_KIND_LABEL, MODALITY_LABEL, formatBRL, originChannel } from '@/lib/format'
import { cn, sum } from '@/lib/utils'
import { ALLOWED_UF, slaInfo, useTick } from './helpers'
import { KanbanBoard } from './KanbanBoard'
import { LeadDrawer } from './LeadDrawer'
import { LeadTable } from './LeadTable'
import { NewLeadModal } from './NewLeadModal'
import { StageMoveProvider } from './stageMove'

type View = 'kanban' | 'list'

const VIEW_KEY = 'crm:view'
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'kanban'
  } catch {
    return 'kanban'
  }
}

export default function CrmPage() {
  return (
    <StageMoveProvider>
      <CrmContent />
    </StageMoveProvider>
  )
}

function CrmContent() {
  useTick(30_000)
  const leads = useLeadStore((s) => s.leads)
  const conversations = useLeadStore((s) => s.conversations)
  const [params, setParams] = useSearchParams()
  const openId = params.get('lead')

  const [view, setViewState] = useState<View>(readView)
  const setView = (v: View) => {
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* ignore */
    }
  }
  const [q, setQ] = useState('')
  const [channel, setChannel] = useState('')
  const [origin, setOrigin] = useState('')
  const [modality, setModality] = useState('')
  const [region, setRegion] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const convByLead = useMemo(() => {
    const m = new Map<string, Conversation>()
    for (const c of conversations) m.set(c.leadId, c)
    return m
  }, [conversations])

  const originTags = useMemo(() => [...new Set(leads.map((l) => l.originTag))].sort(), [leads])
  const channels = useMemo(() => [...new Set(leads.map((l) => originChannel(l.originTag)))] as ChannelKind[], [leads])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (needle && ![l.name, l.companyName, l.locationCity].some((x) => x?.toLowerCase().includes(needle))) return false
      if (channel && originChannel(l.originTag) !== channel) return false
      if (origin && l.originTag !== origin) return false
      if (modality && l.modality !== modality) return false
      if (region) {
        if (region === 'fora') {
          if (!l.locationState || ALLOWED_UF.includes(l.locationState)) return false
        } else if (l.locationState !== region) return false
      }
      return true
    })
  }, [leads, q, channel, origin, modality, region])

  const stats = useMemo(() => {
    const sqls = filtered.filter((l) => l.sqlAt).length
    const pipeline = sum(filtered.filter((l) => l.kanbanStage === 'PROPOSAL_SENT').map((l) => l.proposalValueBRL ?? 0))
    const slaBreaches = filtered.filter((l) => {
      const s = slaInfo(l, convByLead.get(l.id))
      return s.waiting && s.breached
    }).length
    return { total: filtered.length, sqls, pipeline, slaBreaches }
  }, [filtered, convByLead])

  const hasFilters = !!(q || channel || origin || modality || region)
  const clearFilters = () => {
    setQ('')
    setChannel('')
    setOrigin('')
    setModality('')
    setRegion('')
  }

  const openLead = useCallback(
    (id: string) =>
      setParams((p) => {
        const n = new URLSearchParams(p)
        n.set('lead', id)
        return n
      }),
    [setParams],
  )
  const closeLead = useCallback(
    () =>
      setParams((p) => {
        const n = new URLSearchParams(p)
        n.delete('lead')
        return n
      }),
    [setParams],
  )

  return (
    <>
      <PageHeader
        title="Kanban CRM"
        description="Pipeline de leads com handoff automático para o Vinicius, takeover humano e close-out obrigatório."
        actions={
          <Button leftIcon={<Plus />} onClick={() => setNewOpen(true)}>
            Novo lead
          </Button>
        }
      />

      {/* counters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Stat icon={<Users />} label="Leads" value={String(stats.total)} />
        <Stat icon={<Target />} label="SQLs" value={String(stats.sqls)} tone="violet" />
        <Stat icon={<BadgeDollarSign />} label="Pipeline" value={formatBRL(stats.pipeline, { decimals: 0 })} tone="warning" />
        {stats.slaBreaches > 0 && <Stat icon={<span className="size-2 animate-pulse rounded-full bg-danger-500" />} label="SLA estourado" value={String(stats.slaBreaches)} tone="danger" />}
      </div>

      {/* toolbar */}
      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-line bg-white p-2.5 shadow-card lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nome, empresa ou cidade…"
            className="h-8 w-full rounded-lg border border-line-strong bg-white pr-8 pl-9 text-sm outline-none placeholder:text-ink-400 focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-400 hover:text-ink-700" aria-label="Limpar busca">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Select
            size="sm"
            aria-label="Canal"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            options={[{ value: '', label: 'Todos os canais' }, ...channels.map((c) => ({ value: c, label: CHANNEL_KIND_LABEL[c] }))]}
          />
          <Select size="sm" aria-label="Origem" value={origin} onChange={(e) => setOrigin(e.target.value)} options={[{ value: '', label: 'Todas as origens' }, ...originTags.map((t) => ({ value: t, label: t }))]} />
          <Select
            size="sm"
            aria-label="Modalidade"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            options={[{ value: '', label: 'Todas modalidades' }, ...(Object.keys(MODALITY_LABEL) as Modality[]).map((m) => ({ value: m, label: MODALITY_LABEL[m] }))]}
          />
          <Select
            size="sm"
            aria-label="Estado"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            options={[
              { value: '', label: 'Todos estados' },
              { value: 'PA', label: 'PA' },
              { value: 'MA', label: 'MA' },
              { value: 'AP', label: 'AP' },
              { value: 'fora', label: 'Fora da região' },
            ]}
          />
          {hasFilters && (
            <Button size="sm" variant="ghost" leftIcon={<X />} onClick={clearFilters} className="col-span-2 sm:col-span-1">
              Limpar
            </Button>
          )}
        </div>
        <Tabs
          variant="pills"
          size="sm"
          className="self-start lg:ml-auto lg:self-auto"
          value={view}
          onChange={(v) => setView(v as View)}
          items={[
            { value: 'kanban', label: 'Kanban', icon: <Columns3 /> },
            { value: 'list', label: 'Lista', icon: <LayoutList /> },
          ]}
        />
      </div>

      {view === 'kanban' ? <KanbanBoard leads={filtered} convByLead={convByLead} onOpen={openLead} /> : <LeadTable leads={filtered} convByLead={convByLead} onOpen={openLead} />}

      <LeadDrawer leadId={openId} onClose={closeLead} />
      <NewLeadModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={openLead} />
    </>
  )
}

const STAT_TONE = {
  neutral: 'bg-ink-100 text-ink-600',
  violet: 'bg-violet-100 text-violet-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
}

function Stat({ icon, label, value, tone = 'neutral' }: { icon: ReactNode; label: string; value: string; tone?: keyof typeof STAT_TONE }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pr-3 pl-1.5 shadow-card">
      <span className={cn('flex size-7 items-center justify-center rounded-lg [&_svg]:size-4', STAT_TONE[tone])}>{icon}</span>
      <span className="text-xs text-ink-500">{label}</span>
      <span className="num text-sm font-semibold text-ink-900">{value}</span>
    </div>
  )
}
