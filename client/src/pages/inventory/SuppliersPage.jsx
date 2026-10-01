import { useState } from 'react'
import { Ban, Plus, Trash2 } from 'lucide-react'
import { SupplierDetailDialog } from '@/components/feature/suppliers/SupplierDetailDialog'
import { SupplierFilters } from '@/components/feature/suppliers/SupplierFilters'
import { SupplierFormDialog } from '@/components/feature/suppliers/SupplierFormDialog'
import { SupplierTable } from '@/components/feature/suppliers/SupplierTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useSuppliers } from '@/hooks/useSuppliers'
import { toastError, toastSuccess } from '@/lib/toast'

export function SuppliersPage() {
  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    updateFilters,
    setPage,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    setSupplierActive,
  } = useSuppliers()

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editing, setEditing] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)

  function openCreate() {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row) {
    setFormMode('edit')
    setEditing(row)
    setFormOpen(true)
  }

  async function handleSubmit(fields) {
    const result =
      formMode === 'edit' && editing?.id
        ? await updateSupplier(editing.id, fields)
        : await createSupplier(fields)
    if (result.success) {
      toastSuccess(formMode === 'edit' ? 'Supplier updated' : 'Supplier created')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  // clean and optimized code — soft status updates (deactivate / activate)
  async function applySupplierStatus(row, isActive) {
    if (!row?.id) return
    setStatusUpdatingId(row.id)
    try {
      const result = await setSupplierActive(row.id, isActive)
      if (!result.success) toastError(result.error || 'Status update failed')
      else toastSuccess(isActive ? 'Supplier activated' : 'Supplier deactivated')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function handleDeactivate(row) {
    if (!row?.id || row.isActive === false) return
    setStatusTarget(row)
  }

  function handleActivate(row) {
    if (!row?.id || row.isActive !== false) return
    void applySupplierStatus(row, true)
  }

  async function handleConfirmDeactivate() {
    if (!statusTarget?.id) return
    await applySupplierStatus(statusTarget, false)
    setStatusTarget(null)
  }

  // Delete uses soft-remove API (keeps purchase history); same outcome as deactivate
  async function handleConfirmDelete() {
    if (!deleteTarget?.id) return
    const result = await deleteSupplier(deleteTarget.id)
    setDeleteTarget(null)
    if (result.success) toastSuccess('Supplier removed from active directory')
    else toastError(result.error || 'Delete failed')
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Supplier Management"
          description="Vendor directory — deactivate instead of delete so purchase history stays intact"
          actions={
            <Button type="button" variant="brand" onClick={openCreate}>
              <Plus className="size-4" />
              Add supplier
            </Button>
          }
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <MotionReveal delay={0.04}>
        <SupplierFilters
          q={filters.q}
          active={filters.active}
          onSearchChange={(q) => updateFilters({ q })}
          onActiveChange={(active) => updateFilters({ active, page: 1 })}
        />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <SupplierTable
          items={items}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(limit) => updateFilters({ limit })}
          onView={setViewTarget}
          onEdit={openEdit}
          onDeactivate={handleDeactivate}
          onActivate={handleActivate}
          onDelete={setDeleteTarget}
          statusUpdatingId={statusUpdatingId}
        />
      </MotionReveal>

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialSupplier={editing}
        loading={mutating}
        onSubmit={handleSubmit}
      />

      <SupplierDetailDialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => {
          if (!open) setViewTarget(null)
        }}
        supplier={viewTarget}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        title="Deactivate supplier?"
        description={
          statusTarget
            ? `${statusTarget.companyName || 'This supplier'} will be hidden from new orders. Purchase history is kept.`
            : undefined
        }
        confirmLabel="Deactivate"
        icon={Ban}
        variant="destructive"
        loading={mutating}
        onConfirm={handleConfirmDeactivate}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Remove supplier?"
        description={
          deleteTarget
            ? `${deleteTarget.companyName || 'This supplier'} will be hidden from new orders. Purchase history stays intact — prefer Deactivate when you only need a temporary pause.`
            : undefined
        }
        warning="Permanent wipe is not available for suppliers so purchase history stays intact."
        confirmLabel="Remove"
        icon={Trash2}
        variant="destructive"
        loading={mutating}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default SuppliersPage
