import { Clock, MapPin } from 'lucide-react'
import type { AllowedState } from '@/types/domain'
import { Badge, Switch, Textarea } from '@/components/ui'
import { useTenantStore } from '@/store'
import * as api from '@/mock/api'
import { cn, isBusinessHours } from '@/lib/utils'
import { useLocalSettings, type DayHours } from './localStore'
import { Note, Row, SaveBar, Section, useDraft, useSaver, WEEKDAYS } from './shared'

const UFS: [string, string][] = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'], ['CE', 'Ceará'], ['DF', 'Distrito Federal'],
  ['ES', 'Espírito Santo'], ['GO', 'Goiás'], ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'], ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'], ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'], ['SE', 'Sergipe'], ['TO', 'Tocantins'],
]
const CORE = ['PA', 'MA', 'AP']
const ORDER = [1, 2, 3, 4, 5, 6, 0]

export function CoverageSection() {
  const tenant = useTenantStore((s) => s.tenant)
  const local = useLocalSettings()
  const { draft, set, dirty, reset } = useDraft({
    states: tenant.allowedStates as string[],
    week: local.weekHours,
    afterHours: tenant.aiSettings.afterHoursMessage,
  })
  const { saving, run } = useSaver()

  const toggleState = (uf: string) => set('states', draft.states.includes(uf) ? draft.states.filter((s) => s !== uf) : [...draft.states, uf])
  const setDay = (d: number, patch: Partial<DayHours>) => set('week', { ...draft.week, [d]: { ...draft.week[d], ...patch } })

  const save = () =>
    run(async () => {
      const days = ORDER.filter((d) => draft.week[d].on)
      const first = draft.week[days[0] ?? 1]
      await api.updateTenantSettings({
        allowedStates: draft.states as AllowedState[],
        businessHours: { ...tenant.businessHours, days: days.sort(), start: first.start, end: first.end },
        aiSettings: { ...tenant.aiSettings, afterHoursMessage: draft.afterHours },
      })
      local.patch({ weekHours: draft.week })
      local.log('Atualizou cobertura e horário', draft.states.join(', '))
    }, 'Cobertura e horário salvos', 'O system prompt foi atualizado com a nova área de atuação.')

  const open = isBusinessHours()

  return (
    <>
      <Section
        title="Cobertura regional"
        description="Leads de fora destes estados recebem resposta educada e vão para DISQUALIFIED_OUT_OF_REGION."
        icon={<MapPin />}
        actions={<Badge tone="primary" size="md">{draft.states.length} UF</Badge>}
      >
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-7">
          {UFS.map(([uf, name]) => {
            const on = draft.states.includes(uf)
            const core = CORE.includes(uf)
            return (
              <button
                key={uf}
                type="button"
                title={name}
                onClick={() => toggleState(uf)}
                className={cn(
                  'relative rounded-lg px-2 py-2 text-left ring-1 transition',
                  on ? 'bg-primary-600 text-white ring-primary-600' : 'bg-surface text-ink-600 ring-line hover:bg-ink-50',
                  core && !on && 'ring-2 ring-primary-200',
                )}
              >
                <div className="text-sm font-semibold">{uf}</div>
                <div className={cn('truncate text-[10px]', on ? 'text-white/80' : 'text-ink-400')}>{name}</div>
                {core && <span className={cn('absolute top-1.5 right-1.5 size-1.5 rounded-full', on ? 'bg-white' : 'bg-primary-500')} />}
              </button>
            )
          })}
        </div>
        <Note>
          PA, MA e AP (marcados com ponto) são a área de atendimento da Maquinabel: matriz em Ananindeua-PA e filial em São Luís-MA. Ampliar a cobertura muda o
          guardrail regional do prompt imediatamente.
        </Note>
      </Section>

      <Section
        title="Horário comercial"
        description={`Atendimento humano do Vinicius · ${tenant.timezone}`}
        icon={<Clock />}
        className="mt-5"
        actions={
          <Badge tone={open ? 'success' : 'neutral'} dot size="md">
            {open ? 'Aberto agora' : 'Fechado agora'}
          </Badge>
        }
      >
        <div className="divide-y divide-line rounded-lg ring-1 ring-line">
          {ORDER.map((d) => {
            const h = draft.week[d]
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <Switch size="sm" checked={h.on} onChange={(v) => setDay(d, { on: v })} />
                <span className={cn('w-20 text-sm font-medium', h.on ? 'text-ink-800' : 'text-ink-400')}>{WEEKDAYS[d]}</span>
                {h.on ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input type="time" value={h.start} onChange={(e) => setDay(d, { start: e.target.value })} className="h-8 rounded-md border border-line bg-surface px-2 num focus:border-primary-400 focus:outline-none" />
                    <span className="text-ink-400">até</span>
                    <input type="time" value={h.end} onChange={(e) => setDay(d, { end: e.target.value })} className="h-8 rounded-md border border-line bg-surface px-2 num focus:border-primary-400 focus:outline-none" />
                  </div>
                ) : (
                  <span className="text-xs text-ink-400">Fechado — IA atende e agenda retorno</span>
                )}
              </div>
            )
          })}
        </div>
        <Row label="Mensagem fora do horário" hint="Enviada pela IA quando o lead escreve fora do expediente (ex.: sábado).">
          <div className="grid gap-4 lg:grid-cols-2">
            <Textarea rows={4} value={draft.afterHours} onChange={(e) => set('afterHours', e.target.value)} />
            <div className="rounded-xl bg-[#efeae2] p-3">
              <div className="mb-2 text-center text-[10px] text-ink-500">sábado · 09:14</div>
              <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-tr-none bg-whatsapp-light px-3 py-2 text-sm text-ink-800 shadow-sm">Bom dia, vocês alugam lavadora?</div>
              <div className="mt-2 w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-sm text-ink-800 shadow-sm">
                {draft.afterHours || <span className="text-ink-400">(mensagem vazia)</span>}
                <div className="mt-1 text-right text-[10px] text-ink-400">09:14 · IA</div>
              </div>
            </div>
          </div>
        </Row>
      </Section>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={reset} />
    </>
  )
}
