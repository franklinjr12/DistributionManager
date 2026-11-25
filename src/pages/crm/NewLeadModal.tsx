import { useState } from 'react'
import { UserRound } from 'lucide-react'
import type { AttributionChannel, ConversationChannel, Modality } from '@/types/domain'
import { Button, Input, Modal, Select, toast } from '@/components/ui'
import { useLeadStore } from '@/store'
import { delay } from '@/mock/api'
import { MODALITY_LABEL, ORIGIN_LABEL, UF_NAME, originChannel } from '@/lib/format'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const EMPTY = { name: '', company: '', phone: '', city: '', state: 'PA', modality: '', origin: 'WhatsApp_Direto' }

export function NewLeadModal({ open, onClose, onCreated }: Props) {
  const createLead = useLeadStore((s) => s.createLead)
  const [f, setF] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }))

  const phoneDigits = f.phone.replace(/\D/g, '')
  const errors = {
    name: !f.name.trim() ? 'Nome obrigatório' : undefined,
    phone: phoneDigits && phoneDigits.length < 10 ? 'Telefone incompleto' : undefined,
  }
  const valid = !errors.name && !errors.phone

  const close = () => {
    if (saving) return
    setF(EMPTY)
    setTouched(false)
    onClose()
  }

  const submit = async () => {
    setTouched(true)
    if (!valid) return
    setSaving(true)
    await delay(400, 900)
    const ch = originChannel(f.origin)
    const channel: ConversationChannel = ch === 'instagram' ? 'INSTAGRAM' : ch === 'site' ? 'WIDGET' : 'WHATSAPP'
    const attributionChannel: AttributionChannel =
      ch === 'google' ? 'GOOGLE_AD' : ch === 'meta' ? 'META_AD' : ch === 'instagram' ? 'IG_DM' : ch === 'site' ? 'WEB_WIDGET' : ch === 'outbound' ? 'OUTBOUND' : 'WHATSAPP_DIRECT'
    const lead = createLead({
      name: f.name.trim(),
      companyName: f.company.trim() || null,
      isB2B: f.company.trim() ? true : null,
      phoneE164: phoneDigits ? `+55${phoneDigits}` : null,
      locationCity: f.city.trim() || null,
      locationState: f.state || null,
      modality: (f.modality || null) as Modality | null,
      originTag: f.origin,
      channel,
      attributionChannel,
    })
    setSaving(false)
    toast.success('Lead criado', `${lead.name} entrou em «Novos».`)
    setF(EMPTY)
    setTouched(false)
    onClose()
    onCreated(lead.id)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Novo lead"
      description="Cadastro manual (ex.: indicação, ligação). A IA pode assumir a triagem depois."
      icon={<UserRound />}
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} disabled={touched && !valid}>
            Criar lead
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Input label="Nome" required autoFocus value={f.name} onChange={set('name')} error={touched ? errors.name : undefined} placeholder="Ex.: Carla Menezes" />
        <Input label="Empresa" value={f.company} onChange={set('company')} placeholder="Ex.: Atacadão Norte Ltda." />
        <Input
          label="WhatsApp"
          inputMode="tel"
          value={f.phone}
          onChange={(e) => setF((p) => ({ ...p, phone: maskPhone(e.target.value) }))}
          error={touched ? errors.phone : undefined}
          placeholder="(91) 98888-7777"
          prefix="+55"
          className="pl-11!"
        />
        <Select
          label="Origem (tag)"
          value={f.origin}
          onChange={set('origin')}
          options={Object.keys(ORIGIN_LABEL).map((k) => ({ value: k, label: `${k} — ${ORIGIN_LABEL[k]}` }))}
        />
        <Input label="Cidade" value={f.city} onChange={set('city')} placeholder="Ex.: Belém" />
        <Select
          label="UF"
          value={f.state}
          onChange={set('state')}
          options={Object.keys(UF_NAME).map((k) => ({ value: k, label: `${k} — ${UF_NAME[k]}${['PA', 'MA', 'AP'].includes(k) ? '' : ' (fora da cobertura)'}` }))}
        />
        <Select
          label="Modalidade"
          value={f.modality}
          onChange={set('modality')}
          wrapperClassName="sm:col-span-2"
          options={[{ value: '', label: 'A definir (IA vai perguntar)' }, ...(Object.keys(MODALITY_LABEL) as Modality[]).map((m) => ({ value: m, label: MODALITY_LABEL[m] }))]}
        />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  )
}
