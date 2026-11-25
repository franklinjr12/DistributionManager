import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import { Bot, Cpu, Rocket, ShieldCheck, Sparkles, TriangleExclamationPoint } from 'lucide-react'
import type { AdCampaign, BlueprintCampaign, BlueprintConfig, CampaignBlueprint } from '@/types/domain'
import { Badge, Button, Card, CardHeader, ChannelIcon, Modal, PageHeader, toast } from '@/components/ui'
import { useCampaignStore, useCatalogStore, useTenantStore } from '@/store'
import * as api from '@/mock/api'
import { formatBRL, formatNumber } from '@/lib/format'
import {
  buildDeployLines,
  countAssets,
  enrichBlueprint,
  generationSteps,
  regenerateCampaign,
  validate,
  WORKDAYS_PER_MONTH,
  type DeployLine,
  type WizardConfig,
} from './mockGenerator'
import { Stepper } from './Stepper'
import { ConfigStep } from './ConfigStep'
import { GeneratingPanel } from './GeneratingPanel'
import { ReviewStep } from './ReviewStep'
import { DeployStep } from './DeployStep'
import { BlueprintHistory } from './BlueprintHistory'

type Phase = 'config' | 'generating' | 'review' | 'deploying' | 'done'

function initialConfig(): WizardConfig {
  const d = api.defaultBlueprintConfig()
  return {
    allowedStates: d.allowedStates,
    days: d.businessHours.days,
    start: d.businessHours.start,
    end: d.businessHours.end,
    monthlyBudgetBRL: d.monthlyBudgetBRL,
    googleShare: 0.65,
    themes: d.themes,
    machineIds: useCatalogStore.getState().machines.map((m) => m.id),
    google: d.platforms.includes('GOOGLE'),
    meta: d.platforms.includes('META'),
    notes: 'Tom consultivo B2B, sem preços. Destacar assistência técnica própria, locação flexível e atendimento em PA/MA/AP.',
  }
}

function toBlueprintConfig(cfg: WizardConfig): BlueprintConfig {
  return {
    platforms: [...(cfg.google ? (['GOOGLE'] as const) : []), ...(cfg.meta ? (['META'] as const) : [])],
    themes: cfg.themes,
    monthlyBudgetBRL: cfg.monthlyBudgetBRL,
    allowedStates: cfg.allowedStates,
    businessHours: { days: [...cfg.days].sort(), start: cfg.start, end: cfg.end, timezone: 'America/Belem' },
    machineIds: cfg.machineIds,
  }
}

export default function BlueprintPage() {
  const machines = useCatalogStore((s) => s.machines)
  const blueprints = useCampaignStore((s) => s.blueprints)
  const tenant = useTenantStore((s) => s.tenant)

  const [cfg, setCfgState] = useState<WizardConfig>(initialConfig)
  const setCfg = useCallback((patch: Partial<WizardConfig>) => setCfgState((c) => ({ ...c, ...patch })), [])
  const [phase, setPhase] = useState<Phase>('config')
  const [bp, setBp] = useState<CampaignBlueprint | null>(null)
  const [edited, setEdited] = useState(false)
  const [regenerating, setRegenerating] = useState<Set<string>>(new Set())
  const [gen, setGen] = useState({ step: 0, pct: 0, elapsed: 0, target: 0 })
  const [confirmDeploy, setConfirmDeploy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [deploy, setDeploy] = useState<{ lines: DeployLine[]; externalIds: Record<string, string> } | null>(null)
  const [created, setCreated] = useState<AdCampaign[] | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => void (mounted.current = false)
  }, [])

  const seedMachines = useMemo(() => machines.filter((m) => cfg.machineIds.includes(m.id)), [machines, cfg.machineIds])
  const steps = useMemo(() => generationSteps(cfg, cfg.machineIds.length), [cfg])

  // Keep the stored draft in sync with local edits
  useEffect(() => {
    if (bp && phase === 'review') useCampaignStore.getState().updateBlueprint(bp.id, { campaigns: bp.campaigns })
  }, [bp, phase])

  // ───── Guard leaving with unsaved review
  const guard = phase === 'review' || phase === 'deploying'
  const blocker = useBlocker(({ currentLocation, nextLocation }) => guard && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!guard) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [guard])

  // ───── Step 1 → generate
  const generate = async () => {
    const draft = enrichBlueprint(api.buildBlueprint(toBlueprintConfig(cfg)), cfg, seedMachines)
    setPhase('generating')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const t0 = performance.now()
    setGen({ step: 0, pct: 0, elapsed: 0, target: draft.tokensIn + draft.tokensOut })
    const timer = setInterval(() => mounted.current && setGen((g) => ({ ...g, elapsed: performance.now() - t0 })), 100)
    try {
      await api.withProgress(steps, (i, _s, pct) => mounted.current && setGen((g) => ({ ...g, step: i, pct })))
      api.maybeFail('generate-blueprint')
      const final: CampaignBlueprint = { ...draft, generationMs: Math.round(performance.now() - t0) }
      useCampaignStore.getState().addBlueprint(final)
      if (!mounted.current) return
      setBp(final)
      setEdited(false)
      setPhase('review')
      toast.success(
        'Blueprint gerado com IA',
        `${final.campaigns.length} campanhas · ${countAssets(final.campaigns)} assets · ${formatNumber(final.tokensIn + final.tokensOut)} tokens · US$ ${final.costUsd.toFixed(4).replace('.', ',')}`,
      )
    } catch (e) {
      if (!mounted.current) return
      setPhase('config')
      toast.error('Falha ao gerar blueprint', e instanceof Error ? e.message : undefined)
    } finally {
      clearInterval(timer)
    }
  }

  // ───── Step 2 editing
  const changeCampaign = useCallback((tempId: string, patch: Partial<BlueprintCampaign>) => {
    setBp((b) => (b ? { ...b, campaigns: b.campaigns.map((c) => (c.tempId === tempId ? { ...c, ...patch } : c)) } : b))
    setEdited(true)
  }, [])

  const fixHeadline = useCallback((cid: string, gid: string, idx: number, value: string) => {
    setBp((b) =>
      b
        ? {
            ...b,
            campaigns: b.campaigns.map((c) =>
              c.tempId !== cid ? c : { ...c, adGroups: c.adGroups.map((g) => (g.id !== gid ? g : { ...g, headlines: g.headlines.map((h, i) => (i === idx ? value : h)) })) },
            ),
          }
        : b,
    )
    setEdited(true)
  }, [])

  const regenerate = async (ids: string[]) => {
    if (!ids.length) return
    setRegenerating((s) => new Set([...s, ...ids]))
    await api.delay(900, 1600)
    if (!mounted.current) return
    setBp((b) => (b ? { ...b, campaigns: b.campaigns.map((c) => (ids.includes(c.tempId) ? regenerateCampaign(c, seedMachines) : c)) } : b))
    setRegenerating((s) => {
      const n = new Set(s)
      ids.forEach((id) => n.delete(id))
      return n
    })
    setEdited(true)
    toast.info('Novas variações geradas', `${ids.length} ${ids.length === 1 ? 'campanha atualizada' : 'campanhas atualizadas'} · gpt-4o-mini`)
  }

  const issues = useMemo(() => (bp ? validate(bp, cfg.monthlyBudgetBRL, { fixHeadline }) : []), [bp, cfg.monthlyBudgetBRL, fixHeadline])

  const openDraft = (draft: CampaignBlueprint) => {
    const c = draft.config
    const g = draft.campaigns.filter((x) => x.platform === 'GOOGLE').reduce((a, x) => a + x.dailyBudgetBRL, 0)
    const all = draft.campaigns.reduce((a, x) => a + x.dailyBudgetBRL, 0) || 1
    setCfgState((prev) => ({
      ...prev,
      allowedStates: c.allowedStates,
      days: c.businessHours.days,
      start: c.businessHours.start,
      end: c.businessHours.end,
      monthlyBudgetBRL: c.monthlyBudgetBRL,
      googleShare: Math.round((g / all) * 20) / 20,
      themes: c.themes,
      machineIds: c.machineIds,
      google: c.platforms.includes('GOOGLE'),
      meta: c.platforms.includes('META'),
    }))
    setBp(draft)
    setEdited(false)
    setPhase('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ───── Step 3 deploy
  const included = bp?.campaigns.filter((c) => c.included) ?? []
  const startDeploy = () => {
    if (!bp) return
    setConfirmDeploy(false)
    setDeploy(buildDeployLines(bp.campaigns, tenant.googleAdsCustomerId, tenant.metaAdAccountId))
    setCreated(null)
    setPhase('deploying')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const runDeploy = useCallback(async () => {
    if (!bp || !deploy) return []
    const store = useCampaignStore.getState()
    store.updateBlueprint(bp.id, { campaigns: bp.campaigns })
    const res = await api.deployCampaigns(bp)
    const inc = bp.campaigns.filter((c) => c.included)
    // Align external IDs with the streamed mutation log
    return res.map((c, i) => {
      const ext = deploy.externalIds[inc[i]?.tempId]
      if (ext) store.updateCampaign(c.id, { externalId: ext })
      return ext ? { ...c, externalId: ext } : c
    })
  }, [bp, deploy])

  const onDeployed = (list: AdCampaign[]) => {
    setCreated(list)
    setPhase('done')
    toast.success(`${list.length} campanhas criadas em PAUSADO`, 'Revise e ative com 1 clique no Ads Manager.')
  }

  const restart = () => {
    setBp(null)
    setDeploy(null)
    setCreated(null)
    setEdited(false)
    setPhase('config')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stepNum: 1 | 2 | 3 = phase === 'config' || phase === 'generating' ? 1 : phase === 'review' ? 2 : 3

  return (
    <>
      <PageHeader
        eyebrow="Módulo 1A · Ads autônomos"
        title="Gerador de Campanhas com IA"
        description="Blueprint de Google Search + Meta gerado pelo gpt-4o-mini a partir do tenant e do catálogo Alfa Tennant. Tudo é criado PAUSADO para revisão."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="violet" icon={<Bot className="h-3 w-3" />}>gpt-4o-mini</Badge>
            <Badge tone="success" icon={<ShieldCheck className="h-3 w-3" />}>Schema Zod</Badge>
          </div>
        }
      />
      <Stepper current={stepNum} done={phase === 'done'} />

      {(phase === 'config' || phase === 'generating') && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {phase === 'config' ? (
              <ConfigStep cfg={cfg} setCfg={setCfg} machines={machines} onGenerate={generate} />
            ) : (
              <GeneratingPanel steps={steps} current={gen.step} pct={gen.pct} targetTokens={gen.target} elapsedMs={gen.elapsed} />
            )}
          </div>
          <aside className="space-y-4">
            <EstimateCard cfg={cfg} />
            <BlueprintHistory blueprints={blueprints} onOpen={openDraft} />
          </aside>
        </div>
      )}

      {phase === 'review' && bp && (
        <ReviewStep
          blueprint={bp}
          cfg={cfg}
          machines={machines}
          issues={issues}
          regenerating={regenerating}
          edited={edited}
          onChangeCampaign={changeCampaign}
          onRegenerate={regenerate}
          onCancel={() => setConfirmCancel(true)}
          onDeploy={() => setConfirmDeploy(true)}
        />
      )}

      {(phase === 'deploying' || phase === 'done') && deploy && (
        <div className="mx-auto max-w-4xl">
          <DeployStep
            lines={deploy.lines}
            run={runDeploy}
            onFinished={onDeployed}
            onRestart={restart}
            onBackToReview={() => setPhase('review')}
            created={created}
          />
        </div>
      )}

      {/* Confirm deploy */}
      <Modal
        open={confirmDeploy}
        onClose={() => setConfirmDeploy(false)}
        size="lg"
        icon={<Rocket className="h-5 w-5" />}
        title="Implantar campanhas em status PAUSADO?"
        description="As entidades abaixo serão criadas via API. Nada será veiculado até você ativar no Ads Manager."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeploy(false)}>Voltar</Button>
            <Button leftIcon={<Rocket className="h-4 w-4" />} onClick={startDeploy} autoFocus>
              Confirmar implantação
            </Button>
          </>
        }
      >
        <EntitiesList campaigns={included} />
      </Modal>

      {/* Cancel review */}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        size="sm"
        icon={<TriangleExclamationPoint className="h-5 w-5" />}
        iconTone="warning"
        title="Sair da revisão?"
        description={`Este blueprint ${edited ? 'tem edições e ' : ''}ainda não foi implantado. Ele ficará salvo como rascunho no histórico.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)} autoFocus>Continuar revisando</Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmCancel(false)
                restart()
                toast.info('Blueprint salvo como rascunho')
              }}
            >
              Sair e salvar rascunho
            </Button>
          </>
        }
      />

      {/* Route blocker */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        size="sm"
        icon={<TriangleExclamationPoint className="h-5 w-5" />}
        iconTone="warning"
        title={phase === 'deploying' ? 'Implantação em andamento' : 'Alterações não publicadas'}
        description={
          phase === 'deploying'
            ? 'A implantação continua em segundo plano, mas você perderá o acompanhamento ao vivo.'
            : 'O blueprint ainda não foi implantado. Ele ficará como rascunho no histórico.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => blocker.reset?.()} autoFocus>Ficar na página</Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>Sair mesmo assim</Button>
          </>
        }
      />
    </>
  )
}

function EstimateCard({ cfg }: { cfg: WizardConfig }) {
  const daily = cfg.monthlyBudgetBRL / WORKDAYS_PER_MONTH
  const nGoogle = cfg.google ? cfg.themes.filter((t) => !t.startsWith('META')).length : 0
  const nMeta = cfg.meta ? cfg.themes.filter((t) => t.startsWith('META')).length : 0
  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4" title="O que a IA vai gerar" icon={<Sparkles className="h-4 w-4" />} />
      <div className="space-y-2.5 px-4 pb-4 pt-3 text-sm">
        <Row icon={<ChannelIcon channel="google" size="xs" />} label="Campanhas Google Search" value={String(nGoogle)} />
        <Row icon={<ChannelIcon channel="meta" size="xs" />} label="Campanhas Meta" value={String(nMeta)} />
        <Row label="Orçamento diário médio" value={formatBRL(daily, { decimals: 2 })} />
        <Row label="RSA por grupo" value="15 títulos · 4 desc." />
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">
          <Cpu className="h-3.5 w-3.5 shrink-0" />
          <span>Estimativa: ~{formatNumber(3200 + (nGoogle + nMeta) * 110)} tokens · US$ 0,002 · &lt; 10 s</span>
        </div>
      </div>
    </Card>
  )
}

function Row({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="flex-1 text-ink-500">{label}</span>
      <span className="font-semibold text-ink-800 num">{value}</span>
    </div>
  )
}

function EntitiesList({ campaigns }: { campaigns: BlueprintCampaign[] }) {
  const totals = { budgets: 0, campaigns: 0, criteria: 0, adGroups: 0, keywords: 0, ads: 0, adsets: 0, creatives: 0 }
  campaigns.forEach((c) => {
    totals.campaigns++
    if (c.platform === 'GOOGLE') {
      totals.budgets++
      totals.criteria += c.targetStates.length + c.schedule.days.length + c.negatives.length
      totals.adGroups += c.adGroups.length
      totals.keywords += c.adGroups.reduce((a, g) => a + g.keywords.length, 0)
      totals.ads += c.adGroups.length
    } else {
      totals.adsets++
      totals.creatives += c.meta?.creatives.length ?? 0
      totals.ads += c.meta?.creatives.length ?? 0
    }
  })
  const daily = campaigns.reduce((a, c) => a + c.dailyBudgetBRL, 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Campanhas', totals.campaigns],
          ['Grupos / conjuntos', totals.adGroups + totals.adsets],
          ['Palavras-chave', totals.keywords],
          ['Anúncios', totals.ads],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-line bg-ink-50 px-3 py-2">
            <p className="text-lg font-semibold text-ink-900 num">{v}</p>
            <p className="text-xs text-ink-500">{l}</p>
          </div>
        ))}
      </div>
      <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-lg border border-line scrollbar-thin">
        {campaigns.map((c) => (
          <li key={c.tempId} className="flex items-center gap-3 px-3 py-2">
            <ChannelIcon channel={c.platform === 'GOOGLE' ? 'google' : c.type === 'CLICK_TO_WHATSAPP' ? 'whatsapp' : 'instagram'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-800">{c.name}</p>
              <p className="text-xs text-ink-500 num">
                {c.platform === 'GOOGLE'
                  ? `1 orçamento · ${c.targetStates.length} geo + ${c.schedule.days.length} agenda · ${c.adGroups.length} grupos · ${c.adGroups.reduce((a, g) => a + g.keywords.length, 0)} keywords · ${c.negatives.length} negativas · ${c.adGroups.length} RSA`
                  : `1 campanha · 1 conjunto · ${c.meta?.creatives.length ?? 0} criativos · ${c.meta?.creatives.length ?? 0} anúncios`}
              </p>
            </div>
            <span className="text-xs font-medium text-ink-700 num">{formatBRL(c.dailyBudgetBRL, { decimals: 2 })}/dia</span>
          </li>
        ))}
      </ul>
      <p className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700">
        <span>Total diário · {formatBRL(daily * WORKDAYS_PER_MONTH)}/mês</span>
        <strong className="num">{formatBRL(daily, { decimals: 2 })}/dia</strong>
      </p>
    </div>
  )
}
