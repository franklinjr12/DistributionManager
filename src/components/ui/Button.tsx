import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** icon element rendered before children (hidden while loading) */
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-300',
  secondary: 'bg-ink-100 text-ink-800 hover:bg-ink-200 focus-visible:ring-ink-300',
  outline: 'border border-line-strong bg-white text-ink-700 shadow-sm hover:bg-ink-50 hover:border-ink-300 focus-visible:ring-primary-200',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-ink-200',
  danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700 focus-visible:ring-danger-100',
  success: 'bg-success-600 text-white shadow-sm hover:bg-success-700 focus-visible:ring-success-100',
  link: 'text-primary-600 hover:text-primary-700 hover:underline underline-offset-2 px-0! h-auto!',
}
const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
  'icon-sm': 'h-7 w-7 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-4 disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
