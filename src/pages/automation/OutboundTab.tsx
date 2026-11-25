import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bot, Mail, MessageCircle, Pickaxe, Plus, Radar, Save, Search, Send, Trash, Users } from 'lucide-react'
import type { AllowedState, OutboundProspect, Segment } from '@/types/domain'
import * as api from '@/mock/api'
import { useAutomationStore } from '@/store'
import { Badge, Button, Card, CardHeader, EmptyState, Input, ProgressBar, Select, Switch, Table, Tabs, Textarea, Tooltip, toast } from '@/components/ui'
import { SEGMENT_LABEL, UF_NAME, formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { BUCKET_LABEL, BUCKET_TONE, DEFAULT_SEQUENCE, prospectBucket, type ProspectBucket, type SequenceStep } from './lib'
import { JobConsole, Mono, TableSkeleton, useBoot, useJob } from './shared'

const MINE_STEPS = [
  'Receita Federal · minerando CNPJs por CNAE (PA, MA, AP)',
  'Enriquecendo contatos (telefone, e-mail, porte)',
  'Calculando score de fit ICP',
  'Agendando sequência (Resend e-mail + template WhatsApp)',
]
const RESEND_LIMIT = 3000
const RESEND_BASE = 1184

const CH_LABEL = { EMAIL: 'E-mail', WHATSAPP: 'WhatsApp' } as const

function stageLabel(p: OutboundProspect, seq: SequenceStep[]) {
  if (p.sequenceStep === 0) return 'Aguardando D0'
  const st = seq[p.sequenceStep - 1]
  return `${st ? CH_LABEL[st.channel] : 'Passo'} ${p.sequenceStep}/${p.sequenceTotal}`
}

function fillTemplate(s: string, p: OutboundProspect | undefined) {
  if (!p) return s
  return s
    .replaceAll('{{nome_fantasia}}', p.nomeFantasia)
    .replaceAll('{{cidade}}', p.city)
    .replaceAll('{{uf}}', p.state)
    .replaceAll('{{segmento}}', SEGMENT_LABEL[p.segment].toLowerCase())
}

export function OutboundTab({ autoRun, onAutoRunHandled }: { autoRun: boolean; onAutoRunHandled: () => void }) {
  const prospects = useAutomationStore((s) => s.prospects)
  const booting = useBoot()
  const { job, run, running } = useJob(MINE_STEPS)

  const [uf, setUf] = useState<'ALL' | AllowedState>('ALL')
  const [segment, setSegment] = useState<'ALL' | Segment>('ALL')
  const [bucket, setBucket] = useState<'ALL' | ProspectBucket>('ALL')
  const [q, setQ] = useState('')
  const [source, setSource] = useState<'CNAE' | 'GOOGLE_PLACES'>('CNAE')
  const [limit, setLimit] = useState('5')
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [lastMined, setLastMined] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [emailsUsed, setEmailsUsed] = useState(RESEND_BASE)
  const [sequence, setSequence] = useState<SequenceStep[]>(DEFAULT_SEQUENCE)

  const sorted = useMemo(() => [...prospects].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.fitScore - a.fitScore), [prospects])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return sorted.filter(
      (p) =>
        (uf === 'ALL' || p.state === uf) &&
        (segment === 'ALL' || p.segment === segment) &&
        (bucket === 'ALL' || prospectBucket(p) === bucket) &&
        (!s || p.razaoSocial.toLowerCase().includes(s) || p.nomeFantasia.toLowerCase().includes(s) || p.cnpj.includes(s) || p.city.toLowerCase().includes(s)),
    )
  }, [sorted, uf, segment, bucket, q])

  const counts = useMemo(() => {
    const c: Record<ProspectBucket, number> = { NOVO: 0, SEQUENCIA: 0, RESPONDEU: 0, CONVERTIDO: 0, DESCADASTRADO: 0 }
    prospects.forEach((p) => c[prospectBucket(p)]++)
    return c
  }, [prospects])

  const mine = async () => {
    const res = await run(
      (onStep) => api.triggerProspecting({ states: uf === 'ALL' ? ['PA', 'MA', 'AP'] : [uf], segments: segment === 'ALL' ? undefined : [segment], source, limit: Number(limit) }, onStep),
      'Falha na mineração',
    )
    if (res) {
      setFresh(new Set(res.map((p) => p.id)))
      setLastMined(res.length)
      if (res.length) toast.success(`${res.length} novos prospects ICP`, 'Sequência agendada para o próximo dia útil às 09:00.')
      else toast.info('Nenhum prospect novo', 'Todos os CNPJs do filtro já estão na base.')
    }
  }

  useEffect(() => {
    if (autoRun && !running) {
      onAutoRunHandled()
      void mine()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])

  const sendToSdr = async (p: OutboundProspect) => {
    setBusy(p.id)
    try {
      const lead = await api.convertProspectToLead(p.id)
      toast.success('Lead criado e enviado ao SDR IA', `${lead.name} entrou no Kanban como Novo.`)
    } catch (e) {
      toast.error('Falha ao converter prospect', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const sendTouch = async (p: OutboundProspect) => {
    const st = sequence[p.sequenceStep] ?? sequence[sequence.length - 1]
    setBusy(p.id)
    try {
      await api.sendOutboundTouch(p.id, st.channel)
      if (st.channel === 'EMAIL') setEmailsUsed((n) => n + 1)
      toast.success(st.channel === 'EMAIL' ? 'E-mail enviado via Resend' : 'Template WhatsApp enviado', p.nomeFantasia)
    } catch (e) {
      toast.error('Falha no envio', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,1.6fr)]">
        {(Object.keys(BUCKET_LABEL) as ProspectBucket[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBucket(bucket === b ? 'ALL' : b)}
            className={cn('rounded-xl border bg-surface p-3 text-left shadow-card transition hover:border-primary-200', bucket === b ? 'border-primary-400 ring-1 ring-primary-200' : 'border-line')}
          >
            <Badge tone={BUCKET_TONE[b]} dot>
              {BUCKET_LABEL[b]}
            </Badge>
            <div className="num mt-2 text-xl font-semibold text-ink-900">{counts[b]}</div>
          </button>
        ))}
        <div className="col-span-2 rounded-xl border border-line bg-surface p-3 shadow-card md:col-span-1">
          <div className="flex items-center gap-2 text-xs font-medium text-ink-600">
            <Mail className="size-3.5" /> Resend · plano gratuito
          </div>
          <div className="num mt-1.5 text-sm text-ink-900">
            <span className="text-xl font-semibold">{formatNumber(emailsUsed)}</span> / {formatNumber(RESEND_LIMIT)} e-mails/mês
          </div>
          <ProgressBar className="mt-2" size="sm" value={emailsUsed} max={RESEND_LIMIT} tone={emailsUsed / RESEND_LIMIT > 0.85 ? 'danger' : emailsUsed / RESEND_LIMIT > 0.6 ? 'warning' : 'success'} marker={2550} markerLabel="85%" />
          <div className="mt-1 text-[11px] text-ink-400">Renova em 01/12 · throttle protege o limite</div>
        </div>
      </div>

      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-line p-4 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-900">Minerar contas B2B ICP</div>
            <p className="text-xs text-ink-500">CNPJ/CNAE (Receita Federal) e Google Places em Pará, Maranhão e Amapá: CDs, indústrias de alimentos, supermercados, shoppings e prestadoras de limpeza.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              size="sm"
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
              options={[
                { value: 'CNAE', label: 'Fonte: CNAE / Receita' },
                { value: 'GOOGLE_PLACES', label: 'Fonte: Google Places' },
              ]}
              wrapperClassName="w-48"
            />
            <Select
              size="sm"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              options={['3', '5', '10'].map((v) => ({ value: v, label: `Até ${v} prospects` }))}
              wrapperClassName="w-40"
            />
            <Button size="sm" leftIcon={<Pickaxe />} loading={running} onClick={mine}>
              Minerar novos prospects
            </Button>
          </div>
        </div>
        {job.status !== 'idle' && (
          <div className="border-b border-line p-4">
            <JobConsole
              job={job}
              title={`worker:OutboundProspectingWorker · ${source} · ${uf === 'ALL' ? 'PA,MA,AP' : uf}`}
              result={lastMined != null && <span>✓ {lastMined} novos prospects inseridos em outbound_prospects (destacados na tabela).</span>}
            />
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <Tabs
            variant="pills"
            size="sm"
            value={uf}
            onChange={(v) => setUf(v as typeof uf)}
            items={[
              { value: 'ALL', label: 'Todos', count: prospects.length },
              ...(['PA', 'MA', 'AP'] as const).map((s) => ({ value: s, label: s, count: prospects.filter((p) => p.state === s).length })),
            ]}
          />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl lg:ml-auto">
            <Select
              size="sm"
              value={segment}
              onChange={(e) => setSegment(e.target.value as typeof segment)}
              options={[{ value: 'ALL', label: 'Todos os segmentos' }, ...(Object.keys(SEGMENT_LABEL) as Segment[]).filter((s) => s !== 'OUTRO').map((s) => ({ value: s, label: SEGMENT_LABEL[s] }))]}
            />
            <Input size="sm" placeholder="Buscar empresa, CNPJ, cidade…" leftIcon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {booting ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={<Users />} title="Nenhum prospect neste filtro" description="Ajuste os filtros ou minere novas contas." />
        ) : (
          <Table hover compact>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>CNPJ</th>
                <th>CNAE</th>
                <th>Segmento</th>
                <th>Cidade/UF</th>
                <th>Fonte</th>
                <th>Etapa</th>
                <th>Status</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const b = prospectBucket(p)
                return (
                  <tr key={p.id} className={cn(fresh.has(p.id) && 'animate-fade-in bg-success-50/60')}>
                    <td className="min-w-[200px]">
                      <div className="flex items-center gap-1.5 font-medium text-ink-900">
                        {p.nomeFantasia}
                        {fresh.has(p.id) && <Badge tone="success">novo</Badge>}
                      </div>
                      <div className="text-[11px] text-ink-400">{p.razaoSocial}</div>
                    </td>
                    <td>
                      <Mono>{p.cnpj}</Mono>
                    </td>
                    <td className="min-w-[180px]">
                      <span className="font-mono text-[11px] text-ink-700">{p.cnae}</span>
                      <div className="text-[11px] text-ink-500">{p.cnaeDescription}</div>
                    </td>
                    <td className="text-xs text-ink-600">{SEGMENT_LABEL[p.segment]}</td>
                    <td className="text-xs whitespace-nowrap text-ink-600">
                      <Tooltip content={UF_NAME[p.state]}>
                        <span>
                          {p.city}/{p.state}
                        </span>
                      </Tooltip>
                    </td>
                    <td>
                      <Badge tone={p.source === 'CNAE' ? 'neutral' : 'info'}>{p.source === 'CNAE' ? 'CNAE' : 'Google Places'}</Badge>
                      {p.googleRating != null && <div className="mt-0.5 text-[10px] text-ink-400">★ {String(p.googleRating).replace('.', ',')}</div>}
                    </td>
                    <td className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1 text-ink-700">
                        {p.lastTouchChannel === 'WHATSAPP' ? <MessageCircle className="size-3.5 text-whatsapp" /> : p.lastTouchChannel === 'EMAIL' ? <Mail className="size-3.5 text-primary-500" /> : null}
                        {stageLabel(p, sequence)}
                      </div>
                      {p.nextTouchAt && (b === 'NOVO' || b === 'SEQUENCIA') && <div className="text-[10px] text-ink-400">próx. {formatDateTime(p.nextTouchAt).slice(0, 16)}</div>}
                    </td>
                    <td>
                      <Badge tone={BUCKET_TONE[b]} dot>
                        {BUCKET_LABEL[b]}
                      </Badge>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {b === 'RESPONDEU' ? (
                        <Button size="xs" leftIcon={<Bot />} loading={busy === p.id} onClick={() => sendToSdr(p)}>
                          Enviar ao SDR IA
                        </Button>
                      ) : b === 'CONVERTIDO' && p.leadId ? (
                        <Link to={`/crm?lead=${p.leadId}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
                          Ver lead <ArrowUpRight className="size-3" />
                        </Link>
                      ) : (b === 'NOVO' || b === 'SEQUENCIA') && p.sequenceStep < p.sequenceTotal ? (
                        <Button size="xs" variant="ghost" leftIcon={<Send />} loading={busy === p.id} onClick={() => sendTouch(p)}>
                          Próximo toque
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <SequenceEditor sequence={sequence} onChange={setSequence} sample={sorted.find((p) => p.status === 'PENDING') ?? sorted[0]} />
    </div>
  )
}

// ───────────────────────── Sequence editor ─────────────────────────

function SequenceEditor({ sequence, onChange, sample }: { sequence: SequenceStep[]; onChange: (s: SequenceStep[]) => void; sample: OutboundProspect | undefined }) {
  const [activeId, setActiveId] = useState<string | undefined>(sequence[0]?.id)
  const [throttle, setThrottle] = useState('40')
  const [windowStart, setWindowStart] = useState('08:00')
  const [windowEnd, setWindowEnd] = useState('17:00')
  const [stopOnReply, setStopOnReply] = useState(true)
  const [saving, setSaving] = useState(false)
  const active = sequence.find((s) => s.id === activeId) ?? sequence[0]

  const patch = (id: string, p: Partial<SequenceStep>) => onChange(sequence.map((s) => (s.id === id ? { ...s, ...p } : s)))

  const addStep = () => {
    const last = sequence[sequence.length - 1]
    const st: SequenceStep = { id: `s${Date.now()}`, channel: 'EMAIL', day: (last?.day ?? 0) + 3, subject: 'Novo passo', body: 'Olá {{nome_fantasia}}, …' }
    onChange([...sequence, st])
    setActiveId(st.id)
  }

  const save = async () => {
    setSaving(true)
    await api.delay(400, 900)
    setSaving(false)
    toast.success('Sequência salva', `${sequence.length} passos · ${throttle} envios/hora · ${windowStart}–${windowEnd}.`)
  }

  return (
    <Card padding="none">
      <CardHeader
        icon={<Radar />}
        title="Sequência outbound multi-toque"
        description="Resend (e-mail B2B) + template utility pré-aprovado do WhatsApp. Respostas entram direto no SDR IA."
        actions={
          <Button size="sm" leftIcon={<Save />} loading={saving} onClick={save}>
            Salvar
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_300px]">
        <ol className="space-y-2">
          {sequence.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setActiveId(s.id)}
                className={cn('flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition', active?.id === s.id ? 'border-primary-300 bg-primary-50/60' : 'border-line hover:bg-ink-50')}
              >
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full text-white [&_svg]:size-3.5', s.channel === 'EMAIL' ? 'bg-primary-500' : 'bg-whatsapp')}>
                  {s.channel === 'EMAIL' ? <Mail /> : <MessageCircle />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-ink-900">
                    {i + 1}. {s.channel === 'EMAIL' ? 'E-mail Resend' : 'WhatsApp template'} · D{s.day}
                  </span>
                  <span className="block truncate text-[11px] text-ink-500">{s.subject}</span>
                </span>
              </button>
            </li>
          ))}
          <Button size="xs" variant="ghost" leftIcon={<Plus />} onClick={addStep} disabled={sequence.length >= 6}>
            Adicionar passo
          </Button>
        </ol>

        {active ? (
          <div className="min-w-0 space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <Select
                size="sm"
                label="Canal"
                value={active.channel}
                onChange={(e) => patch(active.id, { channel: e.target.value as SequenceStep['channel'] })}
                options={[
                  { value: 'EMAIL', label: 'E-mail (Resend)' },
                  { value: 'WHATSAPP', label: 'WhatsApp (template utility)' },
                ]}
              />
              <Input size="sm" label="Dia (D+)" type="number" min={0} value={active.day} onChange={(e) => patch(active.id, { day: Math.max(0, Number(e.target.value)) })} />
            </div>
            <Input size="sm" label={active.channel === 'EMAIL' ? 'Assunto' : 'Nome do template'} value={active.subject} onChange={(e) => patch(active.id, { subject: e.target.value })} />
            <Textarea label="Mensagem" rows={7} value={active.body} onChange={(e) => patch(active.id, { body: e.target.value })} />
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 text-[11px] leading-relaxed text-ink-400">
                Variáveis: <Mono>{'{{nome_fantasia}}'}</Mono> <Mono>{'{{cidade}}'}</Mono> <Mono>{'{{uf}}'}</Mono> <Mono>{'{{segmento}}'}</Mono>
              </p>
              <Button
                size="xs"
                variant="ghost"
                leftIcon={<Trash />}
                disabled={sequence.length <= 1}
                onClick={() => {
                  onChange(sequence.filter((s) => s.id !== active.id))
                  setActiveId(sequence.find((s) => s.id !== active.id)?.id)
                }}
              >
                Remover passo
              </Button>
            </div>
            {sample && (
              <div className="rounded-lg border border-dashed border-line-strong bg-ink-50 p-3">
                <div className="mb-1 text-[11px] font-medium text-ink-500">Pré-visualização com {sample.nomeFantasia}</div>
                {active.channel === 'EMAIL' && <div className="text-xs font-semibold text-ink-900">{fillTemplate(active.subject, sample)}</div>}
                <div className="mt-1 text-xs whitespace-pre-line text-ink-700">{fillTemplate(active.body, sample)}</div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState compact title="Sem passos" />
        )}

        <div className="space-y-4 rounded-lg border border-line p-4 md:col-span-2 2xl:col-span-1">
          <div className="text-xs font-semibold text-ink-700">Throttle & regras</div>
          <Select
            size="sm"
            label="Envios por hora"
            value={throttle}
            onChange={(e) => setThrottle(e.target.value)}
            options={['20', '40', '60', '100'].map((v) => ({ value: v, label: `${v} por hora` }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input size="sm" type="time" label="Janela início" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
            <Input size="sm" type="time" label="Janela fim" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
          </div>
          <Switch size="sm" checked={stopOnReply} onChange={setStopOnReply} label="Parar ao responder" description="Resposta → SDR IA assume a conversa" />
          <div className="rounded-md bg-ink-50 p-2.5 text-[11px] text-ink-500">
            Somente dias úteis (America/Belem). Link de descadastro (LGPD) em todo e-mail. Capacidade estimada: {formatNumber(Number(throttle) * 9 * 22)} envios/mês.
          </div>
        </div>
      </div>
    </Card>
  )
}
