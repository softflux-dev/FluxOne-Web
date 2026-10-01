import { useEffect, useState } from 'react'
import { Ban, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { StaffFilters } from '@/components/feature/branch/staff/StaffFilters'
import { StaffFormDialog } from '@/components/feature/branch/staff/StaffFormDialog'
import { StaffTable } from '@/components/feature/branch/staff/StaffTable'
import { StaffAttendanceTab } from '@/components/feature/branch/staff/StaffAttendanceTab'
import { StaffHolidaysTab } from '@/components/feature/branch/staff/StaffHolidaysTab'
import { StaffPerformanceTab } from '@/components/feature/branch/staff/StaffPerformanceTab'
import { LeavesPanel } from '@/components/feature/branch/staff/LeavesPanel'
import { Button } from '@/components/ui/button'
import { useBranchStaff } from '@/hooks/useBranchStaff'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { BRAND } from '@/lib/constants'
import { toastError, toastSuccess } from '@/lib/toast'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { cn } from '@/lib/utils'

export function StaffPage() {
  const {
    items,
    pagination,
    filters,
    loading,
    mutating,
    error,
    updateFilters,
    setPage,
    createStaff,
    updateStaff,
    setStaffStatus,
    deleteStaff,
  } = useBranchStaff()

  const { localQ, onSearchChange } = useDebouncedSearch(updateFilters)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [designations, setDesignations] = useState([])
  const [activeTab, setActiveTab] = useState('list')

  // Tab-specific create modals (header CTA opens these)
  const [holidayCreateOpen, setHolidayCreateOpen] = useState(false)
  const [leaveCreateOpen, setLeaveCreateOpen] = useState(false)
  const [scaleCreateOpen, setScaleCreateOpen] = useState(false)
  const [performanceSubTab, setPerformanceSubTab] = useState('roster')
  const [leaveSubTab, setLeaveSubTab] = useState('mine') // 'mine' | 'staff'

  async function loadDesignations() {
    const res = await apiClient.get(endpoints.branch.designations.list, {
      active: 'active',
      limit: 100,
    })
    if (res.success && res.data) {
      setDesignations(res.data.items || res.data || [])
    }
  }

  useEffect(() => {
    void loadDesignations()
  }, [])

  // Close create dialogs when leaving their tab
  useEffect(() => {
    setHolidayCreateOpen(false)
    setLeaveCreateOpen(false)
    setScaleCreateOpen(false)
    if (activeTab !== 'performance') setPerformanceSubTab('roster')
    if (activeTab !== 'leaves') setLeaveSubTab('mine')
  }, [activeTab])

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
        ? await updateStaff(editing.id, fields)
        : await createStaff(fields)
    if (result.success) {
      toastSuccess(formMode === 'edit' ? 'Staff updated' : 'Staff created')
    } else {
      toastError(result.error || 'Save failed')
    }
    return result
  }

  async function applyStaffStatus(row, status) {
    if (!row?.id) return
    setStatusUpdatingId(row.id)
    try {
      const result = await setStaffStatus(row.id, status)
      if (!result.success) toastError(result.error || 'Status update failed')
      else toastSuccess(status === 'inactive' ? 'Staff set inactive' : 'Staff set active')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  function handleStatusChange(row, nextActive) {
    if (!row?.id) return
    const currentlyActive = row.status === 'active' || row.status === 'open'
    if (currentlyActive === nextActive) return
    if (!nextActive) {
      setStatusTarget(row)
      return
    }
    void applyStaffStatus(row, 'active')
  }

  async function handleConfirmDeactivate() {
    if (!statusTarget?.id) return
    await applyStaffStatus(statusTarget, 'inactive')
    setStatusTarget(null)
  }

  async function handleSoftDeleteStaff() {
    if (!deleteTarget?.id) return
    await applyStaffStatus(deleteTarget, 'inactive')
    setDeleteTarget(null)
  }

  async function handleHardDeleteStaff() {
    if (!deleteTarget?.id) return
    const result = await deleteStaff(deleteTarget.id)
    setDeleteTarget(null)
    if (result.success) toastSuccess('Staff permanently deleted')
    else toastError(result.error || 'Delete failed')
  }

  const deleteStaffIsActive =
    deleteTarget?.status === 'active' || deleteTarget?.status === 'open'

  function renderHeaderActions() {
    if (activeTab === 'list') {
      return (
        <Button type="button" variant="brand" onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="size-4" />
          Add Staff
        </Button>
      )
    }

    if (activeTab === 'holidays') {
      return (
        <Button
          type="button"
          variant="brand"
          onClick={() => setHolidayCreateOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="size-4" />
          Add Holidays
        </Button>
      )
    }

    if (activeTab === 'leaves') {
      const isMine = leaveSubTab === 'mine'
      return (
        <Button
          type="button"
          variant="brand"
          onClick={() => setLeaveCreateOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="size-4" />
          {isMine ? 'Apply for Leave' : 'Add Leaves'}
        </Button>
      )
    }

    if (activeTab === 'performance' && performanceSubTab === 'scales') {
      return (
        <Button
          type="button"
          variant="brand"
          onClick={() => setScaleCreateOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="size-4" />
          Add Scale
        </Button>
      )
    }

    // Attendance + Performance Roster: no header CTA
    return null
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <MotionHeader>
        <PageHeader
          eyebrow="Branch Team"
          title="Staff Management"
          description="Manage branch staff roles for this location (Inventory Manager, Cashier, Website Manager, and more)."
          actions={renderHeaderActions()}
        />
      </MotionHeader>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {[
          { id: 'list', label: 'Staff Roster' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'holidays', label: 'Holidays' },
          { id: 'leaves', label: 'Leaves' },
          { id: 'performance', label: 'Performance' },
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm',
                active
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-border bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              )}
              style={active ? { background: BRAND.purple } : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'list' && (
        <>
          <MotionReveal delay={0.04}>
            <StaffFilters
              q={localQ}
              status={filters.status || ''}
              role={filters.role || ''}
              hardwareType={filters.hardwareType || ''}
              onChange={(patch) => {
                if (patch.q !== undefined) onSearchChange(patch.q)
                if (patch.status !== undefined) updateFilters({ status: patch.status })
                if (patch.role !== undefined) updateFilters({ role: patch.role })
                if (patch.hardwareType !== undefined) {
                  updateFilters({ hardwareType: patch.hardwareType })
                }
              }}
            />
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <StaffTable
              items={items}
              loading={loading}
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={(limit) => updateFilters({ limit })}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onBlock={(row) => handleStatusChange(row, false)}
              onUnblock={(row) => handleStatusChange(row, true)}
              statusUpdatingId={statusUpdatingId}
            />
          </MotionReveal>
        </>
      )}

      {activeTab === 'attendance' && (
        <MotionReveal delay={0.04}>
          <StaffAttendanceTab designations={designations} staff={items} />
        </MotionReveal>
      )}

      {activeTab === 'holidays' && (
        <MotionReveal delay={0.04}>
          <StaffHolidaysTab
            designations={designations}
            staff={items}
            createOpen={holidayCreateOpen}
            onCreateOpenChange={setHolidayCreateOpen}
          />
        </MotionReveal>
      )}

      {activeTab === 'leaves' && (
        <MotionReveal delay={0.04}>
          <LeavesPanel
            designations={designations}
            staff={items}
            createOpen={leaveCreateOpen}
            onCreateOpenChange={setLeaveCreateOpen}
            onSubTabChange={setLeaveSubTab}
          />
        </MotionReveal>
      )}

      {activeTab === 'performance' && (
        <MotionReveal delay={0.04}>
          <StaffPerformanceTab
            designations={designations}
            createOpen={scaleCreateOpen}
            onCreateOpenChange={setScaleCreateOpen}
            onSubTabChange={setPerformanceSubTab}
          />
        </MotionReveal>
      )}

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialStaff={editing}
        loading={mutating}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
        }}
        title="Set staff inactive?"
        description={
          statusTarget
            ? `${statusTarget.fullName || statusTarget.email} will lose login access. You can set them active again later.`
            : undefined
        }
        warning="This sets the account Inactive only. The staff record stays, and you can reactivate from the Inactive filter."
        confirmLabel="Set Inactive"
        icon={Ban}
        variant="destructive"
        loading={mutating}
        onConfirm={handleConfirmDeactivate}
      />

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        entityName={deleteTarget?.fullName || deleteTarget?.email}
        description={
          deleteTarget ? (
            <>
              Permanently remove <strong>{deleteTarget.fullName || deleteTarget.email}</strong>?
              Prefer <strong>Inactive</strong> if you only want to block login — attendance and sales
              history stay intact.
            </>
          ) : null
        }
        softLabel="Set Inactive"
        softHint="Stops login. You can reactivate this person later from the Inactive filter."
        hardLabel="Permanently delete"
        hardHint="Use only for mistaken accounts with no operational history."
        showSoftAction={deleteStaffIsActive}
        canHardDelete
        loading={mutating}
        onSoftDelete={handleSoftDeleteStaff}
        onHardDelete={handleHardDeleteStaff}
      />
    </div>
  )
}

export default StaffPage
