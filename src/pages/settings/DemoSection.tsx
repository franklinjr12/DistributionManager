import { useState } from 'react'
import { FlaskConical, RotateCcw, TriangleExclamationPoint } from 'lucide-react'
import { Badge, Button, Modal, toast } from '@/components/ui'
import { useUiStore } from '@/store'
import { formatNumber, formatPercent } from '@/lib/format'
import { Note, Row, Section } from './shared'

const LATENCY_STEPS = [0.25, 0.5, 1, 1.5, 2, 3]

export function DemoSection() {
  const failure = useUiStore((s) => s.mockFailureRate)
  const latency = useUiStore((s) => s.latencyMultiplier)
  const setFailure = useUiStore((s) => s.setMockFailureRate)
  const setLatency = useUiStore((s) => s.setLatencyMultiplier)
  const [confirm, setConfirm] = useState(false)

  const latencyIdx = Math.max(0, LATENCY_STEPS.findIndex((v) => v >= latency))
  const minMs = Math.round(300 * latency)
  const maxMs = Math.round(1500 * latency)

  return (
    <Section title="Modo demonstração" description="Controles para apresentar estados de carregamento e erro. Aplicam-se imediatamente." icon={<FlaskConical />}>
      <Row label="Taxa de falha simulada" hint="Probabilidade de qualquer chamada mock falhar (toasts de erro, retry).">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.05}
            value={failure}
            onChange={(e) => setFailure(Number(e.target.value))}
            className="w-full max-w-sm accent-danger-600"
            aria-label="Taxa de falha simulada"
          />
          <Badge tone={failure === 0 ? 'success' : failure < 0.2 ? 'warning' : 'danger'} size="md" className="num w-16 justify-center">
            {formatPercent(failure, 0)}
          </Badge>
        </div>
        {failure > 0 && (
          <Note tone="warning" icon={<TriangleExclamationPoint />}>
            Cerca de 1 em cada {Math.round(1 / failure)} ações (salvar, testar conexão, gerar campanha…) vai falhar de propósito.
          </Note>
        )}
      </Row>
      <Row label="Multiplicador de latência" hint="Escala o atraso das APIs mock (padrão 300–1.500 ms).">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={LATENCY_STEPS.length - 1}
            step={1}
            value={latencyIdx}
            onChange={(e) => setLatency(LATENCY_STEPS[Number(e.target.value)])}
            className="w-full max-w-sm accent-primary-600"
            aria-label="Multiplicador de latência"
          />
          <Badge tone="primary" size="md" className="num w-16 justify-center">
            {formatNumber(latency, { maxDecimals: 2 })}×
          </Badge>
        </div>
        <div className="mt-1 text-xs text-ink-500 num">
          Atraso atual: {formatNumber(minMs)}–{formatNumber(maxMs)} ms por chamada
        </div>
      </Row>
      <Row label="Atalhos">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => (setFailure(0), setLatency(1), toast.success('Modo demonstração padrão'))}>
            Padrão
          </Button>
          <Button size="sm" variant="outline" onClick={() => (setFailure(0), setLatency(0.25), toast.info('Modo apresentação rápida', 'Latência 0,25×, sem falhas.'))}>
            Apresentação rápida
          </Button>
          <Button size="sm" variant="outline" onClick={() => (setFailure(0.3), setLatency(2), toast.warning('Modo caos', '30% de falhas e latência 2×.'))}>
            Modo caos
          </Button>
        </div>
      </Row>
      <Row label="Dados de demonstração" hint="Todos os dados vivem em memória; recarregar volta ao estado inicial (sex 20/11/2026 10:30).">
        <Button variant="danger" size="sm" leftIcon={<RotateCcw />} onClick={() => setConfirm(true)}>
          Restaurar dados de demonstração
        </Button>
      </Row>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Restaurar dados de demonstração?"
        description="Leads, conversas, campanhas e configurações alterados nesta sessão serão descartados. A página será recarregada."
        icon={<RotateCcw />}
        iconTone="danger"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => window.location.reload()}>
              Restaurar e recarregar
            </Button>
          </>
        }
      />
    </Section>
  )
}
