import { useCallback, useState } from 'react'
import { Power, TriangleExclamationPoint } from 'lucide-react'
import type { AdCampaign, CampaignStatus } from '@/types/domain'
import * as api from '@/mock/api'
import { useCampaignStore } from '@/store'
import { Badge, Button, Modal, toast } from '@/components/ui'
import { formatBRL } from '@/lib/format'
import { BUSINESS_DAYS_MONTH, PLATFORM_SHORT, formatSeconds, scheduleSummary } from './lib'

/** Campaigns already confirmed for activation in this browser session. */
const confirmedOnce = new Set<string>()

export interface StatusToggle {
  /** id → target status while the API call is in flight */
  pending: Record<string, CampaignStatus>
  /** request toggle; enabling may open the confirm dialog first */
  request: (ids: string[], target: 'ENABLED' | 'PAUSED') => void
  dialog: React.ReactNode
}

export function useStatusToggle(): StatusToggle {
  const [pending, setPending] = useState<Record<string, CampaignStatus>>({})
  const [confirm, setConfirm] = useState<string[] | null>(null)

  const run = useCallback(async (ids: string[], target: 'ENABLED' | 'PAUSED') => {
    const campaigns = useCampaignStore.getState().campaigns.filter((c) => ids.includes(c.id) && c.status !== target && c.status !== 'REMOVED')
    if (!campaigns.length) return
    setPending((p) => ({ ...p, ...Object.fromEntries(campaigns.map((c) => [c.id, target])) }))
    const t0 = performance.now()
    const results = await Promise.allSettled(campaigns.map((c) => api.patchCampaignStatus(c.id, target)))
    const elapsed = performance.now() - t0
    setPending((p) => {
      const n = { ...p }
      campaigns.forEach((c) => delete n[c.id])
      return n
    })
    const ok = campaigns.filter((_, i) => results[i].status === 'fulfilled')
    const failed = campaigns.length - ok.length
    const verb = target === 'ENABLED' ? 'ativada' : 'pausada'
    if (ok.length === 1) {
      const c = ok[0]
      toast.success(`Campanha ${verb} no ${PLATFORM_SHORT[c.platform]} em ${formatSeconds(elapsed)}`, c.name)
    } else if (ok.length > 1) {
      toast.success(`${ok.length} campanhas ${target === 'ENABLED' ? 'ativadas' : 'pausadas'} em ${formatSeconds(elapsed)}`, 'Status sincronizado com Google Ads API v26 e Meta Marketing API v26.0.')
    }
    if (failed) toast.error(`Falha ao alterar ${failed} campanha${failed > 1 ? 's' : ''}`, 'A plataforma não respondeu. Status mantido — tente novamente.')
  }, [])

  const request = useCallback(
    (ids: string[], target: 'ENABLED' | 'PAUSED') => {
      if (target === 'ENABLED' && ids.some((id) => !confirmedOnce.has(id))) {
        setConfirm(ids)
        return
      }
      void run(ids, target)
    },
    [run],
  )

  const all = useCampaignStore((s) => s.campaigns)
  const toConfirm: AdCampaign[] = confirm ? all.filter((c) => confirm.includes(c.id) && c.status === 'PAUSED') : []
  const totalDaily = toConfirm.reduce((a, c) => a + c.dailyBudgetBRL, 0)

  const dialog = (
    <Modal
      open={!!confirm}
      onClose={() => setConfirm(null)}
      icon={<Power className="size-5" />}
      iconTone="warning"
      title={toConfirm.length > 1 ? `Ativar ${toConfirm.length} campanhas?` : 'Ativar campanha?'}
      description="Esta ação começará a gastar o orçamento assim que a plataforma confirmar."
      footer={
        <>
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button
            variant="success"
            leftIcon={<Power className="size-4" />}
            autoFocus
            onClick={() => {
              const ids = confirm ?? []
              ids.forEach((id) => confirmedOnce.add(id))
              setConfirm(null)
              void run(ids, 'ENABLED')
            }}
          >
            Ativar agora
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <ul className="divide-y divide-line rounded-xl border border-line">
          {toConfirm.map((c) => (
            <li key={c.id} className="space-y-1.5 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-900">{c.name}</span>
                <Badge tone={c.platform === 'GOOGLE' ? 'primary' : 'info'}>{PLATFORM_SHORT[c.platform]}</Badge>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-ink-500">Orçamento</dt>
                  <dd className="num font-medium text-ink-800">{formatBRL(c.dailyBudgetBRL)}/dia</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Geo</dt>
                  <dd className="font-medium text-ink-800">{c.targetStates.join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Horário</dt>
                  <dd className="font-medium text-ink-800">{scheduleSummary(c.schedule)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 rounded-lg bg-warning-50 px-3 py-2.5 text-xs text-warning-700">
          <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" />
          <p>
            Gasto máximo estimado: <strong className="num">{formatBRL(totalDaily)}/dia</strong> ≈{' '}
            <strong className="num">{formatBRL(totalDaily * BUSINESS_DAYS_MONTH, { decimals: 0 })}/mês</strong> ({BUSINESS_DAYS_MONTH} dias úteis). Você pode pausar a
            qualquer momento com 1 clique.
          </p>
        </div>
      </div>
    </Modal>
  )

  return { pending, request, dialog }
}
