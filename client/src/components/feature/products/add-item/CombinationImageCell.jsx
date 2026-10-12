import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Pencil } from 'lucide-react'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { IMAGE_ACCEPT, validateImageFile } from '@/lib/imageUpload'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'

// Compact per-row image picker for Combinations table
export function CombinationImageCell({
  file = null,
  existingUrl = null,
  name = '',
  disabled = false,
  onChange,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return undefined
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const displayUrl = previewUrl || existingUrl || null

  function handleFileChange(event) {
    const next = event.target.files?.[0] || null
    const err = validateImageFile(next)
    if (err) {
      toastError(err)
      event.target.value = ''
      return
    }
    onChange?.(next)
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        title={displayUrl ? 'Change image' : 'Upload image'}
        aria-label={displayUrl ? `Change image for ${name}` : `Upload image for ${name}`}
        className={cn(
          'group relative cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={() => {
          if (!disabled) inputRef.current?.click()
        }}
      >
        <ProductImageCell src={displayUrl} name={name} />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/45 text-white opacity-0 transition-opacity',
            'group-hover:opacity-100 group-focus-visible:opacity-100',
            disabled && 'hidden',
          )}
        >
          {displayUrl ? <Pencil className="size-3.5" /> : <ImagePlus className="size-3.5" />}
        </span>
      </button>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />
    </div>
  )
}

export default CombinationImageCell
