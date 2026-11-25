import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { BadgeDollarSign, Ban, Send, ThumbsDown, Trophy } from 'lucide-react'
import type { KanbanStage, Lead, LossReason, Modality } from '@/types/domain'
import { Badge, Button, Field, Input, Modal, Textarea, toast } from '@/components/ui'
import { useLeadStore } from '@/store'
import { delay } from '@/mock/api'
import { LOSS_REASON_LABEL, MODALITY_LABEL, STAGE_LABEL, formatBRL, isPaidOrigin } from '@/lib/format'
import { cn } from '@/lib/utils'
import { MoneyInput } from './MoneyInput'
import { DISQUALIFY_REASONS } from './helpers'

type CloseOutKind = 'PROPOSAL_SENT' | 'WON' | 'LOST'

interface Ctx {
  /** Request a stage change. Opens the mandatory close-out modal when required. */
  requestMove: (lead: Lead, target: KanbanStage) => void
  /** true while a close-out modal is open (used to block ESC on the drawer) */
  modalOpen: boolean
}

const StageMoveContext = createContext<Ctx | null>(null)

export function useStageMove(): Ctx {
  const ctx = useContext(StageMoveContext)
  if (!ctx) throw new Error('useStageMove fora do StageMoveProvider')
  return ctx
}

function afterMoveToasts(lead: Lead, target: KanbanStage) {
  if (target === 'HANDOFF') {
    toast.success('Brief de 4 linhas enviado ao WhatsApp do Vinicius', 'Template novo_lead_qualificado · IA pausada automaticamente.')
    if (!lead.sqlAt && isPaidOrigin(lead.originTag)) toast.info('Conversão SQL enviada ao Google Ads & Meta CAPI', 'Evento offline em fila (PENDING → SENT).')
    else if (!lead.sqlAt) toast.info('Lead marcado como SQL', 'Origem orgânica — sem conversão offline para enviar.')
  }
}

export function StageMoveProvider({ children }: { children: ReactNode }) {
  const moveLeadStage = useLeadStore((s) => s.moveLeadStage)
  const [pending, setPending] = useState<{ lead: Lead; kind: CloseOutKind } | null>(null)

  const requestMove = useCallback(
    (lead: Lead, target: KanbanStage) => {
      if (lead.kanbanStage === target) return
      if (target === 'DISQUALIFIED') target = 'LOST'
      if (target === 'LOST' && (lead.kanbanStage === 'LOST' || lead.kanbanStage === 'DISQUALIFIED')) return
      if (target === 'PROPOSAL_SENT' || target === 'WON' || target === 'LOST') {
        setPending({ lead, kind: target })
        return
      }
      moveLeadStage(lead.id, target)
      if (target !== 'HANDOFF') toast.success(`Movido para «${STAGE_LABEL[target]}»`, lead.name)
      afterMoveToasts(lead, target)
    },
    [moveLeadStage],
  )

  const value = useMemo(() => ({ requestMove, modalOpen: !!pending }), [requestMove, pending])

  return (
    <StageMoveContext.Provider value={value}>
      {children}
      {pending && <CloseOutModal key={pending.lead.id + pending.kind} lead={pending.lead} kind={pending.kind} onClose={() => setPending(null)} />}
    </StageMoveContext.Provider>
  )
}

// ───────────────────────────── Close-out modal ─────────────────────────────

const LOSS_REASONS: LossReason[] = ['PRECO', 'PRAZO', 'FORA_REGIAO', 'SEM_RETORNO', 'CONCORRENTE', 'CURIOSO_RESIDENCIAL']

function CloseOutModal({ lead, kind, onClose }: { lead: Lead; kind: CloseOutKind; onClose: () => void }) {
  const moveLeadStage = useLeadStore((s) => s.moveLeadStage)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  // PROPOSAL
  const [proposal, setProposal] = useState<number | null>(lead.proposalValueBRL)
  // WON
  const [winMode, setWinMode] = useState<'COMPRA' | 'LOCACAO'>(lead.modality === 'LOCACAO' ? 'LOCACAO' : 'COMPRA')
  const [saleValue, setSaleValue] = useState<number | null>(lead.proposalValueBRL)
  const [monthly, setMonthly] = useState<number | null>(lead.rentalMonthlyBRL)
  const [months, setMonths] = useState<string>(lead.rentalMonths ? String(lead.rentalMonths) : '12')
  // LOST
  const [reason, setReason] = useState<LossReason | null>(null)
  const [notes, setNotes] = useState('')

  const monthsN = Number(months)
  const rentalTotal = monthly && monthsN > 0 ? monthly * monthsN : null

  const valid =
    kind === 'PROPOSAL_SENT'
      ? !!proposal && proposal > 0
      : kind === 'WON'
        ? winMode === 'COMPRA'
          ? !!saleValue && saleValue > 0
          : !!monthly && monthly > 0 && Number.isInteger(monthsN) && monthsN > 0
        : !!reason

  const lostTarget: KanbanStage = reason && DISQUALIFY_REASONS.includes(reason) ? 'DISQUALIFIED' : 'LOST'

  const submit = async () => {
    setTouched(true)
    if (!valid || saving) return
    setSaving(true)
    await delay(350, 700)
    if (kind === 'PROPOSAL_SENT') {
      moveLeadStage(lead.id, 'PROPOSAL_SENT', { proposalValue: proposal! })
      toast.success('Proposta registrada', `${lead.name} · ${formatBRL(proposal)}`)
    } else if (kind === 'WON') {
      const modality: Modality = lead.modality === 'MANUTENCAO_PECAS' && winMode === 'COMPRA' ? 'MANUTENCAO_PECAS' : winMode
      if (winMode === 'LOCACAO') moveLeadStage(lead.id, 'WON', { modality, rentalMonthly: monthly!, rentalMonths: monthsN, closedValue: rentalTotal! })
      else moveLeadStage(lead.id, 'WON', { modality, closedValue: saleValue! })
      toast.success('Negócio ganho!', `${lead.companyName ?? lead.name} · ${formatBRL(winMode === 'LOCACAO' ? rentalTotal : saleValue)}`)
      if (isPaidOrigin(lead.originTag)) toast.info('Conversão WON enviada ao Google Ads & Meta CAPI', 'Valor em BRL anexado ao evento offline.')
    } else {
      moveLeadStage(lead.id, lostTarget, { lossReason: reason!, lossNotes: notes.trim() || undefined })
      toast.warning(lostTarget === 'DISQUALIFIED' ? 'Lead desqualificado' : 'Lead marcado como perdido', `${lead.name} · ${LOSS_REASON_LABEL[reason!]}`)
    }
    setSaving(false)
    onClose()
  }

  const meta = {
    PROPOSAL_SENT: { title: 'Registrar proposta enviada', icon: <Send />, tone: 'warning' as const, cta: 'Confirmar proposta' },
    WON: { title: 'Fechar negócio (Ganho)', icon: <Trophy />, tone: 'success' as const, cta: 'Registrar ganho' },
    LOST: { title: 'Marcar como perdido', icon: <ThumbsDown />, tone: 'danger' as const, cta: lostTarget === 'DISQUALIFIED' ? 'Desqualificar lead' : 'Marcar como perdido' },
  }[kind]

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      persistent
      title={meta.title}
      description={
        <>
          <span className="font-medium text-ink-700">{lead.name}</span>
          {lead.companyName ? ` · ${lead.companyName}` : ''} — close-out obrigatório para mover para «{kind === 'LOST' ? 'Perdido / Desqualificado' : STAGE_LABEL[kind]}».
        </>
      }
      icon={meta.icon}
      iconTone={meta.tone}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant={kind === 'LOST' ? 'danger' : kind === 'WON' ? 'success' : 'primary'} onClick={submit} loading={saving} disabled={touched && !valid}>
            {meta.cta}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {kind === 'PROPOSAL_SENT' && (
          <MoneyInput
            label="Valor estimado da proposta"
            required
            autoFocus
            value={proposal}
            onChange={setProposal}
            error={touched && !valid ? 'Informe o valor estimado (BRL) para continuar.' : undefined}
            hint="Entra no pipeline aberto do Painel ROI."
          />
        )}

        {kind === 'WON' && (
          <>
            <Field label="Modalidade do fechamento" required>
              <div className="grid grid-cols-2 gap-2">
                {(['COMPRA', 'LOCACAO'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWinMode(m)}
                    className={cn(
                      'flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition',
                      winMode === m ? 'border-success-500 bg-success-50 ring-4 ring-success-100' : 'border-line-strong hover:bg-ink-50',
                    )}
                  >
                    <span className="text-sm font-semibold text-ink-900">{m === 'COMPRA' ? 'Venda' : 'Locação'}</span>
                    <span className="text-xs text-ink-500">{m === 'COMPRA' ? 'Valor final do contrato/venda' : 'Mensalidade × meses'}</span>
                  </button>
                ))}
              </div>
            </Field>
            {/* fixed min-height: switching Venda/Locação must not resize (and re-center) the modal,
                otherwise the toggle jumps under the cursor and typing lands nowhere */}
            <div className="flex min-h-[136px] flex-col gap-4">
            {winMode === 'COMPRA' ? (
              <MoneyInput
                label="Valor final da venda"
                required
                autoFocus
                value={saleValue}
                onChange={setSaleValue}
                error={touched && !valid ? 'Valor final obrigatório — não é possível fechar com valor nulo.' : undefined}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                  <MoneyInput label="Mensalidade" required autoFocus value={monthly} onChange={setMonthly} error={touched && !monthly ? 'Informe a mensalidade.' : undefined} />
                  <Input
                    label="Meses de contrato"
                    required
                    type="number"
                    min={1}
                    max={60}
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                    suffix="meses"
                    className="num"
                    error={touched && !(monthsN > 0) ? 'Mín. 1' : undefined}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
                  <span className="text-sm text-ink-600">
                    Total do contrato {monthly && monthsN > 0 ? `(${formatBRL(monthly)} × ${monthsN})` : ''}
                  </span>
                  <span className="num text-lg font-semibold text-success-700">{formatBRL(rentalTotal)}</span>
                </div>
              </>
            )}
            </div>
            {lead.proposalValueBRL != null && (
              <p className="text-xs text-ink-500">
                Proposta estimada: <span className="num font-medium text-ink-700">{formatBRL(lead.proposalValueBRL)}</span>
                {lead.modality ? ` · interesse inicial: ${MODALITY_LABEL[lead.modality]}` : ''}
              </p>
            )}
          </>
        )}

        {kind === 'LOST' && (
          <>
            <Field label="Motivo da perda" required error={touched && !reason ? 'Selecione um motivo estruturado.' : undefined}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LOSS_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-sm font-medium transition',
                      reason === r ? 'border-danger-500 bg-danger-50 text-danger-700 ring-4 ring-danger-100' : 'border-line-strong text-ink-700 hover:bg-ink-50',
                    )}
                  >
                    {LOSS_REASON_LABEL[r]}
                  </button>
                ))}
              </div>
            </Field>
            {reason && (
              <div className="flex items-center gap-2 text-xs text-ink-500">
                Classificação:
                {lostTarget === 'DISQUALIFIED' ? (
                  <Badge tone="neutral" icon={<Ban />}>
                    Desqualificado
                  </Badge>
                ) : (
                  <Badge tone="danger">Perdido</Badge>
                )}
                <span>{lostTarget === 'DISQUALIFIED' ? 'não é ICP — não conta como oportunidade perdida' : 'oportunidade real perdida'}</span>
              </div>
            )}
            <Textarea label="Observações (opcional)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: fechou com concorrente por prazo de entrega menor." />
          </>
        )}
        {kind !== 'LOST' && (
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            <BadgeDollarSign className="size-3.5" /> Valores em BRL alimentam o ROI e as conversões offline (Google Ads / Meta CAPI).
          </p>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
