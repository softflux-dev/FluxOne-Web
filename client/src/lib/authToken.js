// Session expiry helpers for opaque tokens (no JWT decode).
import { formatDateTimeInline } from '@/lib/formatDateTime'
import { tokenStorage } from '@/api/tokenStorage'

export function getSessionExpiryDate(expiresAt = tokenStorage.getExpiresAt()) {
  if (!expiresAt) return null
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return null
  return date
}

// Kept name used by profile pages; now reads stored expiresAt, not JWT exp.
export function getTokenExpiryDate(_tokenIgnored) {
  return getSessionExpiryDate()
}

export function formatLoginExpires(date) {
  // Login expiry — always 12h AM/PM via shared helper
  return formatDateTimeInline(date)
}