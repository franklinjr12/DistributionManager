import { useState } from 'react'
import { Bot, MessageCircle, RotateCcw, ScanSearch, SlidersHorizontal } from 'lucide-react'
import { Badge, Button, PageHeader, Tabs } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useSdrSim } from './useSdrSim'
import { ScenarioPanel } from './ScenarioPanel'
import { ChatPhone } from './ChatPhone'
import { Inspector } from './Inspector'

type Pane = 'scenarios' | 'chat' | 'inspector'

export default function SdrPage() {
  const sim = useSdrSim()
  const [pane, setPane] = useState<Pane>('chat')

  return (
    <>
      <PageHeader
        eyebrow="Módulo 3 · IA SDR"
        title="Simulador SDR IA"
        description="Converse como lead e veja o consultor técnico virtual qualificar, dimensionar e fazer o handoff em tempo real."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info" icon={<Bot className="size-3" />}>
              Motor determinístico (mock gpt-4o-mini)
            </Badge>
            <Button size="sm" variant="outline" leftIcon={<RotateCcw className="size-4" />} onClick={sim.reset}>
              Reiniciar
            </Button>
          </div>
        }
      />

      <div className="mb-4 xl:hidden">
        <Tabs
          variant="pills"
          value={pane}
          onChange={(v) => setPane(v as Pane)}
          items={[
            { value: 'scenarios', label: 'Cenários', icon: <SlidersHorizontal className="size-4" /> },
            { value: 'chat', label: 'Chat', icon: <MessageCircle className="size-4" /> },
            { value: 'inspector', label: 'Inspetor IA', icon: <ScanSearch className="size-4" />, count: sim.turns.length || undefined },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[250px_360px_minmax(0,1fr)] 2xl:grid-cols-[290px_400px_minmax(0,1fr)]">
        <div className={cn(pane !== 'scenarios' && 'hidden', 'xl:block')}>
          <ScenarioPanel sim={sim} onPick={() => setPane('chat')} />
        </div>
        <div className={cn(pane !== 'chat' && 'hidden', 'xl:block')}>
          <div className="xl:sticky xl:top-4">
            <ChatPhone sim={sim} />
          </div>
        </div>
        <div className={cn(pane !== 'inspector' && 'hidden', 'min-w-0 xl:block')}>
          <Inspector sim={sim} />
        </div>
      </div>
    </>
  )
}
