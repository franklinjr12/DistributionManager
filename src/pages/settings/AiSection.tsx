import { useMemo } from 'react'
import { Bot, Lock, ShieldCheck, Wallet } from 'lucide-react'
import { Badge, Input, ProgressBar, Select, Switch, Textarea } from '@/components/ui'
import { useLeadStore, useTenantStore } from '@/store'
import * as api from '@/mock/api'
import { formatNumber } from '@/lib/format'
import { sum } from '@/lib/utils'
import { useLocalSettings } from './localStore'
import { Note, Row, SaveBar, Section, useDraft, useSaver } from './shared'

const MODELS = [
  { value: 'gpt-4o-mini', label: 'OpenAI gpt-4o-mini (Structured Outputs)' },
  { value: 'gpt-4o', label: 'OpenAI gpt-4o' },
  { value: 'claude-3-5-haiku', label: 'Anthropic claude-3-5-haiku' },
]
const FALLBACKS = [
  { value: 'claude-3-5-haiku', label: 'Anthropic claude-3-5-haiku' },
  { value: 'gpt-4o-mini', label: 'OpenAI gpt-4o-mini' },
  { value: 'none', label: 'Sem fallback' },
]

const usd = (v: number) => `US$ ${formatNumber(v, { minDecimals: 2, maxDecimals: 2 })}`

export function AiSection() {
  const ai = useTenantStore((s) => s.tenant.aiSettings)
  const local = useLocalSettings()
  const messages = useLeadStore((s) => s.messages)
  const { draft, set, dirty, reset } = useDraft({
    model: ai.model,
    fallbackModel: ai.fallbackModel,
    temperature: ai.temperature,
    maxQuestionsPerTurn: ai.maxQuestionsPerTurn,
    debounceSeconds: ai.debounceSeconds,
    outOfRegionFilter: ai.outOfRegionFilter,
    override: ai.systemPromptOverride ?? '',
    catalogGrounding: local.catalogGrounding,
    businessHoursGuardrail: local.businessHoursGuardrail,
    budget: local.aiMonthlyBudgetUsd,
  })
  const { saving, run } = useSaver()

  const cost = useMemo(() => {
    const ai = messages.filter((m) => m.senderType === 'AI')
    const novMsgs = ai.filter((m) => m.createdAt >= '2026-11-01')
    return {
      month: sum(novMsgs.map((m) => m.llmCostUsd ?? 0)),
      total: sum(ai.map((m) => m.llmCostUsd ?? 0)),
      tokens: sum(ai.map((m) => (m.llmTokensIn ?? 0) + (m.llmTokensOut ?? 0))),
      replies: ai.length,
    }
  }, [messages])
  const projected = cost.month * (30 / 20)

  const save = () =>
    run(async () => {
      await api.updateTenantSettings({
        aiSettings: {
          ...ai,
          model: draft.model,
          fallbackModel: draft.fallbackModel,
          temperature: draft.temperature,
          maxQuestionsPerTurn: draft.maxQuestionsPerTurn,
          debounceSeconds: draft.debounceSeconds,
          outOfRegionFilter: draft.outOfRegionFilter,
          priceGuardrail: true,
          systemPromptOverride: draft.override.trim() ? draft.override : null,
        },
      })
      local.patch({ catalogGrounding: draft.catalogGrounding, businessHoursGuardrail: draft.businessHoursGuardrail, aiMonthlyBudgetUsd: draft.budget })
      local.log('Atualizou configurações do SDR IA', draft.model)
    }, 'Configurações da IA salvas', 'Valem a partir da próxima mensagem recebida.')

  return (
    <>
      <Section title="IA SDR" description="Modelo, comportamento conversacional e guardrails do consultor técnico virtual." icon={<Bot />}>
        <Row label="Modelo" hint="Fallback automático em timeout ou erro 5xx do provedor principal.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Principal" options={MODELS} value={draft.model} onChange={(e) => set('model', e.target.value)} />
            <Select label="Fallback" options={FALLBACKS} value={draft.fallbackModel} onChange={(e) => set('fallbackModel', e.target.value)} />
          </div>
        </Row>
        <Row label="Temperatura" hint="Mais baixo = respostas mais consistentes.">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.temperature}
              onChange={(e) => set('temperature', Number(e.target.value))}
              className="w-full max-w-xs accent-primary-600"
            />
            <Badge tone="primary" size="md" className="num">
              {formatNumber(draft.temperature, { minDecimals: 2, maxDecimals: 2 })}
            </Badge>
          </div>
        </Row>
        <Row label="Ritmo da conversa">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Máx. perguntas por turno"
              options={[1, 2, 3].map((n) => ({ value: String(n), label: `${n} pergunta${n > 1 ? 's' : ''}` }))}
              value={String(draft.maxQuestionsPerTurn)}
              onChange={(e) => set('maxQuestionsPerTurn', Number(e.target.value))}
              hint="SPEC: 1 a 2 perguntas curtas por mensagem."
            />
            <Input
              label="Janela de debounce"
              type="number"
              min={1}
              max={30}
              suffix="s"
              value={draft.debounceSeconds}
              onChange={(e) => set('debounceSeconds', Math.max(1, Number(e.target.value) || 1))}
              hint="Agrupa mensagens picadas do lead antes de chamar o LLM."
            />
          </div>
        </Row>
        <Row label="Guardrails" hint="Regras críticas injetadas no system prompt.">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Switch checked onChange={() => {}} disabled label="Bloquear preços, mensalidades e descontos" description="Obrigatório: orçamento oficial só pela equipe comercial." />
              <Badge tone="neutral" icon={<Lock />}>
                Travado
              </Badge>
            </div>
            <Switch
              checked={draft.catalogGrounding}
              onChange={(v) => set('catalogGrounding', v)}
              label="Grounding no catálogo"
              description="Só recomenda modelos ativos da base técnica autorizada (catálogo Alfa Tennant)."
            />
            <Switch checked={draft.outOfRegionFilter} onChange={(v) => set('outOfRegionFilter', v)} label="Filtro de região" description="Fora de PA/MA/AP → DISQUALIFIED_OUT_OF_REGION." />
            <Switch
              checked={draft.businessHoursGuardrail}
              onChange={(v) => set('businessHoursGuardrail', v)}
              label="Aviso de horário comercial"
              description="Fora do expediente informa retorno no próximo dia útil às 8h."
            />
          </div>
        </Row>
        <Row label="System prompt (override)" hint="Vazio = prompt padrão da SPEC §3.3 com o catálogo cacheado.">
          <Textarea
            rows={6}
            className="font-mono text-xs"
            placeholder="Você é o Consultor Técnico Virtual da Maquinabel…"
            value={draft.override}
            onChange={(e) => set('override', e.target.value)}
          />
          {draft.override.trim() && (
            <Note tone="warning" icon={<ShieldCheck />}>
              Override ativo: o guardrail de preços e o JSON Schema de saída continuam sendo aplicados pelo backend.
            </Note>
          )}
        </Row>
        <Row label="Custo de IA no mês" hint="Somatório de llm_cost_usd das mensagens da IA (nov/2026).">
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="flex items-center gap-1 text-xs text-ink-500">
                  <Wallet className="size-3.5" /> Consumido
                </div>
                <div className="num text-2xl font-semibold text-ink-900">{usd(cost.month)}</div>
              </div>
              <div className="text-xs text-ink-500">
                Projeção do mês: <b className="num text-ink-800">{usd(projected)}</b>
                <br />
                {formatNumber(cost.replies)} respostas · {formatNumber(cost.tokens, { compact: true })} tokens no piloto
              </div>
              <Input
                wrapperClassName="ml-auto w-36"
                size="sm"
                label="Teto mensal"
                type="number"
                min={1}
                prefix="$"
                value={draft.budget}
                onChange={(e) => set('budget', Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <ProgressBar
              value={cost.month}
              max={draft.budget}
              tone={cost.month / draft.budget > 0.8 ? 'warning' : 'success'}
              marker={Math.min(projected, draft.budget)}
              markerLabel="projeção"
              size="md"
            />
          </div>
        </Row>
      </Section>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={reset} />
    </>
  )
}
