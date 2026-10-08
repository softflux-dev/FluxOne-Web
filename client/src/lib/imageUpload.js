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
  return `Max ${IMAGE_MAX_LABEL}. ${IMAGE_FORMATS_LABEL}.`
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
