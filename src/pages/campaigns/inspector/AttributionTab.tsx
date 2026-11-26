import { useMemo, useState } from 'react'
import { Check, Copy, Link2, Radio } from 'lucide-react'
import type { AdCampaign } from '@/types/domain'
import { Badge, Button, Card, EmptyState, ProgressBar, StatusPill, Table, toast } from '@/components/ui'
import { useAutomationStore, useLeadStore } from '@/store'
import { formatBRL, formatDateTime, formatPercent } from '@/lib/format'

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success('Copiado para a área de transferência')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Não foi possível copiar', 'Selecione o texto manualmente.')
    }
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-700">{label}</span>
        <Button size="xs" variant="ghost" leftIcon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <code className="scrollbar-thin block overflow-x-auto rounded-lg bg-ink-900 px-3 py-2.5 font-mono text-xs whitespace-pre text-ink-100">{value}</code>
    </div>
  )
}

export function TrackingTab({ c }: { c: AdCampaign }) {
  const leads = useLeadStore((s) => s.leads)
  const attributions = useLeadStore((s) => s.attributions)
  const events = useAutomationStore((s) => s.conversionEvents)
  const isGoogle = c.platform === 'GOOGLE'
  const clickKey = isGoogle ? 'gclid' : 'fbclid'

  const { campaignLeads, withClick, withUtm, myEvents } = useMemo(() => {
    const cl = leads.filter((l) => l.campaignId === c.id)
    const ids = new Set(cl.map((l) => l.id))
    const attrs = attributions.filter((a) => ids.has(a.leadId))
    return {
      campaignLeads: cl,
      withClick: attrs.filter((a) => (isGoogle ? a.gclid : a.fbclid)).length,
      withUtm: attrs.filter((a) => a.utmSource && a.utmCampaign).length,
      myEvents: events.filter((e) => ids.has(e.leadId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }
  }, [leads, attributions, events, c.id, isGoogle])

  const n = campaignLeads.length
  const example = isGoogle
    ? `${c.finalUrl}?utm_source=google&utm_medium=cpc&utm_campaign=${c.externalId}&utm_term=aluguel+lavadora+de+piso&gclid=Cj0KCQiA…`
    : `${c.finalUrl}?utm_source=ig&utm_medium=paid_social&utm_campaign=${encodeURIComponent(c.name)}&fbclid=IwAR2…`

  return (
    <div className="space-y-5">
      <Card padding="md" className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Link2 className="size-4 text-primary-600" /> {isGoogle ? 'Modelo de rastreamento (tracking_url_template)' : 'Parâmetros de URL (url_tags)'}
        </div>
        <CopyBlock label={isGoogle ? 'tracking_url_template' : 'url_tags'} value={c.trackingTemplate} />
        <CopyBlock label="Exemplo de URL final resolvida" value={example} />
        <p className="text-xs text-ink-500">
          Injetado automaticamente na criação da campanha. O widget do site e o link de WhatsApp persistem {clickKey} + UTMs no lead (código de sessão MQ-XXXX).
        </p>
      </Card>

      <Card padding="md" className="space-y-3">
        <h3 className="text-sm font-semibold text-ink-900">Cobertura de captura</h3>
        {n ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ProgressBar
              value={withClick}
              max={n}
              tone={withClick / n >= 0.95 ? 'success' : 'warning'}
              label={`Leads com ${clickKey}`}
              valueLabel={`${withClick}/${n} · ${formatPercent(withClick / n, 0)}`}
            />
            <ProgressBar
              value={withUtm}
              max={n}
              tone={withUtm / n >= 0.95 ? 'success' : 'warning'}
              label="Leads com UTMs completos"
              valueLabel={`${withUtm}/${n} · ${formatPercent(withUtm / n, 0)}`}
            />
          </div>
        ) : (
          <p className="text-sm text-ink-500">Nenhum lead atribuído a esta campanha ainda.</p>
        )}
      </Card>

      <Card padding="none">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Radio className="size-4 text-primary-600" /> Conversões offline enviadas
          </div>
          <Badge tone="info">{isGoogle ? 'Google Ads API v26' : 'Meta CAPI v26.0'}</Badge>
        </div>
        {myEvents.length ? (
          <Table compact>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Evento</th>
                <th>Destino</th>
                <th className="text-right!">Valor</th>
                <th>Status</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {myEvents.map((e) => (
                <tr key={e.id}>
                  <td className="font-medium text-ink-900">{e.leadName}</td>
                  <td>
                    <Badge tone={e.event === 'WON' ? 'success' : 'violet'}>{e.event === 'WON' ? 'Venda ganha' : 'SQL'}</Badge>
                  </td>
                  <td className="text-xs whitespace-nowrap">{e.platform === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta CAPI'}</td>
                  <td className="num text-right">{e.valueBRL ? formatBRL(e.valueBRL, { decimals: 0 }) : '—'}</td>
                  <td>
                    <StatusPill kind="conversion" value={e.status} />
                  </td>
                  <td className="text-xs whitespace-nowrap text-ink-500">{formatDateTime(e.sentAt ?? e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState compact icon={<Radio />} title="Sem conversões offline" description="Eventos SQL e venda ganha aparecerão aqui quando leads desta campanha avançarem no funil." />
        )}
      </Card>
    </div>
  )
}
