import { cva } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/constants'

// Shared motion for primary / brand CTAs (create, save, confirm).
export const ctaMotionClass =
  'shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:brightness-110 active:translate-y-0 active:scale-[0.98]'

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:brightness-100 disabled:hover:scale-100',
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary text-primary-foreground hover:bg-primary/90',
          ctaMotionClass,
        ),
        destructive: cn(
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
          ctaMotionClass,
        ),
        // Primary purple CTAs (Add Staff, Add Holidays, Save, etc.)
        brand: cn('text-white', ctaMotionClass),
        outline: cn(
          'border border-input bg-background hover:border-slate-300 hover:bg-accent hover:text-accent-foreground dark:hover:border-border',
          'hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98]',
        ),
        secondary: cn(
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          'hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98]',
        ),
        ghost:
          'hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  style,
  ...props
}) {
  const Comp = asChild ? Slot : 'button'
  const brandStyle =
    variant === 'brand' ? { background: BRAND.purple, ...style } : style
  // Keep label stable; spinner signals busy (Slot/asChild cannot wrap spinner + text)
  const isDisabled = Boolean(disabled || loading)

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      style={brandStyle}
      disabled={asChild ? disabled : isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : null}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
