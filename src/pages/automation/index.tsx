import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Radar, Send, Sparkles, Webhook } from 'lucide-react'
import { useAutomationStore } from '@/store'
import { Badge, ChannelIcon, PageHeader, Tabs } from '@/components/ui'
import type { TabKey } from './lib'
import { WorkersStrip } from './WorkersStrip'
import { OptimizerTab } from './OptimizerTab'
import { ConversionsTab } from './ConversionsTab'
import { OutboundTab } from './OutboundTab'
import { InstagramTab } from './InstagramTab'
import { WebhooksTab } from './WebhooksTab'

const TAB_KEYS: TabKey[] = ['otimizador', 'capi', 'outbound', 'instagram', 'webhooks']

export default function AutomationPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab') as TabKey | null
  const tab: TabKey = raw && TAB_KEYS.includes(raw) ? raw : 'otimizador'
  const [autoRun, setAutoRun] = useState<TabKey | null>(null)

  const failed = useAutomationStore((s) => s.conversionEvents).filter((e) => e.status === 'FAILED').length
  const replied = useAutomationStore((s) => s.prospects).filter((p) => p.status === 'REPLIED').length
  const igCount = useAutomationStore((s) => s.igEvents).length

  const setTab = useCallback(
    (t: TabKey) => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          n.set('tab', t)
          return n
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const openTab = (t: TabKey, run?: boolean) => {
    setTab(t)
    if (run) setAutoRun(t)
    requestAnimationFrame(() => document.getElementById('automation-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <>
      <PageHeader
        eyebrow="Workers & integrações"
        title="Automação & CAPI"
        description="Otimizador semanal de termos, conversões offline (Google Ads + Meta CAPI), prospecção outbound B2B, Instagram Comentário→DM e filas."
        actions={
          <Badge tone="success" dot size="md">
            6 workers ativos
          </Badge>
        }
      />

      <WorkersStrip onOpen={openTab} />

      <div id="automation-tabs" className="mt-6 scroll-mt-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as TabKey)}
          items={[
            { value: 'otimizador', label: 'Otimizador de termos', icon: <Sparkles /> },
            { value: 'capi', label: 'Conversões offline (CAPI)', icon: <Send />, count: failed || undefined },
            { value: 'outbound', label: 'Prospecção outbound', icon: <Radar />, count: replied || undefined },
            { value: 'instagram', label: 'Instagram Comentário→DM', icon: <ChannelIcon channel="instagram" variant="plain" size="xs" />, count: igCount },
            { value: 'webhooks', label: 'Webhooks & filas', icon: <Webhook /> },
          ]}
        />
        <div className="pt-5" key={tab}>
          {tab === 'otimizador' && <OptimizerTab autoRun={autoRun === 'otimizador'} onAutoRunHandled={() => setAutoRun(null)} />}
          {tab === 'capi' && <ConversionsTab />}
          {tab === 'outbound' && <OutboundTab autoRun={autoRun === 'outbound'} onAutoRunHandled={() => setAutoRun(null)} />}
          {tab === 'instagram' && <InstagramTab />}
          {tab === 'webhooks' && <WebhooksTab />}
        </div>
      </div>
    </>
  )
}
