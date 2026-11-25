import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Badge, toast } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { estimateTokens } from './lib'

export async function copyText(text: string, label = 'Copiado para a área de transferência') {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(label)
    return true
  } catch {
    toast.error('Não foi possível copiar', 'Permissão de área de transferência negada pelo navegador.')
    return false
  }
}

interface CodeViewerProps {
  title: string
  code: string
  language?: string
  maxHeight?: string
  showTokens?: boolean
  className?: string
}

/** Dark code-style viewer with copy button and optional token estimate. */
export function CodeViewer({ title, code, language = 'markdown', maxHeight = 'max-h-[420px]', showTokens = true, className }: CodeViewerProps) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    if (await copyText(code)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  const lines = code.split('\n').length
  return (
    <div className={cn('overflow-hidden rounded-xl border border-ink-800 bg-ink-900 text-ink-100', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-danger-500/80" />
          <span className="size-2.5 rounded-full bg-warning-500/80" />
          <span className="size-2.5 rounded-full bg-success-500/80" />
        </div>
        <span className="ml-1 truncate text-xs font-medium text-ink-300">{title}</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-300">{language}</span>
        <div className="ml-auto flex items-center gap-2">
          {showTokens && (
            <Badge tone="violet" size="sm" className="num">
              ~{formatNumber(estimateTokens(code))} tokens
            </Badge>
          )}
          <span className="hidden text-[11px] text-ink-400 sm:inline">{lines} linhas</span>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-7 items-center gap-1 rounded-md bg-white/10 px-2.5 text-xs font-medium text-white transition hover:bg-white/20 [&_svg]:size-3.5"
          >
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <pre className={cn('scrollbar-thin overflow-auto p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words', maxHeight)}>{code}</pre>
    </div>
  )
}
