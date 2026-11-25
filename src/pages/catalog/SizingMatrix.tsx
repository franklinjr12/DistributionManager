import { useMemo } from 'react'
import { RotateCcw, Ruler } from 'lucide-react'
import type { Machine, SizingRule } from '@/types/domain'
import { Badge, Button, Card, CardHeader, Table, toast } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { useCatalogStore } from '@/store'
import { sizingRules as seedRules } from '@/mock/data/catalog'
import { cn } from '@/lib/utils'
import { MachineTile } from './MachineTile'

const SCALE_MAX = 10000
/** sqrt scale so small bands (< 500 m²) stay readable. */
const pos = (v: number) => (Math.sqrt(Math.min(v, SCALE_MAX)) / Math.sqrt(SCALE_MAX)) * 100
const TICKS = [0, 500, 1000, 2500, 5000, 10000]

const GROUP_LABEL: Record<SizingRule['group'], string> = { LAVAGEM: 'Lavagem (piso interno)', VARRICAO: 'Varrição (poeira / detritos)', ESPECIAL: 'Necessidades especiais' }

function Band({ rule, machines, row = 0 }: { rule: SizingRule; machines: Machine[]; row?: number }) {
  const left = pos(rule.minAreaM2 ?? 0)
  const right = rule.maxAreaM2 == null ? 100 : pos(rule.maxAreaM2)
  const ms = rule.machineIds.map((id) => machines.find((m) => m.id === id)).filter((m): m is Machine => !!m)
  const color = ms[0]?.color ?? '#64748b'
  return (
    <div
      className="absolute flex h-11 items-center gap-1.5 overflow-hidden rounded-lg px-2 text-xs font-medium text-white shadow-sm"
      style={{ left: `${left}%`, width: `calc(${right - left}% - 3px)`, top: row * 50, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
      title={`${rule.condition} — ${ms.map((m) => m.model).join(' / ')}`}
    >
      <span className="truncate">
        {ms.map((m) => (
          <span key={m.id} className={cn(!m.active && 'line-through opacity-70')}>
            {m.model}
            {m !== ms[ms.length - 1] && ' · '}
          </span>
        ))}
      </span>
      {rule.maxAreaM2 == null && <span className="ml-auto shrink-0 opacity-80">→</span>}
    </div>
  )
}

function Lane({ title, rules, machines, rows }: { title: string; rules: { rule: SizingRule; row: number }[]; machines: Machine[]; rows: number }) {
  return (
    <div className="grid gap-2 md:grid-cols-[150px_1fr] md:items-center">
      <div className="text-xs font-semibold text-ink-700">{title}</div>
      <div className="relative" style={{ height: rows * 50 - 6 }}>
        {rules.map(({ rule, row }) => (
          <Band key={rule.id} rule={rule} machines={machines} row={row} />
        ))}
      </div>
    </div>
  )
}

function AreaInput({ value, onCommit, placeholder }: { value: number | null; onCommit: (v: number | null) => void; placeholder: string }) {
  return (
    <input
      key={value ?? 'null'}
      type="number"
      min={0}
      step={100}
      defaultValue={value ?? ''}
      placeholder={placeholder}
      onBlur={(e) => {
        const raw = e.target.value.trim()
        const next = raw === '' ? null : Math.max(0, Number(raw))
        if (next !== value) onCommit(next)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="num h-8 w-24 rounded-md border border-line bg-surface px-2 text-right text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none"
    />
  )
}

export function SizingMatrix() {
  const rules = useCatalogStore((s) => s.sizingRules)
  const machines = useCatalogStore((s) => s.machines)
  const update = useCatalogStore((s) => s.updateSizingRule)

  const wash = useMemo(() => rules.filter((r) => r.group === 'LAVAGEM'), [rules])
  const sweep = useMemo(() => rules.filter((r) => r.group === 'VARRICAO'), [rules])
  const special = useMemo(() => rules.filter((r) => r.group === 'ESPECIAL'), [rules])

  const isModified = useMemo(
    () => rules.some((r) => {
      const s = seedRules.find((x) => x.id === r.id)
      return s && (s.minAreaM2 !== r.minAreaM2 || s.maxAreaM2 !== r.maxAreaM2)
    }),
    [rules],
  )

  const commit = (r: SizingRule, key: 'minAreaM2' | 'maxAreaM2', v: number | null) => {
    const other = key === 'minAreaM2' ? r.maxAreaM2 : r.minAreaM2
    if (v != null && other != null && (key === 'minAreaM2' ? v >= other : v <= other)) {
      toast.error('Faixa inválida', 'O mínimo precisa ser menor que o máximo.')
      return
    }
    update(r.id, { [key]: v })
    toast.success('Regra atualizada', `${r.condition.slice(0, 48)}… — prompt e calculadora já usam o novo limite.`)
  }

  const restore = () => {
    seedRules.forEach((s) => update(s.id, { minAreaM2: s.minAreaM2, maxAreaM2: s.maxAreaM2 }))
    toast.info('Limites restaurados', 'Matriz voltou aos valores da SPEC §3.2.')
  }

  return (
    <div className="space-y-5">
      <Card padding="none">
        <CardHeader
          icon={<Ruler />}
          title="Heurística determinística de dimensionamento"
          description="Faixas de área (escala √ até 10.000 m²) embutidas no system prompt — SPEC §3.2. Modelos riscados estão inativos para a IA."
          actions={
            isModified && (
              <Button size="xs" variant="outline" leftIcon={<RotateCcw />} onClick={restore}>
                Restaurar padrão
              </Button>
            )
          }
        />
        <div className="space-y-5 p-5">
          <div className="grid gap-2 md:grid-cols-[150px_1fr]">
            <div className="hidden md:block" />
            <div className="relative h-5 text-[10px] text-ink-400">
              {TICKS.map((t) => (
                <span key={t} className="num absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full" style={{ left: `${pos(t)}%` }}>
                  {t >= SCALE_MAX ? '10.000+ m²' : `${formatNumber(t)}`}
                </span>
              ))}
            </div>
          </div>
          <Lane
            title="Lavagem de piso"
            machines={machines}
            rows={2}
            rules={wash.map((r) => ({ rule: r, row: r.id === 'sr_wash_xl' ? 1 : 0 }))}
          />
          <Lane title="Varrição" machines={machines} rows={1} rules={sweep.map((r) => ({ rule: r, row: 0 }))} />
          <div className="grid gap-2 md:grid-cols-[150px_1fr] md:items-start">
            <div className="text-xs font-semibold text-ink-700">Especiais (qualquer área)</div>
            <div className="flex flex-wrap gap-2">
              {special.map((r) => {
                const m = machines.find((x) => x.id === r.machineIds[0])
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 ring-1 ring-line">
                    {m && <MachineTile machine={m} size="sm" />}
                    <div>
                      <div className="text-xs font-semibold text-ink-800">{m?.model}</div>
                      <div className="text-[11px] text-ink-500">{r.condition}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
            Sobreposição intencional 5.000–6.000 m²: acima de 5.000 m² em operação multi-turno (CD, logística, supermercados com falta de mão de obra) a IA indica
            T16AMR, mantendo a Brava como alternativa operada por pessoa.
          </p>
        </div>
      </Card>

      <Card padding="none">
        <CardHeader title="Regras editáveis" description="Ajuste os limites de área. Enter ou sair do campo salva; a mudança reflete na calculadora e na prévia do contexto LLM." />
        <Table hover compact>
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Condição</th>
              <th className="text-right">Mín. (m²)</th>
              <th className="text-right">Máx. (m²)</th>
              <th>Modelos</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>
                  <Badge tone={r.group === 'LAVAGEM' ? 'primary' : r.group === 'VARRICAO' ? 'warning' : 'violet'}>{GROUP_LABEL[r.group].split(' (')[0]}</Badge>
                </td>
                <td className="min-w-[260px]">
                  <div className="text-sm text-ink-800">{r.condition}</div>
                  <div className="text-xs text-ink-500">{r.note}</div>
                </td>
                <td className="text-right">
                  {r.group === 'ESPECIAL' ? <span className="text-ink-400">—</span> : <AreaInput value={r.minAreaM2} placeholder="0" onCommit={(v) => commit(r, 'minAreaM2', v)} />}
                </td>
                <td className="text-right">
                  {r.group === 'ESPECIAL' ? <span className="text-ink-400">—</span> : <AreaInput value={r.maxAreaM2} placeholder="sem limite" onCommit={(v) => commit(r, 'maxAreaM2', v)} />}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {r.machineIds.map((id) => {
                      const m = machines.find((x) => x.id === id)
                      return (
                        <Badge key={id} tone={m?.active ? 'neutral' : 'warning'}>
                          {m?.model ?? id}
                        </Badge>
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
