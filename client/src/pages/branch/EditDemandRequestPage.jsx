import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { OrderCompanyBlock } from '@/components/feature/orders/OrderCompanyBlock'
import { GenerateOrderSummaryCards } from '@/components/feature/orders/GenerateOrderSummaryCards'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { displayOrderRef } from '@/lib/formatDisplayId'
import {
  emptyCompanyBlock,
  emptyOrderFilters,
  newCompanyBlockKey,
  summarizeBlocks,
} from '@/lib/orderGenerate'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult, catalogActiveOnly } from '@/rtk/asResult'
import { loadControlCatalog } from '@/rtk/features/control/controlSlice'
import {
  fetchOrderDetail,
  updatePendingOrder as updatePendingOrderThunk,
  approveOrder as approveOrderThunk,
} from '@/rtk/features/orders/ordersSlice'
import { fetchControlSuppliers } from '@/hooks/useInventoryControl'
import { PATHS } from '@/router/paths'
import { toastError, toastSuccess } from '@/lib/toast'

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

function buildPayload(blocks, explanation) {
  return {
    explanation: explanation.trim() || undefined,
    companies: blocks.map((block) => ({
      supplierId: block.supplierId,
      lines: (block.lines || []).map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitCost: Number(line.unitCost ?? line.lastPurchasePrice ?? 0),
        scale: line.scale || 'unit',
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
  if (new Set(ids).size !== ids.length) {
    return 'Each company block must use a different supplier'
  }
  return ''
}

const BACK = `${PATHS.branch.inventory}?tab=demand`

// Parent: BM Edit Demand Request — same layout as Generate Order (full page, not modal)
export function EditDemandRequestPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const mutating = useAppSelector((state) => state.orders.mutating)
  const catalogRaw = useAppSelector((state) => state.control.catalog)
  const catalog = useMemo(() => catalogActiveOnly(catalogRaw), [catalogRaw])

  const [order, setOrder] = useState(null)
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
    void (async () => {
      void dispatch(loadControlCatalog())
      const [detailRes, suppliersRes] = await Promise.all([
        asResult(dispatch(fetchOrderDetail(id)).unwrap()),
        fetchControlSuppliers(),
      ])
      if (cancelled) return
      if (!detailRes.success) {
        toastError(detailRes.error || 'Failed to load demand request')
        navigate(BACK, { replace: true })
        return
      }
      const mapped = detailRes.data
      if (!mapped?.id) {
        toastError('Demand request not found')
        navigate(BACK, { replace: true })
        return
      }
      if (mapped.status !== 'pending') {
        toastError('Only Pending demand requests can be edited')
        navigate(BACK, { replace: true })
        return
      }
      setOrder(mapped)
      setBlocks(orderToBlocks(mapped))
      setExplanation(mapped.explanation || '')
      setSuppliers(suppliersRes.success ? suppliersRes.items : [])
      setLoadingMeta(false)
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch, id, navigate])

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

  async function saveThen(approve) {
    const error = validateBlocks(blocks)
    if (error) {
      setFormError(error)
      toastError(error)
      return
    }
    setFormError('')
    const payload = buildPayload(blocks, explanation)
    const saved = await asResult(
      dispatch(updatePendingOrderThunk({ id, ...payload })).unwrap(),
    )
    if (!saved.success) {
      const message = saved.error || 'Failed to save changes'
      setFormError(message)
      toastError(message)
      return
    }
    if (!approve) {
      toastSuccess('Demand request updated')
      navigate(BACK)
      return
    }
    const approved = await asResult(dispatch(approveOrderThunk(id)).unwrap())
    if (!approved.success) {
      toastError(approved.error || 'Approve failed')
      return
    }
    toastSuccess('Demand request approved')
    navigate(BACK)
  }

  if (loadingMeta && !order) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">Loading demand request…</p>
    )
  }

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Branch Manager · Demand Requests"
          title="Edit Demand Request"
          description={`${displayOrderRef(order || { id })} · ${order?.createdByName || 'Inventory Manager'} · Pending review`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" asChild>
                <Link to={BACK}>Cancel</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutating || loadingMeta}
                onClick={() => void saveThen(false)}
              >
                {mutating ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="brand"
                disabled={mutating || loadingMeta}
                onClick={() => void saveThen(true)}
              >
                {mutating ? 'Working…' : 'Save & Approve'}
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
        <Label htmlFor="demand-explanation">Notes (optional)</Label>
        <Textarea
          id="demand-explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Optional note saved with this request"
          rows={3}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="button" variant="outline" asChild>
          <Link to={BACK}>Cancel</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={mutating || loadingMeta}
          onClick={() => void saveThen(false)}
        >
          {mutating ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          type="button"
          variant="brand"
          disabled={mutating || loadingMeta}
          onClick={() => void saveThen(true)}
        >
          {mutating ? 'Working…' : 'Save & Approve'}
        </Button>
      </div>
    </div>
  )
}

export default EditDemandRequestPage
