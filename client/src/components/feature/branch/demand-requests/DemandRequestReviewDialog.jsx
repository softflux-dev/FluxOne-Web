import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { OrderCompanyBlock } from '@/components/feature/orders/OrderCompanyBlock'
import { displayOrderRef } from '@/lib/formatDisplayId'
import { OrderStatusBadge } from '@/lib/orderStatus'
import {
  emptyCompanyBlock,
  emptyOrderFilters,
  newCompanyBlockKey,
  summarizeBlocks,
} from '@/lib/orderGenerate'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { catalogActiveOnly } from '@/rtk/asResult'
import { loadControlCatalog } from '@/rtk/features/control/controlSlice'
import { fetchControlSuppliers } from '@/hooks/useInventoryControl'

function orderToBlocks(order) {
  if (!order) return [emptyCompanyBlock()]
  if (Array.isArray(order.companies) && order.companies.length) {
    return order.companies.map((company) => ({
      key: newCompanyBlockKey(),
      supplierId: company.supplierId || '',
      filters: emptyOrderFilters(),
      lines: (company.lines || []).map((line) => ({
        productId: line.productId,
        name: line.name || '',
        itemCode: line.itemCode || '',
        categoryPath: line.categoryPath || '—',
        scale: line.scale || 'unit',
        quantity: Math.max(1, Number(line.quantity) || 1),
        unitCost: Number(line.unitCost ?? 0),
        lastPurchasePrice: Number(line.lastPurchasePrice ?? line.unitCost ?? 0),
      })),
    }))
  }
  if (order.supplierId && Array.isArray(order.lines) && order.lines.length) {
    return [
      {
        key: newCompanyBlockKey(),
        supplierId: order.supplierId,
        filters: emptyOrderFilters(),
        lines: order.lines.map((line) => ({
          productId: line.productId,
          name: line.name || '',
          itemCode: line.itemCode || '',
          categoryPath: line.categoryPath || '—',
          scale: line.scale || 'unit',
          quantity: Math.max(1, Number(line.quantity) || 1),
          unitCost: Number(line.unitCost ?? 0),
          lastPurchasePrice: Number(line.lastPurchasePrice ?? line.unitCost ?? 0),
        })),
      },
    ]
  }
  return [emptyCompanyBlock()]
}

export function buildUpdatePayload(blocks, explanation) {
  return {
    explanation: explanation || undefined,
    companies: blocks.map((block) => ({
      supplierId: block.supplierId,
      lines: (block.lines || []).map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        scale: line.scale,
      })),
    })),
  }
}

function validateBlocks(blocks) {
  if (!blocks.length) return 'Add at least one supplier company'
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    if (!block.supplierId) return `Company block ${i + 1}: select a supplier company`
    if (!block.lines?.length) return `Company block ${i + 1}: add at least one item`
    for (const line of block.lines) {
      if (!(Number(line.quantity) > 0)) {
        return `Company block ${i + 1}: quantity must be greater than 0`
      }
    }
  }
  const ids = blocks.map((b) => b.supplierId)
  if (new Set(ids).size !== ids.length) return 'Each company block must use a different supplier'
  return ''
}

// Parent: BM Edit & Approve — full TL §5.3 (company / qty / add / remove)
export function DemandRequestReviewDialog({
  open,
  onOpenChange,
  order = null,
  loading = false,
  onSave,
  onApprove,
}) {
  const dispatch = useAppDispatch()
  const catalogRaw = useAppSelector((state) => state.control.catalog)
  const catalog = useMemo(() => catalogActiveOnly(catalogRaw), [catalogRaw])

  const [suppliers, setSuppliers] = useState([])
  const [blocks, setBlocks] = useState([emptyCompanyBlock()])
  const [baseline, setBaseline] = useState('')
  const [formError, setFormError] = useState('')
  const [metaLoading, setMetaLoading] = useState(false)

  const categoryById = useMemo(() => {
    const map = new Map()
    for (const parent of catalog?.parents || []) {
      map.set(parent.id, parent)
      const children = catalog?.childrenByParent?.get?.(parent.id) || []
      for (const child of children) map.set(child.id, child)
    }
    return map
  }, [catalog])

  const usedSupplierIds = useMemo(
    () => new Set(blocks.map((b) => b.supplierId).filter(Boolean)),
    [blocks],
  )

  const summary = useMemo(() => summarizeBlocks(blocks), [blocks])

  useEffect(() => {
    if (!open || !order) return
    const next = orderToBlocks(order)
    setBlocks(next)
    setBaseline(JSON.stringify(buildUpdatePayload(next, order.explanation)))
    setFormError('')

    let cancelled = false
    setMetaLoading(true)
    void dispatch(loadControlCatalog())
    void fetchControlSuppliers().then((res) => {
      if (cancelled) return
      setSuppliers(res.success ? res.items : [])
      setMetaLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, order, dispatch])

  const dirty = useMemo(() => {
    if (!order) return false
    return JSON.stringify(buildUpdatePayload(blocks, order.explanation)) !== baseline
  }, [blocks, order, baseline])

  function updateBlock(key, next) {
    setBlocks((prev) => prev.map((block) => (block.key === key ? next : block)))
    setFormError('')
  }

  function removeBlock(key) {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((block) => block.key !== key)
    })
    setFormError('')
  }

  function addCompanyBlock() {
    setBlocks((prev) => [...prev, emptyCompanyBlock()])
    setFormError('')
  }

  function tryPayload() {
    const err = validateBlocks(blocks)
    if (err) {
      setFormError(err)
      return null
    }
    return buildUpdatePayload(blocks, order?.explanation)
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>Edit & Approve · {displayOrderRef(order)}</span>
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            Submitted by {order.createdByName || 'Inventory Manager'}. Change supplier companies,
            quantities, add or remove items, then approve.
            {metaLoading ? ' Loading catalogue…' : ''}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-slate-500">
          {summary.companies} compan{summary.companies === 1 ? 'y' : 'ies'} · {summary.itemLines}{' '}
          item line(s) · {summary.totalUnits} unit(s)
        </p>

        {formError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        ) : null}

        <div className="space-y-4">
          {blocks.map((block, index) => (
            <OrderCompanyBlock
              key={block.key}
              index={index}
              block={block}
              suppliers={suppliers}
              catalog={catalog}
              categoryById={categoryById}
              usedSupplierIds={usedSupplierIds}
              canRemove={blocks.length > 1}
              onChange={(next) => updateBlock(block.key, next)}
              onRemove={() => removeBlock(block.key)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer sm:w-auto"
          disabled={loading || metaLoading}
          onClick={addCompanyBlock}
        >
          <Plus className="size-4" />
          Add company
        </Button>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading}
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          {dirty ? (
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer sm:w-auto"
              disabled={loading}
              onClick={() => {
                const payload = tryPayload()
                if (payload) onSave?.(payload)
              }}
            >
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="brand"
            className="w-full cursor-pointer sm:w-auto"
            disabled={loading}
            onClick={() => {
              const payload = dirty ? tryPayload() : null
              if (dirty && !payload) return
              onApprove?.(payload)
            }}
          >
            {loading ? 'Working…' : dirty ? 'Save & Approve' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DemandRequestReviewDialog
