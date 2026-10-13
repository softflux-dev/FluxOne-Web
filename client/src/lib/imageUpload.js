export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const IMAGE_MAX_LABEL = '10 MB'
export const IMAGE_FORMATS_LABEL = 'JPEG, PNG, or WebP'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Client-side image validation before upload.
// Returns a user-facing error string, or null when valid.
export function validateImageFile(file) {
  if (!file) return null

  if (!ALLOWED_TYPES.has(file.type)) {
    return `Only ${IMAGE_FORMATS_LABEL} images are allowed`
  }

  if (file.size > IMAGE_MAX_BYTES) {
    return `Image must be under ${IMAGE_MAX_LABEL} (${IMAGE_FORMATS_LABEL})`
  }

  return null
}

export function imageUploadHint() {
  return `Supported: JPG, PNG, or WebP. Max ${IMAGE_MAX_LABEL}.`
}

// 245 KB / 1.2 MB style labels for selected files
export function formatImageBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${Math.round(n)} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  const mb = n / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}

// Extract a display filename from a stored image URL (e.g. Asad.jpeg).
export function imageFileNameFromUrl(url) {
  if (!url || typeof url !== 'string') return ''
  try {
    const withoutQuery = url.split('?')[0]
    const segment = withoutQuery.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(segment) || 'image'
  } catch {
    return 'image'
  }
}

// Shorten hash-like storage keys for UI (keep extension when present).
export function shortenImageFileName(name, maxChars = 28) {
  const raw = String(name || '').trim()
  if (!raw) return 'image'
  if (raw.length <= maxChars) return raw

  const lastDot = raw.lastIndexOf('.')
  const ext = lastDot > 0 && lastDot < raw.length - 1 ? raw.slice(lastDot) : ''
  const base = ext ? raw.slice(0, lastDot) : raw
  const budget = Math.max(4, maxChars - ext.length - 1)
  return `${base.slice(0, budget)}…${ext}`
}

// Prefer File.name; else short name from stored URL.
export function displayImageFileName(file, url) {
  if (file?.name) return shortenImageFileName(file.name)
  const fromUrl = imageFileNameFromUrl(url)
  return fromUrl ? shortenImageFileName(fromUrl) : 'image'
}
