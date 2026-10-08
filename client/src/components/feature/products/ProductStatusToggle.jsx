import { EntityStatusToggle, isEntityActive } from '@/components/shared/EntityStatusToggle'
import { BRAND } from '@/lib/constants'

// Display-only Active / Inactive capsule — soft toggle lives in Actions (Ban / Unlock).
export function ProductStatusToggle({
  status,
  loading = false,
  onChange,
  interactive = false,
  className,
}) {
  return (
    <EntityStatusToggle
      status={status}
      loading={loading}
      interactive={interactive}
      activeLabel="Active"
      inactiveLabel="Inactive"
      activeTitle="Click to deactivate"
      inactiveTitle="Click to activate"
      onChange={(nextActive) => onChange?.(nextActive ? 'active' : 'inactive')}
      className={className}
    />
  )
}

export { isEntityActive }

export function ProductImageCell({ src, name }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        className="size-10 rounded-lg object-cover ring-1 ring-border"
      />
    )
  }
  return (
    <div
      className="flex size-10 items-center justify-center rounded-lg text-xs font-bold text-white"
      style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </div>
  )
}
