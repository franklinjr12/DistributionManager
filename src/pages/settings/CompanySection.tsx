import { Building, Layers } from 'lucide-react'
import { Badge, Input, Select } from '@/components/ui'
import { useTenantStore } from '@/store'
import * as api from '@/mock/api'
import { formatDate } from '@/lib/format'
import { initials } from '@/lib/utils'
import { useLocalSettings } from './localStore'
import { Note, Row, SaveBar, Section, useDraft, useSaver } from './shared'

const LOGO_COLORS = ['#1d4ed8', '#0f766e', '#7c3aed', '#c2410c', '#0f172a']
const TIMEZONES = ['America/Belem', 'America/Fortaleza', 'America/Sao_Paulo', 'America/Manaus']

export function CompanySection() {
  const tenant = useTenantStore((s) => s.tenant)
  const others = useTenantStore((s) => s.otherTenants)
  const local = useLocalSettings()
  const matriz = tenant.addresses.find((a) => a.label === 'Matriz')?.address ?? ''
  const filial = tenant.addresses.find((a) => a.label === 'Filial')?.address ?? ''
  const { draft, set, dirty, reset } = useDraft({
    name: tenant.name,
    slug: tenant.slug,
    cnpj: local.cnpj,
    email: tenant.commercialEmail,
    timezone: tenant.timezone,
    matriz,
    filial,
    logoColor: local.logoColor,
  })
  const { saving, run } = useSaver()

  const save = () =>
    run(async () => {
      await api.updateTenantSettings({
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        commercialEmail: draft.email.trim(),
        timezone: draft.timezone,
        businessHours: { ...tenant.businessHours, timezone: draft.timezone },
        addresses: [
          { label: 'Matriz', address: draft.matriz.trim() },
          { label: 'Filial', address: draft.filial.trim() },
        ],
      })
      local.patch({ cnpj: draft.cnpj, logoColor: draft.logoColor })
      local.log('Atualizou dados da empresa', 'tenant')
    }, 'Dados da empresa salvos')

  const slugError = /^[a-z0-9-]+$/.test(draft.slug) ? undefined : 'Use apenas letras minúsculas, números e hífen.'

  return (
    <>
      <Section title="Empresa (tenant)" description="Identidade do tenant usada no system prompt, nos templates e no widget." icon={<Building />}>
        <Row label="Logo" hint="Mostrado no painel e no widget do site.">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-card" style={{ background: draft.logoColor }}>
              {initials(draft.name || 'M')}
            </div>
            <div className="flex gap-2">
              {LOGO_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => set('logoColor', c)}
                  className="size-7 rounded-full ring-2 ring-offset-2 transition"
                  style={{ background: c, ['--tw-ring-color' as string]: draft.logoColor === c ? c : 'transparent' }}
                />
              ))}
            </div>
          </div>
        </Row>
        <Row label="Identificação">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nome fantasia" value={draft.name} onChange={(e) => set('name', e.target.value)} />
            <Input label="Slug do tenant" value={draft.slug} error={slugError} onChange={(e) => set('slug', e.target.value)} hint="Usado em /api/v1/widget/session" />
            <Input label="CNPJ" value={draft.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
            <Input label="E-mail comercial" type="email" value={draft.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        </Row>
        <Row label="Endereços" hint="Matriz e filial citadas pela IA quando o lead pergunta onde fica a loja.">
          <div className="space-y-3">
            <Input label="Matriz — Ananindeua-PA" value={draft.matriz} onChange={(e) => set('matriz', e.target.value)} />
            <Input label="Filial — São Luís-MA" value={draft.filial} onChange={(e) => set('filial', e.target.value)} />
          </div>
        </Row>
        <Row label="Fuso horário" hint="Base do horário comercial e dos relatórios.">
          <Select wrapperClassName="max-w-xs" options={TIMEZONES.map((t) => ({ value: t, label: t }))} value={draft.timezone} onChange={(e) => set('timezone', e.target.value)} />
        </Row>
        <Row label="Concessionária">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-700">
            <Badge tone="primary">{tenant.dealerOf}</Badge>
            <span className="text-xs text-ink-500">Tenant criado em {formatDate(tenant.createdAt)} · ID {tenant.id}</span>
          </div>
        </Row>
      </Section>

      <Section title="Multi-tenant" description="Roadmap v2 — SaaS comercial (SPEC §7.3)." icon={<Layers />} className="mt-5">
        <Note tone="violet">
          A v1 roda com o Maquinabel como Client Zero. Todas as tabelas já carregam <code>tenant_id</code> com RLS; na v2 entram onboarding self-service (Meta Embedded
          Signup), KB Manager, roteamento configurável e cobrança recorrente (Stripe/Asaas).
        </Note>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg px-3 py-2.5 ring-2 ring-primary-200">
            <div className="text-sm font-semibold text-ink-900">{tenant.name}</div>
            <div className="text-xs text-ink-500">{tenant.dealerOf} · ativo</div>
          </div>
          {others.map((t) => (
            <div key={t.id} className="rounded-lg bg-ink-50 px-3 py-2.5 opacity-70 ring-1 ring-line">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                {t.name} <Badge tone="neutral">em breve</Badge>
              </div>
              <div className="text-xs text-ink-500">{t.dealerOf}</div>
            </div>
          ))}
        </div>
      </Section>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={reset} />
    </>
  )
}
