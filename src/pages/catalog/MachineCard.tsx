import { Gauge, Package } from 'lucide-react'
import type { Machine } from '@/types/domain'
import { Badge, Card, Switch, toast } from '@/components/ui'
import { SEGMENT_LABEL } from '@/lib/format'
import { useCatalogStore } from '@/store'
import { cn } from '@/lib/utils'
import { MachineTile } from './MachineTile'
import { CATEGORY_SHORT, OPERATION_LABEL, operationKind } from './lib'

export function MachineCard({ machine, onOpen }: { machine: Machine; onOpen: () => void }) {
  const toggle = useCatalogStore((s) => s.toggleMachineActive)
  const op = operationKind(machine)
  return (
    <Card
      padding="none"
      interactive
      onClick={onOpen}
      className={cn('flex flex-col overflow-hidden', !machine.active && 'opacity-70')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen()
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <MachineTile machine={machine} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink-900">{machine.model}</h3>
            <span className="text-[11px] text-ink-400">{machine.brand}</span>
          </div>
          <p className="truncate text-xs text-ink-500">{machine.categoryLabel}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge tone="neutral">{CATEGORY_SHORT[machine.category]}</Badge>
            <Badge tone={op === 'autonoma' ? 'violet' : op === 'a_bordo' ? 'info' : 'primary'}>{OPERATION_LABEL[op]}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-line bg-line text-xs">
        <div className="bg-surface px-4 py-2.5">
          <div className="flex items-center gap-1 text-ink-400">
            <Gauge className="size-3.5" /> Produtividade
          </div>
          <div className="mt-0.5 truncate font-medium text-ink-800" title={machine.productivityLabel}>
            {machine.productivityLabel}
          </div>
        </div>
        <div className="bg-surface px-4 py-2.5">
          <div className="flex items-center gap-1 text-ink-400">
            <Package className="size-3.5" /> Tanque / reservatório
          </div>
          <div className="mt-0.5 truncate font-medium text-ink-800" title={machine.tankLabel}>
            {machine.tankLabel}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 p-4">
        <ul className="space-y-1 text-xs text-ink-600">
          {machine.keySpecs.slice(0, 3).map((s) => (
            <li key={s} className="flex gap-1.5">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-300" />
              <span className="line-clamp-1">{s}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-1">
          {machine.idealSegments.slice(0, 3).map((s) => (
            <span key={s} className="rounded-md bg-ink-50 px-1.5 py-0.5 text-[11px] text-ink-600 ring-1 ring-line">
              {SEGMENT_LABEL[s]}
            </span>
          ))}
          {machine.bndesEligible && <Badge tone="success">BNDES</Badge>}
          {machine.ecH2O && <Badge tone="info">ec-H2O™</Badge>}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-ink-50/50 px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
        <Switch
          size="sm"
          tone="success"
          checked={machine.active}
          onChange={() => {
            toggle(machine.id)
            toast.info(machine.active ? `${machine.model} removida do contexto da IA` : `${machine.model} ativada para a IA`, 'O catálogo cacheado será reconstruído na próxima conversa.')
          }}
          label={<span className="text-xs">Ativo para IA</span>}
        />
        {machine.availableForRental && <span className="text-[11px] text-ink-500">{machine.rentalFleetUnits} un. na frota de locação</span>}
      </div>
    </Card>
  )
}
