import { Route, Timer } from 'lucide-react'
import { Avatar, Badge, Input, Switch } from '@/components/ui'
import { useTenantStore } from '@/store'
import * as api from '@/mock/api'
import { formatPhone } from '@/lib/format'
import { useLocalSettings } from './localStore'
import { Note, Row, SaveBar, Section, useDraft, useSaver } from './shared'

function toE164(input: string) {
  const d = input.replace(/\D/g, '')
  if (!d) return ''
  return `+${d.startsWith('55') ? d : `55${d}`}`
}

export function RoutingSection() {
  const tenant = useTenantStore((s) => s.tenant)
  const users = useTenantStore((s) => s.users)
  const local = useLocalSettings()
  const { draft, set, dirty, reset } = useDraft({
    phone: formatPhone(tenant.handoffWhatsappPhone),
    sla: local.slaMinutes,
    fields: local.triggerFieldsComplete,
    human: local.triggerHumanRequest,
    emailCopy: local.notifyEmailCopy,
  })
  const { saving, run } = useSaver()
  const vinicius = users.find((u) => u.id === 'usr_vinicius')
  const e164 = toE164(draft.phone)
  const phoneError = /^\+55\d{10,11}$/.test(e164) ? undefined : 'Informe DDD + número (ex.: (91) 99380-1020).'

  const save = () => {
    if (phoneError) return
    return run(async () => {
      await api.updateTenantSettings({ handoffWhatsappPhone: e164 })
      local.patch({ slaMinutes: draft.sla, triggerFieldsComplete: draft.fields, triggerHumanRequest: draft.human, notifyEmailCopy: draft.emailCopy })
      local.log('Atualizou roteamento de handoff', formatPhone(e164))
    }, 'Roteamento salvo')
  }

  return (
    <>
      <Section title="Roteamento & handoff" description="v1: 100% dos leads qualificados vão direto para o WhatsApp do Vinicius." icon={<Route />}>
        <Row label="Destinatário" hint="Recebe o template com o resumo de 4 linhas.">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={vinicius?.fullName ?? 'Vinicius Goés'} size="md" status="online" />
              <div>
                <div className="text-sm font-semibold text-ink-900">{vinicius?.fullName ?? 'Vinicius Goés'}</div>
                <div className="text-xs text-ink-500">{vinicius?.title}</div>
              </div>
            </div>
            <Input wrapperClassName="w-56" label="WhatsApp" value={draft.phone} error={phoneError} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </Row>
        <Row label="Template Meta" hint="Utility template aprovado — funciona fora da janela de 24h.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-[#efeae2] p-3">
              <div className="w-fit max-w-full rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm text-ink-800 shadow-sm">
                <div className="mb-1 font-semibold">🔔 Novo lead qualificado</div>
                <div className="space-y-0.5 text-[13px]">
                  <div>1️⃣ <b>{'{{1}}'}</b> — Ricardo Lima · CD Logístico Belém (PA)</div>
                  <div>2️⃣ <b>{'{{2}}'}</b> — Locação · 8.000 m² · cimento queimado · poeira</div>
                  <div>3️⃣ <b>{'{{3}}'}</b> — Indicação: T16AMR + Brava (alternativa)</div>
                  <div>4️⃣ <b>{'{{4}}'}</b> — Origem Google Ads Locação · #MQ-4821</div>
                </div>
                <div className="mt-2 border-t border-line pt-1.5 text-center text-xs font-medium text-whatsapp-dark">Abrir conversa no painel</div>
              </div>
            </div>
            <div className="space-y-2 text-xs text-ink-600">
              <div className="flex items-center gap-2">
                <code className="rounded bg-ink-100 px-1.5 py-0.5 text-ink-800">novo_lead_qualificado</code>
                <Badge tone="success">Aprovado</Badge>
                <Badge tone="neutral">pt_BR · UTILITY</Badge>
              </div>
              <p>Variáveis preenchidas pelo campo <code>handoff_summary_4_lines</code> do JSON estruturado do LLM.</p>
              <Switch size="sm" checked={draft.emailCopy} onChange={(v) => set('emailCopy', v)} label="Enviar cópia por e-mail" description={tenant.commercialEmail} />
            </div>
          </div>
        </Row>
        <Row label="SLA de primeira resposta humana" hint="Meta medida no painel ROI a partir do handoff.">
          <div className="flex items-center gap-3">
            <Input wrapperClassName="w-32" type="number" min={1} max={240} suffix="min" value={draft.sla} onChange={(e) => set('sla', Math.max(1, Number(e.target.value) || 1))} />
            <span className="flex items-center gap-1 text-xs text-ink-500">
              <Timer className="size-3.5" /> Alerta no painel e notificação quando estourar.
            </span>
          </div>
        </Row>
        <Row label="Gatilhos de handoff" hint="Quando a IA pausa e passa o lead ao humano.">
          <div className="space-y-3">
            <Switch
              checked={draft.fields}
              onChange={(v) => set('fields', v)}
              label="4 campos obrigatórios completos"
              description="Modalidade, segmento, metragem/piso/sujeira e localização → QUALIFIED_HANDOFF (conta como SQL)."
            />
            <Switch
              checked={draft.human}
              onChange={(v) => set('human', v)}
              label="Pedido explícito por humano"
              description='"Quero falar com o Vinicius" → HUMAN_REQUESTED (não conta como SQL até proposta).'
            />
          </div>
          {!draft.fields && !draft.human && <Note tone="warning">Sem gatilhos ativos nenhum lead será transferido ao Vinicius.</Note>}
        </Row>
        <Note tone="violet">v2: motor de roteamento configurável (regional Belém × São Luís, linha de produto, ticket, round-robin).</Note>
      </Section>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={reset} />
    </>
  )
}
