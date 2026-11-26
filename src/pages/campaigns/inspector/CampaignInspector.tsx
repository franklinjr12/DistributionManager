import { useEffect, useMemo, useState } from 'react'
import { Ban, ChartColumn, CircleExclamationPoint, Megaphone, Radar, TriangleExclamationPoint } from 'lucide-react'
import type { AdCampaign, CampaignStatus } from '@/types/domain'
import * as api from '@/mock/api'
import { useCampaignStore, useLeadStore, useTenantStore } from '@/store'
import { Badge, Button, Drawer, Modal, StatusPill, Switch, Tabs, toast } from '@/components/ui'
import { CAMPAIGN_TYPE_LABEL, formatRelative } from '@/lib/format'
import { PlatformGlyph } from '../CampaignTable'
import { campaignRangeMetrics, mergeDaily, PLATFORM_SHORT } from '../lib'
import { draftFrom, isDirty, toPatch, validate, type Draft, type SetDraft } from './draft'
import { OverviewTab } from './OverviewTab'
import { GoogleAdsTab } from './GoogleChannelTab'
import { MetaAdsTab } from './MetaChannelTab'
import { NegativesTab } from './NegativesTab'
import { TrackingTab } from './AttributionTab'

type TabKey = 'overview' | 'ads' | 'negatives' | 'tracking'

interface Props {
  campaignId: string | null
  onClose: () => void
  window: { from: string; to: string }
  rangeLabel: string
  pending: Record<string, CampaignStatus>
  onToggle: (c: AdCampaign, enable: boolean) => void
}

export function CampaignInspector({ campaignId, onClose, window: w, rangeLabel, pending, onToggle }: Props) {
  const c = useCampaignStore((s) => (campaignId ? s.campaigns.find((x) => x.id === campaignId) : undefined))
  if (!c) return <Drawer open={false} onClose={onClose} />
  return <InspectorBody key={c.id} c={c} onClose={onClose} w={w} rangeLabel={rangeLabel} pending={pending} onToggle={onToggle} />
}

function InspectorBody({
  c,
  onClose,
  w,
  rangeLabel,
  pending,
  onToggle,
}: {
  c: AdCampaign
  onClose: () => void
  w: { from: string; to: string }
  rangeLabel: string
  pending: Record<string, CampaignStatus>
  onToggle: (c: AdCampaign, enable: boolean) => void
}) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [draft, setDraftState] = useState<Draft>(() => draftFrom(c))
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const setDraft: SetDraft = (fn) => setDraftState((d) => fn(d))

  const leads = useLeadStore((s) => s.leads)
  const campaigns = useCampaignStore((s) => s.campaigns)
  const monthlyBudget = useTenantStore((s) => s.tenant.monthlyAdBudgetBRL)
  const m = useMemo(() => campaignRangeMetrics(c, leads, w), [c, leads, w])
  const series = useMemo(() => mergeDaily([c], w), [c, w])
  const otherEnabledDaily = useMemo(
    () => campaigns.filter((x) => x.id !== c.id && x.status === 'ENABLED').reduce((a, x) => a + x.dailyBudgetBRL, 0),
    [campaigns, c.id],
  )

  const dirty = isDirty(draft, c)
  const errors = validate(draft)

  // warn on tab close / reload with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const requestClose = () => (dirty ? setConfirmClose(true) : onClose())

  const save = async () => {
    if (errors.count) {
      setShowErrors(true)
      if (errors.budget || errors.states) setTab('overview')
      else if (errors.ads) setTab('ads')
      toast.error('Corrija os campos destacados', errors.budget ?? errors.states ?? errors.ads ?? undefined)
      return
    }
    setSaving(true)
    try {
      const updated = await api.updateCampaign(c.id, toPatch(draft))
      setDraftState(draftFrom(updated))
      setShowErrors(false)
      toast.success('Alterações salvas', `Sincronizado com ${c.platform === 'GOOGLE' ? 'Google Ads API v26' : 'Meta Marketing API v26.0'}.`)
    } catch (e) {
      toast.error('Falha ao salvar', e instanceof Error ? e.message : 'Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const busy = pending[c.id]
  const enabled = busy ? busy === 'ENABLED' : c.status === 'ENABLED'
  const adsCount = c.platform === 'GOOGLE' ? draft.adGroups.length : (draft.meta?.creatives.length ?? 0)

  return (
    <>
      <Drawer
        open
        width="xl"
        onClose={requestClose}
        title={
          <span className="flex items-center gap-2.5">
            <PlatformGlyph platform={c.platform} className="size-7" />
            <span className="truncate">{c.name}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              Inspetor de campanha · {PLATFORM_SHORT[c.platform]} · {CAMPAIGN_TYPE_LABEL[c.type]}
            </span>
            <span className="text-xs text-ink-400">ID {c.externalId}</span>
          </span>
        }
        headerActions={
          <div className="flex items-center gap-2">
            <StatusPill kind="campaign" value={c.status} />
            <Switch checked={enabled} disabled={!!busy || c.status === 'REMOVED'} tone="success" onChange={(on) => onToggle(c, on)} />
          </div>
        }
        footer={
          <div className="flex w-full flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 text-xs">
              {showErrors && errors.count > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-danger-600">
                  <CircleExclamationPoint className="size-3.5" /> {errors.count} problema{errors.count > 1 ? 's' : ''} para corrigir
                </span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5 text-warning-700">
                  <span className="size-1.5 rounded-full bg-warning-500" /> Alterações não salvas
                </span>
              ) : (
                <span className="text-ink-500">Sincronizado {formatRelative(c.lastSyncedAt)}</span>
              )}
            </div>
            <Button variant="outline" disabled={!dirty || saving} onClick={() => setDraftState(draftFrom(c))}>
              Descartar
            </Button>
            <Button disabled={!dirty} loading={saving} onClick={save}>
              Salvar alterações
            </Button>
          </div>
        }
      >
        <div className="-mt-1 mb-4">
          <Tabs
            value={tab}
            onChange={(v) => setTab(v as TabKey)}
            items={[
              { value: 'overview', label: 'Visão geral', icon: <ChartColumn className="size-4" /> },
              { value: 'ads', label: 'Anúncios', icon: <Megaphone className="size-4" />, count: adsCount },
              { value: 'negatives', label: 'Negativas', icon: <Ban className="size-4" />, count: draft.negatives.length },
              { value: 'tracking', label: 'Rastreamento', icon: <Radar className="size-4" /> },
            ]}
          />
        </div>
        {showErrors && errors.ads && tab === 'ads' && (
          <div className="mb-4 flex gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">
            <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" /> {errors.ads}
          </div>
        )}
        {c.status === 'PAUSED' && tab === 'overview' && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-ink-50 px-3 py-2 text-xs text-ink-600">
            <Badge tone="warning" dot>
              Pausada
            </Badge>
            Esta campanha não está veiculando. Use o interruptor acima para ativá-la em 1 clique.
          </div>
        )}
        {tab === 'overview' && (
          <OverviewTab c={c} m={m} rangeLabel={rangeLabel} series={series} draft={draft} setDraft={setDraft} otherEnabledDaily={otherEnabledDaily} monthlyBudget={monthlyBudget} />
        )}
        {tab === 'ads' && (c.platform === 'GOOGLE' ? <GoogleAdsTab draft={draft} setDraft={setDraft} /> : <MetaAdsTab draft={draft} setDraft={setDraft} />)}
        {tab === 'negatives' && <NegativesTab c={c} draft={draft} setDraft={setDraft} />}
        {tab === 'tracking' && <TrackingTab c={c} />}
      </Drawer>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        size="sm"
        icon={<TriangleExclamationPoint className="size-5" />}
        iconTone="warning"
        title="Descartar alterações?"
        description="Você tem alterações não salvas nesta campanha. Elas serão perdidas."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmClose(false)}>
              Continuar editando
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmClose(false)
                onClose()
              }}
            >
              Descartar e fechar
            </Button>
          </>
        }
      />
    </>
  )
}
