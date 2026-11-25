import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FIELD =
  'w-full rounded-lg border border-line-strong bg-white text-sm text-ink-900 placeholder:text-ink-400 shadow-xs transition outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-ink-50 disabled:text-ink-400'
const INVALID = 'border-danger-500 focus:border-danger-500 focus:ring-danger-100'

export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
  htmlFor?: string
}

/** Label + hint/error wrapper for any control. */
export function Field({ label, hint, error, required, className, children, htmlFor }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-danger-600">{error}</p> : hint ? <p className="text-xs text-ink-500">{hint}</p> : null}
    </div>
  )
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  leftIcon?: ReactNode
  /** right-side adornment, e.g. "m²" or "R$" */
  suffix?: ReactNode
  prefix?: string
  size?: 'sm' | 'md'
  wrapperClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, suffix, prefix, size = 'md', className, wrapperClassName, id, required, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const control = (
    <div className="relative flex items-center">
      {leftIcon && <span className="pointer-events-none absolute left-3 text-ink-400 [&_svg]:size-4">{leftIcon}</span>}
      {prefix && <span className="pointer-events-none absolute left-3 text-sm text-ink-500">{prefix}</span>}
      <input
        ref={ref}
        id={inputId}
        required={required}
        className={cn(FIELD, size === 'sm' ? 'h-8 px-2.5' : 'h-9 px-3', (leftIcon || prefix) && 'pl-9', suffix && 'pr-10', error && INVALID, className)}
        {...rest}
      />
      {suffix && <span className="absolute right-3 text-xs text-ink-500">{suffix}</span>}
    </div>
  )
  if (!label && !hint && !error) return <div className={wrapperClassName}>{control}</div>
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} htmlFor={inputId}>
      {control}
    </Field>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  wrapperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, id, required, rows = 3, ...rest },
  ref,
) {
  const autoId = useId()
  const tid = id ?? autoId
  const control = <textarea ref={ref} id={tid} rows={rows} required={required} className={cn(FIELD, 'px-3 py-2 leading-relaxed', error && INVALID, className)} {...rest} />
  if (!label && !hint && !error) return <div className={wrapperClassName}>{control}</div>
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} htmlFor={tid}>
      {control}
    </Field>
  )
})

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  options: SelectOption[]
  placeholder?: string
  size?: 'sm' | 'md'
  wrapperClassName?: string
}

/** Native select styled. onChange gives the native event: e.target.value */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, size = 'md', className, wrapperClassName, id, required, ...rest },
  ref,
) {
  const autoId = useId()
  const sid = id ?? autoId
  const control = (
    <div className="relative">
      <select
        ref={ref}
        id={sid}
        required={required}
        className={cn(FIELD, 'appearance-none pr-9', size === 'sm' ? 'h-8 pl-2.5' : 'h-9 pl-3', error && INVALID, className)}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400" />
    </div>
  )
  if (!label && !hint && !error) return <div className={wrapperClassName}>{control}</div>
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName} htmlFor={sid}>
      {control}
    </Field>
  )
})
