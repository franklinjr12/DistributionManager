import { useMemo, useState } from 'react'
import { Calculator, Clock, Sparkles, TriangleExclamationPoint } from 'lucide-react'
import type { DirtProfile, FloorType, PowerPreference, Segment } from '@/types/domain'
import { Badge, Card, CardHeader, EmptyState, Input, Select, Switch } from '@/components/ui'
import { DIRT_LABEL, FLOOR_LABEL, formatNumber, POWER_LABEL, SEGMENT_LABEL } from '@/lib/format'
import { useCatalogStore } from '@/store'
import { cn } from '@/lib/utils'
import { MachineTile } from './MachineTile'
import { quickSize, type CalcInput, type CalcMode } from './lib'

const opts = <T extends string>(map: Record<T, string>) => (Object.keys(map) as T[]).map((k) => ({ value: k, label: map[k] }))

const PRESETS: { label: string; input: Partial<CalcInput> }[] = [
  { label: 'CD Belém 8.000 m²', input: { areaM2: 8000, segment: 'CD_LOGISTICA', floorType: 'cimento_queimado', dirtProfile: 'poeira_fina', mode: 'lavagem', laborShortage: true } },
  { label: 'Clínica 300 m²', input: { areaM2: 300, segment: 'HOSPITAL_HOTEL_ESCOLA', floorType: 'porcelanato', dirtProfile: 'alto_trafego', mode: 'lavagem' } },
  { label: 'Indústria 1.800 m²', input: { areaM2: 1800, segment: 'INDUSTRIA', floorType: 'epoxi', dirtProfile: 'graxa_oleo', mode: 'lavagem' } },
  { label: 'Pátio 6.000 m²', input: { areaM2: 6000, segment: 'CD_LOGISTICA', floorType: 'externo_asfalto', dirtProfile: 'detritos_solidos', mode: 'varricao' } },
]

function hoursLabel(h: number) {
  if (h < 1) return `${Math.max(5, Math.round((h * 60) / 5) * 5)} min/dia`
  return `${formatNumber(h, { maxDecimals: 1 })} h/dia`
}

export function QuickCalculator() {
  const machines = useCatalogStore((s) => s.machines)
  const rules = useCatalogStore((s) => s.sizingRules)
  const [input, setInput] = useState<CalcInput>({
    areaM2: 3200,
    floorType: 'porcelanato',
    dirtProfile: 'alto_trafego',
    mode: 'lavagem',
    power: 'bateria',
    segment: 'SUPERMERCADO_ATACAREJO',
    laborShortage: false,
  })
  const set = <K extends keyof CalcInput>(k: K, v: CalcInput[K]) => setInput((i) => ({ ...i, [k]: v }))
  const out = useMemo(() => quickSize(input, machines, rules), [input, machines, rules])

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card padding="none" className="h-fit">
        <CardHeader icon={<Calculator />} title="Dados do ambiente" description="Mesmos 4 campos que o SDR IA coleta na conversa." />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setInput((i) => ({ ...i, laborShortage: false, ...p.input }))}
                className="rounded-full bg-ink-50 px-2.5 py-1 text-[11px] text-ink-600 ring-1 ring-line hover:bg-primary-50 hover:text-primary-700"
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input label="Área a limpar" type="number" min={0} step={100} suffix="m²" value={input.areaM2 || ''} onChange={(e) => set('areaM2', Number(e.target.value))} />
          <div>
            <div className="mb-1.5 text-xs font-medium text-ink-700">Necessidade principal</div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1">
              {(['lavagem', 'varricao'] as CalcMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set('mode', m)}
                  className={cn('rounded-md py-1.5 text-sm font-medium transition', input.mode === m ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800')}
                >
                  {m === 'lavagem' ? 'Lavagem' : 'Varrição'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo de piso" options={opts<FloorType>(FLOOR_LABEL)} value={input.floorType} onChange={(e) => set('floorType', e.target.value as FloorType)} />
            <Select label="Sujeira" options={opts<DirtProfile>(DIRT_LABEL)} value={input.dirtProfile} onChange={(e) => set('dirtProfile', e.target.value as DirtProfile)} />
            <Select label="Energia" options={opts<PowerPreference>(POWER_LABEL)} value={input.power} onChange={(e) => set('power', e.target.value as PowerPreference)} />
            <Select label="Segmento" options={opts<Segment>(SEGMENT_LABEL)} value={input.segment} onChange={(e) => set('segment', e.target.value as Segment)} />
          </div>
          <Switch
            size="sm"
            checked={input.laborShortage}
            onChange={(v) => set('laborShortage', v)}
            label="Multi-turno / falta de mão de obra"
            description="Habilita a indicação de robótica autônoma acima do limite XL."
          />
        </div>
      </Card>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
          <Sparkles className="size-4 text-violet-500" />
          Regra aplicada: <span className="font-medium text-ink-800">{out.ruleLabel || '—'}</span>
        </div>
        {out.results.length === 0 ? (
          <Card>
            <EmptyState
              icon={<TriangleExclamationPoint />}
              title="Nenhum modelo ativo para este cenário"
              description="Os modelos indicados pela matriz estão desativados para a IA. Reative-os no catálogo."
            />
          </Card>
        ) : (
          out.results.map((r, i) => (
            <Card key={r.machine.id} padding="none" className={cn(i === 0 && 'ring-2 ring-primary-200')}>
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
                <div className="flex min-w-0 flex-1 gap-4">
                <MachineTile machine={r.machine} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-ink-900">{r.machine.model}</h3>
                    <Badge tone={i === 0 ? 'primary' : 'neutral'} solid={i === 0}>
                      {i === 0 ? 'Recomendação principal' : 'Alternativa'}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-500">{r.machine.categoryLabel}</p>
                  <p className="mt-2 text-sm text-ink-700">{r.reason}</p>
                </div>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 md:w-48 md:grid-cols-1">
                  <div className="rounded-lg bg-ink-50 px-3 py-2 ring-1 ring-line">
                    <div className="text-[11px] text-ink-500">Produtividade prática</div>
                    <div className="num text-sm font-semibold text-ink-900">
                      {r.practicalM2h ? `${formatNumber(r.practicalM2h)} m²/h` : 'Uso pontual'}
                      {r.estimated && r.practicalM2h ? <span className="ml-1 text-[10px] font-normal text-ink-400">est.</span> : null}
                    </div>
                  </div>
                  <div className="rounded-lg bg-primary-50 px-3 py-2 ring-1 ring-primary-100">
                    <div className="flex items-center gap-1 text-[11px] text-primary-700">
                      <Clock className="size-3" /> Tempo estimado
                    </div>
                    <div className="num text-sm font-semibold text-primary-800">{r.hoursPerDay != null ? hoursLabel(r.hoursPerDay) : '—'}</div>
                  </div>
                </div>
              </div>
              {r.hoursPerDay != null && r.hoursPerDay > 8 && (
                <div className="border-t border-line bg-warning-50 px-5 py-2 text-xs text-warning-700">
                  Acima de 8 h/dia para 1 unidade — considere {Math.ceil(r.hoursPerDay / 8)} unidades ou operação em turnos.
                </div>
              )}
            </Card>
          ))
        )}
        {out.skipped.length > 0 && (
          <p className="text-xs text-warning-700">
            Ignorado(s) por estar(em) inativo(s) para a IA: {out.skipped.map((m) => m.model).join(', ')}.
          </p>
        )}
        <p className="text-[11px] text-ink-400">
          Tempo = área ÷ produtividade prática (≈ 60% da teórica quando o fabricante não publica valor prático). Estimativa para uma passada diária; não substitui visita
          técnica.
        </p>
      </div>
    </div>
  )
}
