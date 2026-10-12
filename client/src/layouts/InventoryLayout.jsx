import { Outlet } from 'react-router-dom'
import { AppTopNav } from '@/layouts/Navbar/AppTopNav'

export function InventoryLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <AppTopNav />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
