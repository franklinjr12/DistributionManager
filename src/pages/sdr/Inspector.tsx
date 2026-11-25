import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellOff,
  Braces,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Circle,
  Cpu,
  ExternalLink,
  Gauge,
  ShieldCheck,
  Sparkles,
  SquareKanban,
  Workflow,
} from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader } from '@/components/ui'
import { cn, median } from '@/lib/utils'
import { POWER_LABEL, formatMs, formatNumber, formatPercent, formatTime } from '@/lib/format'
import { MANDATORY, buildSummary4, mandatoryStatus, type EngineState } from './engine'
import type { SdrSim, TurnRecord } from './useSdrSim'

// ───────────────────────────── State machine ─────────────────────────────

const MAIN: { key: EngineState; label: string }[] = [
  { key: 'NEW', label: 'NEW' },
  { key: 'QUALIFYING', label: 'QUALIFYING' },
  { key: 'QUALIFIED_HANDOFF', label: 'QUALIFIED_HANDOFF' },
]
const BRANCH: { key: EngineState; label: string; tone: string }[] = [
  { key: 'HUMAN_REQUESTED', label: 'HUMAN_REQUESTED', tone: 'violet' },
  { key: 'DISQUALIFIED_OUT_OF_REGION', label: 'DISQUALIFIED_OUT_OF_REGION', tone: 'danger' },
]

function Node({ label, active, visited, tone = 'primary' }: { label: string; active: boolean; visited: boolean; tone?: string }) {
  const toneCls =
    tone === 'danger'
      ? 'border-danger-500 bg-danger-50 text-danger-700 ring-danger-500/25'
      : tone === 'violet'
        ? 'border-violet-500 bg-violet-50 text-violet-700 ring-violet-500/25'
        : tone === 'success'
          ? 'border-success-500 bg-success-50 text-success-700 ring-success-500/25'
          : 'border-primary-500 bg-primary-50 text-primary-700 ring-primary-500/25'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-1 font-mono text-[9.5px] font-semibold transition-all duration-300',
        active ? cn(toneCls, 'ring-4') : visited ? 'border-ink-300 bg-surface text-ink-700' : 'border-dashed border-line bg-ink-50 text-ink-400',
      )}
    >
      {active && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {label}
    </span>
  )
}

function StateMachine({ state, visited }: { state: EngineState; visited: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {MAIN.map((n, i) => (
          <span key={n.key} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-ink-300" />}
            <Node label={n.label} active={state === n.key} visited={visited.includes(n.key)} tone={n.key === 'QUALIFIED_HANDOFF' ? 'success' : 'primary'} />
          </span>
        ))}
      </div>
      <div className="ml-6 flex flex-wrap items-center gap-1.5 border-l-2 border-dashed border-line pl-3">
        {BRANCH.map((n) => (
          <span key={n.key} className="flex items-center gap-1">
            <span className="text-[10px] text-ink-400">↳</span>
            <Node label={n.label} active={state === n.key} visited={visited.includes(n.key)} tone={n.tone} />
          </span>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────────── JSON viewer ─────────────────────────────

function JsonView({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2)
  const html = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/g, (m, str, colon, lit, num) => {
      if (str) return colon ? `<span class="text-sky-300">${str}</span>${colon}` : `<span class="text-emerald-300">${str}</span>`
      if (lit) return `<span class="text-violet-300">${lit}</span>`
      if (num) return `<span class="text-amber-300">${num}</span>`
      return m
    })
  return <pre className="max-h-80 overflow-auto rounded-lg bg-ink-900 p-3 font-mono text-[10.5px] leading-relaxed text-ink-100 scrollbar-thin" dangerouslySetInnerHTML={{ __html: html }} />
}

function TurnRow({ t, open, onToggle }: { t: TurnRecord; open: boolean; onToggle: () => void }) {
  const r = t.result
  return (
    <div className="rounded-lg border border-line">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-ink-50">
        {open ? <ChevronDown className="size-3.5 text-ink-400" /> : <ChevronRight className="size-3.5 text-ink-400" />}
        <span className="text-xs font-semibold text-ink-800">Turno {t.index}</span>
        <span className="text-[10px] text-ink-400">{formatTime(t.at)}</span>
        <span className="ml-auto flex flex-wrap justify-end gap-1">
          {r.bubbles > 1 && (
            <Badge tone="warning" size="sm">
              {r.bubbles} bolhas → 1 chamada
            </Badge>
          )}
          {r.priceProbe && (
            <Badge tone="danger" size="sm" icon={<ShieldCheck className="size-3" />}>
              preço
            </Badge>
          )}
          <Badge tone={r.output.next_state === 'QUALIFYING' ? 'primary' : r.output.next_state === 'QUALIFIED_HANDOFF' ? 'success' : r.output.next_state === 'HUMAN_REQUESTED' ? 'violet' : 'danger'} size="sm">
            {r.output.next_state}
          </Badge>
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-line p-2.5 animate-fade-in">
          <div className="rounded-md bg-ink-50 px-2 py-1.5 text-[11px] text-ink-600">
            <span className="font-medium text-ink-800">Entrada agrupada:</span> {t.userText.replace(/\n/g, ' ⏎ ')}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-ink-500">
            <span>
              latência <b className="num text-ink-800">{formatMs(r.metrics.latencyMs)}</b>
            </span>
            <span>
              tokens <b className="num text-ink-800">{formatNumber(r.metrics.tokensIn)}</b> in / <b className="num text-ink-800">{formatNumber(r.metrics.tokensOut)}</b> out
            </span>
            <span>
              cache <b className="num text-ink-800">{formatPercent(r.metrics.cacheHitPct, 0)}</b>
            </span>
            <span>
              custo <b className="num text-ink-800">US$ {r.metrics.costUsd.toFixed(5)}</b>
            </span>
          </div>
          {r.newlyExtracted.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.newlyExtracted.map((k) => (
                <span key={k} className="rounded bg-success-50 px-1.5 py-0.5 font-mono text-[10px] text-success-700">
                  +{k}
                </span>
              ))}
            </div>
          )}
          <JsonView value={r.output} />
        </div>
      )}
    </div>
  )
}

// ───────────────────────────── Handoff brief ─────────────────────────────

function HandoffBrief({ sim }: { sim: SdrSim }) {
  const navigate = useNavigate()
  const st = sim.ctx.state
  const last = sim.turns[sim.turns.length - 1]
  const lines = useMemo(
    () => (st === 'QUALIFIED_HANDOFF' || st === 'HUMAN_REQUESTED' ? buildSummary4(sim.ctx.fields, sim.ctx.flags, last?.result.recommended ?? [], sim.originTag, st, sim.igUsername ? `@${sim.igUsername}` : null) : null),
    [st, sim.ctx, last, sim.originTag],
  )
  if (st !== 'QUALIFIED_HANDOFF' && st !== 'HUMAN_REQUESTED' && st !== 'DISQUALIFIED_OUT_OF_REGION') return null
  const afterHours = sim.clock !== 'business'

  const kanban = sim.persistedLeadId ? (
    <Button size="sm" variant="success" fullWidth leftIcon={<ExternalLink className="size-4" />} onClick={() => navigate(`/crm?lead=${sim.persistedLeadId}`)}>
      Abrir no CRM
    </Button>
  ) : (
    <Button size="sm" fullWidth leftIcon={<SquareKanban className="size-4" />} onClick={sim.persistToCrm}>
      Criar card no Kanban
    </Button>
  )

  if (st === 'DISQUALIFIED_OUT_OF_REGION') {
    return (
      <Card padding="none" className="border-danger-500/30 animate-scale-in">
        <CardBody className="space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-danger-50 text-danger-600">
              <BellOff className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Vinicius não notificado</p>
              <p className="text-xs text-ink-500">
                Lead fora da cobertura PA/MA/AP ({sim.ctx.fields.location_city ?? '—'}-{sim.ctx.fields.location_state}). Resposta educada enviada; nenhum template disparado para o WhatsApp do vendedor.
              </p>
            </div>
          </div>
          {kanban}
        </CardBody>
      </Card>
    )
  }

  return (
    <Card padding="none" className="overflow-hidden border-whatsapp/40 animate-scale-in">
      <div className="flex items-center gap-2 bg-whatsapp-dark px-3 py-2 text-white">
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-whatsapp-dark">VG</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">WhatsApp do Vinicius Goés</p>
          <p className="text-[10px] text-white/75">template novo_lead_qualificado · utility</p>
        </div>
        <Badge tone="success" size="sm" solid>
          {st === 'HUMAN_REQUESTED' ? 'Pediu humano' : 'SQL'}
        </Badge>
      </div>
      <div className="bg-[#efeae2] p-3">
        <div className="rounded-lg rounded-tl-sm bg-white p-2.5 text-[11.5px] leading-relaxed text-ink-800 shadow-sm">
          <p className="mb-1 font-semibold text-whatsapp-dark">{st === 'HUMAN_REQUESTED' ? '🙋 Lead pediu para falar com você' : '🔥 Novo lead qualificado'}</p>
          {lines?.map((l, i) => (
            <p key={i} className="flex gap-1.5">
              <span className="font-mono text-[10px] font-bold text-ink-400">{i + 1}</span>
              <span>{l}</span>
            </p>
          ))}
          <p className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-ink-400">
            {formatTime(sim.simNow())} <CheckCheck className="size-3.5 text-[#53bdeb]" />
          </p>
        </div>
        {afterHours && <p className="mt-2 rounded-md bg-warning-50 px-2 py-1 text-[10.5px] text-warning-700">Fora do horário: lead informado de que Vinicius retorna segunda-feira às 08:00.</p>}
      </div>
      <CardBody className="space-y-2">
        {kanban}
        {sim.persistedLeadId && <p className="text-center text-[10.5px] text-ink-500">Card criado em «Enviado ao Vendedor» com conversa e mensagens.</p>}
      </CardBody>
    </Card>
  )
}

// ───────────────────────────── Inspector ─────────────────────────────

export function Inspector({ sim }: { sim: SdrSim }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const { ctx, turns } = sim
  useEffect(() => setOpenId(null), [turns.length])
  const status = mandatoryStatus(ctx)
  const filled = MANDATORY.filter((m) => status[m.key]).length
  const lastTurn = turns[turns.length - 1]
  const recs = lastTurn?.result.recommended ?? []
  const expanded = openId ?? lastTurn?.id ?? null

  const totals = useMemo(() => {
    const m = turns.map((t) => t.result.metrics)
    return {
      latency: m.length ? median(m.map((x) => x.latencyMs)) : null,
      lastLatency: m.length ? m[m.length - 1].latencyMs : null,
      tokensIn: m.reduce((a, x) => a + x.tokensIn, 0),
      tokensOut: m.reduce((a, x) => a + x.tokensOut, 0),
      cached: m.reduce((a, x) => a + x.cachedTokens, 0),
      cost: m.reduce((a, x) => a + x.costUsd, 0),
      priceHits: turns.filter((t) => t.result.priceProbe).length,
    }
  }, [turns])

  const enrichers: [string, string | null][] = [
    ['Nome', ctx.fields.lead_name],
    ['Empresa', ctx.fields.company_name],
    ['Energia', ctx.fields.power_preference ? POWER_LABEL[ctx.fields.power_preference] : null],
    ['Rotina', ctx.fields.usage_routine],
    ['Contato', ctx.flags.phone],
    ['Falta de mão de obra', ctx.flags.laborShortage ? 'Sim' : null],
  ]

  const region = !ctx.fields.location_state ? 'pending' : ['PA', 'MA', 'AP'].includes(ctx.fields.location_state) ? 'ok' : 'blocked'
  const guards: { label: string; ok: boolean; note: string }[] = [
    { label: 'Preço', ok: true, note: totals.priceHits ? `bloqueado ${totals.priceHits}×` : 'nenhum valor citado' },
    { label: 'Catálogo', ok: true, note: 'só modelos Alfa Tennant' },
    { label: 'Região', ok: region !== 'blocked', note: region === 'pending' ? 'aguardando UF' : region === 'ok' ? `${ctx.fields.location_state} coberto` : `${ctx.fields.location_state} fora` },
    { label: 'Horário', ok: true, note: sim.clock === 'business' ? 'comercial' : 'fora → seg 08:00' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <HandoffBrief sim={sim} />

      <Card padding="none">
        <CardHeader title="Máquina de estados" icon={<Workflow className="size-4" />} actions={<Badge tone={sim.phase === 'typing' ? 'info' : 'neutral'} dot>{sim.phase === 'typing' ? 'inferindo' : sim.phase === 'debouncing' ? 'debounce' : 'ocioso'}</Badge>} />
        <CardBody>
          <StateMachine state={ctx.state} visited={sim.visited} />
        </CardBody>
      </Card>

      <Card padding="none">
        <CardHeader title="Campos obrigatórios" description={`${filled}/4 coletados`} icon={<CircleCheck className="size-4" />} />
        <CardBody className="space-y-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-success-500 transition-all duration-500" style={{ width: `${(filled / 4) * 100}%` }} />
          </div>
          {MANDATORY.map((m) => {
            const v = status[m.key]
            return (
              <div key={m.key + (v ?? '')} className={cn('flex items-start gap-2 rounded-lg px-2 py-1.5', v ? 'bg-success-50 animate-scale-in' : 'bg-ink-50')}>
                {v ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-600" /> : <Circle className="mt-0.5 size-4 shrink-0 text-ink-300" />}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-800">{m.label}</p>
                  <p className={cn('text-[11px]', v ? 'text-success-700' : 'text-ink-400')}>{v ?? 'pendente'}</p>
                </div>
              </div>
            )
          })}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {enrichers.map(([k, v]) => (
              <div key={k} className="rounded-md border border-line px-2 py-1">
                <p className="text-[10px] text-ink-400">{k}</p>
                <p className={cn('truncate text-[11px]', v ? 'font-medium text-ink-800' : 'text-ink-300')}>{v ?? '—'}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card padding="none">
        <CardHeader title="Modelos recomendados" description="Heurística SPEC §3.2 · catálogo verificado" icon={<Sparkles className="size-4" />} />
        <CardBody className="space-y-2">
          {recs.length ? (
            recs.map((r, i) => (
              <div key={r.machineId + i} className="rounded-lg border border-primary-200 bg-primary-50/60 p-2.5 animate-scale-in">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary-800">{r.modelName}</span>
                  {i === 0 && (
                    <Badge tone="primary" size="sm">
                      principal
                    </Badge>
                  )}
                  {r.productivityM2h && <span className="num ml-auto text-xs font-semibold text-ink-700">{formatNumber(r.productivityM2h)} m²/h</span>}
                </div>
                <p className="mt-1 text-[11.5px] text-ink-600">{r.reason}</p>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-ink-50 px-3 py-3 text-center text-xs text-ink-400">Recomendação aparece quando os 4 campos obrigatórios estiverem completos.</p>
          )}
        </CardBody>
      </Card>

      <Card padding="none">
        <CardHeader title="Métricas da IA" description="gpt-4o-mini · Structured Outputs · Prompt Caching" icon={<Gauge className="size-4" />} />
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Latência (última)" value={totals.lastLatency != null ? formatMs(totals.lastLatency) : '—'} hint={`meta < 10 s · mediana ${totals.latency != null ? formatMs(totals.latency) : '—'}`} ok />
            <Metric label="Tokens in / out" value={`${formatNumber(totals.tokensIn)} / ${formatNumber(totals.tokensOut)}`} hint={`${turns.length} chamada(s) ao LLM`} />
            <Metric label="Cache hit" value={totals.tokensIn ? formatPercent(totals.cached / totals.tokensIn, 0) : '—'} hint="catálogo + system prompt" />
            <Metric label="Custo total" value={`US$ ${totals.cost.toFixed(4)}`} hint="$0,15 / $0,60 por 1M tokens" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {guards.map((g) => (
              <div key={g.label} className={cn('flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px]', g.ok ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700')}>
                <ShieldCheck className="size-3.5 shrink-0" />
                <span className="font-semibold">{g.label} {g.ok ? '✓' : '✕'}</span>
                <span className="truncate opacity-80">{g.note}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card padding="none">
        <CardHeader title="Structured Output por turno" description="JSON Schema SPEC §3.3" icon={<Braces className="size-4" />} />
        <CardBody className="space-y-1.5">
          {turns.length ? (
            [...turns].reverse().map((t) => <TurnRow key={t.id} t={t} open={expanded === t.id} onToggle={() => setOpenId(expanded === t.id ? '__none__' : t.id)} />)
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-ink-50 px-3 py-3 text-xs text-ink-400">
              <Cpu className="size-4" /> Nenhuma inferência ainda.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function Metric({ label, value, hint, ok }: { label: string; value: string; hint?: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-line px-2.5 py-2">
      <p className="text-[10.5px] text-ink-500">{label}</p>
      <p className={cn('num text-sm font-semibold', ok ? 'text-success-700' : 'text-ink-900')}>{value}</p>
      {hint && <p className="text-[10px] text-ink-400">{hint}</p>}
    </div>
  )
}
