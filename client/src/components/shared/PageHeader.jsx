import { cn } from '@/lib/utils'

// Reusable page title row for BM / IM screens.
// @param {{ eyebrow?: string, title: string, description?: string, actions?: import('react').ReactNode, className?: string }} props
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase dark:text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            'text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl dark:text-slate-100',
            eyebrow && 'mt-1',
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
