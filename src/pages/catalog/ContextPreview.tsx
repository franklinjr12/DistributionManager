import { useMemo, useState } from 'react'
import { Database, FileText, Zap } from 'lucide-react'
import { Badge, Card, ProgressBar, Tabs } from '@/components/ui'
import { formatNumber, formatPercent } from '@/lib/format'
import { useCatalogStore, useTenantStore } from '@/store'
import { CodeViewer } from './CodeViewer'
import { CACHE_HIT_RATE, CACHE_TOKEN_TARGET, catalogMarkdown, estimateTokens, JSON_SCHEMA, systemPrompt } from './lib'

type View = 'full' | 'prompt' | 'catalog' | 'schema'

export function ContextPreview() {
  const machines = useCatalogStore((s) => s.machines)
  const rules = useCatalogStore((s) => s.sizingRules)
  const tenant = useTenantStore((s) => s.tenant)
  const [view, setView] = useState<View>('full')

  const prompt = useMemo(() => tenant.aiSettings.systemPromptOverride?.trim() || systemPrompt(tenant, tenant.aiSettings.maxQuestionsPerTurn), [tenant])
  const catalog = useMemo(() => catalogMarkdown(machines, rules), [machines, rules])
  const full = `${prompt}\n\n${catalog}`
  const cachedTokens = estimateTokens(full)
  const t = { prompt: estimateTokens(prompt), catalog: estimateTokens(catalog), schema: estimateTokens(JSON_SCHEMA) }

  const code = view === 'full' ? full : view === 'prompt' ? prompt : view === 'catalog' ? catalog : JSON_SCHEMA

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-3">
        <Tabs
          variant="pills"
          size="sm"
          value={view}
          onChange={(v) => setView(v as View)}
          items={[
            { value: 'full', label: 'Prefixo cacheado completo' },
            { value: 'prompt', label: 'System prompt' },
            { value: 'catalog', label: 'Catálogo Markdown' },
            { value: 'schema', label: 'JSON Schema (saída)' },
          ]}
        />
        <CodeViewer
          title={view === 'schema' ? 'response_format: json_schema' : 'messages[0].role = "system"'}
          language={view === 'schema' ? 'json' : 'markdown'}
          code={code}
          maxHeight="max-h-[560px]"
        />
      </div>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Database className="size-4 text-violet-500" /> Orçamento de tokens
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <ProgressBar
              value={cachedTokens}
              max={CACHE_TOKEN_TARGET * 1.25}
              tone={cachedTokens < CACHE_TOKEN_TARGET ? 'success' : 'danger'}
              marker={CACHE_TOKEN_TARGET}
              markerLabel="meta 4.000"
              label="Prefixo cacheado"
              valueLabel={`~${formatNumber(cachedTokens)}`}
            />
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-500">System prompt</dt>
                <dd className="num font-medium text-ink-800">~{formatNumber(t.prompt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Catálogo + matriz</dt>
                <dd className="num font-medium text-ink-800">~{formatNumber(t.catalog)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">JSON Schema (fora do cache)</dt>
                <dd className="num font-medium text-ink-800">~{formatNumber(t.schema)}</dd>
              </div>
            </dl>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Zap className="size-4 text-warning-500" /> Prompt Caching
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink-900 num">{formatPercent(CACHE_HIT_RATE)}</div>
          <p className="text-xs text-ink-500">Taxa de acerto do cache nos últimos 7 dias (gpt-4o-mini). Tokens cacheados custam 50% menos.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="success">Prefixo estável</Badge>
            <Badge tone="info">≥ 1.024 tokens</Badge>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <FileText className="size-4 text-primary-500" /> Origem
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-600">
            Gerado a partir da tabela <code className="rounded bg-ink-100 px-1">knowledge_items</code> (tenant <b>{tenant.slug}</b>, apenas itens ativos). Na v2, o KB Manager
            self-service aceitará PDF/CSV/URL com chunking pgvector.
          </p>
        </Card>
      </div>
    </div>
  )
}
