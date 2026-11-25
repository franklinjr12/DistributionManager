import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Ban, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Trash } from 'lucide-react'
import type { KeywordMatchType, NegativeKeyword, OptimizationLog } from '@/types/domain'
import * as api from '@/mock/api'
import { useAutomationStore, useCampaignStore } from '@/store'
import { Badge, Button, Card, CardHeader, EmptyState, Input, Num, Select, Table, Tooltip, toast } from '@/components/ui'
import { SEARCH_TERM_CLASS_LABEL, SEARCH_TERM_CLASS_TONE, formatBRL, formatDate, formatDateTime, formatNumber, formatPercent, formatTime, formatWeekdayShort } from '@/lib/format'
import { cn, hashString } from '@/lib/utils'
import { OPTIMIZER_STEPS, runOptimizerLocal } from './lib'
import { JobConsole, TableSkeleton, WhatsAppBubble, WhatsAppPhone, useBoot, useJob, waFormat } from './shared'

const MATCH_LABEL: Record<KeywordMatchType, string> = { EXACT: 'Exata', PHRASE: 'Frase', BROAD: 'Ampla' }
const SOURCE_LABEL: Record<NegativeKeyword['source'], string> = { AI_OPTIMIZER: 'Otimizador IA', BLUEPRINT: 'Blueprint IA', MANUAL: 'Manual' }

function confidence(l: OptimizationLog) {
  const h = (hashString(l.id) % 1000) / 1000
  return l.action === 'REVIEW' ? 0.55 + h * 0.15 : 0.82 + h * 0.16
}

function fmtNeg(text: string, m: KeywordMatchType) {
  return m === 'EXACT' ? `[${text}]` : m === 'PHRASE' ? `"${text}"` : text
}

export function OptimizerTab({ autoRun, onAutoRunHandled }: { autoRun: boolean; onAutoRunHandled: () => void }) {
  const runs = useAutomationStore((s) => s.optimizationRuns)
  const logs = useAutomationStore((s) => s.optimizationLogs)
  const booting = useBoot()
  const { job, run, running } = useJob(OPTIMIZER_STEPS)

  const sortedRuns = useMemo(() => [...runs].sort((a, b) => b.runDate.localeCompare(a.runDate)), [runs])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = sortedRuns.find((r) => r.id === selectedId) ?? sortedRuns[0] ?? null
  const runLogs = useMemo(() => (selected ? logs.filter((l) => l.runId === selected.id) : []), [logs, selected])

  const [lastResult, setLastResult] = useState<{ negatives: number; kept: number; saved: number } | null>(null)

  const execute = async () => {
    const res = await run((onStep) => runOptimizerLocal(onStep), 'Falha no otimizador')
    if (res) {
      setSelectedId(res.run.id)
      setLastResult({ negatives: res.run.negativesAdded, kept: res.run.keptCount, saved: res.run.wastedSpendSavedBRL })
      toast.success(`${res.run.negativesAdded} negativas adicionadas`, 'Digest enviado ao Vinicius no WhatsApp.')
    }
  }

  useEffect(() => {
    if (autoRun && !running) {
      onAutoRunHandled()
      void execute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])

  const totals = useMemo(
    () => ({
      terms: runs.reduce((a, r) => a + r.termsAnalyzed, 0),
      negatives: runs.reduce((a, r) => a + r.negativesAdded, 0),
      saved: runs.reduce((a, r) => a + r.wastedSpendSavedBRL, 0),
    }),
    [runs],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-900">Auditor semanal de termos de busca</div>
          <p className="mt-0.5 text-xs text-ink-500">
            Puxa o relatório de termos via <span className="font-mono">GoogleAdsService.SearchStream</span>, classifica a intenção com <span className="font-mono">gpt-4o-mini</span>, negativa termos residenciais/varejo e
            envia um resumo ao Vinicius no WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-500">
          <div>
            <div className="num text-base font-semibold text-ink-900">{formatNumber(totals.terms)}</div>termos analisados
          </div>
          <div>
            <div className="num text-base font-semibold text-ink-900">{formatNumber(totals.negatives)}</div>negativas pela IA
          </div>
          <div>
            <div className="num text-base font-semibold text-success-700">{formatBRL(totals.saved)}</div>economia estimada
          </div>
        </div>
        <Button leftIcon={<Sparkles />} loading={running} onClick={execute} className="shrink-0">
          Executar agora
        </Button>
      </div>

      <JobConsole
        job={job}
        title="worker:GoogleAdsWeeklyOptimizerWorker · trigger=MANUAL"
        result={
          lastResult && (
            <span>
              ✓ {lastResult.negatives} negativas injetadas · {lastResult.kept} termos B2B mantidos · economia estimada {formatBRL(lastResult.saved)}/mês · incluindo cenário 12: “residencial karcher” negativada,
              “varredeira industrial tennant” mantido.
            </span>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Run history */}
        <Card padding="none" className="self-start">
          <CardHeader title="Histórico de execuções" description="Cron: toda segunda às 07:00 (America/Belem)" />
          {booting ? (
            <TableSkeleton rows={5} />
          ) : sortedRuns.length === 0 ? (
            <EmptyState compact title="Nenhuma execução ainda" description="Clique em “Executar agora” para rodar o primeiro ciclo." />
          ) : (
            <ul className="scrollbar-thin max-h-[420px] divide-y divide-line overflow-y-auto">
              {sortedRuns.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn('w-full px-4 py-3 text-left transition hover:bg-ink-50', selected?.id === r.id && 'bg-primary-50/60 ring-1 ring-primary-200 ring-inset')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-900">{formatWeekdayShort(r.runDate)}</span>
                      <span className="text-xs text-ink-400">{formatTime(r.runDate)}</span>
                      <Badge tone={r.trigger === 'MANUAL' ? 'violet' : 'neutral'} className="ml-auto">
                        {r.trigger === 'MANUAL' ? 'Manual' : 'Cron'}
                      </Badge>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px] text-ink-500">
                      <div>
                        <div className="num text-sm font-semibold text-ink-800">{r.termsAnalyzed}</div>termos
                      </div>
                      <div>
                        <div className="num text-sm font-semibold text-danger-600">{r.negativesAdded}</div>negativas
                      </div>
                      <div>
                        <div className="num text-sm font-semibold text-success-700">{formatBRL(r.wastedSpendSavedBRL, { decimals: 0 })}</div>economia
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="min-w-0 space-y-5">
          <RunDetail runLabel={selected ? formatDateTime(selected.runDate) : ''} logs={runLogs} booting={booting} />
          {selected && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card padding="none">
                <CardHeader title="Resumo da execução" description={selected.summaryText} />
                <div className="grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
                  <Stat label="Termos analisados" value={formatNumber(selected.termsAnalyzed)} />
                  <Stat label="Negativas" value={formatNumber(selected.negativesAdded)} tone="text-danger-600" />
                  <Stat label="Mantidos" value={formatNumber(selected.keptCount)} />
                  <Stat label="Economia estimada" value={formatBRL(selected.wastedSpendSavedBRL)} tone="text-success-700" />
                </div>
                <div className="border-t border-line px-5 py-3 text-xs text-ink-500">
                  Digest enviado {selected.digestSentAt ? `em ${formatDateTime(selected.digestSentAt)}` : '—'} · log persistido em <span className="font-mono">ad_optimization_logs</span> ·{' '}
                  <Link to="/ads" className="inline-flex items-center gap-0.5 text-primary-600 hover:underline">
                    ver campanhas <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </Card>
              <DigestPreview
                date={selected.digestSentAt ?? selected.runDate}
                terms={selected.termsAnalyzed}
                negatives={runLogs.filter((l) => l.action === 'NEGATIVE_ADDED').map((l) => l.negativeKeyword ?? l.searchTerm)}
                kept={runLogs.filter((l) => l.action === 'KEPT' && l.classification === 'ICP_B2B').map((l) => l.searchTerm)}
                saved={selected.wastedSpendSavedBRL}
              />
            </div>
          )}
        </div>
      </div>

      <NegativeLibrary />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs text-ink-500">{label}</div>
      <div className={cn('num mt-0.5 text-lg font-semibold text-ink-900', tone)}>{value}</div>
    </div>
  )
}

// ───────────────────────── Run detail table ─────────────────────────

function RunDetail({ runLabel, logs, booting }: { runLabel: string; logs: OptimizationLog[]; booting: boolean }) {
  const negatives = useAutomationStore((s) => s.negativeKeywords)
  const updateLog = useAutomationStore((s) => s.updateOptimizationLog)
  const addNegatives = useAutomationStore((s) => s.addNegatives)
  const removeNegative = useAutomationStore((s) => s.removeNegative)
  const [overridden, setOverridden] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  const revert = async (l: OptimizationLog) => {
    setBusy(l.id)
    await api.delay(300, 700)
    const neg = negatives.find((n) => n.text === (l.negativeKeyword ?? '').toLowerCase() && (n.runId === l.runId || n.source === 'AI_OPTIMIZER'))
    if (neg) removeNegative(neg.id)
    updateLog(l.id, { action: 'KEPT' })
    setOverridden((s) => new Set(s).add(l.id))
    setBusy(null)
    toast.success('Negativa revertida', `“${l.negativeKeyword}” removida das campanhas. O termo volta a gerar impressões.`)
  }

  const approve = async (l: OptimizationLog) => {
    setBusy(l.id)
    await api.delay(300, 700)
    const text = l.negativeKeyword ?? l.searchTerm
    addNegatives([text], { source: 'MANUAL', runId: l.runId, listName: 'Negativas IA · Otimizador semanal', matchType: 'PHRASE', scope: 'ACCOUNT' })
    updateLog(l.id, { action: 'NEGATIVE_ADDED', negativeKeyword: text })
    setOverridden((s) => new Set(s).add(l.id))
    setBusy(null)
    toast.success('Negativa aplicada', `“${text}” adicionada como correspondência de frase.`)
  }

  return (
    <Card padding="none">
      <CardHeader title="Termos classificados" description={runLabel ? `Execução de ${runLabel} · revise e sobrescreva decisões da IA` : 'Selecione uma execução'} />
      {booting ? (
        <TableSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState compact icon={<Search />} title="Sem termos registrados" description="Esta execução não gerou logs detalhados." />
      ) : (
        <Table hover compact>
          <thead>
            <tr>
              <th>Termo de busca</th>
              <th>Classificação</th>
              <th>Ação</th>
              <th className="min-w-[220px]">Motivo (LLM)</th>
              <th className="text-right">Impr.</th>
              <th className="text-right">Cliques</th>
              <th className="text-right">Custo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const conf = confidence(l)
              return (
                <tr key={l.id}>
                  <td className="min-w-[200px]">
                    <div className="font-medium text-ink-900">{l.searchTerm}</div>
                    <div className="text-[11px] text-ink-400">{l.campaignName}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={SEARCH_TERM_CLASS_TONE[l.classification]}>{SEARCH_TERM_CLASS_LABEL[l.classification]}</Badge>
                      <Tooltip content="Confiança do classificador">
                        <span className={cn('num text-[11px]', conf < 0.7 ? 'text-warning-700' : 'text-ink-500')}>{formatPercent(conf, 0)}</span>
                      </Tooltip>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      {l.action === 'NEGATIVE_ADDED' ? (
                        <Badge tone="danger" icon={<Ban />}>
                          Negativado
                        </Badge>
                      ) : l.action === 'REVIEW' ? (
                        <Badge tone="warning">Revisar</Badge>
                      ) : (
                        <Badge tone="success" icon={<ShieldCheck />}>
                          Mantido
                        </Badge>
                      )}
                      {l.action === 'NEGATIVE_ADDED' && l.negativeKeyword && <span className="font-mono text-[11px] text-ink-500">"{l.negativeKeyword}"</span>}
                      {overridden.has(l.id) && <span className="text-[10px] font-medium text-violet-600">ajuste manual</span>}
                    </div>
                  </td>
                  <td className="text-xs whitespace-normal text-ink-600">{l.reason}</td>
                  <td>
                    <Num>{formatNumber(l.impressions)}</Num>
                  </td>
                  <td>
                    <Num>{formatNumber(l.clicks)}</Num>
                  </td>
                  <td>
                    <Num>{formatBRL(l.cost)}</Num>
                  </td>
                  <td className="text-right">
                    {l.action === 'NEGATIVE_ADDED' ? (
                      <Button size="xs" variant="ghost" leftIcon={<RotateCcw />} loading={busy === l.id} onClick={() => revert(l)}>
                        Reverter
                      </Button>
                    ) : (
                      <Button size="xs" variant="ghost" leftIcon={<Ban />} loading={busy === l.id} onClick={() => approve(l)}>
                        Negativar
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

// ───────────────────────── WhatsApp digest ─────────────────────────

function DigestPreview({ date, terms, negatives, kept, saved }: { date: string; terms: number; negatives: string[]; kept: string[]; saved: number }) {
  const text =
    `📊 *Otimizador semanal · Google Ads*\n${formatDate(date)}\n\n` +
    `Analisei *${terms} termos de busca* da última semana.\n\n` +
    `🚫 *${negatives.length} negativas adicionadas:*\n${negatives.slice(0, 5).map((n) => `• ${n}`).join('\n') || '• nenhuma'}${negatives.length > 5 ? `\n• +${negatives.length - 5}…` : ''}\n\n` +
    `✅ *Mantidos (ICP B2B):*\n${kept.slice(0, 3).map((n) => `• ${n}`).join('\n') || '• —'}\n\n` +
    `💰 Economia estimada: *${formatBRL(saved)}/mês*\n\nResponda *REVERTER <termo>* para desfazer.`
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-ink-500">Prévia do digest no WhatsApp</div>
      <WhatsAppPhone contact="Vinicius Goés" subtitle="via WhatsApp Cloud API · template utility">
        <WhatsAppBubble time={formatTime(date)}>{waFormat(text)}</WhatsAppBubble>
      </WhatsAppPhone>
    </div>
  )
}

// ───────────────────────── Negative keyword library ─────────────────────────

function NegativeLibrary() {
  const negatives = useAutomationStore((s) => s.negativeKeywords)
  const removeNegative = useAutomationStore((s) => s.removeNegative)
  const campaigns = useCampaignStore((s) => s.campaigns)
  const googleCampaigns = useMemo(() => campaigns.filter((c) => c.platform === 'GOOGLE' && c.status !== 'REMOVED'), [campaigns])
  const campaignName = (id: string | null) => (id ? googleCampaigns.find((c) => c.id === id)?.name ?? id : 'Toda a conta')

  const [q, setQ] = useState('')
  const [list, setList] = useState('ALL')
  const [scope, setScope] = useState('ALL')
  const [newText, setNewText] = useState('')
  const [newScope, setNewScope] = useState('ACCOUNT')
  const [adding, setAdding] = useState(false)

  const lists = useMemo(() => Array.from(new Set(negatives.map((n) => n.listName))).sort(), [negatives])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...negatives]
      .filter((n) => (list === 'ALL' || n.listName === list) && (scope === 'ALL' || (scope === 'ACCOUNT' ? n.scope === 'ACCOUNT' : n.campaignId === scope)) && (!s || n.text.includes(s)))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  }, [negatives, q, list, scope])

  const add = async () => {
    const terms = newText
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean)
    if (!terms.length) return
    setAdding(true)
    try {
      const added = await api.addNegativeKeywords(terms, newScope === 'ACCOUNT' ? null : newScope)
      toast.success(added.length ? `${added.length} negativa(s) adicionada(s)` : 'Nenhuma negativa nova', added.length ? undefined : 'Os termos já existiam na biblioteca.')
      setNewText('')
    } catch (e) {
      toast.error('Falha ao adicionar negativa', (e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card padding="none">
      <CardHeader title="Biblioteca de palavras-chave negativas" description={`${negatives.length} negativas · listas compartilhadas e por campanha`} />
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-end">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <Input size="sm" placeholder="Buscar termo…" leftIcon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} />
          <Select size="sm" value={list} onChange={(e) => setList(e.target.value)} options={[{ value: 'ALL', label: 'Todas as listas' }, ...lists.map((l) => ({ value: l, label: l }))]} />
          <Select
            size="sm"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            options={[{ value: 'ALL', label: 'Todos os escopos' }, { value: 'ACCOUNT', label: 'Lista da conta' }, ...googleCampaigns.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:max-w-xl">
          <Input size="sm" placeholder="Nova negativa (separe por vírgula)" value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} wrapperClassName="flex-1" />
          <Select
            size="sm"
            value={newScope}
            onChange={(e) => setNewScope(e.target.value)}
            options={[{ value: 'ACCOUNT', label: 'Conta inteira' }, ...googleCampaigns.map((c) => ({ value: c.id, label: c.name }))]}
            wrapperClassName="sm:w-48"
          />
          <Button size="sm" leftIcon={<Plus />} loading={adding} disabled={!newText.trim()} onClick={add}>
            Adicionar
          </Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyState compact icon={<Ban />} title="Nenhuma negativa encontrada" description="Ajuste os filtros ou adicione um termo." />
      ) : (
        <Table hover compact wrapperClassName="max-h-[420px] overflow-y-auto">
          <thead>
            <tr>
              <th>Termo</th>
              <th>Correspondência</th>
              <th>Escopo</th>
              <th>Lista</th>
              <th>Origem</th>
              <th>Adicionada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => (
              <tr key={n.id}>
                <td className="font-mono text-xs text-ink-900">{fmtNeg(n.text, n.matchType)}</td>
                <td>
                  <Badge>{MATCH_LABEL[n.matchType]}</Badge>
                </td>
                <td className="text-xs text-ink-600">{n.scope === 'ACCOUNT' ? 'Toda a conta' : campaignName(n.campaignId)}</td>
                <td className="text-xs text-ink-600">{n.listName}</td>
                <td>
                  <Badge tone={n.source === 'AI_OPTIMIZER' ? 'violet' : n.source === 'BLUEPRINT' ? 'primary' : 'neutral'}>{SOURCE_LABEL[n.source]}</Badge>
                </td>
                <td className="text-xs text-ink-500">{formatDate(n.addedAt)}</td>
                <td className="text-right">
                  <Tooltip content="Remover negativa">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Remover negativa"
                      onClick={() => {
                        removeNegative(n.id)
                        toast.info('Negativa removida', `“${n.text}” não bloqueia mais impressões.`)
                      }}
                    >
                      <Trash className="size-3.5" />
                    </Button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
