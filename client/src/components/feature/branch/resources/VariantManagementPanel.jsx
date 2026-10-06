import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import { VariantTypeDialog } from '@/components/feature/branch/resources/VariantTypeDialog'
import { VariantValueDialog } from '@/components/feature/branch/resources/VariantValueDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { ParentChildManagementLayout } from '@/components/shared/parent-child/ParentChildManagementLayout'
import {
  ChildEntityTable,
  ParentEntityTable,
} from '@/components/shared/parent-child/ParentChildEntityTables'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  filterFlatChildRows,
  filterParentChildRows,
  flattenParentChildRows,
} from '@/lib/filterParentChildRows'
import { TABLE_PAGE_SIZE } from '@/lib/tablePagination'
import { toastError, toastSuccess } from '@/lib/toast'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function VariantManagementPanel() {
  const [saving, setSaving] = useState(false)
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('parents')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [parentFilterId, setParentFilterId] = useState('all')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)

  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [typeDialogMode, setTypeDialogMode] = useState('create')
  const [editingType, setEditingType] = useState(null)

  const [valueDialogOpen, setValueDialogOpen] = useState(false)
  const [valueDialogMode, setValueDialogMode] = useState('create')
  const [editingValue, setEditingValue] = useState(null)
  const [lockedTypeId, setLockedTypeId] = useState(null)

  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteKind, setDeleteKind] = useState(null)

  const loadTypes = useCallback(async () => {
    const res = await apiClient.get(endpoints.branch.resources.variantTypes.list, {
      active: 'all',
      includeValues: true,
    })
    if (res.success) {
      setTypes(res.data || [])
      return true
    }
    toastError(res.error || 'Failed to load variant types')
    return false
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await apiClient.get(endpoints.branch.resources.variantTypes.list, {
        active: 'all',
        includeValues: true,
      })
      if (cancelled) return
      if (res.success) setTypes(res.data || [])
      else toastError(res.error || 'Failed to load variant types')
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  //
  // Normalize API → shared parent/child row shape.
  //
  const treeRows = useMemo(() => {
    return types.map((type) => {
      const values = type.values || []
      return {
        id: type.id,
        name: type.name,
        isActive: type.isActive,
        valuesCount: type.valuesCount,
        children: values.map((value) => ({
          id: value.id,
          name: value.name,
          isActive: value.isActive,
          parentId: value.variantTypeId || type.id,
          variantTypeId: value.variantTypeId || type.id,
        })),
        _raw: type,
      }
    })
  }, [types])

  const parentRows = useMemo(
    () => filterParentChildRows(treeRows, statusFilter, debouncedSearch),
    [treeRows, statusFilter, debouncedSearch],
  )

  const flatChildren = useMemo(() => flattenParentChildRows(treeRows), [treeRows])

  const childRows = useMemo(
    () =>
      filterFlatChildRows(flatChildren, statusFilter, debouncedSearch, parentFilterId),
    [flatChildren, statusFilter, debouncedSearch, parentFilterId],
  )

  const parentCount = treeRows.length
  const childCount = flatChildren.length

  const parentPaging = useClientPagination(parentRows, TABLE_PAGE_SIZE)
  const childPaging = useClientPagination(childRows, TABLE_PAGE_SIZE)

  const parentFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Variant Types' },
      ...treeRows.map((row) => ({ value: String(row.id), label: row.name })),
    ],
    [treeRows],
  )

  const hasActiveType = types.some((t) => t.isActive !== false)

  function resetPageOnFilter() {
    parentPaging.setPage(1)
    childPaging.setPage(1)
  }

  function openCreateType() {
    setTypeDialogMode('create')
    setEditingType(null)
    setTypeDialogOpen(true)
  }

  function openEditType(row) {
    setTypeDialogMode('edit')
    setEditingType(row._raw || row)
    setTypeDialogOpen(true)
  }

  function openCreateValue(type = null) {
    setValueDialogMode('create')
    setEditingValue(null)
    setLockedTypeId(type?.id || null)
    setValueDialogOpen(true)
  }

  function openEditValue(row) {
    setValueDialogMode('edit')
    setEditingValue(row)
    setLockedTypeId(null)
    setValueDialogOpen(true)
  }

  async function handleTypeSubmit({ name, isActive }) {
    setSaving(true)
    try {
      const res =
        typeDialogMode === 'edit' && editingType?.id
          ? await apiClient.put(endpoints.branch.resources.variantTypes.update(editingType.id), {
              name,
              isActive,
            })
          : await apiClient.post(endpoints.branch.resources.variantTypes.create, {
              name,
              isActive,
            })

      if (!res.success) return res
      toastSuccess(typeDialogMode === 'edit' ? 'Variant type updated' : 'Variant type created')
      await loadTypes()
      return res
    } finally {
      setSaving(false)
    }
  }

  async function handleValueSubmit({ variantTypeId, name, isActive }) {
    setSaving(true)
    try {
      const res =
        valueDialogMode === 'edit' && editingValue?.id
          ? await apiClient.put(
              endpoints.branch.resources.variantValues.update(editingValue.id),
              { variantTypeId, name, isActive },
            )
          : await apiClient.post(endpoints.branch.resources.variantValues.create, {
              variantTypeId,
              name,
              isActive,
            })

      if (!res.success) return res
      toastSuccess(valueDialogMode === 'edit' ? 'Variant value updated' : 'Variant value created')
      await loadTypes()
      return res
    } finally {
      setSaving(false)
    }
  }

  async function patchStatus(kind, row, isActive) {
    const target = row._raw || row
    if (!target?.id) return
    if (!isActive) {
      setDeactivateTarget({ kind, row: target })
      return
    }

    setStatusUpdatingId(target.id)
    try {
      const endpoint =
        kind === 'type'
          ? endpoints.branch.resources.variantTypes.update(target.id)
          : endpoints.branch.resources.variantValues.update(target.id)
      const res = await apiClient.put(endpoint, { isActive: true })
      if (res.success) {
        toastSuccess(kind === 'type' ? 'Variant type activated' : 'Variant value activated')
        await loadTypes()
      } else {
        toastError(res.error || 'Activate failed')
      }
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget?.row?.id) return
    const { kind, row } = deactivateTarget
    setStatusUpdatingId(row.id)
    try {
      const endpoint =
        kind === 'type'
          ? endpoints.branch.resources.variantTypes.update(row.id)
          : endpoints.branch.resources.variantValues.update(row.id)
      const res = await apiClient.put(endpoint, { isActive: false })
      setDeactivateTarget(null)
      if (res.success) {
        toastSuccess(kind === 'type' ? 'Variant type deactivated' : 'Variant value deactivated')
        await loadTypes()
      } else {
        toastError(res.error || 'Deactivate failed')
      }
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function requestDelete(kind, row) {
    setDeleteKind(kind)
    setDeleteTarget(row._raw || row)
  }

  async function confirmDelete() {
    if (!deleteTarget?.id || !deleteKind) return
    setSaving(true)
    try {
      const endpoint =
        deleteKind === 'type'
          ? endpoints.branch.resources.variantTypes.delete(deleteTarget.id)
          : endpoints.branch.resources.variantValues.delete(deleteTarget.id)
      const res = await apiClient.delete(endpoint)
      if (!res.success) {
        toastError(res.error || 'Delete failed')
        return
      }
      if (deleteKind === 'type') {
        const count = res.data?.deletedValuesCount || 0
        toastSuccess(
          count > 0
            ? `Variant type deleted (${count} value${count === 1 ? '' : 's'} removed)`
            : 'Variant type deleted',
        )
      } else {
        toastSuccess('Variant value deleted')
      }
      setDeleteTarget(null)
      setDeleteKind(null)
      await loadTypes()
    } finally {
      setSaving(false)
    }
  }

  const deleteDescription =
    deleteKind === 'type'
      ? (deleteTarget?.valuesCount || deleteTarget?.values?.length || 0) > 0
        ? `This type has ${deleteTarget.valuesCount || deleteTarget.values.length} associated value(s). Deleting it will also remove all associated values.`
        : `Permanently remove variant type “${deleteTarget?.name}”? This cannot be undone.`
      : `Permanently remove variant value “${deleteTarget?.name}”? This cannot be undone.`

  const emptyParentTitle =
    debouncedSearch || statusFilter !== 'all'
      ? 'No variant types match your filters.'
      : 'No variant types yet. Create a type first, then add values.'

  const emptyChildTitle =
    debouncedSearch || statusFilter !== 'all' || parentFilterId !== 'all'
      ? 'No variant values match your filters.'
      : 'No variant values yet. Add values from a type or use Add Variant Value.'

  return (
    <>
      <MotionHeader>
        <PageHeader
          title="Variant Management"
          description="Variant Types and Values configured here become available to the Inventory Manager in Add Item."
        />
      </MotionHeader>

      <MotionReveal delay={0.02}>
        <ParentChildManagementLayout
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            resetPageOnFilter()
          }}
          parentTabLabel="Variant Types"
          childTabLabel="Variant Values"
          parentCount={parentCount}
          childCount={childCount}
          primaryActionLabel={
            activeTab === 'parents' ? 'Add Variant Type' : 'Add Variant Value'
          }
          primaryActionDisabled={activeTab === 'children' && !hasActiveType}
          onPrimaryAction={() =>
            activeTab === 'parents' ? openCreateType() : openCreateValue()
          }
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            resetPageOnFilter()
          }}
          searchPlaceholder={
            activeTab === 'parents'
              ? 'Search variant type or value…'
              : 'Search value or type…'
          }
          status={statusFilter}
          onStatusChange={(value) => {
            setStatusFilter(value)
            resetPageOnFilter()
          }}
          statusOptions={STATUS_OPTIONS}
          showParentFilter={activeTab === 'children'}
          parentFilterId={parentFilterId}
          onParentFilterChange={(value) => {
            setParentFilterId(value)
            childPaging.setPage(1)
          }}
          parentFilterOptions={parentFilterOptions}
          parentFilterLabel="Variant type"
        >
          {activeTab === 'parents' ? (
            <ParentEntityTable
              rows={parentPaging.slice}
              loading={loading}
              emptyIcon={Layers}
              emptyTitle={emptyParentTitle}
              showConfiguredColumn
              countSuffix=""
              labels={{
                name: 'Variant Type Name',
                count: 'Number of Values',
                parentSummaryEmpty: 'No values yet',
              }}
              statusUpdatingId={statusUpdatingId}
              onEdit={openEditType}
              onToggleActive={(row, next) => patchStatus('type', row, next)}
              onDelete={(row) => requestDelete('type', row)}
              onAddChild={openCreateValue}
              addChildLabel="Add Values"
              pagination={{
                page: parentPaging.page,
                pageCount: parentPaging.pageCount,
                total: parentPaging.total,
                pageSize: parentPaging.pageSize,
                loading,
                onPageChange: parentPaging.setPage,
                onPageSizeChange: parentPaging.setPageSize,
              }}
            />
          ) : (
            <ChildEntityTable
              rows={childPaging.slice}
              loading={loading}
              emptyIcon={Layers}
              emptyTitle={emptyChildTitle}
              labels={{
                name: 'Value Name',
                parent: 'Variant Type',
              }}
              statusUpdatingId={statusUpdatingId}
              onEdit={openEditValue}
              onToggleActive={(row, next) => patchStatus('value', row, next)}
              onDelete={(row) => requestDelete('value', row)}
              pagination={{
                page: childPaging.page,
                pageCount: childPaging.pageCount,
                total: childPaging.total,
                pageSize: childPaging.pageSize,
                loading,
                onPageChange: childPaging.setPage,
                onPageSizeChange: childPaging.setPageSize,
              }}
            />
          )}
        </ParentChildManagementLayout>
      </MotionReveal>

      <VariantTypeDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        mode={typeDialogMode}
        initial={editingType}
        loading={saving}
        onSubmit={handleTypeSubmit}
      />

      <VariantValueDialog
        open={valueDialogOpen}
        onOpenChange={setValueDialogOpen}
        mode={valueDialogMode}
        initial={editingValue}
        types={types}
        lockedTypeId={lockedTypeId}
        loading={saving}
        onSubmit={handleValueSubmit}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
        title={
          deactivateTarget?.kind === 'type'
            ? 'Deactivate variant type?'
            : 'Deactivate variant value?'
        }
        description={
          deactivateTarget?.kind === 'type'
            ? `“${deactivateTarget?.row?.name}” will be inactive. Existing values stay, but new values cannot be added to it until reactivated.`
            : `“${deactivateTarget?.row?.name}” will be inactive and hidden from active selection lists.`
        }
        confirmLabel="Deactivate"
        loading={Boolean(statusUpdatingId)}
        onConfirm={confirmDeactivate}
      />

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteKind(null)
          }
        }}
        entityName={deleteTarget?.name}
        title={
          deleteKind === 'type'
            ? `Remove “${deleteTarget?.name}” variant type?`
            : `Remove “${deleteTarget?.name}” variant value?`
        }
        description={deleteDescription}
        showSoftAction={false}
        canHardDelete
        hardLabel="Permanently delete"
        loading={saving}
        onHardDelete={confirmDelete}
      />
    </>
  )
}

export default VariantManagementPanel
