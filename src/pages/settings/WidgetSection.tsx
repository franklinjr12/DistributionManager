import { useMemo, useState } from 'react'
import { Code, ExternalLink, Link, QrCode, RefreshCw } from 'lucide-react'
import { Badge, Button, Input, Textarea } from '@/components/ui'
import { useTenantStore } from '@/store'
import { cn, hashString, sessionCode } from '@/lib/utils'
import { CopyButton, Note, Row, Section } from './shared'

const PARAMS: { key: string; desc: string; sample: string }[] = [
  { key: 'utm_source', desc: 'Origem (google, meta, instagram)', sample: 'google' },
  { key: 'utm_medium', desc: 'Mídia (cpc, paid_social, organic)', sample: 'cpc' },
  { key: 'utm_campaign', desc: 'Campanha', sample: 'locacao_belem' },
  { key: 'utm_term', desc: 'Termo de pesquisa', sample: 'aluguel lavadora de piso' },
  { key: 'utm_content', desc: 'Variação do anúncio', sample: 'rsa_v2' },
  { key: 'gclid', desc: 'Clique Google Ads → conversão offline', sample: 'Cj0KCQiA…' },
  { key: 'fbclid', desc: 'Clique Meta → CAPI', sample: 'IwAR2x…' },
]

/** Deterministic QR-like placeholder (not a scannable QR). */
function QrTile({ seed, className }: { seed: string; className?: string }) {
  const n = 25
  const cells = useMemo(() => {
    let h = hashString(seed)
    const out: boolean[] = []
    for (let i = 0; i < n * n; i++) {
      h = (h * 1664525 + 1013904223) >>> 0
      out.push((h >>> 16) % 100 < 46)
    }
    return out
  }, [seed])
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
    return inBox(0, 0) || inBox(n - 7, 0) || inBox(0, n - 7)
  }
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className={cn('rounded-lg bg-white ring-1 ring-line', className)} shapeRendering="crispEdges">
      {cells.map((on, i) => {
        const x = i % n
        const y = Math.floor(i / n)
        if (finder(x, y) || !on) return null
        return <rect key={i} x={x} y={y} width={1} height={1} fill="#0f172a" />
      })}
      {[
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={7} height={7} fill="#0f172a" />
          <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="#0f172a" />
        </g>
      ))}
    </svg>
  )
}

export function WidgetSection() {
  const tenant = useTenantStore((s) => s.tenant)
  const [phone, setPhone] = useState(tenant.handoffWhatsappPhone.replace(/\D/g, ''))
  const [code, setCode] = useState('MQ-4821')
  const [text, setText] = useState('Olá! Vim pelo site e quero um orçamento de máquina de limpeza. Código: #{code}')
  const [landing, setLanding] = useState('https://vendas.maquinabel.com.br/brava')
  const [utm, setUtm] = useState({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'locacao_belem', utm_term: '', utm_content: '' })

  const filledText = text.replace('{code}', code)
  const waUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(filledText)}`
  const landingUrl = useMemo(() => {
    const qs = Object.entries(utm)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`)
      .join('&')
    return qs ? `${landing}${landing.includes('?') ? '&' : '?'}${qs}` : landing
  }, [landing, utm])

  const snippet = `<!-- Maquinabel · Central de Aquisição (WPCode → Header) -->
<script>
  window.MQ_WIDGET = {
    tenant: "${tenant.slug}",
    whatsapp: "${phone}",
    capture: ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","fbclid"],
    lgpdNotice: "Ao enviar, você autoriza o contato da ${tenant.name} para retorno comercial."
  };
</script>
<script async src="https://cdn.centraldeaquisicao.app/widget/v1/typebot-bridge.js"
        data-session-endpoint="/api/v1/widget/session"
        data-lead-endpoint="/api/v1/widget/lead"></script>`

  return (
    <>
      <Section
        title="Widget do site (Typebot via WPCode)"
        description="Instalado em maquinabel.com.br e vendas.maquinabel.com.br. Cria a sessão de atribuição e gera o link wa.me rastreado."
        icon={<Code />}
        actions={<CopyButton text={snippet} label="Copiar snippet" />}
      >
        <pre className="scrollbar-thin overflow-x-auto rounded-xl bg-ink-900 p-4 font-mono text-[12px] leading-relaxed text-ink-100">{snippet}</pre>
        <Note>
          No WordPress: <b>WPCode → Adicionar snippet → HTML</b>, local “Site Wide Header”. O Shadow DOM widget próprio (Preact) fica para a v2.
        </Note>
      </Section>

      <Section title="Gerador de link wa.me rastreado" description="O código #MQ-XXXX na mensagem liga a conversa do WhatsApp à sessão (UTMs/gclid/fbclid)." icon={<Link />} className="mt-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input label="WhatsApp de destino (E.164 sem +)" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <div className="flex items-end gap-2">
                <Input label="Código de sessão" value={code} readOnly wrapperClassName="w-32" className="font-mono" />
                <Button variant="outline" size="icon" aria-label="Gerar novo código" title="Gerar novo código" onClick={() => setCode(sessionCode())}>
                  <RefreshCw />
                </Button>
              </div>
            </div>
            <Textarea label="Texto pré-preenchido" hint="Use {code} onde o código de sessão deve aparecer." rows={2} value={text} onChange={(e) => setText(e.target.value)} />
            {!text.includes('{code}') && <Note tone="warning">Sem {'{code}'} a conversa não poderá ser atribuída à campanha.</Note>}
            <Input label="Landing page" value={landing} onChange={(e) => setLanding(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(utm) as (keyof typeof utm)[]).map((k) => (
                <Input key={k} size="sm" label={k} value={utm[k]} placeholder="—" onChange={(e) => setUtm((u) => ({ ...u, [k]: e.target.value }))} />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <QrTile seed={waUrl} className="size-48" />
            <span className="flex items-center gap-1 text-[11px] text-ink-400">
              <QrCode className="size-3.5" /> Prévia ilustrativa
            </span>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-ink-50 p-4 ring-1 ring-line">
          {[
            { label: 'Link da landing com UTMs', url: landingUrl },
            { label: 'Link wa.me rastreado', url: waUrl },
          ].map((l) => (
            <div key={l.label}>
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-ink-600">
                {l.label}
                <div className="ml-auto flex gap-1">
                  <CopyButton text={l.url} variant="ghost" />
                  <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-ink-600 hover:bg-ink-100">
                    <ExternalLink className="size-3.5" /> Abrir
                  </a>
                </div>
              </div>
              <code className="block rounded-md bg-surface px-3 py-2 font-mono text-xs break-all text-primary-700 ring-1 ring-line">{l.url}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Parâmetros capturados" description="Gravados em lead_attributions na criação da sessão." className="mt-5">
        <Row label="Por sessão" hint="Também: landing_url, referrer e session_code.">
          <div className="divide-y divide-line rounded-lg ring-1 ring-line">
            {PARAMS.map((p) => (
              <div key={p.key} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <code className="w-28 font-mono text-xs font-semibold text-ink-800">{p.key}</code>
                <span className="flex-1 text-xs text-ink-500">{p.desc}</span>
                <Badge tone={p.key.endsWith('clid') ? 'violet' : 'neutral'} className="font-mono">
                  {p.sample}
                </Badge>
              </div>
            ))}
          </div>
        </Row>
      </Section>
    </>
  )
}
