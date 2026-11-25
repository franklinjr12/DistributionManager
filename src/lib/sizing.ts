import type { DirtProfile, FloorType, Machine, PowerPreference, RecommendedModel, Segment } from '@/types/domain'
import { machines as seedMachines } from '@/mock/data/catalog'
import { formatNumber } from './format'

export interface SizingInput {
  areaM2: number | null
  segment?: Segment | null
  floorType?: FloorType | null
  dirtProfile?: DirtProfile | null
  powerPreference?: PowerPreference | null
  /** true when lead mentions labor shortage / multi-shift (pushes T16AMR) */
  laborShortage?: boolean
  /** need dry sweeping (dust/solid debris) in addition to / instead of washing */
  needsSweeping?: boolean
  /** only sweeping, no washing */
  sweepOnly?: boolean
}

function rec(m: Machine | undefined, reason: string): RecommendedModel | null {
  if (!m) return null
  return { machineId: m.id, modelName: m.model, reason, productivityM2h: m.practicalM2h ?? m.productivityM2h ?? undefined }
}

/**
 * Deterministic SPEC §3.2 heuristic. Returns 1–2 recommended models with pt-BR rationale.
 * Pass `catalog` to respect machines toggled inactive in the catalog store.
 */
export function recommendMachines(input: SizingInput, catalog: Machine[] = seedMachines): RecommendedModel[] {
  const get = (id: string) => catalog.find((m) => m.id === id && m.active)
  const out: (RecommendedModel | null)[] = []
  const area = input.areaM2 ?? 0
  const a = formatNumber(area)

  // Specialized needs
  if (input.floorType === 'carpete_estofado') {
    out.push(rec(get('m_ext52'), 'Extração de sólidos e líquidos com baixo ruído, ideal para carpetes e estofados.'))
  }
  if (input.floorType === 'externo_asfalto' && input.dirtProfile === 'graxa_oleo') {
    out.push(rec(get('m_alfa_pressure_400'), 'Lavagem pesada de graxa incrustada em área externa: 2.320 lbs de pressão máx., 600 L/h.'))
  }

  const sweep = input.needsSweeping || input.sweepOnly || input.dirtProfile === 'detritos_solidos' || input.floorType === 'externo_asfalto'
  if (sweep) {
    if (area >= 3000) out.push(rec(get('m_s16'), `Varredeira a bordo com filtragem multiestágio: ${a} m² cobertos em menos de 1 h (até 10.340 m²/h).`))
    else out.push(rec(get('m_alfa_bizz'), `Varredeira manual silenciosa, sem bateria: até 3.400 m²/h para ${a} m².`))
  }

  if (!input.sweepOnly && input.floorType !== 'externo_asfalto') {
    if (area > 5000 && (input.laborShortage || input.segment === 'CD_LOGISTICA' || input.segment === 'SUPERMERCADO_ATACAREJO')) {
      out.push(rec(get('m_t16amr'), `Robô autônomo BrainOS® (até 5.890 m²/h) resolve a falta de operadores em ${a} m² multi-turno.`))
      if (out.filter(Boolean).length < 2) out.push(rec(get('m_brava'), 'Alternativa operada por pessoa: lavadora a bordo de 870 mm, elegível BNDES.'))
    } else if (area >= 2500) {
      out.push(rec(get('m_brava'), `Lavadora a bordo de 870 mm (prática ~2.015 m²/h): lava ${a} m² em cerca de ${formatNumber(area / 2015, { maxDecimals: 1 })} h e passa em portas de 70 cm.`))
    } else if (area >= 500) {
      const heavy = input.dirtProfile === 'graxa_oleo' || input.segment === 'ALIMENTOS_BEBIDAS'
      if (heavy) out.push(rec(get('m_t600e'), 'Construção industrial robusta para graxa pesada, com opção ec-H2O NanoClean™ sem químicos.'))
      else
        out.push(
          rec(
            get('m_a260'),
            input.powerPreference === 'cabo'
              ? `A260c (cabo): até 2.000 m²/h, faixa de 510 mm — ${a} m² em cerca de ${formatNumber(area / 2000, { maxDecimals: 1 })} h.`
              : `A260 a bateria: até 2.000 m²/h, faixa de 510 mm — ${a} m² em cerca de ${formatNumber(area / 2000, { maxDecimals: 1 })} h.`,
          ),
        )
    } else if (area > 0) {
      out.push(rec(get('m_imop_lite'), `Compacta com giro 360° (até 1.050 m²/h) para ${a} m² com circulação apertada.`))
      if (out.filter(Boolean).length < 2) out.push(rec(get('m_alfa_mini'), 'Alternativa micro: substitui mop e balde lavando com água limpa.'))
    }
  }

  const uniq: RecommendedModel[] = []
  for (const r of out) if (r && !uniq.some((u) => u.machineId === r.machineId)) uniq.push(r)
  return uniq.slice(0, 2)
}
