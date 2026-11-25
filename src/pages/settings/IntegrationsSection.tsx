import { useState, type ReactNode } from 'react'
import { Database, Mail, Plug, RefreshCw, Server, Sparkles, Zap, Bot, MapPin, Globe } from 'lucide-react'
import type { IntegrationStatus } from '@/types/domain'
import { Badge, Button, Card, ChannelIcon, toast } from '@/components/ui'
import { useTenantStore } from '@/store'
import * as api from '@/mock/api'
import { formatRelative, INTEGRATION_STATUS_LABEL, INTEGRATION_STATUS_TONE } from '@/lib/format'
import { nowISO } from '@/lib/utils'
import { useLocalSettings } from './localStore'
import { SecretField, Section } from './shared'

interface Cred {
  label: string
  value: string
  secret?: boolean
}

interface CardModel {
  key: string
  name: string
  description: string
  status: IntegrationStatus
  accountLabel?: string
  detail?: string
  lastSyncAt?: string
  icon: ReactNode
  creds: Cred[]
  local: boolean
}

const tile = (cls: string, node: ReactNode) => <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white [&_svg]:size-5 ${cls}`}>{node}</div>

const META: Record<string, { icon: ReactNode; creds: Cred[] }> = {
  GOOGLE_ADS: {
    icon: <ChannelIcon channel="google" size="lg" />,
    creds: [
      { label: 'Developer Token (Basic Access)', value: 'gAds-DEMO-7Kq2LmX9pR4tV8wZ' },
      { label: 'Customer ID', value: '482-913-7705', secret: false },
      { label: 'OAuth refresh token', value: '1//0demoRefreshTokenAbCdEf123456' },
    ],
  },
  META_ADS: {
    icon: <ChannelIcon channel="meta" size="lg" />,
    creds: [
      { label: 'System User token (ads_management)', value: 'EAAGdemoSystemUserToken9x8y7z6w5v4u' },
      { label: 'Ad Account', value: 'act_9910•••••4471', secret: false },
    ],
  },
  META_CAPI: {
    icon: <ChannelIcon channel="meta" size="lg" />,
    creds: [
      { label: 'Pixel / Dataset ID', value: '7720583361093', secret: false },
      { label: 'Access token CAPI', value: 'EAAGdemoCapiTokenQwErTy112233' },
    ],
  },
  WHATSAPP_CLOUD: {
    icon: <ChannelIcon channel="whatsapp" size="lg" />,
    creds: [
      { label: 'WABA ID', value: '118400000002207', secret: false },
      { label: 'Phone Number ID', value: '532900000008810', secret: false },
      { label: 'App Secret (HMAC)', value: 'demo_app_secret_5f2a9c0e7b3d' },
    ],
  },
  INSTAGRAM_GRAPH: {
    icon: <ChannelIcon channel="instagram" size="lg" />,
    creds: [
      { label: 'IG Business Account', value: '17841000003391 · @maquinabel', secret: false },
      { label: 'Webhook verify token', value: 'mq_ig_verify_demo_8d1e' },
    ],
  },
  OPENAI: { icon: tile('bg-ink-900', <Sparkles />), creds: [{ label: 'API key', value: 'sk-proj-demoKeyNotReal1234567890abcd' }] },
  RESEND: { icon: tile('bg-ink-800', <Mail />), creds: [{ label: 'API key', value: 're_demo_9KmP2xQ7wL4n' }, { label: 'Domínio verificado', value: 'maquinabel.com.br', secret: false }] },
  TYPEBOT: {
    icon: tile('bg-primary-600', <Bot />),
    creds: [
      { label: 'Typebot ID', value: 'maquinabel-sdr-entry', secret: false },
      { label: 'Sites (WPCode)', value: 'maquinabel.com.br, vendas.maquinabel.com.br', secret: false },
    ],
  },
  GOOGLE_PLACES: { icon: tile('bg-google-green', <MapPin />), creds: [{ label: 'API key', value: 'AIzaDemoPlacesKey00000000000' }] },
  SUPABASE: {
    icon: tile('bg-success-600', <Database />),
    creds: [
      { label: 'Project URL', value: 'https://demo-maquinabel.supabase.co', secret: false },
      { label: 'Service role key (apenas backend)', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo' },
    ],
  },
  UPSTASH: {
    icon: tile('bg-danger-600', <Server />),
    creds: [
      { label: 'REST URL', value: 'https://gru1-demo.upstash.io', secret: false },
      { label: 'REST token', value: 'AXdemoUpstashTokenZZ11yy22' },
    ],
  },
}

function IntegrationCard({ m, onUpdate }: { m: CardModel; onUpdate: (patch: { status: IntegrationStatus; lastSyncAt?: string; detail?: string }) => void }) {
  const [busy, setBusy] = useState<'test' | 'reconnect' | null>(null)

  const test = async () => {
    setBusy('test')
    try {
      if (m.local) {
        await api.delay(600, 1400)
        api.maybeFail('integration-test')
        const ms = 80 + Math.round(Math.random() * 200)
        onUpdate({ status: 'CONNECTED', lastSyncAt: nowISO() })
        toast.success(`${m.name}: conexão OK`, `Respondeu em ${ms} ms`)
      } else {
        const r = await api.testIntegration(m.key as Parameters<typeof api.testIntegration>[0])
        toast.success(`${m.name}: conexão OK`, r.message)
      }
    } catch (e) {
      onUpdate({ status: 'ERROR', detail: e instanceof Error ? e.message : 'Falha na conexão' })
      toast.error(`${m.name}: falha no teste`, e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  const reconnect = async () => {
    setBusy('reconnect')
    try {
      await api.delay(900, 1800)
      api.maybeFail('integration-reconnect')
      onUpdate({ status: 'CONNECTED', lastSyncAt: nowISO(), detail: undefined })
      toast.success(`${m.name} reconectado`, 'Credenciais renovadas e webhooks re-inscritos.')
    } catch (e) {
      onUpdate({ status: 'ERROR', detail: e instanceof Error ? e.message : 'Falha' })
      toast.error(`Não foi possível reconectar ${m.name}`, e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex items-start gap-3 p-4">
        {m.icon}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-ink-900">{m.name}</h4>
            <Badge tone={INTEGRATION_STATUS_TONE[m.status]} dot>
              {INTEGRATION_STATUS_LABEL[m.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink-500">{m.description}</p>
        </div>
      </div>
      <div className="flex-1 space-y-2.5 px-4 pb-4">
        {m.creds.map((c) => (
          <SecretField key={c.label} label={c.label} value={c.value} secret={c.secret !== false} />
        ))}
        {m.detail && <p className="rounded-md bg-warning-50 px-2.5 py-1.5 text-xs text-warning-700">{m.detail}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5">
        <span className="text-[11px] text-ink-400">{m.lastSyncAt ? `Sincronizado ${formatRelative(m.lastSyncAt)}` : m.accountLabel}</span>
        <div className="ml-auto flex gap-1.5">
          <Button size="xs" variant="ghost" leftIcon={<RefreshCw />} loading={busy === 'reconnect'} disabled={!!busy} onClick={reconnect}>
            Reconectar
          </Button>
          <Button size="xs" variant="outline" leftIcon={<Zap />} loading={busy === 'test'} disabled={!!busy} onClick={test}>
            Testar conexão
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function IntegrationsSection() {
  const integrations = useTenantStore((s) => s.tenant.integrations)
  const updateIntegration = useTenantStore((s) => s.updateIntegration)
  const extras = useLocalSettings((s) => s.extraIntegrations)

  const cards: CardModel[] = [
    ...integrations.map((i) => ({ ...i, key: i.key as string, icon: META[i.key]?.icon ?? tile('bg-ink-500', <Globe />), creds: META[i.key]?.creds ?? [], local: false })),
    ...extras.map((i) => ({ ...i, key: i.key as string, icon: META[i.key].icon, creds: META[i.key].creds, local: true })),
  ]
  const counts = cards.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {})

  return (
    <Section
      title="Integrações"
      description="Credenciais criptografadas em repouso (AES-256-GCM). Valores exibidos são fictícios de demonstração."
      icon={<Plug />}
      actions={
        <div className="hidden gap-1.5 sm:flex">
          <Badge tone="success">{counts.CONNECTED ?? 0} conectadas</Badge>
          {counts.PENDING ? <Badge tone="warning">{counts.PENDING} pendente</Badge> : null}
          {counts.ERROR ? <Badge tone="danger">{counts.ERROR} com erro</Badge> : null}
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((c) => (
          <IntegrationCard
            key={c.key}
            m={c}
            onUpdate={(p) => {
              if (c.local) useLocalSettings.setState((s) => ({ extraIntegrations: s.extraIntegrations.map((x) => (x.key === c.key ? { ...x, ...p } : x)) }))
              else updateIntegration(c.key as Parameters<typeof updateIntegration>[0], p)
            }}
          />
        ))}
      </div>
    </Section>
  )
}
