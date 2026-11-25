import { CalendarClock, CircleCheckBig, ShieldCheck, Target, TrendingUp, TriangleExclamationPoint } from 'lucide-react'
import { Badge, Card, Tooltip } from '@/components/ui'
import { useStopLoss } from '@/store'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useTenantStore } from '@/store'
import { InfoHint } from './InfoHint'

export function StopLossHero() {
  const sl = useStopLoss()
  const startDate = useTenantStore((s) => s.tenant.pilot.startDate)
  const pct = (v: number) => `${Math.min(100, (v / sl.target) * 100)}%`
  const reached = sl.current >= sl.target
  const missing = Math.max(0, sl.target - sl.current)
  const neededPerWeek = sl.daysLeft > 0 ? (missing / sl.daysLeft) * 7 : 0
  const tone = reached || sl.onTrack ? 'success' : 'warning'
  const endDate = new Date(new Date(startDate).getTime() + sl.totalDays * 86_400_000)

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_300px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <ShieldCheck className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-ink-900">Stop-loss do piloto · 10 SQLs em 60 dias</h2>
            <InfoHint content="SQL = lead qualificado pela IA (4 campos obrigatórios) e enviado ao Vinicius. Se o piloto não gerar ao menos 10 SQLs em 60 dias, a Maquinabel pode encerrar sem custo adicional." />
            <Badge tone={tone} dot className="ml-auto" icon={tone === 'success' ? <CircleCheckBig className="size-3" /> : <TriangleExclamationPoint className="size-3" />}>
              {reached ? 'Meta atingida' : sl.onTrack ? 'No ritmo' : 'Em risco'}
            </Badge>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div className="flex items-baseline gap-1.5">
              <span className="num text-5xl font-semibold tracking-tight text-ink-900">{sl.current}</span>
              <span className="text-lg font-medium text-ink-400">/ {sl.target} SQLs</span>
            </div>
            <p className="pb-1.5 text-sm text-ink-500">
              {reached ? 'Meta do piloto cumprida.' : `Faltam ${missing} SQL${missing === 1 ? '' : 's'} em ${sl.daysLeft} dias.`}
            </p>
          </div>

          {/* Progress track */}
          <div className="relative mt-8 mb-9" role="img" aria-label={`${sl.current} de ${sl.target} SQLs; esperado até hoje ${formatNumber(sl.expectedByNow, { maxDecimals: 1 })}; projeção ${formatNumber(sl.projected, { maxDecimals: 1 })}`}>
            <div className="relative h-4 overflow-hidden rounded-full bg-ink-100">
              {/* projected ghost */}
              <div className="absolute inset-y-0 left-0 rounded-full bg-primary-100 [background-image:repeating-linear-gradient(135deg,transparent_0_5px,rgba(37,86,235,.18)_5px_7px)]" style={{ width: pct(sl.projected) }} />
              <div className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700', reached || sl.onTrack ? 'bg-primary-600' : 'bg-warning-500')} style={{ width: pct(sl.current) }} />
              {/* unit ticks */}
              {Array.from({ length: sl.target - 1 }, (_, i) => (
                <span key={i} className="absolute inset-y-0 w-0.5 bg-surface/80" style={{ left: `${((i + 1) / sl.target) * 100}%` }} />
              ))}
            </div>
            {/* expected marker */}
            <div className="absolute -top-6 -translate-x-1/2" style={{ left: pct(sl.expectedByNow) }}>
              <Tooltip content={`Ritmo linear esperado para o dia ${sl.dayOfPilot}: ${formatNumber(sl.expectedByNow, { maxDecimals: 1 })} SQLs`}>
                <div className="flex cursor-help flex-col items-center">
                  <span className="text-[10px] font-semibold whitespace-nowrap text-ink-600">Esperado hoje {formatNumber(sl.expectedByNow, { maxDecimals: 1 })}</span>
                  <span className="mt-0.5 h-8 w-0.5 rounded bg-ink-800" />
                </div>
              </Tooltip>
            </div>
            <div className="absolute top-6 left-0 flex w-full justify-between text-[10px] text-ink-400 num">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
            <li className="flex items-center gap-1.5">
              <span className={cn('h-2 w-4 rounded-sm', reached || sl.onTrack ? 'bg-primary-600' : 'bg-warning-500')} /> SQLs realizados
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-primary-100 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,rgba(37,86,235,.3)_3px_4px)]" /> Projeção no dia {sl.totalDays}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 rounded bg-ink-800" /> Esperado até hoje (ritmo linear)
            </li>
          </ul>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-600">
            {reached ? (
              <>A meta de 10 orçamentos qualificados foi atingida antes do fim do piloto. A partir daqui, cada SQL adicional reforça o caso para manter o investimento.</>
            ) : sl.onTrack ? (
              <>
                Estamos <strong className="text-ink-900">à frente do ritmo</strong>: no dia {sl.dayOfPilot} o esperado era {formatNumber(sl.expectedByNow, { maxDecimals: 1 })} SQLs e já temos {sl.current}. Mantendo a média atual, o piloto termina com cerca de{' '}
                <strong className="text-ink-900">{formatNumber(sl.projected, { maxDecimals: 1 })} SQLs</strong>.
              </>
            ) : (
              <>
                Estamos <strong className="text-warning-700">abaixo do ritmo</strong>: o esperado para o dia {sl.dayOfPilot} era {formatNumber(sl.expectedByNow, { maxDecimals: 1 })} SQLs. É preciso gerar cerca de {formatNumber(neededPerWeek, { maxDecimals: 1 })} SQLs por semana até o fim do piloto.
              </>
            )}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-px border-t border-line bg-line lg:grid-cols-1 lg:border-t-0 lg:border-l">
          <Stat icon={<CalendarClock />} label="Dia do piloto" value={`${sl.dayOfPilot} de ${sl.totalDays}`} sub={`termina em ${formatDate(endDate)}`} />
          <Stat icon={<Target />} label="Dias restantes" value={String(sl.daysLeft)} sub={`${formatNumber(neededPerWeek, { maxDecimals: 1 })} SQL/semana necessários`} />
          <Stat icon={<TrendingUp />} label="Projeção no dia 60" value={`${formatNumber(sl.projected, { maxDecimals: 1 })} SQLs`} sub="mantendo a média atual" />
          <Stat icon={<ShieldCheck />} label="Progresso" value={`${formatNumber(Math.min(1, sl.pct) * 100, { maxDecimals: 0 })}%`} sub="da meta de 10 SQLs" />
        </dl>
      </div>
    </Card>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 bg-ink-50/60 px-5 py-4">
      <span className="mt-0.5 text-ink-400 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="num text-base font-semibold text-ink-900">{value}</dd>
        <dd className="truncate text-[11px] text-ink-400">{sub}</dd>
      </div>
    </div>
  )
}
