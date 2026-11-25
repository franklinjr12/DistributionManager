import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ExternalLink, Save } from 'lucide-react'
import type { Machine, Segment } from '@/types/domain'
import { Badge, Button, Drawer, Input, Switch, Textarea, toast } from '@/components/ui'
import { formatNumber, SEGMENT_LABEL, POWER_LABEL } from '@/lib/format'
import { useCatalogStore, useMachine } from '@/store'
import { cn } from '@/lib/utils'
import { MachineTile } from './MachineTile'
import { CodeViewer } from './CodeViewer'
import { machineMarkdown, OPERATION_LABEL, operationKind, practicalProductivity } from './lib'

interface Draft {
  productivityLabel: string
  practicalM2h: string
  tankLabel: string
  application: string
  keySpecs: string
  rentalFleetUnits: string
  availableForRental: boolean
  idealSegments: Segment[]
}

const toDraft = (m: Machine): Draft => ({
  productivityLabel: m.productivityLabel,
  practicalM2h: m.practicalM2h?.toString() ?? '',
  tankLabel: m.tankLabel,
  application: m.application,
  keySpecs: m.keySpecs.join('\n'),
  rentalFleetUnits: m.rentalFleetUnits.toString(),
  availableForRental: m.availableForRental,
  idealSegments: m.idealSegments,
})

const fromDraft = (d: Draft): Partial<Machine> => ({
  productivityLabel: d.productivityLabel.trim(),
  practicalM2h: d.practicalM2h.trim() ? Number(d.practicalM2h) || null : null,
  tankLabel: d.tankLabel.trim(),
  application: d.application.trim(),
  keySpecs: d.keySpecs
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean),
  rentalFleetUnits: Math.max(0, Math.round(Number(d.rentalFleetUnits) || 0)),
  availableForRental: d.availableForRental,
  idealSegments: d.idealSegments,
})

function Spec({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-ink-50 px-3 py-2 ring-1 ring-line">
      <div className="text-[11px] text-ink-500">{label}</div>
      <div className="text-sm font-medium text-ink-900">{value}</div>
    </div>
  )
}

export function MachineDrawer({ machineId, onClose }: { machineId: string | null; onClose: () => void }) {
  const machine = useMachine(machineId)
  const updateMachine = useCatalogStore((s) => s.updateMachine)
  const toggle = useCatalogStore((s) => s.toggleMachineActive)
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    if (machine) setDraft(toDraft(machine))
    // only reset when switching machine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId])

  const dirty = useMemo(() => !!machine && !!draft && JSON.stringify(toDraft(machine)) !== JSON.stringify(draft), [machine, draft])
  const preview = useMemo(() => (machine && draft ? machineMarkdown({ ...machine, ...fromDraft(draft) }) : ''), [machine, draft])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const save = () => {
    if (!machine || !draft) return
    updateMachine(machine.id, fromDraft(draft))
    toast.success(`${machine.model} atualizada`, 'O Markdown do catálogo cacheado foi regenerado.')
  }

  const prod = machine ? practicalProductivity(machine) : null

  return (
    <Drawer
      open={!!machine}
      onClose={onClose}
      width="lg"
      title={
        machine && (
          <span className="flex items-center gap-3">
            <MachineTile machine={machine} size="sm" />
            {machine.model}
          </span>
        )
      }
      description={machine?.categoryLabel}
      footer={
        machine && (
          <div className="flex w-full items-center gap-2">
            <Switch size="sm" tone="success" checked={machine.active} onChange={() => toggle(machine.id)} label="Ativo para IA" />
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" disabled={!dirty} onClick={() => setDraft(toDraft(machine))}>
                Descartar
              </Button>
              <Button size="sm" leftIcon={<Save />} disabled={!dirty} onClick={save}>
                Salvar alterações
              </Button>
            </div>
          </div>
        )
      }
    >
      {machine && draft && (
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge tone="primary">{OPERATION_LABEL[operationKind(machine)]}</Badge>
              {machine.power.map((p) => (
                <Badge key={p} tone="neutral">
                  {POWER_LABEL[p]}
                </Badge>
              ))}
              {machine.bndesEligible && <Badge tone="success">Elegível BNDES</Badge>}
              {machine.ecH2O && <Badge tone="info">ec-H2O NanoClean™</Badge>}
              {!machine.active && <Badge tone="warning">Fora do contexto da IA</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Spec label="Produtividade teórica" value={machine.productivityM2h ? `${formatNumber(machine.productivityM2h)} m²/h` : machine.productivityLabel} />
              <Spec
                label="Produtividade prática"
                value={prod?.value ? `${formatNumber(prod.value)} m²/h${prod.estimated ? ' (est.)' : ''}` : '—'}
              />
              <Spec label="Faixa de limpeza" value={machine.cleaningPathMm ? `${machine.cleaningPathMm} mm` : '—'} />
              <Spec label="Peso" value={machine.weightKg ? `${formatNumber(machine.weightKg, { maxDecimals: 1 })} kg` : '—'} />
              <Spec label="Ruído" value={machine.noiseDb ? `${machine.noiseDb} dBA` : '—'} />
              <Spec
                label="Área ideal"
                value={machine.idealAreaM2 ? `${formatNumber(machine.idealAreaM2.min)}${machine.idealAreaM2.max ? `–${formatNumber(machine.idealAreaM2.max)}` : '+'} m²` : 'Uso especializado'}
              />
            </div>
            <a
              href={machine.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              <ExternalLink className="size-3.5" /> Fonte verificada (ficha técnica)
            </a>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Segmentos ideais</h4>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SEGMENT_LABEL) as Segment[]).map((s) => {
                const on = draft.idealSegments.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('idealSegments', on ? draft.idealSegments.filter((x) => x !== s) : [...draft.idealSegments, s])}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs ring-1 transition',
                      on ? 'bg-primary-50 text-primary-700 ring-primary-200' : 'bg-surface text-ink-500 ring-line hover:bg-ink-50',
                    )}
                  >
                    {SEGMENT_LABEL[s]}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Campos editáveis (base de conhecimento)</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Rótulo de produtividade" value={draft.productivityLabel} onChange={(e) => set('productivityLabel', e.target.value)} />
              <Input
                label="Produtividade prática"
                type="number"
                min={0}
                suffix="m²/h"
                hint="Usada no cálculo de horas/dia"
                value={draft.practicalM2h}
                onChange={(e) => set('practicalM2h', e.target.value)}
              />
              <Input label="Tanque / reservatório" value={draft.tankLabel} onChange={(e) => set('tankLabel', e.target.value)} />
              <Input
                label="Unidades na frota de locação"
                type="number"
                min={0}
                value={draft.rentalFleetUnits}
                onChange={(e) => set('rentalFleetUnits', e.target.value)}
              />
            </div>
            <Textarea label="Aplicação ideal" rows={2} value={draft.application} onChange={(e) => set('application', e.target.value)} />
            <Textarea label="Especificações-chave (uma por linha)" rows={4} value={draft.keySpecs} onChange={(e) => set('keySpecs', e.target.value)} />
            <Switch
              size="sm"
              checked={draft.availableForRental}
              onChange={(v) => set('availableForRental', v)}
              label="Disponível para locação"
              description="A IA pode oferecer a modalidade Locação para este modelo."
            />
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">Markdown enviado ao LLM</h4>
            <CodeViewer title={`knowledge_items · ${machine.id}`} code={preview} maxHeight="max-h-72" />
            {dirty && <p className="text-xs text-warning-700">Prévia inclui alterações ainda não salvas.</p>}
          </section>
        </div>
      )}
    </Drawer>
  )
}
