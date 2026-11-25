import { useMemo, useState, type ReactNode } from 'react'
import { CalendarClock, CircleExclamationPoint, Cpu, Info, MapPin, Package, RefreshCw, Rocket, Sparkles, TriangleExclamationPoint, Wallet, WandSparkles } from 'lucide-react'
import type { BlueprintCampaign, CampaignBlueprint, Machine } from '@/types/domain'
import { Badge, Button, ChannelIcon } from '@/components/ui'
import { formatBRL, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { countAssets, WORKDAYS_PER_MONTH, type ValidationIssue, type WizardConfig } from './mockGenerator'
import { CampaignShell } from './CampaignShell'
import { GoogleCampaignBody } from './GoogleCampaignBody'
import { MetaCampaignBody } from './MetaCampaignBody'
import { daysLabel } from './parts'

interface Props {
  blueprint: CampaignBlueprint
  cfg: WizardConfig
  machines: Machine[]
  issues: ValidationIssue[]
  regenerating: Set<string>
  edited: boolean
  onChangeCampaign: (tempId: string, patch: Partial<BlueprintCampaign>) => void
  onRegenerate: (tempIds: string[]) => void
  onCancel: () => void
  onDeploy: () => void
}

export function ReviewStep({ blueprint: bp, cfg, machines, issues, regenerating, edited, onChangeCampaign, onRegenerate, onCancel, onDeploy }: Props) {
  const google = bp.campaigns.filter((c) => c.platform === 'GOOGLE')
  const meta = bp.campaigns.filter((c) => c.platform === 'META')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([google[0]?.tempId, meta[0]?.tempId].filter(Boolean) as string[]))
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const assets = countAssets(bp.campaigns)
  const included = bp.campaigns.filter((c) => c.included)
  const monthly = included.reduce((a, c) => a + c.dailyBudgetBRL, 0) * WORKDAYS_PER_MONTH
  const errors = issues.filter((i) => i.level === 'error')
  const issuesByCampaign = useMemo(() => {
    const m: Record<string, number> = {}
    issues.forEach((i) => { if (i.campaignId && i.level === 'error') m[i.campaignId] = (m[i.campaignId] ?? 0) + 1 })
    return m
  }, [issues])
  const seedNames = machines.filter((m) => cfg.machineIds.includes(m.id)).map((m) => m.model)

  const jumpTo = (cid?: string) => {
    if (!cid) return
    setExpanded((s) => new Set(s).add(cid))
    setTimeout(() => document.getElementById(`bp-campaign-${cid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const column = (title: string, channel: 'google' | 'meta', list: BlueprintCampaign[], sub: string) => (
    <section aria-label={title} className="min-w-0 space-y-3">
      <header className="flex items-center gap-2">
        <ChannelIcon channel={channel} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          <p className="text-xs text-ink-500">{sub}</p>
        </div>
        <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} disabled={!list.length || list.some((c) => regenerating.has(c.tempId))} onClick={() => onRegenerate(list.filter((c) => c.included).map((c) => c.tempId))}>
          Regenerar
        </Button>
      </header>
      {list.length === 0 && <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-ink-400">Plataforma não incluída neste blueprint.</p>}
      {list.map((c) => (
        <CampaignShell
          key={c.tempId}
          campaign={c}
          expanded={expanded.has(c.tempId)}
          onToggle={() => toggle(c.tempId)}
          onChange={(p) => onChangeCampaign(c.tempId, p)}
          onRegenerate={() => onRegenerate([c.tempId])}
          regenerating={regenerating.has(c.tempId)}
          issueCount={issuesByCampaign[c.tempId] ?? 0}
          icon={<ChannelIcon channel={c.platform === 'GOOGLE' ? 'google' : c.type === 'CLICK_TO_WHATSAPP' ? 'whatsapp' : 'instagram'} size="sm" />}
        >
          {c.platform === 'GOOGLE' ? (
            <GoogleCampaignBody campaign={c} onChange={(p) => onChangeCampaign(c.tempId, p)} />
          ) : (
            <MetaCampaignBody campaign={c} machines={machines} onChange={(p) => onChangeCampaign(c.tempId, p)} />
          )}
        </CampaignShell>
      ))}
    </section>
  )

  return (
    <div className="animate-fade-in pb-4">
      {/* Summary chips */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3 shadow-card">
        <Chip icon={<MapPin className="h-3.5 w-3.5" />} label="Regiões" value={cfg.allowedStates.join(' · ')} />
        <Chip icon={<CalendarClock className="h-3.5 w-3.5" />} label="Cronograma" value={`${daysLabel(cfg.days)} ${cfg.start}–${cfg.end} BRT`} />
        <Chip icon={<Wallet className="h-3.5 w-3.5" />} label="Orçamento" value={`${formatBRL(monthly)} / ${formatBRL(cfg.monthlyBudgetBRL)}`} tone={monthly > cfg.monthlyBudgetBRL * 1.02 ? 'danger' : undefined} />
        <Chip icon={<Package className="h-3.5 w-3.5" />} label="Semente" value={seedNames.length > 3 ? `${seedNames.slice(0, 3).join(', ')} +${seedNames.length - 3}` : seedNames.join(', ')} />
        <Chip icon={<Sparkles className="h-3.5 w-3.5" />} label="Assets gerados" value={String(assets)} />
        <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-400 num">
          <Cpu className="h-3.5 w-3.5" /> {bp.model} · {(bp.tokensIn + bp.tokensOut).toLocaleString('pt-BR')} tokens · US$ {bp.costUsd.toFixed(4).replace('.', ',')} · {formatDateTime(bp.generatedAt)}
        </span>
      </div>

      {/* Validation */}
      <ValidationPanel issues={issues} onJump={jumpTo} />

      <div className="grid gap-6 xl:grid-cols-2">
        {column('Google Search', 'google', google, 'Google Ads API v26 · RSA + clusters temáticos')}
        {column('Meta', 'meta', meta, 'Marketing API v26.0 · Click-to-WhatsApp + IG Reels')}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-20 mt-6 -mx-1 flex flex-col gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-pop backdrop-blur sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning-500" />
          </span>
          <span className="text-ink-700">
            <strong>Alterações não publicadas</strong> ({assets} assets gerados{edited ? ' · editado' : ''})
          </span>
          <span className="hidden text-xs text-ink-400 md:inline">· {included.length} campanhas</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button
            leftIcon={<Rocket className="h-4 w-4" />}
            onClick={onDeploy}
            disabled={errors.length > 0}
            title={errors.length ? 'Corrija os erros de validação antes de implantar' : undefined}
          >
            Implantar campanhas (PAUSADAS)
          </Button>
        </div>
      </div>
    </div>
  )
}

function Chip({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: 'danger' }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs', tone === 'danger' ? 'border-danger-100 bg-danger-50 text-danger-700' : 'border-line bg-ink-50 text-ink-700')}>
      <span className="text-ink-400">{icon}</span>
      <span className="text-ink-500">{label}:</span>
      <span className="truncate font-semibold num">{value}</span>
    </span>
  )
}

function ValidationPanel({ issues, onJump }: { issues: ValidationIssue[]; onJump: (cid?: string) => void }) {
  const [showInfo, setShowInfo] = useState(false)
  const main = issues.filter((i) => i.level !== 'info')
  const info = issues.filter((i) => i.level === 'info')
  const fixable = issues.filter((i) => i.fix)
  if (!main.length && !info.length) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-700 animate-fade-in" role="status">
        <Badge tone="success" solid size="sm">✓</Badge> Blueprint válido: schema Zod, limites de caracteres e orçamento OK.
      </div>
    )
  }
  return (
    <div className={cn('mb-4 rounded-xl border px-4 py-3 animate-fade-in', main.some((i) => i.level === 'error') ? 'border-danger-100 bg-danger-50/60' : main.length ? 'border-warning-100 bg-warning-50/60' : 'border-info-100 bg-info-50/60')} role="region" aria-label="Avisos de validação">
      <div className="flex flex-wrap items-center gap-2">
        <TriangleExclamationPoint className={cn('h-4 w-4', main.some((i) => i.level === 'error') ? 'text-danger-600' : 'text-warning-600')} />
        <h3 className="text-sm font-semibold text-ink-900">Validação do blueprint</h3>
        <span className="text-xs text-ink-500">{issues.filter((i) => i.level === 'error').length} erros · {issues.filter((i) => i.level === 'warning').length} avisos · {info.length} sugestões</span>
        {fixable.length > 0 && (
          <Button size="xs" variant="outline" className="ml-auto" leftIcon={<WandSparkles className="h-3.5 w-3.5" />} onClick={() => fixable.forEach((i) => i.fix?.())}>
            Corrigir automaticamente ({fixable.length})
          </Button>
        )}
      </div>
      <ul className="mt-2 space-y-1">
        {main.map((i) => (
          <li key={i.id} className="flex items-start gap-2 text-sm">
            {i.level === 'error' ? <CircleExclamationPoint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-600" /> : <TriangleExclamationPoint className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-600" />}
            <span className="min-w-0 flex-1 text-ink-700">{i.message}</span>
            {i.campaignId && <button type="button" onClick={() => onJump(i.campaignId)} className="shrink-0 text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded">Ver</button>}
            {i.fix && <button type="button" onClick={i.fix} className="shrink-0 text-xs font-medium text-violet-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 rounded">Corrigir</button>}
          </li>
        ))}
      </ul>
      {info.length > 0 && (
        <>
          <button type="button" onClick={() => setShowInfo((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-800" aria-expanded={showInfo}>
            <Info className="h-3.5 w-3.5" /> {showInfo ? 'Ocultar' : 'Mostrar'} {info.length} sugestões
          </button>
          {showInfo && (
            <ul className="mt-1 space-y-0.5 text-xs text-ink-500 animate-fade-in">
              {info.map((i) => <li key={i.id}>• {i.message}</li>)}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
