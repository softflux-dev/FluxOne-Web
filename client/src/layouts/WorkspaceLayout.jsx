// Workspace layout — Phase 2 roles (logo + profile + logout only)
import { Outlet } from 'react-router-dom'
import { AppTopNav } from '@/layouts/Navbar/AppTopNav'

export function WorkspaceLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <AppTopNav />
      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
