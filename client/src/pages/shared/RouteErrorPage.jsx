import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { BRAND } from '@/lib/constants'
import { PATHS } from '@/router/paths'

function errorMessage(error) {
  if (isRouteErrorResponse(error)) {
    return error.data?.message || error.statusText || `Error ${error.status}`
  }
  if (error instanceof Error) return error.message
  return 'Something went wrong while loading this page.'
}

// Shown when a route throws (replaces React Router’s default “Unexpected Application Error”).
export function RouteErrorPage() {
  const error = useRouteError()
  const message = errorMessage(error)
  const isDev = import.meta.env.DEV

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-10">
      <SurfaceCard
        title="Something went wrong"
        description="This page hit an unexpected error. You can retry or go back home."
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl text-white"
            style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
          >
            <AlertTriangle className="size-7" aria-hidden />
          </div>
          <p className="max-w-md text-sm text-slate-600">{message}</p>
          {isDev && error instanceof Error && error.stack ? (
            <pre className="max-h-40 w-full overflow-auto rounded-lg bg-slate-50 p-3 text-left text-[10px] text-slate-500">
              {error.stack}
            </pre>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw className="size-4" />
              Reload
            </Button>
            <Button asChild variant="brand">
              <Link to={PATHS.splash}>
                <Home className="size-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}

export default RouteErrorPage
