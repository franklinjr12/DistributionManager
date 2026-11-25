import { useEffect, useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Button, Input, Modal, Select, Textarea, toast } from '@/components/ui'
import { useAutomationStore, useCampaignStore } from '@/store'
import { formatBRL } from '@/lib/format'
import * as api from '@/mock/api'
import type { AdSpendEntry } from '@/types/domain'

export const MONTH_OPTIONS = [
  { value: '2026-11-01', label: 'Novembro/2026' },
  { value: '2026-10-01', label: 'Outubro/2026' },
]

/** Parses "1.234,56" / "1234.56" / "1234" → number. */
export function parseBRL(raw: string): number {
  const s = raw.replace(/[R$\s]/g, '')
  if (!s) return NaN
  const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Number(norm)
}

export function AddSpendModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const campaigns = useCampaignStore((s) => s.campaigns)
  const addEntry = useAutomationStore((s) => s.addAdSpendEntry)
  const [channel, setChannel] = useState<AdSpendEntry['channel']>('GOOGLE_ADS')
  const [campaignId, setCampaignId] = useState('')
  const [month, setMonth] = useState(MONTH_OPTIONS[0].value)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setChannel('GOOGLE_ADS')
      setCampaignId('')
      setMonth(MONTH_OPTIONS[0].value)
      setAmount('')
      setNotes('')
      setTouched(false)
    }
  }, [open])

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'Conta inteira (sem campanha específica)' },
      ...campaigns.filter((c) => c.status !== 'REMOVED' && (c.platform === 'GOOGLE') === (channel === 'GOOGLE_ADS')).map((c) => ({ value: c.id, label: c.name })),
    ],
    [campaigns, channel],
  )

  const value = parseBRL(amount)
  const error = touched && (!Number.isFinite(value) || value <= 0) ? 'Informe um valor maior que zero' : touched && value > 50_000 ? 'Valor acima do limite de R$ 50.000' : undefined

  const save = async () => {
    setTouched(true)
    if (!Number.isFinite(value) || value <= 0 || value > 50_000) return
    setSaving(true)
    try {
      await api.delay(400, 900)
      api.maybeFail('lançar investimento')
      const camp = campaigns.find((c) => c.id === campaignId)
      addEntry({
        monthStart: month,
        channel,
        campaignId: camp?.id ?? null,
        campaignName: camp?.name ?? (channel === 'GOOGLE_ADS' ? 'Google Ads · conta' : 'Meta Ads · conta'),
        spendBRL: Math.round(value * 100) / 100,
        source: 'MANUAL',
        notes: notes.trim() || null,
      })
      toast.success('Investimento lançado', `${formatBRL(value)} · CPL e Custo/SQL recalculados`)
      onClose()
    } catch (e) {
      toast.error('Falha ao lançar investimento', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      icon={<Wallet />}
      title="Lançar investimento"
      description="Registre manualmente um gasto de mídia (ex.: fatura do cartão ou ajuste fora da API)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={save}>
            Salvar lançamento
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Select
          label="Plataforma"
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value as AdSpendEntry['channel'])
            setCampaignId('')
          }}
          options={[
            { value: 'GOOGLE_ADS', label: 'Google Ads' },
            { value: 'META_ADS', label: 'Meta Ads (Facebook + Instagram)' },
          ]}
        />
        <Select label="Período" value={month} onChange={(e) => setMonth(e.target.value)} options={MONTH_OPTIONS} />
        <Select label="Campanha" wrapperClassName="sm:col-span-2" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} options={campaignOptions} />
        <Input
          label="Valor (R$)"
          prefix="R$"
          inputMode="decimal"
          placeholder="0,00"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => setTouched(true)}
          error={error}
          hint={!error && Number.isFinite(value) && value > 0 ? formatBRL(value) : 'Use vírgula para centavos'}
        />
        <Textarea label="Observação (opcional)" wrapperClassName="sm:col-span-2" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: ajuste de fatura Meta de novembro" />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
