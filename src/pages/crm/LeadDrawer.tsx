import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpDown, ChevronDown, ClipboardList, MessageCircle, Moon, Phone, X } from 'lucide-react'
import { Avatar, Badge, Button, ChannelIcon, Dropdown, DropdownItem, DropdownSeparator, StatusPill, Tabs } from '@/components/ui'
import { useConversationByLead, useLead } from '@/store'
import { STAGE_LABEL, STAGE_TONE, TONE_DOT, formatPhone, originChannel } from '@/lib/format'
import type { KanbanStage } from '@/types/domain'
import { cn } from '@/lib/utils'
import { ConversationPanel } from './ConversationPanel'
import { DetailTabs } from './DetailTabs'
import { AiStatusBadge, OriginChip } from './LeadCard'
import { isAfterHours, waLink } from './helpers'
import { useStageMove } from './stageMove'
import { pushOverlay } from '@/components/ui/overlay'

const MOVE_TARGETS: KanbanStage[] = ['NEW', 'QUALIFYING', 'HANDOFF', 'PROPOSAL_SENT', 'WON', 'LOST']

export function LeadDrawer({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const lead = useLead(leadId)
  const conv = useConversationByLead(leadId)
  const { requestMove } = useStageMove()
  const [mobileTab, setMobileTab] = useState<'chat' | 'details'>('chat')

  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!leadId) return
    // shared overlay stack: Escape closes only the topmost overlay (stage-move modal first)
    const pop = pushOverlay(() => closeRef.current())
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      pop()
      document.body.style.overflow = prev
    }
  }, [leadId])

  useEffect(() => setMobileTab('chat'), [leadId])

  if (!leadId) return null
  if (!lead)
    return createPortal(
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/35" onClick={onClose}>
        <div className="rounded-2xl bg-white p-6 text-sm text-ink-600 shadow-pop">Lead «{leadId}» não encontrado.</div>
      </div>,
      document.body,
    )

  const wa = waLink(lead.phoneE164)

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/35" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={`Lead ${lead.name}`} className="absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col bg-white shadow-pop lg:max-w-[1180px]">
        {/* header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <Avatar name={lead.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold text-ink-900">{lead.name}</h2>
              <StatusPill kind="stage" value={lead.kanbanStage} />
              <AiStatusBadge conv={conv} />
              {isAfterHours(lead) && (
                <Badge tone="neutral" icon={<Moon />}>
                  Fora do horário
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
              <span className="truncate">{lead.companyName ?? 'Empresa não informada'}</span>
              <span className="text-ink-300">·</span>
              <ChannelIcon channel={originChannel(lead.originTag)} size="xs" />
              <OriginChip tag={lead.originTag} />
              {lead.phoneE164 && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {formatPhone(lead.phoneE164)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-whatsapp px-3 text-sm font-medium text-white shadow-sm hover:bg-whatsapp-dark"
              >
                <ChannelIcon channel="whatsapp" variant="plain" size="sm" className="text-white [&_span]:text-white" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            <Dropdown
              width="w-60"
              trigger={(open) => (
                <Button size="sm" variant="outline" leftIcon={<ArrowUpDown />} rightIcon={<ChevronDown className={cn('transition', open && 'rotate-180')} />}>
                  <span className="hidden sm:inline">Mover etapa</span>
                </Button>
              )}
            >
              {(close) => (
                <>
                  <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">Mover para</div>
                  {MOVE_TARGETS.map((s, i) => {
                    const current = lead.kanbanStage === s || (s === 'LOST' && lead.kanbanStage === 'DISQUALIFIED')
                    return (
                      <div key={s}>
                        {i === 4 && <DropdownSeparator />}
                        <DropdownItem
                          active={current}
                          disabled={current}
                          icon={<span className={cn('mt-1 block size-2 rounded-full', TONE_DOT[STAGE_TONE[s]])} />}
                          description={s === 'PROPOSAL_SENT' || s === 'WON' || s === 'LOST' ? 'Close-out obrigatório' : s === 'HANDOFF' ? 'Envia brief ao Vinicius' : undefined}
                          onClick={() => {
                            close()
                            requestMove(lead, s)
                          }}
                        >
                          {s === 'LOST' ? 'Perdido / Desqualificado' : STAGE_LABEL[s]}
                        </DropdownItem>
                      </div>
                    )
                  })}
                </>
              )}
            </Dropdown>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
        </header>

        {/* mobile tabs */}
        <Tabs
          className="shrink-0 px-3 lg:hidden"
          size="sm"
          value={mobileTab}
          onChange={(v) => setMobileTab(v as 'chat' | 'details')}
          items={[
            { value: 'chat', label: 'Conversa', icon: <MessageCircle /> },
            { value: 'details', label: 'Detalhes', icon: <ClipboardList /> },
          ]}
        />

        <div className="flex min-h-0 flex-1">
          <div className={cn('min-h-0 min-w-0 flex-1 flex-col border-line lg:flex lg:border-r', mobileTab === 'chat' ? 'flex' : 'hidden')}>
            <ConversationPanel lead={lead} conv={conv} />
          </div>
          <div className={cn('min-h-0 w-full flex-col lg:flex lg:w-[480px] lg:shrink-0', mobileTab === 'details' ? 'flex' : 'hidden')}>
            <DetailTabs key={lead.id} lead={lead} conv={conv} />
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
