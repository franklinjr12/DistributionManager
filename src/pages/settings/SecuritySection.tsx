import { KeyRound, Lock, ShieldCheck, ScrollText } from 'lucide-react'
import { Badge, Select, Switch, Table, Textarea } from '@/components/ui'
import * as api from '@/mock/api'
import { formatDateTime } from '@/lib/format'
import { useLocalSettings } from './localStore'
import { Note, Row, SaveBar, Section, useDraft, useSaver } from './shared'

export function SecuritySection() {
  const local = useLocalSettings()
  const { draft, set, dirty, reset } = useDraft({
    consent: local.lgpdConsentText,
    retention: local.retentionMonths,
    anonymize: local.anonymizeOnRequest,
    window24h: local.window24hProtection,
  })
  const { saving, run } = useSaver()

  const save = () =>
    run(async () => {
      await api.delay(400, 900)
      api.maybeFail('security-settings')
      local.patch({ lgpdConsentText: draft.consent, retentionMonths: draft.retention, anonymizeOnRequest: draft.anonymize, window24hProtection: draft.window24h })
      local.log('Atualizou políticas LGPD', `retenção ${draft.retention} meses`)
    }, 'Políticas de segurança salvas')

  return (
    <>
      <Section title="LGPD & privacidade" description="Consentimento explícito e ciclo de vida dos dados pessoais dos leads." icon={<ShieldCheck />}>
        <Row label="Texto de consentimento" hint="Exibido no widget; o aceite grava lgpd_consent_at no lead.">
          <Textarea rows={2} value={draft.consent} onChange={(e) => set('consent', e.target.value)} />
          <label className="mt-2 flex items-start gap-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600 ring-1 ring-line">
            <input type="checkbox" checked readOnly className="mt-0.5 accent-primary-600" />
            {draft.consent || '(texto vazio)'}
          </label>
        </Row>
        <Row label="Retenção de dados" hint="Leads perdidos/desqualificados são anonimizados após o prazo.">
          <Select
            wrapperClassName="max-w-xs"
            value={String(draft.retention)}
            onChange={(e) => set('retention', Number(e.target.value))}
            options={[6, 12, 24, 36].map((m) => ({ value: String(m), label: `${m} meses` }))}
          />
        </Row>
        <Row label="Direitos do titular">
          <div className="space-y-3">
            <Switch
              checked={draft.anonymize}
              onChange={(v) => set('anonymize', v)}
              label="Anonimização sob demanda"
              description="DELETE /api/v1/leads/:id/gdpr remove PII mantendo métricas agregadas."
            />
            <Switch
              checked={draft.window24h}
              onChange={(v) => set('window24h', v)}
              label="Proteção da janela de 24h (Meta)"
              description="Após 24h sem mensagem do lead, só templates Utility aprovados."
            />
          </div>
        </Row>
      </Section>

      <Section title="Segurança da plataforma" icon={<Lock />} className="mt-5">
        <Row label="Webhooks Meta" hint="WhatsApp e Instagram.">
          <div className="flex items-start gap-3">
            <Switch checked disabled onChange={() => {}} label="Verificação HMAC-SHA256 (X-Hub-Signature-256)" description="Comparação em tempo constante com META_APP_SECRET antes do parse." />
            <Badge tone="success" icon={<Lock />}>
              Sempre ativo
            </Badge>
          </div>
        </Row>
        <Row label="Criptografia">
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral" icon={<KeyRound />} size="md">
              Tokens AES-256-GCM em repouso
            </Badge>
            <Badge tone="neutral" size="md">
              TLS 1.2+ em trânsito
            </Badge>
            <Badge tone="neutral" size="md">
              Service role só no backend
            </Badge>
          </div>
        </Row>
        <Row label="Isolamento multi-tenant">
          <Note>
            Todas as tabelas têm <code>tenant_id</code> com Row-Level Security no Supabase: <code>USING (tenant_id = auth.jwt() -&gt;&gt; 'tenant_id')</code>. Usuários do
            painel só enxergam o tenant <b>maquinabel</b>.
          </Note>
        </Row>
      </Section>

      <Section title="Log de auditoria" icon={<ScrollText />} className="mt-5" description="Últimas ações sensíveis no tenant.">
        <div className="-mx-5 -my-4">
          <Table compact hover>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ator</th>
                <th>Ação</th>
                <th>Alvo</th>
              </tr>
            </thead>
            <tbody>
              {local.audit.map((a) => (
                <tr key={a.id}>
                  <td className="num text-xs whitespace-nowrap text-ink-500">{formatDateTime(a.at)}</td>
                  <td className="text-sm whitespace-nowrap text-ink-800">{a.actor}</td>
                  <td className="text-sm text-ink-700">{a.action}</td>
                  <td className="text-xs text-ink-500">{a.target}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Section>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={reset} />
    </>
  )
}
