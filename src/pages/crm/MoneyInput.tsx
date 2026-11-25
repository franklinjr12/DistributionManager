import { Input } from '@/components/ui'
import type { ReactNode } from 'react'
import { formatMoneyInput, parseMoneyDigits } from './helpers'

interface Props {
  label?: ReactNode
  value: number | null
  onChange: (v: number | null) => void
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  autoFocus?: boolean
  placeholder?: string
}

/** BRL masked input: typing digits fills from the cents (1 → 0,01 · 123456 → 1.234,56). */
export function MoneyInput({ label, value, onChange, hint, error, required, autoFocus, placeholder = '0,00' }: Props) {
  return (
    <Input
      label={label}
      hint={hint}
      error={error}
      required={required}
      autoFocus={autoFocus}
      inputMode="numeric"
      prefix="R$"
      placeholder={placeholder}
      className="num text-right"
      value={formatMoneyInput(value)}
      onChange={(e) => onChange(parseMoneyDigits(e.target.value))}
    />
  )
}
