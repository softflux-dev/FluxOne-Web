import { useEffect, useMemo, useState } from 'react'
import { StatCard } from '@/components/shared/StatsCards'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { BranchConfirmDialogs } from '@/components/feature/admin/branches/BranchConfirmDialogs'
import { BranchFormDialog } from '@/components/feature/admin/branches/BranchFormDialog'
import { BranchesFilters } from '@/components/feature/admin/branches/BranchesFilters'
import { BranchesTable } from '@/components/feature/admin/branches/BranchesTable'
import {
  BRANCH_FIELD_IDS,
  BRANCH_FIELD_ORDER,
  credentialsToast,
  emptyForm,
  formatCreatedAt,
  timeInputValue,
} from '@/components/feature/admin/branches/branchUtils'
import { BRAND } from '@/lib/constants'
import { formatClockTime } from '@/lib/formatDateTime'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  formatWorkingDaysShort,
  normalizeWorkingDays,
  validateWorkingDaysFields,
} from '@/lib/validation/branchForms'
import { validatePhone, validateEmail } from '@/lib/validation/formValidators'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useAdminBranches } from '@/hooks/useAdminBranches'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { useClientPagination } from '@/hooks/useClientPagination'
import { displayBranchRef, normalizeSearchQuery } from '@/lib/formatDisplayId'
import { exportRowsToCsv } from '@/lib/csvExport'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import { Ban, CheckCircle, Plus, Store, Users } from 'lucide-react'

export function BranchesPage() {
  const { user } = useAuthSession()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(normalizeSearchQuery(searchQuery), 300)
  const [statusFilter, setStatusFilter] = useState('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false)
  const [targetBranch, setTargetBranch] = useState(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const { fieldErrors, formError, resetErrors, clearField, applyErrors } = useFieldErrors()

  const {
    items,
    loading,
    mutating,
    error,
    createBranch,
    updateBranch,
    setBranchStatus,
    resetManagerPassword,
    deleteBranch,
  } = useAdminBranches({ q: debouncedQ, limit: 100 })

  const { captureBaseline, isDirty } = useFormBaseline(addDialogOpen)
  const slowHint = useSlowLoadingHint(loading)

  useEffect(() => {
    if (!addDialogOpen) return
    resetErrors()
    captureBaseline(formData)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per open
  }, [addDialogOpen, captureBaseline, resetErrors])

  const stats = useMemo(() => {
    const total = items.length
    const open = items.filter((b) => b.status === 'open').length
    const blocked = items.filter((b) => b.status === 'blocked').length
    const totalStaff = items.reduce((acc, b) => acc + (Number(b.totalStaff) || 0), 0)
    return { total, open, blocked, totalStaff }
  }, [items])

  const filteredBranches = useMemo(() => {
    return items.filter((b) => (statusFilter === 'all' ? true : b.status === statusFilter))
  }, [items, statusFilter])

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedBranches,
  } = useClientPagination(filteredBranches)

  function handleExportBranches() {
    if (!filteredBranches.length) {
      toastError('No branches to export')
      return
    }
    try {
      const stamp = new Date().toISOString().slice(0, 10)
      exportRowsToCsv({
        filename: `branches-export-${stamp}.csv`,
        headers: [
          'Branch ID',
          'Branch Name',
          'Location',
          'Manager Name',
          'Manager Email',
          'Manager Phone',
          'Branch Staff',
          'Status',
          'Opening Time',
          'Closing Time',
          'Working Days',
          'Created At',
        ],
        rows: filteredBranches.map((b) => [
          displayBranchRef(b),
          b.name || '',
          b.location || '',
          b.manager?.name || '',
          b.manager?.email || '',
          b.manager?.contact || '',
          Number(b.totalStaff) || 0,
          b.status === 'open' ? 'Open' : 'Blocked',
          formatClockTime(b.openingTime) || '',
          formatClockTime(b.closingTime) || '',
          formatWorkingDaysShort(b.workingDays) || '',
          formatCreatedAt(b.createdAt),
        ]),
      })
      toastSuccess(`Exported ${filteredBranches.length} branch record(s)`)
    } catch (err) {
      toastError(err?.message || 'Failed to export branches')
    }
  }

  function handleOpenAdd() {
    setFormData({
      ...emptyForm,
      id: 'Assigned on save',
      createdAt: 'On save',
    })
    setEditingBranch(null)
    setAddDialogOpen(true)
  }

  function handleOpenEdit(b) {
    setEditingBranch(b)
    const days = normalizeWorkingDays(b.workingDays)
    setFormData({
      id: b.id,
      createdAt: formatCreatedAt(b.createdAt),
      name: b.name || '',
      location: b.location || '',
      openingTime: timeInputValue(b.openingTime),
      closingTime: timeInputValue(b.closingTime),
      workingDays: days,
      imageFile: null,
      managerImageFile: null,
      managerName: b.manager?.name || '',
      managerEmail: b.manager?.email || '',
      managerContact: b.manager?.contact || '',
      managerOtherContact: b.manager?.otherContact || '',
      managerGender: b.manager?.gender || 'Male',
      managerAddress: b.manager?.address || '',
    })
    setAddDialogOpen(true)
  }

  function handlePromptToggleStatus(branch) {
    setTargetBranch(branch)
    setConfirmStatusOpen(true)
  }

  async function handleConfirmToggleStatus() {
    if (!targetBranch) return
    const nextStatus = targetBranch.status === 'open' ? 'blocked' : 'open'
    const result = await setBranchStatus(targetBranch.id, nextStatus)
    if (!result.success) {
      toastError(result.error || 'Failed to update branch status')
      return
    }
    toastSuccess(
      `Branch ${targetBranch.name} is now ${nextStatus === 'blocked' ? 'BLOCKED' : 'OPEN & Active'}`,
    )
    setTargetBranch(null)
    setConfirmStatusOpen(false)
  }

  function handlePromptResetPassword(branch) {
    setResetTarget(branch)
    setResetDialogOpen(true)
  }

  async function handleConfirmResetPassword() {
    if (!resetTarget) return
    const result = await resetManagerPassword(resetTarget.id)
    if (!result.success) {
      toastError(result.error || 'Failed to reset password')
      return
    }
    credentialsToast(`Password reset for ${resetTarget.manager?.email || 'manager'}.`, result.data?.credentials)
    setResetTarget(null)
    setResetDialogOpen(false)
  }

  async function handleSoftDeleteFromTrash() {
    if (!deleteTarget) return
    if (deleteTarget.status === 'blocked') {
      setDeleteTarget(null)
      return
    }
    const result = await setBranchStatus(deleteTarget.id, 'blocked')
    if (!result.success) {
      toastError(result.error || 'Failed to block branch')
      return
    }
    toastSuccess(`Branch "${deleteTarget.name}" blocked — data kept. Open it anytime from Blocked.`)
    setDeleteTarget(null)
  }

  async function handleHardDeleteBranch() {
    if (!deleteTarget) return
    const result = await deleteBranch(deleteTarget.id)
    if (!result.success) {
      toastError(result.error || 'Failed to delete branch')
      return
    }
    toastSuccess(`Branch "${deleteTarget.name}" permanently deleted`)
    setDeleteTarget(null)
  }

  const deleteHasStaff = Number(deleteTarget?.totalStaff || 0) > 0
  const deleteCanHard = Boolean(deleteTarget) && !deleteHasStaff
  const deleteShowSoft = Boolean(deleteTarget) && deleteTarget.status === 'open'

  async function handleSubmitBranch(e) {
    e.preventDefault()
    const errors = {}
    if (!formData.name.trim() || !formData.location.trim()) {
      if (!formData.name.trim()) {
        errors.name = 'Please fill in Branch Name and Location'
      }
      if (!formData.location.trim()) {
        errors.location = 'Please fill in Branch Name and Location'
      }
    }
    if (!formData.managerName.trim()) {
      errors.managerName = 'Please fill in Branch Manager Name'
    }

    const emailErr = validateEmail(formData.managerEmail, { fieldName: 'Manager Email' })
    if (emailErr) errors.managerEmail = emailErr

    const phoneErr = validatePhone(formData.managerContact, { fieldName: 'Manager Contact Phone' })
    if (phoneErr) errors.managerContact = phoneErr

    if (formData.managerOtherContact.trim()) {
      const otherErr = validatePhone(formData.managerOtherContact, {
        fieldName: 'Other contact number',
        required: false,
      })
      if (otherErr) errors.managerOtherContact = otherErr
    }

    const hasOpen = Boolean(formData.openingTime?.trim())
    const hasClose = Boolean(formData.closingTime?.trim())
    if (hasOpen !== hasClose) {
      errors.openingTime = 'Set both opening and closing time, or leave both empty'
      errors.closingTime = 'Set both opening and closing time, or leave both empty'
    } else if (hasOpen && hasClose && formData.openingTime >= formData.closingTime) {
      errors.closingTime = 'Closing time must be after opening time'
    }

    Object.assign(errors, validateWorkingDaysFields(formData.workingDays))

    if (Object.keys(errors).length) {
      applyErrors(errors, BRANCH_FIELD_IDS, BRANCH_FIELD_ORDER)
      return
    }
    resetErrors()

    const payload = {
      name: formData.name.trim(),
      location: formData.location.trim(),
      openingTime: formData.openingTime || '',
      closingTime: formData.closingTime || '',
      workingDays: normalizeWorkingDays(formData.workingDays),
      image: formData.imageFile || undefined,
      profileImage: formData.managerImageFile || undefined,
      managerName: formData.managerName.trim(),
      managerEmail: formData.managerEmail.trim(),
      managerContact: formData.managerContact.trim(),
      managerOtherContact: formData.managerOtherContact.trim() || undefined,
      managerGender: formData.managerGender,
      managerAddress: formData.managerAddress.trim() || undefined,
    }

    if (editingBranch) {
      try {
        const result = await updateBranch(editingBranch.id, payload)
        if (!result.success) {
          toastError(result.error || 'Failed to update branch')
          return
        }
        toastSuccess(`Branch details updated for "${formData.name}"`)
        setAddDialogOpen(false)
        setEditingBranch(null)
      } catch (err) {
        toastError(err?.message || 'Failed to update branch')
      }
    } else {
      try {
        const result = await createBranch(payload)
        if (!result.success) {
          toastError(result.error || 'Failed to create branch')
          return
        }
        credentialsToast(`Branch "${formData.name}" created.`, result.data?.credentials)
        setAddDialogOpen(false)
        setEditingBranch(null)
      } catch (err) {
        toastError(err?.message || 'Failed to create branch')
      }
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow={user?.tenantName ? `${user.tenantName} · Network` : 'Network Infrastructure'}
          title="Manage Branches"
          description="Consolidated branch network, branch manager assignments, locations & access statuses"
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <ExportCsvButton
                onClick={handleExportBranches}
                disabled={loading || filteredBranches.length === 0}
                label="Export"
                title="Export branches to Excel / CSV"
              />
              <Button
                type="button"
                onClick={handleOpenAdd}
                disabled={loading}
                className="text-white shadow-xs cursor-pointer font-semibold"
                style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
              >
                <Plus className="mr-1.5 size-4" />
                Add New Branch
              </Button>
            </div>
          }
        />
      </MotionHeader>

      <SlowLoadingBanner show={slowHint} />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <MotionReveal delay={0.03}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            index={0}
            label="Total Branches"
            value={loading ? '—' : stats.total}
            icon={Store}
          />
          <StatCard
            index={1}
            label="Active & Open Branches"
            value={loading ? '—' : stats.open}
            icon={CheckCircle}
            iconGradient="from-emerald-500 to-teal-600"
          />
          <StatCard
            index={2}
            label="Blocked Branches"
            value={loading ? '—' : stats.blocked}
            icon={Ban}
            iconGradient="from-rose-500 to-red-600"
          />
          <StatCard
            index={3}
            label="Total Branch Staff"
            value={loading ? '—' : stats.totalStaff}
            icon={Users}
            iconGradient="from-[#412283] to-[#24104f]"
          />
        </div>
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <BranchesFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          stats={stats}
          setPage={setPage}
        />
      </MotionReveal>

      <MotionReveal delay={0.09}>
        <BranchesTable
          loading={loading}
          items={items}
          filteredBranches={filteredBranches}
          pagedBranches={pagedBranches}
          mutating={mutating}
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
          onEdit={handleOpenEdit}
          onResetPassword={handlePromptResetPassword}
          onToggleStatus={handlePromptToggleStatus}
          onDelete={setDeleteTarget}
        />
      </MotionReveal>

      <BranchFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        dirty={isDirty(formData)}
        editingBranch={editingBranch}
        formData={formData}
        setFormData={setFormData}
        fieldErrors={fieldErrors}
        formError={formError}
        clearField={clearField}
        mutating={mutating}
        onSubmit={handleSubmitBranch}
      />

      <BranchConfirmDialogs
        confirmStatusOpen={confirmStatusOpen}
        setConfirmStatusOpen={setConfirmStatusOpen}
        targetBranch={targetBranch}
        resetDialogOpen={resetDialogOpen}
        setResetDialogOpen={setResetDialogOpen}
        resetTarget={resetTarget}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleteShowSoft={deleteShowSoft}
        deleteCanHard={deleteCanHard}
        deleteHasStaff={deleteHasStaff}
        mutating={mutating}
        onConfirmToggleStatus={handleConfirmToggleStatus}
        onConfirmResetPassword={handleConfirmResetPassword}
        onSoftDelete={handleSoftDeleteFromTrash}
        onHardDelete={handleHardDeleteBranch}
      />
    </div>
  )
}

export default BranchesPage
