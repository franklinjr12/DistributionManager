import { LoaderCircle } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { AdCampaign, CampaignStatus } from '@/types/domain'
import { Badge, Num, StatusPill, Switch, Table, Tooltip } from '@/components/ui'
import { CAMPAIGN_TYPE_LABEL, TONE_HEX, formatBRL, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { GoogleDot, MetaDot } from './ConnectionBar'
import type { RangeMetrics } from './lib'
import { scheduleSummary } from './lib'

export interface CampaignRow {
  campaign: AdCampaign
  m: RangeMetrics
  spark: { date: string; spend: number; leads: number }[]
}

interface Props {
  rows: CampaignRow[]
  selected: Set<string>
  onSelect: (id: string, on: boolean) => void
  onSelectAll: (on: boolean) => void
  pending: Record<string, CampaignStatus>
  onToggle: (c: AdCampaign, enable: boolean) => void
  onOpen: (id: string) => void
  activeId: string | null
}

export function PlatformGlyph({ platform, className }: { platform: AdCampaign['platform']; className?: string }) {
  return (
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white', className)}>
      {platform === 'GOOGLE' ? <GoogleDot className="size-4" /> : <MetaDot className="size-4" />}
    </span>
  )
}

export function CoverageBadge({ c }: { c: AdCampaign }) {
  const cov = c.metrics.trackingCoverage
  const key = c.platform === 'GOOGLE' ? 'UTM/gclid' : 'fbclid'
  if (!c.metrics.leads) return <Badge tone="neutral">Aguardando leads</Badge>
  const tone = cov >= 0.95 ? 'success' : cov >= 0.8 ? 'warning' : 'danger'
  return (
    <Badge tone={tone} dot>
      {formatPercent(cov, 0)} {key}
    </Badge>
  )
}

function Sparkline({ data, id }: { data: CampaignRow['spark']; id: string }) {
  if (data.length < 2 || data.every((d) => d.spend === 0)) return <span className="block h-7 w-20 text-center text-xs leading-7 text-ink-300">—</span>
  return (
    <div className="h-7 w-20" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`sp-${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={TONE_HEX.primary} stopOpacity={0.3} />
              <stop offset="100%" stopColor={TONE_HEX.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="spend" stroke={TONE_HEX.primary} strokeWidth={1.5} fill={`url(#sp-${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CampaignTable({ rows, selected, onSelect, onSelectAll, pending, onToggle, onOpen, activeId }: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.campaign.id))
  const someSelected = rows.some((r) => selected.has(r.campaign.id))
  return (
    <Table hover wrapperClassName="rounded-xl">
      <thead>
        <tr>
          <th className="w-10">
            <input
              type="checkbox"
              aria-label="Selecionar todas as campanhas"
              className="size-4 cursor-pointer rounded border-line-strong accent-primary-600"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && someSelected
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          </th>
          <th className="min-w-[260px]">Campanha</th>
          <th>Status</th>
          <th>Estados</th>
          <th className="text-right!">Orçamento/dia</th>
          <th>Horário</th>
          <th>Rastreamento</th>
          <th className="text-right!">Impr.</th>
          <th className="text-right!">Cliques</th>
          <th className="text-right!">CTR</th>
          <th className="text-right!">Investimento</th>
          <th>Tendência</th>
          <th className="text-right!">Leads</th>
          <th className="text-right!">SQLs</th>
          <th className="text-right!">CPL</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ campaign: c, m, spark }) => {
          const target = pending[c.id]
          const busy = !!target
          const enabled = busy ? target === 'ENABLED' : c.status === 'ENABLED'
          const isSel = selected.has(c.id)
          return (
            <tr
              key={c.id}
              tabIndex={0}
              aria-label={`Abrir ${c.name}`}
              onClick={() => onOpen(c.id)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                  e.preventDefault()
                  onOpen(c.id)
                }
              }}
              className={cn(
                'cursor-pointer outline-none focus-visible:[&>td]:bg-primary-50/70',
                (isSel || activeId === c.id) && '[&>td]:bg-primary-50/50',
              )}
            >
              <td onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${c.name}`}
                  className="size-4 cursor-pointer rounded border-line-strong accent-primary-600"
                  checked={isSel}
                  onChange={(e) => onSelect(c.id, e.target.checked)}
                />
              </td>
              <td>
                <div className="flex items-center gap-3">
                  <PlatformGlyph platform={c.platform} />
                  <div className="min-w-0">
                    <div className="max-w-[300px] truncate font-medium text-ink-900">{c.name}</div>
                    <div className="text-xs text-ink-500">
                      {CAMPAIGN_TYPE_LABEL[c.type]}
                      {c.createdBy === 'AI_BLUEPRINT' && <span className="ml-1.5 text-violet-600">· Gerada por IA</span>}
                    </div>
                  </div>
                </div>
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="flex min-w-[118px] items-center gap-2.5">
                  <label htmlFor={`sw-${c.id}`} className="sr-only">
                    {enabled ? 'Pausar' : 'Ativar'} {c.name}
                  </label>
                  <Switch
                    checked={enabled}
                    disabled={busy || c.status === 'REMOVED'}
                    tone="success"
                    onChange={(on) => onToggle(c, on)}
                    id={`sw-${c.id}`}
                  />
                  {busy ? (
                    <Tooltip content="Sincronizando com a plataforma…">
                      <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                        <LoaderCircle className="size-3.5 animate-spin" />
                        {target === 'ENABLED' ? 'Ativando' : 'Pausando'}
                      </span>
                    </Tooltip>
                  ) : (
                    <StatusPill kind="campaign" value={c.status} />
                  )}
                </div>
              </td>
              <td>
                <div className="flex gap-1">
                  {c.targetStates.map((s) => (
                    <Badge key={s} tone="neutral">
                      {s}
                    </Badge>
                  ))}
                </div>
              </td>
              <td>
                <Num className="font-medium text-ink-900">{formatBRL(c.dailyBudgetBRL)}</Num>
              </td>
              <td className="whitespace-nowrap text-xs text-ink-600">{scheduleSummary(c.schedule)}</td>
              <td className="whitespace-nowrap">
                <CoverageBadge c={c} />
              </td>
              <td>
                <Num>{formatNumber(m.impressions)}</Num>
              </td>
              <td>
                <Num>{formatNumber(m.clicks)}</Num>
              </td>
              <td>
                <Num>{formatPercent(m.ctr, 2)}</Num>
              </td>
              <td>
                <Num className="font-medium text-ink-900">{formatBRL(m.spend)}</Num>
              </td>
              <td>
                <Sparkline data={spark} id={c.id} />
              </td>
              <td>
                <Num>{formatNumber(m.leads)}</Num>
              </td>
              <td>
                <Num className={m.sqls ? 'font-semibold text-success-700' : undefined}>{formatNumber(m.sqls)}</Num>
              </td>
              <td>
                <Num>{formatBRL(m.cpl)}</Num>
              </td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}
