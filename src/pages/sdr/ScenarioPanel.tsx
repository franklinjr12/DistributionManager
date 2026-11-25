import { Clock, Globe, Play, RotateCcw, Square, Timer } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, ChannelIcon, Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import { originChannel, originLabel } from '@/lib/format'
import { ORIGINS, SCENARIOS, originByTag, type SimChannel } from './scenarios'
import type { SdrSim } from './useSdrSim'

const CHANNELS: { value: SimChannel; label: string; icon: React.ReactNode }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp', icon: <ChannelIcon channel="whatsapp" size="xs" variant="plain" /> },
  { value: 'INSTAGRAM', label: 'Instagram Direct', icon: <ChannelIcon channel="instagram" size="xs" variant="plain" /> },
  { value: 'WIDGET', label: 'Widget do site', icon: <Globe className="size-3.5" /> },
]

function Segmented<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[] }) {
  return (
    <div className="flex rounded-lg bg-ink-100 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition',
            value === o.value ? 'bg-surface text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ScenarioPanel({ sim, onPick }: { sim: SdrSim; onPick?: () => void }) {
  const origin = originByTag(sim.originTag)
  return (
    <div className="flex flex-col gap-4">
      <Card padding="none">
        <CardHeader title="Canal & contexto" description="Origem rastreada da conversa" />
        <CardBody className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-500">Canal</p>
            <div className="grid gap-1.5">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => sim.setChannel(c.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition',
                    sim.channel === c.value ? 'border-primary-500 bg-primary-50 font-medium text-primary-800' : 'border-line hover:bg-ink-50',
                  )}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Select
            label="Tag de origem"
            value={sim.originTag}
            onChange={(e) => sim.setOriginTag(e.target.value)}
            options={ORIGINS.map((o) => ({ value: o.originTag, label: o.originTag }))}
          />
          <div className="rounded-lg border border-line bg-ink-50 p-2.5 text-[11px] leading-relaxed text-ink-600">
            <div className="mb-1 flex items-center gap-1.5">
              <ChannelIcon channel={originChannel(origin.originTag)} size="xs" />
              <span className="font-medium text-ink-800">{originLabel(origin.originTag)}</span>
            </div>
            <div className="font-mono break-all">
              {origin.utmSource && <div>utm_source={origin.utmSource}</div>}
              {origin.utmMedium && <div>utm_medium={origin.utmMedium}</div>}
              {origin.utmCampaign && <div>utm_campaign={origin.utmCampaign}</div>}
              {origin.utmTerm && <div>utm_term={origin.utmTerm}</div>}
              {origin.gclid && <div className="text-google-blue">gclid={origin.gclid}</div>}
              {origin.fbclid && <div className="text-meta">fbclid={origin.fbclid}</div>}
              {origin.igMediaId && <div className="text-instagram">ig_media_id={origin.igMediaId}</div>}
              {!origin.utmSource && <div>Sem UTM (contato direto)</div>}
            </div>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ink-500">
              <Clock className="size-3.5" /> Relógio simulado
            </p>
            <Segmented
              value={sim.clock}
              onChange={sim.setClock}
              options={[
                { value: 'business', label: 'Horário comercial' },
                { value: 'saturday', label: 'Sábado 14:00' },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ink-500">
              <Timer className="size-3.5" /> Debounce de mensagens
            </p>
            <Segmented
              value={sim.debounceMs}
              onChange={sim.setDebounceMs}
              options={[
                { value: 5000, label: '5 s' },
                { value: 2000, label: '2 s' },
                { value: 0, label: 'Off' },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      <Card padding="none">
        <CardHeader
          title="Cenários dourados"
          description="SPEC §7.1 — clique para reproduzir"
          actions={
            sim.playing ? (
              <Button size="xs" variant="outline" leftIcon={<Square className="size-3" />} onClick={sim.stopScenario}>
                Parar
              </Button>
            ) : (
              <Button size="xs" variant="ghost" leftIcon={<RotateCcw className="size-3.5" />} onClick={sim.reset}>
                Reiniciar
              </Button>
            )
          }
        />
        <CardBody className="space-y-1.5">
          {SCENARIOS.map((sc, i) => {
            const active = sim.playing === sc.id
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  onPick?.()
                  void sim.playScenario(sc)
                }}
                className={cn(
                  'group flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition',
                  active ? 'border-primary-500 bg-primary-50' : 'border-line hover:border-primary-300 hover:bg-ink-50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    active ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600 group-hover:bg-primary-100 group-hover:text-primary-700',
                  )}
                >
                  {active ? <Play className="size-3 fill-current" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink-900">
                    {sc.title}
                    {sc.clock === 'saturday' && (
                      <Badge tone="warning" size="sm">
                        fora do horário
                      </Badge>
                    )}
                  </span>
                  <span className="block truncate text-[11px] text-ink-500">{sc.subtitle}</span>
                  <span className="mt-0.5 block text-[11px] font-medium text-primary-700">→ {sc.expected}</span>
                </span>
              </button>
            )
          })}
        </CardBody>
      </Card>
    </div>
  )
}
