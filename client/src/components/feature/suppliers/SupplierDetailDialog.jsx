import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProductStatusToggle } from '@/components/feature/products/ProductStatusToggle'
import { BRAND } from '@/lib/constants'
import { displaySupplierRef } from '@/lib/formatDisplayId'

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-slate-800">{children || '—'}</dd>
    </div>
  )
}

// clean and optimized code — read-only supplier details (signature lives here, not in the table)
export function SupplierDetailDialog({ open, onOpenChange, supplier }) {
  if (!supplier) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-3 pr-8">
          {supplier.imageUrl ? (
            <img
              src={supplier.imageUrl}
              alt=""
              className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-border"
            />
          ) : (
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})` }}
            >
              {(supplier.companyName || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {supplier.companyName || 'Supplier details'}
            </DialogTitle>
            <p className="font-mono text-[11px] text-slate-400" title={supplier.id}>
              {displaySupplierRef(supplier)}
            </p>
          </div>
          <ProductStatusToggle
            status={supplier.isActive === false ? 'inactive' : 'active'}
          />
        </div>

        <dl className="space-y-2.5 py-3 sm:space-y-3 sm:py-4">
          <DetailRow label="Company phone">{supplier.companyPhone}</DetailRow>
          <DetailRow label="Representative">{supplier.representativeName}</DetailRow>
          <DetailRow label="Rep. phone">{supplier.representativePhone}</DetailRow>
          <DetailRow label="Rep. email">{supplier.representativeEmail}</DetailRow>
          <DetailRow label="Location">{supplier.location}</DetailRow>
          <DetailRow label="Tax paid">{supplier.taxPaid ? 'Yes' : 'No'}</DetailRow>
          <DetailRow label="Registration">{supplier.registrationNumber}</DetailRow>
          <DetailRow label="Bank account">{supplier.bankAccountNumber}</DetailRow>
          <DetailRow label="Signature">
            {supplier.signatureUrl ? (
              <img
                src={supplier.signatureUrl}
                alt="Signature"
                className="h-12 max-w-[160px] object-contain"
              />
            ) : (
              '—'
            )}
          </DetailRow>
        </dl>
      </DialogContent>
    </Dialog>
  )
}

export default SupplierDetailDialog
