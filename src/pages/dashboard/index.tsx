import { useEffect, useState } from 'react'
import { CalendarRange, Plus, Upload } from 'lucide-react'
import { Button, PageHeader, Select } from '@/components/ui'
import { useCurrentUser, useStopLoss } from '@/store'
import { now, toBelemISO } from '@/lib/utils'
import { formatDayMonth } from '@/lib/format'
import { ActivityFeed } from './ActivityFeed'
import { AddSpendModal } from './AddSpendModal'
import { AttributionStrip } from './AttributionStrip'
import { ChannelSplit } from './ChannelSplit'
import { DailyTrendChart } from './DailyTrendChart'
import { DashboardSkeleton } from './DashboardSkeleton'
import { FunnelChart } from './FunnelChart'
import { ImportCsvModal } from './ImportCsvModal'
import { KpiGrid } from './KpiGrid'
import { NextActions } from './NextActions'
import { OriginBreakdown } from './OriginBreakdown'
import { SpendEntriesTable } from './SpendEntriesTable'
import { StopLossHero } from './StopLossHero'
import { PERIOD_OPTIONS, PERIOD_SHORT, usePeriodKpis, type Period } from './usePeriodKpis'

function greeting() {
  const h = Number(toBelemISO(now()).slice(11, 13))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function DashboardPage() {
  const user = useCurrentUser()
  const sl = useStopLoss()
  const [period, setPeriod] = useState<Period>('pilot')
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const data = usePeriodKpis(period)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(t)
  }, [])

  const firstName = user?.fullName.split(' ')[0] ?? 'Vinicius'
  const prevLabel = period === '7d' ? 'vs 7 dias anteriores' : 'vs 30 dias anteriores'

  return (
    <>
      <PageHeader
        eyebrow={`Piloto Client Zero · dia ${sl.dayOfPilot} de ${sl.totalDays}`}
        title={`${greeting()}, ${firstName}`}
        description="ROI em 3 níveis, stop-loss de 10 SQLs e desempenho por origem da Maquinabel."
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select
              aria-label="Período"
              size="sm"
              wrapperClassName="min-w-48 flex-1 sm:flex-none"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              options={PERIOD_OPTIONS}
            />
            <Button size="sm" variant="outline" leftIcon={<Upload />} onClick={() => setImportOpen(true)}>
              Importar CSV
            </Button>
            <Button size="sm" leftIcon={<Plus />} onClick={() => setAddOpen(true)}>
              Lançar investimento
            </Button>
          </div>
        }
      />

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="animate-fade-in space-y-4 overflow-x-clip">
          <StopLossHero />

          <div className="flex items-center gap-2 pt-2 text-xs text-ink-500">
            <CalendarRange className="size-3.5" />
            <span>
              Métricas {PERIOD_SHORT[period]} · {formatDayMonth(`${data.from}T12:00:00-03:00`)} a {formatDayMonth(`${data.to}T12:00:00-03:00`)}
            </span>
          </div>

          <AttributionStrip kpis={data.kpis} />
          <KpiGrid data={data} loading={false} prevLabel={prevLabel} />

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
              <DailyTrendChart daily={data.daily} />
            </div>
            <FunnelChart funnel={data.kpis.funnel} total={data.kpis.totalLeads} />
          </div>

          <OriginBreakdown rows={data.kpis.byOrigin} />

          <div className="grid gap-4 lg:grid-cols-2">
            <NextActions />
            <ActivityFeed />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <ChannelSplit rows={data.channels} />
            <div className="min-w-0 xl:col-span-2">
              <SpendEntriesTable onAdd={() => setAddOpen(true)} onImport={() => setImportOpen(true)} />
            </div>
          </div>
        </div>
      )}

      <AddSpendModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
