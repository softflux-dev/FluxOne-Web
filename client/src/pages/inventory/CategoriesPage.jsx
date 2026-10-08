import { useMemo, useState } from 'react'
import { Ban, FolderTree } from 'lucide-react'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { CategoryDialog } from '@/components/feature/products/CategoryDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { ParentChildManagementLayout } from '@/components/shared/parent-child/ParentChildManagementLayout'
import {
  ChildEntityTable,
  ParentEntityTable,
} from '@/components/shared/parent-child/ParentChildEntityTables'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useProducts } from '@/hooks/useProducts'
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

export function CategoriesPage() {
  const {
    catalog,
    catalogLoading,
    mutating,
    createCategory,
    updateCategory,
    deleteCategory,
    setCategoryActive,
  } = useProducts({}, { skipList: true, categoryActive: 'all' })

  const [activeTab, setActiveTab] = useState('parents')
  const [statusFilter, setStatusFilter] = useState('active')
  const [query, setQuery] = useState('')
  const [parentFilterId, setParentFilterId] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState('create')
  const [dialogKind, setDialogKind] = useState('category')
  const [editing, setEditing] = useState(null)
  const [parentForSub, setParentForSub] = useState(null)
  const [pickParent, setPickParent] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteDeps, setDeleteDeps] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Load product/sub counts before delete so hard delete stays blocked when used.
  async function openDeleteTarget(row) {
    const target = row?._raw || row
    if (!target?.id) return
    setDeleteTarget(target)
    setDeleteDeps(null)
    const result = await apiClient.get(endpoints.products.categoryDependencies(target.id))
    if (result.success) setDeleteDeps(result.data)
  }

  const treeRows = useMemo(() => {
    return (catalog.parents || []).map((parent) => {
      const children = catalog.childrenByParent.get(parent.id) || []
      return {
        id: parent.id,
        name: parent.name,
        isActive: parent.isActive,
        imageUrl: parent.imageUrl,
        parentId: parent.parentId,
        children: children.map((child) => ({
          id: child.id,
          name: child.name,
          isActive: child.isActive,
          imageUrl: child.imageUrl,
          parentId: child.parentId,
        })),
        _raw: parent,
      }
    })
  }, [catalog])

  const parentRows = useMemo(
    () => filterParentChildRows(treeRows, statusFilter, query),
    [treeRows, statusFilter, query],
  )

  const flatChildren = useMemo(() => flattenParentChildRows(treeRows), [treeRows])

  const childRows = useMemo(
    () => filterFlatChildRows(flatChildren, statusFilter, query, parentFilterId),
    [flatChildren, statusFilter, query, parentFilterId],
  )

  const parentCount = treeRows.length
  const childCount = flatChildren.length

  const parentPaging = useClientPagination(parentRows, TABLE_PAGE_SIZE)
  const childPaging = useClientPagination(childRows, TABLE_PAGE_SIZE)

  const parentFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Categories' },
      ...treeRows.map((row) => ({ value: String(row.id), label: row.name })),
    ],
    [treeRows],
  )

  const hasActiveParent = (catalog.parents || []).some((row) => row.isActive !== false)

  function resetPageOnFilter() {
    parentPaging.setPage(1)
    childPaging.setPage(1)
  }

  function openCreateCategory() {
    setDialogKind('category')
    setDialogMode('create')
    setEditing(null)
    setParentForSub(null)
    setPickParent(false)
    setDialogOpen(true)
  }

  function openCreateSub(parent) {
    if (!parent) {
      const choices = (catalog.parents || []).filter((row) => row.isActive !== false)
      if (!choices.length) {
        toastError('Create a parent category first')
        return
      }
    }
    setDialogKind('subcategory')
    setDialogMode('create')
    setEditing(null)
    setParentForSub(parent?._raw || parent || null)
    setPickParent(!parent)
    setDialogOpen(true)
  }

  function openEdit(row, kind) {
    setDialogKind(kind)
    setDialogMode('edit')
    setEditing(row._raw || row)
    setParentForSub(null)
    setPickParent(false)
    setDialogOpen(true)
  }

  async function handleSubmit({ name, image, parentId }) {
    let result
    if (dialogMode === 'edit' && editing?.id) {
      result = await updateCategory(editing.id, { name, image })
    } else if (dialogKind === 'subcategory') {
      result = await createCategory({
        name,
        image,
        parentId: parentForSub?.id || parentId,
      })
    } else {
      result = await createCategory({ name, image })
    }

    if (result.success) {
      toastSuccess(
        dialogMode === 'edit'
          ? 'Saved'
          : dialogKind === 'subcategory'
            ? 'Sub category created'
            : 'Category created',
      )
    } else {
      toastError(result.error || 'Request failed')
    }
    return result
  }

  async function handleStatusChange(row, isActive) {
    const target = row._raw || row
    if (!target?.id) return
    if (!isActive) {
      setDeactivateTarget(target)
      return
    }
    setStatusUpdatingId(target.id)
    try {
      const result = await setCategoryActive(target.id, true)
      if (result.success) toastSuccess('Category activated')
      else toastError(result.error || 'Activate failed')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function handleConfirmDeactivate() {
    if (!deactivateTarget?.id) return
    setStatusUpdatingId(deactivateTarget.id)
    try {
      const result = await setCategoryActive(deactivateTarget.id, false)
      setDeactivateTarget(null)
      if (result.success) {
        toastSuccess(
          deactivateTarget.parentId
            ? 'Sub category deactivated — products show Subcategory N/A'
            : 'Category deactivated — products keep Active with Category N/A',
        )
      } else {
        toastError(result.error || 'Deactivate failed')
      }
    } finally {
      setStatusUpdatingId(null)
    }
  }

  async function handleSoftDeleteCategory() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await setCategoryActive(deleteTarget.id, false)
      setDeleteTarget(null)
      setDeleteDeps(null)
      if (result.success) {
        toastSuccess(
          deleteTarget.parentId
            ? 'Sub category deactivated — products show Subcategory N/A'
            : 'Category deactivated — products keep Active with Category N/A',
        )
      } else {
        toastError(result.error || 'Deactivate failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleHardDeleteCategory() {
    if (!deleteTarget?.id) return
    setDeleteLoading(true)
    try {
      const result = await deleteCategory(deleteTarget.id)
      setDeleteTarget(null)
      setDeleteDeps(null)
      if (result.success) {
        toastSuccess(deleteTarget.parentId ? 'Sub category deleted' : 'Category deleted')
      } else {
        toastError(result.error || 'Delete failed')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  const deleteCategoryIsActive = deleteTarget?.isActive !== false
  const deleteProductCount = Number(deleteDeps?.productCount) || 0
  const deleteSubCount = Number(deleteDeps?.subcategoryCount) || 0
  const canHardDeleteCategory = Boolean(deleteDeps) && deleteProductCount === 0 && deleteSubCount === 0
  const hardDeleteBlockedReason = !deleteDeps
    ? 'Checking linked products…'
    : deleteProductCount > 0
      ? `${deleteProductCount} product(s) assigned` +
        (deleteSubCount > 0 ? ` and ${deleteSubCount} subcategor(ies)` : '') +
        '. Deactivate or reassign products before permanent delete.'
      : deleteSubCount > 0
        ? `${deleteSubCount} subcategor(ies) still exist. Remove them first, or deactivate this category.`
        : 'Linked records block permanent delete.'

  const emptyParentTitle = query.trim()
    ? 'No categories match that search.'
    : statusFilter === 'all'
      ? 'No categories yet. Create a parent category first.'
      : statusFilter === 'active'
        ? 'No active categories.'
        : 'No inactive categories.'

  const emptyChildTitle =
    query.trim() || statusFilter !== 'active' || parentFilterId !== 'all'
      ? 'No sub categories match your filters.'
      : 'No sub categories yet. Add one from a category or use Add Sub Category.'

  function categoryAvatar(row) {
    if (!row.imageUrl) return null
    return (
      <img src={row.imageUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
    )
  }

  function subAvatar(row) {
    if (!row.imageUrl) return null
    return (
      <img src={row.imageUrl} alt="" className="size-7 shrink-0 rounded object-cover" />
    )
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          title="Categories"
          description="Manage parent and sub categories — delete or deactivate when unused"
        />
      </MotionHeader>

      <MotionReveal delay={0.02}>
        <ParentChildManagementLayout
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            resetPageOnFilter()
          }}
          parentTabLabel="Categories"
          childTabLabel="Sub Categories"
          parentCount={parentCount}
          childCount={childCount}
          primaryActionLabel={
            activeTab === 'parents' ? 'Add Category' : 'Add Sub Category'
          }
          primaryActionDisabled={activeTab === 'children' && !hasActiveParent}
          onPrimaryAction={() =>
            activeTab === 'parents' ? openCreateCategory() : openCreateSub(null)
          }
          search={query}
          onSearchChange={(value) => {
            setQuery(value)
            resetPageOnFilter()
          }}
          searchPlaceholder="Search category or sub category…"
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
          parentFilterLabel="Category"
        >
          {activeTab === 'parents' ? (
            <ParentEntityTable
              rows={parentPaging.slice}
              loading={catalogLoading}
              emptyIcon={FolderTree}
              emptyTitle={emptyParentTitle}
              countSuffix=""
              labels={{
                name: 'Category Name',
                count: 'Sub Categories',
                parentSummaryEmpty: 'No sub categories yet',
              }}
              statusUpdatingId={statusUpdatingId}
              renderNameLeading={categoryAvatar}
              onEdit={(row) => openEdit(row, 'category')}
              onToggleActive={handleStatusChange}
              onDelete={(row) => void openDeleteTarget(row)}
              onAddChild={openCreateSub}
              addChildLabel="Add Sub Category"
              pagination={{
                page: parentPaging.page,
                pageCount: parentPaging.pageCount,
                total: parentPaging.total,
                pageSize: parentPaging.pageSize,
                loading: catalogLoading,
                onPageChange: parentPaging.setPage,
                onPageSizeChange: parentPaging.setPageSize,
              }}
            />
          ) : (
            <ChildEntityTable
              rows={childPaging.slice}
              loading={catalogLoading}
              emptyIcon={FolderTree}
              emptyTitle={emptyChildTitle}
              labels={{
                name: 'Sub Category Name',
                parent: 'Category',
              }}
              statusUpdatingId={statusUpdatingId}
              renderNameLeading={subAvatar}
              onEdit={(row) => openEdit(row, 'subcategory')}
              onToggleActive={handleStatusChange}
              onDelete={(row) => void openDeleteTarget(row)}
              pagination={{
                page: childPaging.page,
                pageCount: childPaging.pageCount,
                total: childPaging.total,
                pageSize: childPaging.pageSize,
                loading: catalogLoading,
                onPageChange: childPaging.setPage,
                onPageSizeChange: childPaging.setPageSize,
              }}
            />
          )}
        </ParentChildManagementLayout>
      </MotionReveal>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initial={editing}
        title={dialogKind === 'subcategory' ? 'Sub category' : 'Category'}
        loading={mutating}
        parents={
          pickParent
            ? (catalog.parents || []).filter((row) => row.isActive !== false)
            : null
        }
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
        title={
          deactivateTarget?.parentId ? 'Deactivate subcategory?' : 'Deactivate category?'
        }
        description={
          deactivateTarget?.parentId
            ? `“${deactivateTarget.name}” will be inactive. Products keep Active; subcategory becomes N/A.`
            : `“${deactivateTarget?.name}” and its sub categories will be inactive. Products stay Active with Category N/A.`
        }
        confirmLabel="Deactivate"
        variant="warning"
        icon={Ban}
        loading={mutating || Boolean(statusUpdatingId)}
        onConfirm={handleConfirmDeactivate}
      />

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteDeps(null)
          }
        }}
        entityName={deleteTarget?.name}
        title={
          deleteTarget?.parentId
            ? `Remove “${deleteTarget?.name}” subcategory?`
            : `Remove “${deleteTarget?.name}” category?`
        }
        description={
          deleteTarget?.parentId
            ? `Prefer Deactivate if products still reference this subcategory. Permanent delete is only allowed when unused.`
            : `Prefer Deactivate for “${deleteTarget?.name}” when products or subcategories exist. Permanent delete is only allowed when unused.`
        }
        softLabel="Deactivate"
        softHint="Products stay Active with Category / Subcategory N/A. You can reactivate later."
        hardLabel="Permanently delete"
        showSoftAction={deleteCategoryIsActive}
        canHardDelete={canHardDeleteCategory}
        hardDisabledReason={hardDeleteBlockedReason}
        loading={deleteLoading || mutating}
        onSoftDelete={handleSoftDeleteCategory}
        onHardDelete={handleHardDeleteCategory}
      />
    </div>
  )
}

export default CategoriesPage
