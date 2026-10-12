import { cn } from '@/lib/utils'

const CARD_SHADOW =
  'shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]'

// Shared panel used across branch dashboard + staff screens.
export function SurfaceCard({
  as: Comp = 'section',
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padding = 'default',
}) {
  const pad =
    padding === 'none'
      ? ''
      : padding === 'compact'
        ? 'p-3 sm:p-4'
        : 'p-4 sm:p-5'

  return (
    <Comp
      className={cn(
        'rounded-2xl border border-border bg-white dark:bg-card',
        CARD_SHADOW,
        pad,
        className,
      )}
    >
      {title || description || actions ? (
        <div
          className={cn(
            'flex flex-wrap items-end justify-between gap-2',
            children ? 'mb-3 sm:mb-4' : null,
          )}
        >
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children ? <div className={bodyClassName}>{children}</div> : null}
    </Comp>
  )
}
