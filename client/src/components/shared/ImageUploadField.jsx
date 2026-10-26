import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  IMAGE_ACCEPT,
  displayImageFileName,
  formatImageBytes,
  imageUploadHint,
  validateImageFile,
} from '@/lib/imageUpload'
import { toastError } from '@/lib/toast'
import { cn } from '@/lib/utils'

// Shared image picker — thumbnail + Change Image (native file input stays hidden).
// Browsers cannot pre-fill <input type="file">; we preview File / existing URL ourselves.
export function ImageUploadField({
  id,
  name,
  label,
  value = null,
  existingImageUrl = null,
  onChange,
  error = null,
  className,
  optionalLabel,
}) {
  const inputRef = useRef(null)
  const [inputKey, setInputKey] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  // × dismisses existing URL preview without waiting on parent props
  const [clearedExisting, setClearedExisting] = useState(false)

  useEffect(() => {
    setClearedExisting(false)
  }, [existingImageUrl])

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return undefined
    }
    setClearedExisting(false)
    const objectUrl = URL.createObjectURL(value)
    setPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [value])

  const displayUrl = previewUrl || (!clearedExisting && existingImageUrl) || null
  const displayName = displayImageFileName(value, !clearedExisting ? existingImageUrl : null)
  const sizeLabel = value ? formatImageBytes(value.size) : null

  function openPicker() {
    inputRef.current?.click()
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null
    const validationError = validateImageFile(file)
    if (validationError) {
      toastError(validationError)
      event.target.value = ''
      onChange?.(null)
      setInputKey((key) => key + 1)
      return
    }
    onChange?.(file)
  }

  // × removes preview (new File and/or existing URL shown in UI)
  function clearSelection() {
    onChange?.(null)
    setClearedExisting(true)
    setInputKey((key) => key + 1)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <Label htmlFor={id}>
          {label}
          {optionalLabel ? (
            <span className="font-normal text-slate-400"> {optionalLabel}</span>
          ) : null}
        </Label>
      ) : null}

      {/* Hidden native input — avoids duplicate “Choose file …” filename */}
      <input
        key={inputKey}
        ref={inputRef}
        id={id}
        name={name || id}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={handleFileChange}
      />

      {displayUrl ? (
        <div className="rounded-xl border border-border bg-slate-50/80 px-3 py-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <img
                src={displayUrl}
                alt=""
                className="size-14 rounded-lg border border-white object-cover shadow-sm"
              />
              <button
                type="button"
                aria-label="Remove image"
                title="Remove"
                className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
                onClick={clearSelection}
              >
                <X className="size-3" strokeWidth={2.5} />
              </button>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className="truncate text-sm font-semibold text-slate-800"
                title={value?.name || displayName}
              >
                {displayName}
              </p>
              {sizeLabel ? <p className="mt-0.5 text-xs text-slate-500">{sizeLabel}</p> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-8 cursor-pointer border-purple-200 px-2.5 text-xs font-semibold text-[#8E238F] hover:bg-purple-50 hover:text-[#7a1e7b]"
                onClick={openPicker}
              >
                <Upload className="size-3.5" />
                Change Image
              </Button>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">{imageUploadHint()}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center transition-colors hover:border-purple-300 hover:bg-purple-50/40"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#8E238F] shadow-sm ring-1 ring-border">
            <Upload className="size-4" />
          </span>
          <span className="text-sm font-semibold text-slate-700">Upload image</span>
          <span className="text-[11px] text-slate-400">{imageUploadHint()}</span>
        </button>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

export default ImageUploadField
