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
import { usePermissions } from '@/hooks/usePermissions'
import { useSuppliers } from '@/hooks/useSuppliers'
import { toastError, toastSuccess } from '@/lib/toast'

export function SuppliersPage() {
  const { can } = usePermissions()
  const canWrite = can('suppliers:write')
  const canModerate = can('suppliers:moderate')
  // BM: View / Edit / Block only — never hard-delete (no soft-delete either)
  const canDelete = can('suppliers:delete')

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

  // Parent: page — Child: status / delete confirms (BM moderate only)
  async function applySupplierStatus(row, isActive) {
    if (!row?.id || !canModerate) return
    setStatusUpdatingId(row.id)
    try {
      const result = await setSupplierActive(row.id, isActive)
      if (!result.success) toastError(result.error || 'Status update failed')
      else toastSuccess(isActive ? 'Supplier unblocked' : 'Supplier blocked')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function handleDeactivate(row) {
    if (!canModerate || !row?.id || row.isActive === false) return
    setStatusTarget(row)
  }

  function handleActivate(row) {
    if (!canModerate || !row?.id || row.isActive !== false) return
    void applySupplierStatus(row, true)
  }

  async function handleConfirmDeactivate() {
    if (!statusTarget?.id) return
    await applySupplierStatus(statusTarget, false)
    setStatusTarget(null)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget?.id || !canDelete) return
    const result = await deleteSupplier(deleteTarget.id)
    setDeleteTarget(null)
    if (result.success) toastSuccess('Supplier deleted')
    else toastError(result.error || 'Delete failed')
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Supplier Management"
          description={
            canWrite && canModerate
              ? 'Vendor directory — add, edit, or block supplier companies'
              : canModerate
                ? 'Vendor directory — view and block companies (cannot be used on new orders)'
                : canWrite
                  ? 'Vendor directory — add and edit supplier companies (block is Branch Manager only)'
                  : 'Vendor directory — view supplier companies'
          }
          actions={
            canWrite ? (
              <Button type="button" variant="brand" onClick={openCreate}>
                <Plus className="size-4" />
                Add supplier
              </Button>
            ) : null
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
          onEdit={canWrite ? openEdit : undefined}
          onDeactivate={canModerate ? handleDeactivate : undefined}
          onActivate={canModerate ? handleActivate : undefined}
          onDelete={canDelete ? setDeleteTarget : undefined}
          statusUpdatingId={statusUpdatingId}
        />
      </MotionReveal>

      {canWrite ? (
        <SupplierFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          mode={formMode}
          initialSupplier={editing}
          loading={mutating}
          onSubmit={handleSubmit}
        />
      ) : null}

      <SupplierDetailDialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => {
          if (!open) setViewTarget(null)
        }}
        supplier={viewTarget}
      />

      {canModerate ? (
        <ConfirmDialog
          open={Boolean(statusTarget)}
          onOpenChange={(open) => {
            if (!open) setStatusTarget(null)
          }}
          title="Block supplier company?"
          description={
            statusTarget
              ? `${statusTarget.companyName || 'This company'} will be blocked and cannot be selected for new order requests. Existing orders are not affected.`
              : undefined
          }
          confirmLabel="Block"
          icon={Ban}
          variant="destructive"
          loading={mutating}
          onConfirm={handleConfirmDeactivate}
        />
      ) : null}

      {canDelete ? (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          title="Delete supplier company?"
          description={
            deleteTarget
              ? `${deleteTarget.companyName || 'This company'} will be permanently removed. If it is used on any order, delete will be blocked — use Block instead.`
              : undefined
          }
          warning="This cannot be undone."
          confirmLabel="Delete"
          icon={Trash2}
          variant="destructive"
          loading={mutating}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </div>
  )
}

export default SuppliersPage