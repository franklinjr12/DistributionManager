import { useMemo } from 'react'
import { Clock, Layers, MapPin, Package, Sparkles, Target, Wallet } from 'lucide-react'
import type { AllowedState, Machine } from '@/types/domain'
import { Badge, Button, Card, CardBody, CardHeader, ChannelIcon, Switch, Textarea } from '@/components/ui'
import { formatBRL, UF_NAME } from '@/lib/format'
import { cn } from '@/lib/utils'
import { OBJECTIVES, WORKDAYS_PER_MONTH, type WizardConfig } from './mockGenerator'
import { MachineIcon, ToggleChip, WEEKDAYS } from './parts'

const STATES: AllowedState[] = ['PA', 'MA', 'AP']

interface Props {
  cfg: WizardConfig
  setCfg: (patch: Partial<WizardConfig>) => void
  machines: Machine[]
  onGenerate: () => void
}

export function ConfigStep({ cfg, setCfg, machines, onGenerate }: Props) {
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const googlePct = Math.round(cfg.googleShare * 100)
  const activeThemes = OBJECTIVES.filter((o) => cfg.themes.includes(o.theme) && (o.platform === 'GOOGLE' ? cfg.google : cfg.meta))

  const problems = useMemo(() => {
    const p: string[] = []
    if (!cfg.allowedStates.length) p.push('Selecione ao menos uma região.')
    if (!cfg.google && !cfg.meta) p.push('Ative ao menos uma plataforma.')
    if (!activeThemes.length) p.push('Selecione ao menos um objetivo compatível com as plataformas ativas.')
    if (!cfg.machineIds.length) p.push('Selecione ao menos uma máquina do catálogo.')
    if (!cfg.days.length) p.push('Selecione os dias do cronograma.')
    if (cfg.start >= cfg.end) p.push('Horário final deve ser após o inicial.')
    if (cfg.monthlyBudgetBRL < 100) p.push('Orçamento mensal mínimo: R$ 100.')
    return p
  }, [cfg, activeThemes.length])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Regions + schedule */}
      <Card padding="none">
        <CardHeader className="px-5 pt-5" title="Região e cronograma" description="Pré-preenchido a partir do tenant Maquinabel (America/Belem)." icon={<MapPin className="h-4 w-4" />} />
        <CardBody className="grid gap-5 px-5 pb-5 md:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-700">Geofencing (estados atendidos)</legend>
            <div className="flex flex-wrap gap-2">
              {STATES.map((uf) => (
                <ToggleChip key={uf} pressed={cfg.allowedStates.includes(uf)} onClick={() => setCfg({ allowedStates: toggle(cfg.allowedStates, uf) })}>
                  <span className="font-semibold">{uf}</span>
                  <span className="hidden text-xs font-normal opacity-80 sm:inline">{UF_NAME?.[uf] ?? ''}</span>
                </ToggleChip>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-400">Leads fora destes estados são desqualificados automaticamente pelo SDR IA.</p>
          </fieldset>
          <fieldset>
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-700">
              <Clock className="h-3.5 w-3.5 text-ink-400" /> Cronograma de anúncios (BRT)
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((w) => (
                <button
                  key={w.d}
                  type="button"
                  aria-pressed={cfg.days.includes(w.d)}
                  onClick={() => setCfg({ days: toggle(cfg.days, w.d) })}
                  className={cn(
                    'h-8 w-11 rounded-md border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                    cfg.days.includes(w.d) ? 'border-primary-500 bg-primary-600 text-white' : 'border-line-strong bg-white text-ink-500 hover:bg-ink-50',
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <label className="sr-only" htmlFor="bp-start">Início</label>
              <input id="bp-start" type="time" value={cfg.start} onChange={(e) => setCfg({ start: e.target.value })} className="h-9 rounded-lg border border-line-strong px-2 num focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" />
              <span className="text-ink-400">até</span>
              <label className="sr-only" htmlFor="bp-end">Fim</label>
              <input id="bp-end" type="time" value={cfg.end} onChange={(e) => setCfg({ end: e.target.value })} className="h-9 rounded-lg border border-line-strong px-2 num focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" />
            </div>
          </fieldset>
        </CardBody>
      </Card>

      {/* Budget + platforms */}
      <Card padding="none">
        <CardHeader className="px-5 pt-5" title="Orçamento e plataformas" description={`Distribuído em ~${WORKDAYS_PER_MONTH} dias úteis/mês (anúncios só em horário comercial).`} icon={<Wallet className="h-4 w-4" />} />
        <CardBody className="grid gap-5 px-5 pb-5 md:grid-cols-2">
          <div>
            <label htmlFor="bp-budget" className="mb-1.5 block text-sm font-medium text-ink-700">Orçamento mensal de mídia</label>
            <div className="flex h-10 items-center rounded-lg border border-line-strong bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
              <span className="pl-3 text-sm text-ink-400">R$</span>
              <input
                id="bp-budget"
                type="number"
                min={100}
                step={50}
                value={cfg.monthlyBudgetBRL}
                onChange={(e) => setCfg({ monthlyBudgetBRL: Math.max(0, Number(e.target.value) || 0) })}
                className="num h-full w-full bg-transparent px-2 text-sm focus:outline-none"
              />
              <span className="pr-3 text-xs text-ink-400">/mês</span>
            </div>
            <div className={cn('mt-4 transition-opacity', !(cfg.google && cfg.meta) && 'pointer-events-none opacity-40')}>
              <div className="mb-1 flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-ink-700"><ChannelIcon channel="google" size="xs" /> Google {googlePct}%</span>
                <span className="flex items-center gap-1.5 text-ink-700">Meta {100 - googlePct}% <ChannelIcon channel="meta" size="xs" /></span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={googlePct}
                aria-label="Divisão do orçamento Google vs Meta"
                aria-valuetext={`Google ${googlePct}%, Meta ${100 - googlePct}%`}
                onChange={(e) => setCfg({ googleShare: Number(e.target.value) / 100 })}
                className="w-full accent-primary-600"
                style={{ background: 'transparent' }}
              />
              <div className="mt-1 flex justify-between text-xs text-ink-500 num">
                <span>{formatBRL(cfg.monthlyBudgetBRL * cfg.googleShare)}/mês · {formatBRL((cfg.monthlyBudgetBRL * cfg.googleShare) / WORKDAYS_PER_MONTH, { decimals: 2 })}/dia</span>
                <span>{formatBRL(cfg.monthlyBudgetBRL * (1 - cfg.googleShare))}/mês</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <span className="block text-sm font-medium text-ink-700">Plataformas</span>
            <div className="rounded-xl border border-line p-3">
              <Switch checked={cfg.google} onChange={(v) => setCfg({ google: v })} label={<span className="flex items-center gap-2"><ChannelIcon channel="google" size="xs" /> Google Ads API v26</span>} description="Search · RSA · CampaignService batch" />
            </div>
            <div className="rounded-xl border border-line p-3">
              <Switch checked={cfg.meta} onChange={(v) => setCfg({ meta: v })} label={<span className="flex items-center gap-2"><ChannelIcon channel="meta" size="xs" /> Meta Marketing API v26.0</span>} description="Click-to-WhatsApp · IG Reels · CAPI" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Objectives */}
      <Card padding="none">
        <CardHeader className="px-5 pt-5" title="Objetivos" description="Cada objetivo vira uma campanha temática no blueprint." icon={<Target className="h-4 w-4" />} />
        <CardBody className="grid gap-2 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
          {OBJECTIVES.map((o) => {
            const platformOn = o.platform === 'GOOGLE' ? cfg.google : cfg.meta
            const checked = cfg.themes.includes(o.theme)
            return (
              <label
                key={o.theme}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary-200',
                  checked && platformOn ? 'border-primary-300 bg-primary-50/60' : 'border-line hover:bg-ink-50',
                  !platformOn && 'cursor-not-allowed opacity-50',
                )}
              >
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary-600" checked={checked} disabled={!platformOn} onChange={() => setCfg({ themes: toggle(cfg.themes, o.theme) })} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                    <ChannelIcon channel={o.platform === 'GOOGLE' ? 'google' : o.theme === 'META_CTWA' ? 'whatsapp' : 'instagram'} size="xs" />
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">{o.description}</span>
                </span>
              </label>
            )
          })}
        </CardBody>
      </Card>

      {/* Catalog seed */}
      <Card padding="none">
        <CardHeader
          className="px-5 pt-5"
          title="Semente de catálogo"
          description="Máquinas Alfa Tennant usadas para keywords, títulos e criativos."
          icon={<Package className="h-4 w-4" />}
          actions={
            <div className="flex gap-1">
              <Button size="xs" variant="ghost" onClick={() => setCfg({ machineIds: machines.map((m) => m.id) })}>Todas</Button>
              <Button size="xs" variant="ghost" onClick={() => setCfg({ machineIds: [] })}>Limpar</Button>
            </div>
          }
        />
        <CardBody className="px-5 pb-5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Máquinas do catálogo">
            {machines.map((m) => {
              const on = cfg.machineIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCfg({ machineIds: toggle(cfg.machineIds, m.id) })}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                    on ? 'border-primary-300 bg-white shadow-sm' : 'border-line bg-ink-50/50 opacity-60 hover:opacity-100',
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: m.color }}>
                    <MachineIcon machine={m} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink-800">{m.model}</span>
                    <span className="block truncate text-xs text-ink-500">{m.categoryLabel}</span>
                  </span>
                  <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded border text-[10px]', on ? 'border-primary-600 bg-primary-600 text-white' : 'border-line-strong bg-white')}>{on ? '✓' : ''}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-ink-400">{cfg.machineIds.length} de {machines.length} máquinas selecionadas</p>
        </CardBody>
      </Card>

      {/* Tone */}
      <Card padding="none">
        <CardHeader className="px-5 pt-5" title="Tom de voz e observações" description="Instruções adicionais para o gpt-4o-mini (opcional)." icon={<Layers className="h-4 w-4" />} />
        <CardBody className="px-5 pb-5">
          <Textarea
            rows={3}
            value={cfg.notes}
            onChange={(e) => setCfg({ notes: e.target.value })}
            placeholder="Ex.: tom consultivo B2B, sem citar preços, destacar assistência técnica própria e locação flexível."
            hint="A IA nunca inclui preços nos anúncios (guardrail de preço ativo)."
          />
        </CardBody>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-pop backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          {problems.length ? (
            <span className="text-danger-600">{problems[0]}</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5 text-ink-600">
              <Badge tone="violet" size="sm">gpt-4o-mini</Badge>
              {activeThemes.length} campanhas · {cfg.allowedStates.join('/')} · {formatBRL(cfg.monthlyBudgetBRL)}/mês
            </span>
          )}
        </div>
        <Button size="lg" leftIcon={<Sparkles className="h-4 w-4" />} onClick={onGenerate} disabled={problems.length > 0}>
          Gerar blueprint com IA
        </Button>
      </div>
    </div>
  )
}
