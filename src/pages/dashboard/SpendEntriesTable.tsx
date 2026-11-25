import { useMemo, useState } from 'react'
import { FileSpreadsheet, Plus, ReceiptText, Trash, Upload } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ChannelIcon, Modal, Num, Table, Tooltip, toast } from '@/components/ui'
import { useAutomationStore } from '@/store'
import { formatBRL, formatMonthYear } from '@/lib/format'
import { sum } from '@/lib/utils'
import type { AdSpendEntry } from '@/types/domain'
import * as api from '@/mock/api'

const SOURCE: Record<AdSpendEntry['source'], { label: string; tone: 'neutral' | 'info' | 'violet' }> = {
  API_SYNC: { label: 'API', tone: 'info' },
  MANUAL: { label: 'Manual', tone: 'neutral' },
  CSV: { label: 'CSV', tone: 'violet' },
}

export function SpendEntriesTable({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  const entries = useAutomationStore((s) => s.adSpendEntries)
  const remove = useAutomationStore((s) => s.removeAdSpendEntry)
  const [toDelete, setToDelete] = useState<AdSpendEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const sorted = useMemo(() => [...entries].sort((a, b) => b.monthStart.localeCompare(a.monthStart) || a.channel.localeCompare(b.channel) || b.spendBRL - a.spendBRL), [entries])
  const total = sum(entries.map((e) => e.spendBRL))

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await api.delay(300, 700)
      api.maybeFail('remover lançamento')
      remove(toDelete.id)
      toast.success('Lançamento removido', `${toDelete.campaignName} · ${formatBRL(toDelete.spendBRL)}`)
      setToDelete(null)
    } catch (e) {
      toast.error('Não foi possível remover', e instanceof Error ? e.message : undefined)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card padding="none" className="min-w-0">
      <CardHeader
        className="flex-wrap px-5 pt-4 [&>div.flex-1]:basis-48"
        icon={<ReceiptText />}
        title="Lançamentos de investimento"
        description={`${entries.length} lançamentos · ${formatBRL(total)} no total (base do CPL e do Custo/SQL)`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" leftIcon={<Upload />} onClick={onImport}>
              <span className="hidden sm:inline">Importar CSV</span>
            </Button>
            <Button size="sm" leftIcon={<Plus />} onClick={onAdd}>
              <span className="hidden sm:inline">Lançar</span>
            </Button>
          </div>
        }
      />
      <div className="p-4 pt-2">
        <Table compact hover wrapperClassName="max-h-96 rounded-lg border border-line">
          <thead className="sticky top-0 z-10">
            <tr>
              <th>Mês</th>
              <th>Campanha</th>
              <th>Origem</th>
              <th className="text-right">Valor</th>
              <th className="w-10" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap first-letter:uppercase">{formatMonthYear(`${e.monthStart}T12:00:00-03:00`)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={e.channel === 'GOOGLE_ADS' ? 'google' : 'meta'} size="xs" />
                    <div className="min-w-0">
                      <p className="max-w-80 truncate text-ink-800">{e.campaignName}</p>
                      {e.notes && <p className="max-w-80 truncate text-[11px] text-ink-400">{e.notes}</p>}
                    </div>
                  </div>
                </td>
                <td>
                  <Badge size="sm" tone={SOURCE[e.source].tone} icon={e.source === 'CSV' ? <FileSpreadsheet className="size-3" /> : undefined}>
                    {SOURCE[e.source].label}
                  </Badge>
                </td>
                <td><Num className="font-medium text-ink-900">{formatBRL(e.spendBRL)}</Num></td>
                <td>
                  <Tooltip content="Excluir lançamento" side="left">
                    <Button size="icon-sm" variant="ghost" aria-label={`Excluir lançamento ${e.campaignName}`} onClick={() => setToDelete(e)}>
                      <Trash className="size-4 text-ink-400" />
                    </Button>
                  </Tooltip>
                </td>
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-ink-400">
                  Nenhum lançamento. Use “Lançar investimento” ou “Importar CSV”.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <Modal
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        size="sm"
        icon={<Trash />}
        iconTone="danger"
        title="Excluir lançamento?"
        description={toDelete ? `${toDelete.campaignName} · ${formatBRL(toDelete.spendBRL)} (${formatMonthYear(`${toDelete.monthStart}T12:00:00-03:00`)}). O CPL e o Custo/SQL serão recalculados.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Excluir
            </Button>
          </>
        }
      />
    </Card>
  )
}
