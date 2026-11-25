import { useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleExclamationPoint, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'
import { Badge, Button, ChannelIcon, Modal, Num, Table, toast } from '@/components/ui'
import { useAutomationStore, useCampaignStore } from '@/store'
import { formatBRL, formatMonthYear } from '@/lib/format'
import { cn, sum } from '@/lib/utils'
import * as api from '@/mock/api'
import type { AdCampaign, AdSpendEntry } from '@/types/domain'
import { parseBRL } from './AddSpendModal'

interface Row {
  key: string
  line: number
  monthStart: string
  channel: AdSpendEntry['channel']
  campaignId: string | null
  campaignName: string
  spendBRL: number
  error: string | null
  include: boolean
}

const SAMPLE = `mes;plataforma;campanha;valor
2026-11;Google Ads;Search · Locação Lavadoras & Varredeiras;84,90
2026-11;Meta Ads;Meta · Click-to-WhatsApp Brava & S16;61,35
2026-11;Google Ads;Search · Peças & Manutenção;27,10
2026-11;Meta Ads;Ajuste fatura cartão;12,00
2026-13;Google Ads;Search · Compra Varredeiras & Robótica T16AMR;abc`

function parseCsv(text: string, campaigns: AdCampaign[]): Row[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const sep = lines[0]?.includes(';') ? ';' : ','
  return lines.slice(1).map((l, i) => {
    const [mes = '', plat = '', camp = '', valor = ''] = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''))
    const channel: AdSpendEntry['channel'] = /meta|facebook|instagram/i.test(plat) ? 'META_ADS' : 'GOOGLE_ADS'
    const m = /^(\d{4})-(\d{2})/.exec(mes)
    const monthOk = !!m && Number(m[2]) >= 1 && Number(m[2]) <= 12
    const v = parseBRL(valor)
    const match = campaigns.find((c) => c.name.toLowerCase() === camp.toLowerCase())
    const error = !monthOk ? 'Mês inválido' : !Number.isFinite(v) || v <= 0 ? 'Valor inválido' : null
    return {
      key: `r${i}`,
      line: i + 2,
      monthStart: monthOk ? `${m![1]}-${m![2]}-01` : mes,
      channel,
      campaignId: match?.id ?? null,
      campaignName: match?.name ?? (camp || 'Sem campanha'),
      spendBRL: Number.isFinite(v) ? v : 0,
      error,
      include: !error,
    }
  })
}

type Step = 'pick' | 'parsing' | 'preview'

export function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const campaigns = useCampaignStore((s) => s.campaigns)
  const addEntry = useAutomationStore((s) => s.addAdSpendEntry)
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('pick')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setStep('pick')
      setRows([])
      setFileName('')
    }
  }, [open])

  const load = async (name: string, text: string) => {
    setFileName(name)
    setStep('parsing')
    await api.delay(600, 1100)
    let parsed = parseCsv(text, campaigns)
    if (!parsed.length) parsed = parseCsv(SAMPLE, campaigns)
    setRows(parsed)
    setStep('preview')
  }

  const onFile = (f: File | undefined) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => void load(f.name, String(reader.result ?? ''))
    reader.onerror = () => void load(f.name, SAMPLE)
    reader.readAsText(f)
  }

  const selected = rows.filter((r) => r.include && !r.error)
  const confirm = async () => {
    setSaving(true)
    try {
      await api.delay(500, 1000)
      api.maybeFail('importar CSV')
      for (const r of selected)
        addEntry({ monthStart: r.monthStart, channel: r.channel, campaignId: r.campaignId, campaignName: r.campaignName, spendBRL: Math.round(r.spendBRL * 100) / 100, source: 'CSV', notes: `Importado de ${fileName}` })
      toast.success(`${selected.length} lançamento${selected.length === 1 ? '' : 's'} importado${selected.length === 1 ? '' : 's'}`, `${formatBRL(sum(selected.map((r) => r.spendBRL)))} adicionados ao investimento`)
      onClose()
    } catch (e) {
      toast.error('Falha ao importar', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      size="xl"
      icon={<FileSpreadsheet />}
      title="Importar investimento via CSV"
      description="Colunas esperadas: mes (AAAA-MM); plataforma; campanha; valor — separador ponto e vírgula."
      footer={
        step === 'preview' ? (
          <>
            <Button variant="ghost" onClick={() => setStep('pick')} disabled={saving}>
              Escolher outro arquivo
            </Button>
            <Button loading={saving} disabled={!selected.length} onClick={confirm}>
              Importar {selected.length} linha{selected.length === 1 ? '' : 's'} · {formatBRL(sum(selected.map((r) => r.spendBRL)))}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        )
      }
    >
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {step === 'pick' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              onFile(e.dataTransfer.files?.[0])
            }}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-ink-50/60 px-4 py-10 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none"
          >
            <Upload className="size-6 text-primary-600" />
            <span className="text-sm font-medium text-ink-800">Clique para escolher ou arraste o arquivo .csv</span>
            <span className="text-xs text-ink-500">Exportação do Google Ads / Meta Ads Manager ou planilha própria</span>
          </button>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2">
            <span className="text-xs text-ink-500">Sem arquivo à mão? Teste com um CSV de exemplo (inclui 1 linha com erro).</span>
            <Button size="xs" variant="outline" onClick={() => void load('investimento_nov_2026.csv', SAMPLE)}>
              Usar exemplo
            </Button>
          </div>
        </div>
      )}
      {step === 'parsing' && (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-ink-600">
          <LoaderCircle className="size-6 animate-spin text-primary-600" />
          Lendo <span className="font-medium">{fileName}</span> e conciliando com as campanhas…
        </div>
      )}
      {step === 'preview' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
            <FileSpreadsheet className="size-4 text-ink-400" />
            <span className="font-medium">{fileName}</span>
            <Badge tone="success" size="sm">{rows.filter((r) => !r.error).length} válidas</Badge>
            {rows.some((r) => r.error) && <Badge tone="danger" size="sm">{rows.filter((r) => r.error).length} com erro</Badge>}
          </div>
          <Table compact className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap" wrapperClassName="rounded-lg border border-line">
            <thead>
              <tr>
                <th className="w-8" aria-label="Incluir" />
                <th>Linha</th>
                <th>Mês</th>
                <th>Canal</th>
                <th>Campanha</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={cn(r.error && 'bg-danger-50/50')}>
                  <td>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary-600"
                      aria-label={`Incluir linha ${r.line}`}
                      disabled={!!r.error}
                      checked={r.include && !r.error}
                      onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, include: e.target.checked } : x)))}
                    />
                  </td>
                  <td className="num text-ink-400">{r.line}</td>
                  <td className="whitespace-nowrap first-letter:uppercase">{r.error === 'Mês inválido' ? r.monthStart : formatMonthYear(`${r.monthStart}T12:00:00-03:00`)}</td>
                  <td>
                    <ChannelIcon channel={r.channel === 'GOOGLE_ADS' ? 'google' : 'meta'} size="xs" />
                  </td>
                  <td>
                    <p className="max-w-52 truncate">{r.campaignName}</p>
                    {!r.campaignId && !r.error && <p className="text-[10px] text-ink-400">Sem campanha vinculada (conta)</p>}
                  </td>
                  <td><Num>{r.spendBRL > 0 ? formatBRL(r.spendBRL) : '—'}</Num></td>
                  <td>
                    {r.error ? (
                      <span className="inline-flex items-center gap-1 text-xs text-danger-600">
                        <CircleExclamationPoint className="size-3.5" /> {r.error}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-success-600">
                        <CircleCheck className="size-3.5" /> OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Modal>
  )
}
