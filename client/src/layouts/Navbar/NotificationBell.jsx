import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { PATHS } from '@/router/paths'
import { useAuthSession } from '@/hooks/useAuthSession'
import { ROLES } from '@/lib/constants'
import { BranchCapsule } from '@/components/shared/BranchRoleCapsules'
import { displayNotification } from '@/lib/notificationDisplay'
import { cn } from '@/lib/utils'

function formatRelative(value) {
  if (!value) return ''
  const then = new Date(value).getTime()
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Shared Admin + BM + IM bell — dropdown + deep-link via notification.linkPath
export function NotificationBell({ className }) {
  const { role } = useAuthSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef(null)

  const notificationsPath =
    role === ROLES.B2B_ADMIN
      ? PATHS.admin.notifications
      : role === ROLES.INVENTORY_MANAGER
        ? PATHS.inventory.notifications
        : PATHS.branch.notifications

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.notifications.list, { limit: 8 })
    setLoading(false)
    if (res.success && res.data) {
      setItems(res.data.items || [])
      setUnreadCount(res.data.unreadCount || 0)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 60_000)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    // Prevent background scroll when panel is open on small screens
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  const openDropdown = () => {
    setOpen((v) => !v)
    void refresh()
  }

  const handleClickItem = async (n) => {
    if (!n.isRead) {
      await apiClient.patch(endpoints.notifications.read(n.id))
    }
    setOpen(false)
    // Dynamic redirect — linkPath drives destination (future notification types)
    const target = n.linkPath || notificationsPath
    navigate(target)
    void refresh()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-9 rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-muted"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={openDropdown}
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          {/* Mobile scrim — keeps panel readable / tappable outside */}
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 bg-slate-900/30 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'z-50 overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:bg-card',
              // Mobile: fixed sheet under header (avoids viewport overflow)
              'fixed top-14 right-3 left-3 max-h-[min(28rem,calc(100dvh-4.5rem))]',
              // Desktop: anchored to bell
              'sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-[min(26rem,calc(100vw-1.5rem))] sm:max-h-96',
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-[#8E238F] hover:underline dark:text-[#c084c1]"
                    onClick={async () => {
                      await apiClient.patch(endpoints.notifications.readAll)
                      void refresh()
                    }}
                  >
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Close notifications"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 sm:hidden dark:hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[min(20rem,calc(100dvh-11rem))] overflow-y-auto overscroll-contain sm:max-h-80">
              {loading && !items.length ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400">Loading…</p>
              ) : items.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-400">No notifications yet</p>
              ) : (
                items.map((n) => {
                  const { title, body, branchName } = displayNotification(n)
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClickItem(n)}
                      className={cn(
                        'flex w-full cursor-pointer flex-col gap-1 border-b border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:border-border dark:hover:bg-muted',
                        !n.isRead && 'bg-purple-50/40 dark:bg-accent/50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug break-words text-slate-900 dark:text-slate-100">
                          {title}
                        </p>
                        {!n.isRead ? (
                          <span className="mt-1 size-2 shrink-0 rounded-full bg-[#8E238F]" />
                        ) : null}
                      </div>
                      {branchName ? (
                        <div className="min-w-0 max-w-full">
                          <BranchCapsule branchName={branchName} />
                        </div>
                      ) : null}
                      {body ? (
                        <p className="whitespace-normal break-words text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {body}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-slate-400">{formatRelative(n.createdAt)}</p>
                    </button>
                  )
                })
              )}
            </div>

            <button
              type="button"
              className="w-full cursor-pointer border-t border-border px-3 py-2.5 text-center text-xs font-semibold text-[#8E238F] hover:bg-slate-50 dark:text-[#c084c1] dark:hover:bg-muted"
              onClick={() => {
                setOpen(false)
                navigate(notificationsPath)
              }}
            >
              View all notifications
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default NotificationBell
