import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2, Edit3, Monitor, Search, Ban, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { VariantManagementPanel } from '@/components/feature/branch/resources/VariantManagementPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableActionsHead,
  TableActionsCell,
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
import { BRAND } from '@/lib/constants'
import { referenceFromUuid } from '@/lib/formatDisplayId'
import { toastError, toastSuccess } from '@/lib/toast'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { validateHardwareForm } from '@/lib/validation/branchForms'
import { useClientPagination } from '@/hooks/useClientPagination'

const actionBtnClass =
  'cursor-pointer text-slate-500 transition-colors hover:text-slate-900 active:scale-95'

export function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('hardware')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [hardwareList, setHardwareList] = useState([])
  const hwPaging = useClientPagination(hardwareList)
  const [filterHardware, setFilterHardware] = useState('')
  const [hwSearch, setHwSearch] = useState('')
  const debouncedHwSearch = useDebouncedValue(hwSearch, 300)

  const [hardwareOpen, setHardwareOpen] = useState(false)
  const [hardwareMode, setHardwareMode] = useState('create')
  const [editingHardware, setEditingHardware] = useState(null)
  const [hName, setHName] = useState('')
  const [hCompany, setHCompany] = useState('')
  const [hId, setHId] = useState('')
  const [hType, setHType] = useState('')
  const [hStatus, setHStatus] = useState('New')
  const [hAccessStatus, setHAccessStatus] = useState('active')
  const [hImageFile, setHImageFile] = useState(null)
  const [hExistingImageUrl, setHExistingImageUrl] = useState(null)
  const [formError, setFormError] = useState(null)
  const [deleteTargetHardware, setDeleteTargetHardware] = useState(null)

  const hardwareSnapshot = {
    hName,
    hCompany,
    hType,
    hStatus,
    hAccessStatus,
    hImageFile: hImageFile?.name || null,
  }
  const { captureBaseline, isDirty } = useFormBaseline(hardwareOpen)

  useEffect(() => {
    if (!hardwareOpen) return
    captureBaseline(hardwareSnapshot)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per open
  }, [hardwareOpen, captureBaseline])

  async function loadHardware(type = filterHardware, q = debouncedHwSearch) {
    const params = {}
    if (type) params.type = type
    if (q?.trim()) params.q = q.trim()
    const res = await apiClient.get(endpoints.branch.resources.hardware.list, params)
    if (res.success) {
      setHardwareList(res.data || [])
    } else {
      toastError(res.error || 'Failed to load hardware')
    }
  }

  useEffect(() => {
    if (activeTab !== 'hardware') return
    hwPaging.setPage(1)
    setLoading(true)
    void loadHardware(filterHardware, debouncedHwSearch).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on filter/search/tab
  }, [activeTab, filterHardware, debouncedHwSearch])

  function handleOpenHardwareCreate() {
    setHardwareMode('create')
    setEditingHardware(null)
    setHName('')
    setHCompany('')
    setHId('')
    setHType('')
    setHStatus('New')
    setHAccessStatus('active')
    setHImageFile(null)
    setHExistingImageUrl(null)
    setFormError(null)
    setHardwareOpen(true)
  }

  function handleOpenHardwareEdit(hw) {
    setHardwareMode('edit')
    setEditingHardware(hw)
    setHName(hw.name || '')
    setHCompany(hw.companyName || '')
    setHId(hw.code || hw.id)
    setHType(hw.type || '')
    // Normalize legacy Used ? Old for the Device Condition field
    setHStatus(hw.status === 'Used' ? 'Old' : hw.status || 'New')
    setHAccessStatus(hw.accessStatus === 'blocked' ? 'blocked' : 'active')
    setHImageFile(null)
    setHExistingImageUrl(hw.image || hw.imageUrl || null)
    setFormError(null)
    setHardwareOpen(true)
  }

  async function handleSaveHardware(e) {
    e.preventDefault()
    const isCreate = hardwareMode === 'create'
    const validationError = validateHardwareForm(
      {
        code: hId,
        name: hName,
        companyName: hCompany,
        type: hType,
        status: hStatus,
      },
      { isCreate },
    )
    if (validationError) {
      setFormError(validationError)
      return toastError(validationError)
    }
    setFormError(null)

    const formData = new FormData()
    formData.append('name', hName.trim())
    formData.append('companyName', hCompany.trim())
    formData.append('type', hType)
    // DB stores Used; UI label is Old (QA device-condition wording).
    formData.append('status', hStatus === 'Old' ? 'Used' : hStatus)
    // Access status is independent of device condition (block/authorize must not overwrite quality).
    if (!isCreate) {
      formData.append('accessStatus', hAccessStatus)
    }
    if (hImageFile instanceof File && hImageFile.size > 0) {
      formData.append('image', hImageFile)
    }

    setSaving(true)
    try {
      const res = isCreate
        ? await apiClient.post(endpoints.branch.resources.hardware.create, formData)
        : await apiClient.put(
            endpoints.branch.resources.hardware.update(editingHardware.id),
            formData,
          )

      if (!res.success) {
        setFormError(res.error || 'Failed to save hardware')
        return toastError(res.error || 'Failed to save hardware')
      }

      const createdCode = res.data?.code
      toastSuccess(
        isCreate
          ? createdCode
            ? `Hardware added (${createdCode})`
            : 'Hardware added successfully'
          : 'Hardware updated successfully',
      )
      setHardwareOpen(false)
      void loadHardware(filterHardware, debouncedHwSearch)
    } catch (err) {
      const msg = err?.message || 'Failed to save hardware'
      setFormError(msg)
      toastError(msg)
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteHardware(hw) {
    if (hw.assignedToStaffId || hw.assignedToName) {
      return toastError(
        'Cannot deactivate hardware. It is currently assigned to a staff member. Unassign it first.',
      )
    }
    setDeleteTargetHardware(hw)
  }

  async function confirmDeleteHardware() {
    if (!deleteTargetHardware) return
    setSaving(true)
    const res = await apiClient.delete(
      endpoints.branch.resources.hardware.delete(deleteTargetHardware.id),
    )
    setSaving(false)
    if (!res.success) {
      return toastError(res.error || 'Failed to deactivate hardware')
    }
    toastSuccess('Hardware deactivated')
    setDeleteTargetHardware(null)
    void loadHardware(filterHardware, debouncedHwSearch)
  }

  // BM can block / authorize assigned systems (same access_status as Admin)
  async function handleToggleAccess(hw) {
    const next = hw.accessStatus === 'blocked' ? 'active' : 'blocked'
    const formData = new FormData()
    formData.append('accessStatus', next)
    setSaving(true)
    const res = await apiClient.put(
      endpoints.branch.resources.hardware.update(hw.id),
      formData,
    )
    setSaving(false)
    if (!res.success) {
      return toastError(res.error || 'Failed to update system access')
    }
    toastSuccess(
      next === 'blocked'
        ? `${hw.name} blocked from system access`
        : `${hw.name} authorized for system access`,
    )
    void loadHardware(filterHardware, debouncedHwSearch)
  }

  // Device condition label ó legacy "Used" shows as "Old" (QA TC-hardware-07a).
  function conditionLabel(status) {
    if (status === 'Used') return 'Old'
    return status || 'ó'
  }

  const getConditionBadgeClass = (status) => {
    switch (status) {
      case 'New':
        return 'border-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      case 'Good':
        return 'border-none bg-sky-50 text-sky-700 hover:bg-sky-100'
      case 'Used':
      case 'Old':
        return 'border-none bg-amber-50 text-amber-700 hover:bg-amber-100'
      default:
        return 'border-none bg-rose-50 text-rose-700 hover:bg-rose-100'
    }
  }

  function DeviceConditionBadge({ status }) {
    return (
      <Badge
        variant="outline"
        className={`w-fit shrink-0 px-2.5 py-0.5 text-xs font-bold ${getConditionBadgeClass(status)}`}
      >
        {conditionLabel(status)}
      </Badge>
    )
  }

  function AccessStatusBadge({ accessStatus }) {
    const blocked = accessStatus === 'blocked'
    return (
      <Badge
        variant="outline"
        className={
          blocked
            ? 'w-fit shrink-0 border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700'
            : 'w-fit shrink-0 border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700'
        }
      >
        {blocked ? 'Blocked' : 'Active'}
      </Badge>
    )
  }

  const displayCode = (hw) =>
    hw.code || (hw.id ? referenceFromUuid(hw.id, 'HW') : '‚Äî')

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Assets"
          title="Resources Management"
          description="Register POS hardware and manage variant types and values for inventory products."
          actions={
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <Button
                variant={activeTab === 'hardware' ? 'default' : 'outline'}
                onClick={() => setActiveTab('hardware')}
                style={activeTab === 'hardware' ? { backgroundColor: BRAND.purple } : {}}
                className={`cursor-pointer flex-1 sm:flex-none ${activeTab === 'hardware' ? 'text-white' : 'hover:border-slate-300'}`}
              >
                <Monitor className="mr-1.5 size-4" />
                Hardware
              </Button>
              <Button
                variant={activeTab === 'variants' ? 'default' : 'outline'}
                onClick={() => setActiveTab('variants')}
                style={activeTab === 'variants' ? { backgroundColor: BRAND.purple } : {}}
                className={`cursor-pointer flex-1 sm:flex-none ${activeTab === 'variants' ? 'text-white' : 'hover:border-slate-300'}`}
              >
                <Layers className="mr-1.5 size-4" />
                Variant Management
              </Button>
            </div>
          }
        />
      </MotionHeader>

      {activeTab === 'hardware' ? (
        <>
          <MotionReveal delay={0.02}>
            <SurfaceCard padding="compact">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="grid w-full min-w-0 flex-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="hw-search">Search by Name / ID</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="hw-search"
                        value={hwSearch}
                        placeholder="Search hardware name or ID‚Ä¶"
                        className="pl-9"
                        onChange={(e) => setHwSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hw-filter">Filter by Hardware Type</Label>
                    <NativeSelect
                      id="hw-filter"
                      value={filterHardware}
                      onChange={(e) => setFilterHardware(e.target.value)}
                      className="cursor-pointer"
                    >
                      <option value="">All Hardware</option>
                      <option value="Computers">Computers</option>
                      <option value="Scanners">Scanners</option>
                      <option value="Printers">Printers</option>
                      <option value="Telephone">Telephone</option>
                      <option value="Other">Other</option>
                    </NativeSelect>
                  </div>
                </div>

                <Button
                  variant="brand"
                  className="w-full shrink-0 md:w-auto"
                  onClick={handleOpenHardwareCreate}
                >
                  <Plus className="mr-1.5 size-4" /> Add Hardware
                </Button>
              </div>
            </SurfaceCard>
          </MotionReveal>

          <MotionReveal delay={0.04}>
            <SurfaceCard title="Hardware Assets Registry">
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-400">Loading hardware‚Ä¶</p>
              ) : hardwareList.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No hardware assets found</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {hwPaging.slice.map((hw) => (
                      <article
                        key={hw.id}
                        className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                      >
                        <div className="flex items-start gap-3">
                          {hw.image ? (
                            <img
                              src={hw.image}
                              alt={hw.name}
                              className="size-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                              HW
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {hw.name}
                                </p>
                                <p className="font-mono text-[11px] text-slate-400">
                                  {displayCode(hw)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <DeviceConditionBadge status={hw.status} />
                                <AccessStatusBadge accessStatus={hw.accessStatus} />
                              </div>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {hw.companyName} ∑ {hw.type}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  className={actionBtnClass}
                                  onClick={() => handleToggleAccess(hw)}
                                  disabled={saving}
                                  aria-label={
                                    hw.accessStatus === 'blocked'
                                      ? 'Authorize system'
                                      : 'Block system'
                                  }
                                  title={
                                    hw.accessStatus === 'blocked'
                                      ? 'Authorize system'
                                      : 'Block system'
                                  }
                                >
                                  {hw.accessStatus === 'blocked' ? (
                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                  ) : (
                                    <Ban className="size-4 text-rose-600" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className={actionBtnClass}
                                  onClick={() => handleOpenHardwareEdit(hw)}
                                  aria-label="Edit hardware"
                                >
                                  <Edit3 className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  className={actionBtnClass}
                                  onClick={() => handleDeleteHardware(hw)}
                                  aria-label="Delete hardware"
                                >
                                  <Ban className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <Table className="w-full text-left text-sm">
                      <TableHeader>
                        <TableRow className="text-xs text-slate-500 uppercase">
                          <TableHead className="px-2 py-3">ID</TableHead>
                          <TableHead className="px-2 py-3">Name</TableHead>
                          <TableHead className="px-2 py-3">Company</TableHead>
                          <TableHead className="px-2 py-3">Type</TableHead>
                          <TableHead className="px-2 py-3">Device Condition</TableHead>
                          <TableHead className="px-2 py-3">Access Status</TableHead>
                          <TableActionsHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hwPaging.slice.map((hw) => (
                          <TableRow key={hw.id} className="group">
                            <TableCell className="px-2 py-3 font-mono font-bold text-slate-900">
                              {displayCode(hw)}
                            </TableCell>
                            <TableCell className="px-2 py-3">
                              <div className="flex items-center gap-2">
                                {hw.image ? (
                                  <img
                                    src={hw.image}
                                    alt=""
                                    className="size-8 rounded object-cover"
                                  />
                                ) : null}
                                <span className="font-semibold text-slate-800">{hw.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-2 py-3 text-slate-600">
                              {hw.companyName}
                            </TableCell>
                            <TableCell className="px-2 py-3 text-slate-600">{hw.type}</TableCell>
                            <TableCell className="px-2 py-3">
                              <DeviceConditionBadge status={hw.status} />
                            </TableCell>
                            <TableCell className="px-2 py-3">
                              <AccessStatusBadge accessStatus={hw.accessStatus} />
                            </TableCell>
                            <TableActionsCell>
                              <button
                                type="button"
                                className={actionBtnClass}
                                onClick={() => handleToggleAccess(hw)}
                                disabled={saving}
                                aria-label={
                                  hw.accessStatus === 'blocked'
                                    ? 'Authorize system'
                                    : 'Block system'
                                }
                                title={
                                  hw.accessStatus === 'blocked'
                                    ? 'Authorize system'
                                    : 'Block system'
                                }
                              >
                                {hw.accessStatus === 'blocked' ? (
                                  <CheckCircle2 className="size-4 text-emerald-600" />
                                ) : (
                                  <Ban className="size-4 text-rose-600" />
                                )}
                              </button>
                              <button
                                type="button"
                                className={actionBtnClass}
                                onClick={() => handleOpenHardwareEdit(hw)}
                                aria-label="Edit hardware"
                              >
                                <Edit3 className="size-4" />
                              </button>
                              <button
                                type="button"
                                className={actionBtnClass}
                                onClick={() => handleDeleteHardware(hw)}
                                aria-label="Delete hardware"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </TableActionsCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <TablePagination
                page={hwPaging.page}
                pageCount={hwPaging.pageCount}
                totalItems={hwPaging.total}
                pageSize={hwPaging.pageSize}
                onPageChange={hwPaging.setPage}
                onPageSizeChange={hwPaging.setPageSize}
                alwaysShow={hwPaging.total > 0}
              />
            </SurfaceCard>
          </MotionReveal>
        </>
      ) : (
        <div className="space-y-4">
          <VariantManagementPanel />
        </div>
      )}

      <Dialog
        open={hardwareOpen}
        onOpenChange={setHardwareOpen}
        dirty={isDirty(hardwareSnapshot)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {hardwareMode === 'create' ? 'Add New Hardware' : 'Edit Hardware'}
            </DialogTitle>
            <DialogDescription>
              Register corporate computing devices, scanners, or barcode assets.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveHardware}>
            <div className="space-y-1.5">
              <Label htmlFor="hw-form-id">Hardware ID</Label>
              <Input
                id="hw-form-id"
                value={
                  hardwareMode === 'edit' ? hId : 'Auto-generated after save'
                }
                disabled
                readOnly
              />
              {hardwareMode === 'create' ? (
                <p className="text-xs text-slate-500">
                  ID is assigned automatically when the device is created.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hw-form-name">Name</Label>
              <Input
                id="hw-form-name"
                placeholder="e.g. Cashier Scanner"
                value={hName}
                onChange={(e) => setHName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-company">Company / Brand</Label>
                <Input
                  id="hw-form-company"
                  placeholder="e.g. Dell, Honeywell"
                  value={hCompany}
                  onChange={(e) => setHCompany(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-type">Device Type</Label>
                <NativeSelect
                  id="hw-form-type"
                  value={hType}
                  onChange={(e) => setHType(e.target.value)}
                  required
                >
                  <option value="">Select device type</option>
                  <option value="Computers">Computers</option>
                  <option value="Scanners">Scanners</option>
                  <option value="Printers">Printers</option>
                  <option value="Telephone">Telephone</option>
                  <option value="Other">Other</option>
                </NativeSelect>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hw-form-status">Device Condition</Label>
                <NativeSelect
                  id="hw-form-status"
                  value={hStatus}
                  onChange={(e) => setHStatus(e.target.value)}
                  required
                >
                  <option value="New">New</option>
                  <option value="Old">Old</option>
                  <option value="Poor">Poor</option>
                </NativeSelect>
                <p className="text-[11px] text-slate-400">Hardware quality (physical condition).</p>
              </div>
              {hardwareMode === 'edit' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="hw-form-access">Access Status</Label>
                  <NativeSelect
                    id="hw-form-access"
                    value={hAccessStatus}
                    onChange={(e) => setHAccessStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </NativeSelect>
                  <p className="text-[11px] text-slate-400">
                    System authorization ó independent of device condition.
                  </p>
                </div>
              ) : null}
            </div>

            <ImageUploadField
              id="hw-form-image"
              label="Device Photo"
              optionalLabel="(optional)"
              value={hImageFile}
              existingImageUrl={hExistingImageUrl}
              onChange={setHImageFile}
            />

            {formError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                {formError}
              </p>
            ) : null}

            <DialogFooter>
              <DialogCancelButton disabled={saving} className="w-full sm:w-auto" />
              <Button
                type="submit"
                disabled={saving}
                className="w-full text-white sm:w-auto"
                style={{ backgroundColor: BRAND.purple }}
              >
                {saving ? 'Saving‚Ä¶' : 'Save Hardware'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteEntityDialog
        open={Boolean(deleteTargetHardware)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetHardware(null)
        }}
        entityName={deleteTargetHardware?.name}
        description={
          deleteTargetHardware ? (
            <>
              Prefer <strong>Deactivate</strong> for ‚Äú{deleteTargetHardware.name}‚Äù so device history
              stays intact. Unassign from staff before removing.
            </>
          ) : null
        }
        softLabel="Deactivate"
        softHint="Hides from active lists and System Access. You can restore via database if needed."
        showSoftAction
        canHardDelete={false}
        hardDisabledReason="Permanent wipe is not available for hardware ‚Äî use Deactivate."
        loading={saving}
        onSoftDelete={confirmDeleteHardware}
      />
    </div>
  )
}

export default ResourcesPage
