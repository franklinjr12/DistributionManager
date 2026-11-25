import { useState } from 'react'
import { Mail, Trash, UserPlus, Users } from 'lucide-react'
import type { UserRole } from '@/types/domain'
import { Avatar, Badge, Button, Input, Modal, Select, Table, toast } from '@/components/ui'
import { useTenantStore } from '@/store'
import * as api from '@/mock/api'
import { formatDate, formatPhone, formatRelative } from '@/lib/format'
import { nowISO, uid } from '@/lib/utils'
import { useLocalSettings } from './localStore'
import { Note, Section } from './shared'

const ROLE_LABEL: Record<UserRole, string> = { ADMIN: 'Administrador', SALES_REP: 'Vendedor / Analista' }

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('SALES_REP')
  const [busy, setBusy] = useState(false)
  const local = useLocalSettings()
  const valid = name.trim().length > 1 && /^\S+@\S+\.\S+$/.test(email)

  const submit = async () => {
    setBusy(true)
    try {
      await api.delay(500, 1200)
      api.maybeFail('invite-user')
      useLocalSettings.setState((s) => ({ invites: [...s.invites, { id: uid('inv'), fullName: name.trim(), email: email.trim(), role, sentAt: nowISO() }] }))
      local.log('Convidou usuário', email.trim())
      toast.success('Convite enviado', `${email.trim()} receberá o link de acesso via Resend.`)
      setName('')
      setEmail('')
      onClose()
    } catch (e) {
      toast.error('Falha ao enviar convite', e instanceof Error ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Convidar usuário"
      description="O convidado acessa apenas os dados do tenant Maquinabel (RLS)."
      icon={<UserPlus />}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button leftIcon={<Mail />} loading={busy} disabled={!valid} onClick={submit}>
            Enviar convite
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Nome completo" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ana Souza" />
        <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@maquinabel.com.br" />
        <Select
          label="Papel"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={[
            { value: 'SALES_REP', label: 'Vendedor / Analista — Kanban e conversas' },
            { value: 'ADMIN', label: 'Administrador — inclui configurações e integrações' },
          ]}
        />
      </div>
    </Modal>
  )
}

export function UsersSection() {
  const users = useTenantStore((s) => s.users)
  const currentUserId = useTenantStore((s) => s.currentUserId)
  const updateUser = useTenantStore((s) => s.updateUser)
  const local = useLocalSettings()
  const [open, setOpen] = useState(false)

  return (
    <Section
      title="Usuários"
      description="Quem acessa o painel do tenant Maquinabel."
      icon={<Users />}
      actions={
        <Button size="sm" leftIcon={<UserPlus />} onClick={() => setOpen(true)}>
          Convidar
        </Button>
      }
    >
      <div className="-mx-5 -mt-4">
        <Table hover>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Papel</th>
              <th>WhatsApp</th>
              <th>Desde</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.fullName} size="sm" status={u.id === currentUserId ? 'online' : null} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                        {u.fullName}
                        {u.id === currentUserId && <Badge tone="primary">Você</Badge>}
                      </div>
                      <div className="text-xs text-ink-500">
                        {u.email} · {u.title}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    value={u.role}
                    disabled={u.id === currentUserId}
                    onChange={(e) => {
                      updateUser(u.id, { role: e.target.value as UserRole })
                      local.log('Alterou papel', `${u.fullName} → ${e.target.value}`)
                      toast.success('Papel atualizado', `${u.fullName}: ${ROLE_LABEL[e.target.value as UserRole]}`)
                    }}
                    className="h-8 rounded-md border border-line bg-surface px-2 text-xs disabled:opacity-60"
                  >
                    {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="num text-sm text-ink-700">{formatPhone(u.whatsappPhone)}</td>
                <td className="text-sm text-ink-500">{formatDate(u.createdAt)}</td>
                <td />
              </tr>
            ))}
            {local.invites.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={inv.fullName} size="sm" />
                    <div>
                      <div className="text-sm font-medium text-ink-700">{inv.fullName}</div>
                      <div className="text-xs text-ink-500">{inv.email}</div>
                    </div>
                  </div>
                </td>
                <td className="text-xs text-ink-600">{ROLE_LABEL[inv.role]}</td>
                <td>
                  <Badge tone="warning" dot>
                    Convite pendente
                  </Badge>
                </td>
                <td className="text-sm text-ink-500">{formatRelative(inv.sentAt)}</td>
                <td className="text-right">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Revogar convite"
                    title="Revogar convite"
                    onClick={() => {
                      local.patch({ invites: local.invites.filter((i) => i.id !== inv.id) })
                      toast.info('Convite revogado', inv.email)
                    }}
                  >
                    <Trash />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Note>
        v1: o Vinicius é o único vendedor e recebe todos os handoffs. Usuários com papel <b>Vendedor / Analista</b> acompanham Kanban e conversas, sem acesso a
        integrações.
      </Note>
      <InviteModal open={open} onClose={() => setOpen(false)} />
    </Section>
  )
}
