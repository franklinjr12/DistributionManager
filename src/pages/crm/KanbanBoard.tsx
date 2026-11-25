import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { Inbox } from 'lucide-react'
import type { Conversation, KanbanStage, Lead } from '@/types/domain'
import { formatBRL, TONE_DOT } from '@/lib/format'
import { cn, sum } from '@/lib/utils'
import { COLUMNS, columnOf, type ColumnDef } from './helpers'
import { LeadCard } from './LeadCard'
import { useStageMove } from './stageMove'

/** Keyboard: ←/→ jump to the previous/next column (↑/↓ ignored). */
const columnKeyboardGetter: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  const dir = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0
  if (!dir) return
  event.preventDefault()
  const rects = COLUMNS.map((c) => ({ id: c.id, rect: context.droppableRects.get(c.id) })).filter((r) => r.rect)
  const cr = context.collisionRect
  const cx = cr ? cr.left + cr.width / 2 : currentCoordinates.x
  let idx = rects.findIndex((r) => r.rect!.left <= cx && cx <= r.rect!.right)
  if (idx < 0) idx = rects.findIndex((r) => r.id === context.over?.id)
  const next = rects[Math.min(rects.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + dir))]
  if (!next?.rect) return
  return { x: next.rect.left + 6, y: currentCoordinates.y }
}

interface Props {
  leads: Lead[]
  convByLead: Map<string, Conversation>
  onOpen: (id: string) => void
}

export function KanbanBoard({ leads, convByLead, onOpen }: Props) {
  const { requestMove } = useStageMove()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] }, coordinateGetter: columnKeyboardGetter }),
  )

  const byColumn = useMemo(() => {
    const out = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as Lead[]])) as Record<string, Lead[]>
    for (const l of leads) out[columnOf(l.kanbanStage)]?.push(l)
    for (const k of Object.keys(out)) out[k].sort((a, b) => b.stageChangedAt.localeCompare(a.stageChangedAt))
    return out
  }, [leads])

  const active = activeId ? leads.find((l) => l.id === activeId) : undefined

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const lead = leads.find((l) => l.id === e.active.id)
    const target = e.over?.id as KanbanStage | undefined
    if (!lead || !target || columnOf(lead.kanbanStage) === target) return
    requestMove(lead, target)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        screenReaderInstructions: { draggable: 'Pressione espaço para pegar o card, use as setas para mover entre colunas e espaço novamente para soltar. ESC cancela.' },
      }}
    >
      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((col) => (
            <Column key={col.id} col={col} leads={byColumn[col.id]} convByLead={convByLead} onOpen={onOpen} activeId={activeId} activeLead={active} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
        {active ? <LeadCard lead={active} conv={convByLead.get(active.id)} overlay className="w-[272px]" /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({
  col,
  leads,
  convByLead,
  onOpen,
  activeId,
  activeLead,
}: {
  col: ColumnDef
  leads: Lead[]
  convByLead: Map<string, Conversation>
  onOpen: (id: string) => void
  activeId: string | null
  activeLead: Lead | undefined
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const total = col.sum === 'proposal' ? sum(leads.map((l) => l.proposalValueBRL ?? 0)) : col.sum === 'closed' ? sum(leads.map((l) => l.closedValueBRL ?? 0)) : null
  const isSource = activeLead && columnOf(activeLead.kanbanStage) === col.id
  const needsCloseOut = col.id === 'PROPOSAL_SENT' || col.id === 'WON' || col.id === 'LOST'
  const lostCount = col.id === 'LOST' ? leads.filter((l) => l.kanbanStage === 'LOST').length : 0

  return (
    <section
      ref={setNodeRef}
      aria-label={col.label}
      className={cn(
        'flex w-[284px] shrink-0 flex-col rounded-2xl border bg-ink-50/70 transition-colors',
        isOver && !isSource ? 'border-primary-400 bg-primary-50/60' : 'border-line',
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={cn('size-2 rounded-full', TONE_DOT[col.tone])} />
        <h3 className="truncate text-sm font-semibold text-ink-800">{col.label}</h3>
        <span className="rounded-full bg-white px-1.5 text-xs font-semibold text-ink-600 ring-1 ring-line">{leads.length}</span>
        {total != null && <span className="num ml-auto text-xs font-semibold text-ink-700">{formatBRL(total, { compact: true, decimals: 0 })}</span>}
        {col.id === 'LOST' && leads.length > 0 && (
          <span className="ml-auto text-[11px] text-ink-500">
            {lostCount} perd. · {leads.length - lostCount} desq.
          </span>
        )}
      </header>
      {activeLead && !isSource && needsCloseOut && (
        <div className="mx-3 mb-1 rounded-md bg-white/80 px-2 py-1 text-[11px] text-ink-500 ring-1 ring-line">Soltar abre o close-out obrigatório</div>
      )}
      <div className="scrollbar-thin flex max-h-[calc(100vh-300px)] min-h-[160px] flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {leads.length === 0 ? (
          <div className={cn('flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-8 text-center', isOver ? 'border-primary-400' : 'border-line-strong')}>
            <Inbox className="size-5 text-ink-300" />
            <p className="text-xs text-ink-400">{col.emptyHint}</p>
          </div>
        ) : (
          leads.map((l) => <DraggableCard key={l.id} lead={l} conv={convByLead.get(l.id)} onOpen={onOpen} hidden={activeId === l.id} />)
        )}
      </div>
    </section>
  )
}

function DraggableCard({ lead, conv, onOpen, hidden }: { lead: Lead; conv: Conversation | undefined; onOpen: (id: string) => void; hidden: boolean }) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: lead.id })
  return (
    <LeadCard
      ref={setNodeRef}
      lead={lead}
      conv={conv}
      dragging={hidden}
      {...attributes}
      {...listeners}
      aria-label={`${lead.name} — abrir ou arrastar`}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !hidden) onOpen(lead.id)
        listeners?.onKeyDown?.(e)
      }}
    />
  )
}
