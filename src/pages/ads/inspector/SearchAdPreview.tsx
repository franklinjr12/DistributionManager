import { useState } from 'react'
import { EllipsisVertical, Shuffle } from 'lucide-react'
import type { AdGroup } from '@/types/domain'
import { Button } from '@/components/ui'
import { domainFromUrl } from '../lib'

/** Live mock of a Google Search responsive ad (desktop SERP style). */
export function SearchAdPreview({ group }: { group: AdGroup }) {
  const [seed, setSeed] = useState(0)
  const hs = group.headlines.map((h) => h.trim()).filter(Boolean)
  const ds = group.descriptions.map((h) => h.trim()).filter(Boolean)
  const pick = <T,>(arr: T[], n: number) => Array.from({ length: Math.min(n, arr.length) }, (_, i) => arr[(seed * n + i) % arr.length])
  const headline = pick(hs, 3).join(' | ')
  const desc = pick(ds, 2).join(' ')
  const { host, path } = domainFromUrl(group.finalUrl)
  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Prévia · Pesquisa Google</span>
        <Button size="xs" variant="ghost" leftIcon={<Shuffle className="size-3.5" />} onClick={() => setSeed((s) => s + 1)}>
          Outra combinação
        </Button>
      </div>
      <div className="px-4 py-4 font-[Arial,sans-serif]" aria-live="polite">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full border border-line bg-ink-50 text-xs font-bold text-primary-700">M</span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm text-[#202124]">Maquinabel</div>
            <div className="truncate text-xs text-[#4d5156]">
              {host}
              {path && <span> › {path.replace(/^\//, '').split('/').join(' › ')}</span>}
            </div>
          </div>
          <EllipsisVertical className="size-4 text-ink-400" />
        </div>
        <div className="mt-1 text-xs font-bold text-[#202124]">Patrocinado</div>
        <div className="mt-1 text-lg leading-snug text-[#1a0dab] hover:underline">{headline || 'Adicione títulos para ver a prévia'}</div>
        <p className="mt-1 text-sm leading-snug text-[#4d5156]">{desc || 'Adicione descrições para ver a prévia.'}</p>
      </div>
    </div>
  )
}
