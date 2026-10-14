import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { RowActionButtons } from '@/components/shared/ActionIconButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogCancelButton,
} from '@/components/ui/dialog'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import {
  displayDiscountRef,
  matchesDisplayRef,
  normalizeSearchQuery,
} from '@/lib/formatDisplayId'
import { UI_RADIUS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { validateDiscountForm } from '@/lib/validation/branchForms'
import { CATEGORY_ACTIVE_QUERY } from '@/lib/productCatalogCache'
import { filterActiveCategories } from '@/lib/mapProduct'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function DiscountsPage() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(normalizeSearchQuery(searchQuery), 300)

  // Client filter: category already applied server-side; search also client for OFF- refs
  const filteredDiscounts = useMemo(() => {
    const q = normalizeSearchQuery(debouncedQ)
    if (!q) return discounts
    return discounts.filter((disc) => {
      const name = String(disc.name || '').toLowerCase()
      if (name.includes(q.toLowerCase())) return true
      return matchesDisplayRef(disc.id, q, 'OFF')
    })
  }, [discounts, debouncedQ])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedDiscounts,
  } = useClientPagination(filteredDiscounts)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('create') // 'create' | 'edit'
  const [editing, setEditing] = useState(null)

  const [name, setName] = useState('')
  const [percent, setPercent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTargetDiscount, setDeleteTargetDiscount] = useState(null)

  const discountSnapshot = { name, percent, categoryId }
  const { captureBaseline, isDirty } = useFormBaseline(open)

  useEffect(() => {
    if (!open) return
    captureBaseline(discountSnapshot)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per open
  }, [open, captureBaseline])

  const fetchDiscounts = async () => {
    setLoading(true)
    const params = {}
    if (filterCategory) params.categoryId = filterCategory
    // Server also accepts q — keeps list small when many offers
    if (debouncedQ) params.q = debouncedQ
    const res = await apiClient.get(endpoints.branch.discounts.list, params)
    setLoading(false)
    if (res.success && res.data) {
      setDiscounts(res.data || [])
    } else if (!res.success) {
      toastError(res.error || 'Failed to load discounts')
    }
  }

  const fetchCategories = async () => {
    const res = await apiClient.get('/inventory/products/categories', CATEGORY_ACTIVE_QUERY)
    if (res.success && res.data) {
      const all = filterActiveCategories(
        Array.isArray(res.data) ? res.data : res.data.items || [],
      )
      setCategories(all.filter((c) => !c.parentId))
    }
  }

  useEffect(() => {
    void fetchCategories()
  }, [])

  useEffect(() => {
    setPage(1)
    void fetchDiscounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filter/search
  }, [filterCategory, debouncedQ])

  const handleOpenCreate = () => {
    setMode('create')
    setEditing(null)
    setName('')
    setPercent('')
    setCategoryId('')
    setOpen(true)
  }

  const handleOpenEdit = (discount) => {
    setMode('edit')
    setEditing(discount)
    setName(discount.name)
    setPercent(String(discount.percent))
    setCategoryId(discount.categoryId || '')
    setOpen(true)
  }

  const handleSaveDiscount = async (e) => {
    e.preventDefault()
    const validationError = validateDiscountForm({ name, percent })
    if (validationError) {
      return toastError(validationError)
    }

    const value = Math.trunc(Number(percent))
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toastError('Discount percentage must be a whole number between 0 and 100')
      return
    }
    const payload = {
      name: name.trim(),
      percent: value,
      categoryId: categoryId || null,
    }

    setSaving(true)
    try {
      let res
      if (mode === 'create') {
        res = await apiClient.post(endpoints.branch.discounts.create, payload)
      } else {
        res = await apiClient.put(endpoints.branch.discounts.update(editing.id), payload)
      }

      if (res.success) {
        toastSuccess(mode === 'create' ? 'Discount offer created' : 'Discount offer updated')
        setOpen(false)
        void fetchDiscounts()
      } else {
        toastError(res.error || 'Failed to save discount')
      }
    } catch (err) {
      toastError(err?.message || 'Failed to save discount')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDiscount = (id) => {
    const disc = discounts.find((d) => d.id === id)
    setDeleteTargetDiscount(disc)
  }

  const confirmDeleteDiscount = async () => {
    if (!deleteTargetDiscount) return
    setSaving(true)
    const res = await apiClient.delete(endpoints.branch.discounts.delete(deleteTargetDiscount.id))
    setSaving(false)
    if (res.success) {
      toastSuccess('Discount deleted successfully')
      setDeleteTargetDiscount(null)
      void fetchDiscounts()
    } else {
      toastError(res.error || 'Failed to delete discount')
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Promo Offers"
          title="Discount Management"
          description="Manage promotional campaigns, store-wide sales, and percentage offers. Staff scoring scales live under Staff → Performance."
          actions={
            <Button variant="brand" onClick={handleOpenCreate} className={cn(UI_RADIUS)}>
              <Plus className="mr-1.5 size-4" /> Add Discount
            </Button>
          }
        />
      </MotionHeader>

      {/* Search + Category — horizontal on desktop, stacked on mobile */}
      <MotionReveal delay={0.02}>
        <SurfaceCard padding="compact">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="disc-search">Search Discounts</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="disc-search"
                  type="search"
                  placeholder="Search by Offer ID or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn('h-10 pl-9', UI_RADIUS)}
                />
              </div>
            </div>

            <div className="w-full space-y-1.5 sm:w-56 sm:shrink-0">
              <Label htmlFor="disc-category">Filter Category</Label>
              <NativeSelect
                id="disc-category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={cn('h-10', UI_RADIUS)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </SurfaceCard>
      </MotionReveal>

      <MotionReveal delay={0.04}>
        <SurfaceCard
          title="Active Discount Campaigns"
          description="Standard discount templates that can be applied to products."
        >
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading campaign offers...</p>
          ) : filteredDiscounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No campaigns found</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {pagedDiscounts.map((disc) => (
                  <article
                    key={disc.id}
                    className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{disc.name}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                          {displayDiscountRef(disc)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {disc.categoryName || 'All categories'}
                        </p>
                      </div>
                      <Badge
                        variant="success"
                        className="inline-flex shrink-0 rounded border-none bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        {parseFloat(disc.percent)}% OFF
                      </Badge>
                    </div>
                    <div className="mt-3 flex justify-start">
                      <RowActionButtons
                        onEdit={() => handleOpenEdit(disc)}
                        onDelete={() => handleDeleteDiscount(disc.id)}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[32rem] text-left text-sm">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-2 py-3">Offer ID</TableHead>
                      <TableHead className="px-2 py-3">Offer name</TableHead>
                      <TableHead className="px-2 py-3">Category</TableHead>
                      <TableHead className="px-2 py-3">Discount %</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedDiscounts.map((disc) => (
                      <TableRow key={disc.id} className="group">
                        <TableCell className="px-2 py-3 font-mono font-bold text-purple-800">
                          {displayDiscountRef(disc)}
                        </TableCell>
                        <TableCell className="px-2 py-3 font-semibold text-slate-800">
                          {disc.name}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-slate-600">
                          {disc.categoryName || 'All categories'}
                        </TableCell>
                        <TableCell className="px-2 py-3">
                          <Badge
                            variant="success"
                            className="inline-flex rounded border-none bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            {parseFloat(disc.percent)}% OFF
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RowActionButtons
                            onEdit={() => handleOpenEdit(disc)}
                            onDelete={() => handleDeleteDiscount(disc.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <TablePagination
            page={page}
            pageCount={pageCount}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </SurfaceCard>
      </MotionReveal>

      <Dialog open={open} onOpenChange={setOpen} dirty={isDirty(discountSnapshot)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add New Discount' : 'Edit Discount'}</DialogTitle>
            <DialogDescription>
              Create a promotional campaign name and configure the discount percentage rate.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveDiscount}>
            <div className="space-y-1.5">
              <Label htmlFor="disc-form-name">Campaign Name / Explanation</Label>
              <Input
                id="disc-form-name"
                placeholder="e.g. Winter Sale, Cashier Promo 10%"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="disc-form-category">Category (optional)</Label>
              <NativeSelect
                id="disc-form-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="disc-form-pct">Discount Percentage (%)</Label>
              <WholeNumberInput
                id="disc-form-pct"
                min={0}
                max={100}
                placeholder="e.g. 15"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <DialogCancelButton disabled={saving} className="w-full sm:w-auto" />
              <Button
                type="submit"
                disabled={saving}
                variant="brand"
                className="w-full sm:w-auto"
              >
                {saving ? 'Saving…' : 'Save Discount'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteEntityDialog
        open={Boolean(deleteTargetDiscount)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTargetDiscount(null)
        }}
        entityName={deleteTargetDiscount?.name}
        description={
          deleteTargetDiscount
            ? `Remove promotional offer “${deleteTargetDiscount.name}”? Discount campaigns have no Inactive state — this permanently deletes the offer.`
            : null
        }
        showSoftAction={false}
        canHardDelete
        hardLabel="Permanently delete"
        hardHint="This cannot be undone."
        loading={saving}
        onHardDelete={confirmDeleteDiscount}
      />
    </div>
  )
}

export default DiscountsPage
