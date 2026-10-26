import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { GenerateOrderSummaryCards } from '@/components/feature/orders/GenerateOrderSummaryCards'
import { OrderCompanyBlock } from '@/components/feature/orders/OrderCompanyBlock'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult, catalogActiveOnly } from '@/rtk/asResult'
import { loadControlCatalog } from '@/rtk/features/control/controlSlice'
import { generateOrder as generateOrderThunk } from '@/rtk/features/orders/ordersSlice'
import { fetchControlSuppliers } from '@/hooks/useInventoryControl'
import {
  emptyCompanyBlock,
  summarizeBlocks,
} from '@/lib/orderGenerate'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

// Parent: Generate Order full page — multi-company blocks → submit Pending
export function GenerateOrderPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const mutating = useAppSelector((state) => state.orders.mutating)
  const catalogRaw = useAppSelector((state) => state.control.catalog)
  const catalog = useMemo(() => catalogActiveOnly(catalogRaw), [catalogRaw])

  const [suppliers, setSuppliers] = useState([])
  const [blocks, setBlocks] = useState([emptyCompanyBlock()])
  const [explanation, setExplanation] = useState('')
  const [formError, setFormError] = useState('')
  const [loadingMeta, setLoadingMeta] = useState(true)

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
    let cancelled = false
    setLoadingMeta(true)
    void dispatch(loadControlCatalog())
    void fetchControlSuppliers().then((res) => {
      if (cancelled) return
      setSuppliers(res.success ? res.items : [])
      setLoadingMeta(false)
    })
    return () => {
      cancelled = true
    }
  }, [dispatch])

  function updateBlock(key, next) {
    setBlocks((prev) => prev.map((block) => (block.key === key ? next : block)))
    setFormError('')
  }

  function removeBlock(key) {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((block) => block.key !== key)
    })
  }

  function addCompanyBlock() {
    setBlocks((prev) => [...prev, emptyCompanyBlock()])
  }

  function validate() {
    if (!blocks.length) return 'Add at least one company block'
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i]
      if (!block.supplierId) {
        return `Company block ${i + 1}: select a supplier`
      }
      if (!block.lines?.length) {
        return `Company block ${i + 1}: add at least one item`
      }
      for (const line of block.lines) {
        if (!(Number(line.quantity) > 0)) {
          return `Company block ${i + 1}: quantity must be greater than 0`
        }
      }
    }
    const ids = blocks.map((b) => b.supplierId)
    if (new Set(ids).size !== ids.length) {
      return 'Each supplier can only appear once — merge duplicate company blocks'
    }
    return ''
  }

  async function handleSubmit() {
    const error = validate()
    if (error) {
      setFormError(error)
      toastError(error)
      return
    }
    setFormError('')

    const payload = {
      companies: blocks.map((block) => ({
        supplierId: block.supplierId,
        lines: block.lines.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
          unitCost: Number(line.unitCost ?? line.lastPurchasePrice ?? 0),
          scale: line.scale || 'unit',
        })),
      })),
      explanation: explanation.trim() || undefined,
    }

    const result = await asResult(dispatch(generateOrderThunk(payload)).unwrap())
    if (result.success) {
      toastSuccess('Order request submitted — awaiting Branch Manager review')
      navigate(PATHS.inventory.orders)
    } else {
      const message = result.error || 'Failed to submit order request'
      setFormError(message)
      toastError(message)
    }
  }

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Inventory Manager · Orders"
          title="Generate Order"
          description="Pick a supplier, filter the catalogue, add items & quantities — then send it to your Branch Manager."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={PATHS.inventory.orders}>Cancel</Link>
              </Button>
              <Button
                type="button"
                variant="brand"
                disabled={mutating || loadingMeta}
                onClick={handleSubmit}
              >
                {mutating ? 'Submitting…' : 'Review & Submit →'}
              </Button>
            </div>
          }
        />
      </MotionHeader>

      {formError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {formError}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <GenerateOrderSummaryCards
          companies={summary.companies}
          itemLines={summary.itemLines}
          totalUnits={summary.totalUnits}
        />
      </MotionReveal>

      <div className="space-y-4">
        {blocks.map((block, index) => (
          <MotionReveal key={block.key} delay={0.06 + index * 0.03}>
            <OrderCompanyBlock
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
          </MotionReveal>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={addCompanyBlock}
          className="h-10 gap-2 rounded-xl border-dashed border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs hover:border-purple-300 hover:bg-purple-50/60 hover:text-purple-900"
        >
          <Plus className="size-4" />
          Add Company
        </Button>
      </div>

      <div className="max-w-2xl space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Label htmlFor="order-explanation">Notes (optional)</Label>
        <Textarea
          id="order-explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Optional note for the Branch Manager"
          rows={3}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="button" variant="outline" asChild>
          <Link to={PATHS.inventory.orders}>Cancel</Link>
        </Button>
        <Button
          type="button"
          variant="brand"
          disabled={mutating || loadingMeta}
          onClick={handleSubmit}
        >
          {mutating ? 'Submitting…' : 'Review & Submit →'}
        </Button>
      </div>
    </div>
  )
}

export default GenerateOrderPage
