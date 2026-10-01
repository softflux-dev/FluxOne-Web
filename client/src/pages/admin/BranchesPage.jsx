import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { StatCard } from '@/components/shared/StatsCards'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
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
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { FieldError } from '@/components/shared/FieldError'
import { PhoneInput } from '@/components/shared/PhoneInput'
import { TimePicker } from '@/components/shared/TimePicker'
import { WorkingDaysPicker } from '@/components/shared/WorkingDaysPicker'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { BRAND } from '@/lib/constants'
import { formatDateTimeInline, formatClockTime } from '@/lib/formatDateTime'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  FULL_WEEK_DAYS,
  formatWorkingDaysShort,
  normalizeWorkingDays,
  validateWorkingDaysFields,
} from '@/lib/validation/branchForms'
import {
  validatePhone,
  validateEmail,
} from '@/lib/validation/formValidators'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useAdminBranches } from '@/hooks/useAdminBranches'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFormBaseline } from '@/hooks/useFormBaseline'
import { useClientPagination } from '@/hooks/useClientPagination'
import { displayBranchRef, normalizeSearchQuery } from '@/lib/formatDisplayId'
import { exportRowsToCsv } from '@/lib/csvExport'
import { ExportCsvButton } from '@/components/shared/ExportCsvButton'
import {
  Plus,
  Search,
  MapPin,
  Mail,
  Phone,
  Ban,
  CheckCircle,
  Users,
  Store,
  KeyRound,
  Loader2,
  Trash2,
  Unlock,
  Pencil,
} from 'lucide-react'

const DEFAULT_BRANCH_IMAGE =
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60'
const AVATAR_MALE =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
const AVATAR_FEMALE =
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'

function formatCreatedAt(value) {
  // Branch established timestamp — 12h AM/PM system helper
  return formatDateTimeInline(value)
}

function managerAvatar(manager) {
  if (manager?.profileImage) return manager.profileImage
  return manager?.gender === 'Female' ? AVATAR_FEMALE : AVATAR_MALE
}

function credentialsToast(prefix, credentials) {
  if (!credentials) {
    toastSuccess(prefix)
    return
  }
  if (credentials.emailed) {
    toastSuccess(`${prefix} Login credentials emailed to ${credentials.email}.`)
    return
  }
  if (credentials.temporaryPassword) {
    toastSuccess(
      `${prefix} Email failed — use the key icon to resend. Temp password: ${credentials.temporaryPassword}`,
    )
    return
  }
  toastSuccess(
    `${prefix} Email failed — use the key icon on the row to reset & resend credentials.`,
  )
}

const emptyForm = {
  id: '',
  createdAt: '',
  name: '',
  location: '',
  openingTime: '',
  closingTime: '',
  // Default full week — matches migration / server omit→full week
  workingDays: [...FULL_WEEK_DAYS],
  imageFile: null,
  managerImageFile: null,
  managerName: '',
  managerEmail: '',
  managerContact: '',
  managerOtherContact: '',
  managerGender: 'Male',
  managerAddress: '',
}

function timeInputValue(value) {
  if (!value) return ''
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

function formatHoursRange(openingTime, closingTime) {
  const open = formatClockTime(openingTime)
  const close = formatClockTime(closingTime)
  if (!open || !close) return null
  return `${open} – ${close}`
}

function BranchRowActions({
  branch: b,
  mutating,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}) {
  const isOpen = b.status === 'open'
  return (
    // Left-aligned action icons (table consistency)
    <div className="inline-flex items-center justify-start gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onEdit(b)}
        disabled={mutating}
        title="Edit"
        aria-label={`Edit ${b.name}`}
        className="size-8 text-purple-800 hover:bg-purple-50 hover:text-purple-950"
      >
        <Pencil className="size-4" />
      </Button>
      {b.manager?.id && !b.manager?.credentialsEmailed ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onResetPassword(b)}
          disabled={mutating}
          title="Manage credentials"
          aria-label={`Manage credentials for ${b.name}`}
          className="size-8 text-amber-700 hover:bg-amber-50 hover:text-amber-900"
        >
          <KeyRound className="size-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onToggleStatus(b)}
        disabled={mutating}
        title={isOpen ? 'Block' : 'Unblock'}
        aria-label={isOpen ? `Block ${b.name}` : `Unblock ${b.name}`}
        className={`size-8 ${
          isOpen
            ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-800'
            : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-900'
        }`}
      >
        {isOpen ? <Ban className="size-4" /> : <Unlock className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(b)}
        disabled={mutating}
        title="Delete"
        aria-label={`Delete ${b.name}`}
        className="size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

const BRANCH_FIELD_IDS = {
  name: 'branchName',
  location: 'branchLocation',
  managerName: 'mgrName',
  managerEmail: 'mgrEmail',
  managerContact: 'mgrContact',
  managerOtherContact: 'mgrOtherContact',
  openingTime: 'branchOpeningTime',
  closingTime: 'branchClosingTime',
  workingDays: 'branchWorkingDays',
}

const BRANCH_FIELD_ORDER = [
  'name',
  'location',
  'openingTime',
  'closingTime',
  'workingDays',
  'managerName',
  'managerEmail',
  'managerContact',
  'managerOtherContact',
]

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

  // Snapshot form when Add/Edit opens so Esc/X only prompt when fields changed
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

  // Search is server-side (debounced); status tabs stay client-side on the result set
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

  // Export filtered branch list (CSV / Excel-compatible)
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
      workingDays: days.length ? days : [...FULL_WEEK_DAYS],
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
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Branch Name, ID, Location, or Manager..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              onPaste={(e) => {
                // Normalize pasted Branch IDs (BRN-XXXXXXXX) before debounce
                e.preventDefault()
                const pasted = e.clipboardData?.getData('text') || ''
                setSearchQuery(normalizeSearchQuery(pasted))
                setPage(1)
              }}
              className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
            <div className="flex max-w-full overflow-x-auto rounded-xl bg-slate-100 p-0.5 border border-slate-200">
              {[
                { key: 'all', label: `All (${stats.total})` },
                { key: 'open', label: `Open (${stats.open})` },
                { key: 'blocked', label: `Blocked (${stats.blocked})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key)
                    setPage(1)
                  }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.key
                      ? 'bg-white text-purple-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MotionReveal>

      <MotionReveal delay={0.09}>
        <SurfaceCard
          title="List of branches"
          description="Registered branch network, branch manager assignments, locations & access statuses"
        >
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              Loading branches…
            </div>
          ) : filteredBranches.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No branches match the filter criteria. Add a branch to start the SoftFlux upward flow.
            </p>
          ) : (
            <ResponsiveDataShell
              mobile={pagedBranches.map((b) => {
                const isOpen = b.status === 'open'
                const imageSrc = b.image || DEFAULT_BRANCH_IMAGE
                return (
                  <DataCard key={b.id}>
                    <div className="flex items-start gap-3">
                      <img
                        src={imageSrc}
                        alt={b.name}
                        className="size-12 shrink-0 rounded-md border border-slate-200 object-cover shadow-2xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{b.name}</p>
                            {/* Human-readable ID; title shows full UUID on hover */}
                            <p
                              title={b.id || undefined}
                              className="mt-0.5 font-mono text-[11px] font-semibold text-purple-800"
                            >
                              {displayBranchRef(b)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              isOpen
                                ? 'shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                                : 'shrink-0 bg-rose-50 text-rose-700 border-rose-200 font-bold'
                            }
                          >
                            {isOpen ? (
                              <CheckCircle className="mr-1 size-3 text-emerald-600" />
                            ) : (
                              <Ban className="mr-1 size-3 text-rose-600" />
                            )}
                            {isOpen ? 'Open' : 'Blocked'}
                          </Badge>
                        </div>
                        <p className="mt-1.5 flex items-start gap-1 text-xs text-slate-500">
                          <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />
                          <span className="line-clamp-2">{b.location || '—'}</span>
                        </p>
                        {formatHoursRange(b.openingTime, b.closingTime) ? (
                          <p className="mt-0.5 text-[10px] font-medium text-purple-800">
                            Hours {formatHoursRange(b.openingTime, b.closingTime)}
                          </p>
                        ) : null}
                        {formatWorkingDaysShort(b.workingDays) ? (
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            Days {formatWorkingDaysShort(b.workingDays)}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={managerAvatar(b.manager)}
                            alt={b.manager?.name || 'Manager'}
                            className="size-8 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-900">
                              {b.manager?.name || '—'}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">
                              {b.manager?.email || '—'}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Users className="size-3.5 text-slate-400" />
                          Branch Staff:{' '}
                          <span className="font-bold text-purple-900">
                            {Number(b.totalStaff) || 0}
                          </span>
                        </p>
                        <div className="mt-3 flex justify-end">
                          <BranchRowActions
                            branch={b}
                            mutating={mutating}
                            onEdit={handleOpenEdit}
                            onResetPassword={handlePromptResetPassword}
                            onToggleStatus={handlePromptToggleStatus}
                            onDelete={setDeleteTarget}
                          />
                        </div>
                      </div>
                    </div>
                  </DataCard>
                )
              })}
              desktop={
                <Table className="min-w-[42rem] w-full text-left text-sm sm:min-w-[52rem]">
                  <TableHeader>
                    <TableRow className="text-xs text-slate-500 uppercase">
                      <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Branch ID</TableHead>
                      <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Image</TableHead>
                      <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3 min-w-[10rem]">Branch</TableHead>
                      <TableHead className="hidden px-2 py-3 font-medium whitespace-nowrap sm:table-cell sm:px-3 min-w-[9rem]">
                        Location
                      </TableHead>
                      <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3 min-w-[12rem]">
                        Manager
                      </TableHead>
                      <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">
                        Branch Staff
                      </TableHead>
                      <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Status</TableHead>
                      <TableHead className="sticky right-0 z-[1] bg-slate-200/80 px-2 py-3 font-medium whitespace-nowrap sm:px-3">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedBranches.map((b) => {
                      const isOpen = b.status === 'open'
                      const imageSrc = b.image || DEFAULT_BRANCH_IMAGE
                      return (
                        <TableRow key={b.id} className="group hover:bg-slate-50/80">
                          {/* Compact ID cell — aligned with other modules (no pill / truncation) */}
                          <TableCell className="px-2 py-3 align-middle whitespace-nowrap sm:px-3">
                            <span
                              title={b.id || undefined}
                              className="font-mono text-xs font-bold text-purple-800 select-all"
                            >
                              {displayBranchRef(b)}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                            <img
                              src={imageSrc}
                              alt={b.name}
                              className="size-9 sm:size-11 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-3 sm:px-3">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">{b.name}</p>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 whitespace-nowrap">
                              Est. {formatCreatedAt(b.createdAt)}
                            </span>
                            {formatHoursRange(b.openingTime, b.closingTime) ? (
                              <p className="mt-0.5 text-[10px] font-medium text-purple-800 whitespace-nowrap">
                                Hours {formatHoursRange(b.openingTime, b.closingTime)}
                              </p>
                            ) : null}
                            {formatWorkingDaysShort(b.workingDays) ? (
                              <p className="mt-0.5 text-[10px] text-slate-500 whitespace-nowrap">
                                Days {formatWorkingDaysShort(b.workingDays)}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="hidden px-2 py-3 text-xs text-slate-600 sm:table-cell sm:px-3">
                            <div className="flex items-start gap-1">
                              <MapPin className="mt-0.5 size-3.5 text-slate-400 shrink-0" />
                              <span className="line-clamp-2">{b.location || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 sm:px-3">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                              <img
                                src={managerAvatar(b.manager)}
                                alt={b.manager?.name || 'Manager'}
                                className="size-8 sm:size-9 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900 text-xs truncate">
                                    {b.manager?.name || '—'}
                                  </p>
                                  {b.manager?.gender ? (
                                    <span className="hidden text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0 sm:inline">
                                      {b.manager.gender}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-[10px] sm:text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                  <Mail className="size-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{b.manager?.email || '—'}</span>
                                </p>
                                <p className="hidden text-[11px] text-slate-400 truncate sm:flex items-center gap-1">
                                  <Phone className="size-3 text-slate-400 shrink-0" />
                                  <span className="whitespace-nowrap">{b.manager?.contact || '—'}</span>
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/80 px-2 py-1 text-xs font-bold text-purple-900">
                              <Users className="size-3.5 text-purple-600" />
                              {Number(b.totalStaff) || 0}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                            <Badge
                              variant="outline"
                              className={
                                isOpen
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold whitespace-nowrap'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 font-bold whitespace-nowrap'
                              }
                            >
                              {isOpen ? (
                                <CheckCircle className="mr-1 size-3 text-emerald-600" />
                              ) : (
                                <Ban className="mr-1 size-3 text-rose-600" />
                              )}
                              {isOpen ? 'Open' : 'Blocked'}
                            </Badge>
                          </TableCell>
                          <TableCell className="sticky right-0 z-[1] bg-white px-1.5 py-3 whitespace-nowrap sm:px-3 group-hover:bg-slate-50/80">
                            <BranchRowActions
                              branch={b}
                              mutating={mutating}
                              onEdit={handleOpenEdit}
                              onResetPassword={handlePromptResetPassword}
                              onToggleStatus={handlePromptToggleStatus}
                              onDelete={setDeleteTarget}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              }
            />
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

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen} dirty={isDirty(formData)}>
        <DialogContent className="max-w-full sm:max-w-xl md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch Details' : 'Add New Branch'}</DialogTitle>
            <DialogDescription>
              {editingBranch
                ? 'Update branch location and manager profile. Use the key icon on the row to reset password.'
                : 'Register a new branch. An auto-generated temporary password is emailed to the manager (or logged if SMTP is unset).'}
            </DialogDescription>
          </DialogHeader>

          {formError ? (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          ) : null}

          <form onSubmit={handleSubmitBranch} className="space-y-4 pt-2" noValidate>
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                Branch Details
              </h5>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="branchId" className="text-xs">
                    Branch ID
                  </Label>
                  <Input
                    id="branchId"
                    value={editingBranch ? displayBranchRef(editingBranch) : formData.id}
                    disabled
                    title={editingBranch?.id || undefined}
                    className="bg-slate-50 font-bold text-purple-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="createdAt" className="text-xs">
                    Created Date / Time
                  </Label>
                  <Input
                    id="createdAt"
                    value={formData.createdAt}
                    disabled
                    className="bg-slate-50 text-slate-600 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchName" className="text-xs">
                    Name of branch *
                  </Label>
                  <Input
                    id="branchName"
                    placeholder="e.g. Wah Cantt SoftFlux"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      clearField('name')
                    }}
                    aria-invalid={Boolean(fieldErrors.name)}
                    className={fieldErrorClass(fieldErrors.name)}
                  />
                  <FieldError message={fieldErrors.name} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchLocation" className="text-xs">
                    Location *
                  </Label>
                  <Input
                    id="branchLocation"
                    placeholder="e.g. Main GT Road, Wah Cantt"
                    value={formData.location}
                    onChange={(e) => {
                      setFormData({ ...formData, location: e.target.value })
                      clearField('location')
                    }}
                    aria-invalid={Boolean(fieldErrors.location)}
                    className={fieldErrorClass(fieldErrors.location)}
                  />
                  <FieldError message={fieldErrors.location} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchOpeningTime" className="text-xs">
                    Opening time
                  </Label>
                  <TimePicker
                    id="branchOpeningTime"
                    value={formData.openingTime}
                    onChange={(e) => {
                      setFormData({ ...formData, openingTime: e.target.value })
                      clearField('openingTime')
                      clearField('closingTime')
                    }}
                    aria-invalid={Boolean(fieldErrors.openingTime)}
                    className={fieldErrorClass(fieldErrors.openingTime)}
                  />
                  <FieldError message={fieldErrors.openingTime} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="branchClosingTime" className="text-xs">
                    Closing time
                  </Label>
                  <TimePicker
                    id="branchClosingTime"
                    value={formData.closingTime}
                    onChange={(e) => {
                      setFormData({ ...formData, closingTime: e.target.value })
                      clearField('openingTime')
                      clearField('closingTime')
                    }}
                    aria-invalid={Boolean(fieldErrors.closingTime)}
                    className={fieldErrorClass(fieldErrors.closingTime)}
                  />
                  <FieldError message={fieldErrors.closingTime} />
                </div>

                <p className="text-[11px] text-slate-500 sm:col-span-2">
                  Optional. Same-day window only (opening before closing). Staff shifts must fall inside
                  these hours when set.
                </p>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label id="branchWorkingDays" className="text-xs">
                    Working days *
                  </Label>
                  <WorkingDaysPicker
                    value={formData.workingDays}
                    onChange={(days) => {
                      setFormData({ ...formData, workingDays: days })
                      clearField('workingDays')
                    }}
                  />
                  <FieldError message={fieldErrors.workingDays} />
                  <p className="text-[11px] text-slate-500">
                    Staff schedules can only use days within this branch calendar.
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <ImageUploadField
                    id="branchImage"
                    label="Branch image"
                    optionalLabel="(optional)"
                    value={formData.imageFile}
                    existingImageUrl={editingBranch?.image || null}
                    onChange={(file) => setFormData({ ...formData, imageFile: file })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                Set Branch Manager
              </h5>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <ImageUploadField
                    id="managerProfileImage"
                    label="Branch manager image"
                    optionalLabel="(optional)"
                    value={formData.managerImageFile}
                    existingImageUrl={editingBranch?.manager?.profileImage || null}
                    onChange={(file) => setFormData({ ...formData, managerImageFile: file })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrName" className="text-xs">
                    Name of branch manager *
                  </Label>
                  <Input
                    id="mgrName"
                    placeholder="e.g. Farhan Ali"
                    value={formData.managerName}
                    onChange={(e) => {
                      setFormData({ ...formData, managerName: e.target.value })
                      clearField('managerName')
                    }}
                    aria-invalid={Boolean(fieldErrors.managerName)}
                    className={fieldErrorClass(fieldErrors.managerName)}
                  />
                  <FieldError message={fieldErrors.managerName} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrEmail" className="text-xs">
                    Email (login) *
                  </Label>
                  <Input
                    id="mgrEmail"
                    type="email"
                    placeholder="e.g. bm.wah@softwareflux.com"
                    value={formData.managerEmail}
                    onChange={(e) => {
                      setFormData({ ...formData, managerEmail: e.target.value })
                      clearField('managerEmail')
                    }}
                    aria-invalid={Boolean(fieldErrors.managerEmail)}
                    className={fieldErrorClass(fieldErrors.managerEmail)}
                  />
                  <FieldError message={fieldErrors.managerEmail} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrContact" className="text-xs">
                    Contact number *
                  </Label>
                  <PhoneInput
                    id="mgrContact"
                    value={formData.managerContact}
                    onChange={(val) => {
                      setFormData({ ...formData, managerContact: val })
                      clearField('managerContact')
                    }}
                    aria-invalid={Boolean(fieldErrors.managerContact)}
                    className={fieldErrorClass(fieldErrors.managerContact)}
                  />
                  <FieldError message={fieldErrors.managerContact} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrOtherContact" className="text-xs">
                    Other contact number
                  </Label>
                  <PhoneInput
                    id="mgrOtherContact"
                    value={formData.managerOtherContact}
                    onChange={(val) => {
                      setFormData({ ...formData, managerOtherContact: val })
                      clearField('managerOtherContact')
                    }}
                    aria-invalid={Boolean(fieldErrors.managerOtherContact)}
                    className={fieldErrorClass(fieldErrors.managerOtherContact)}
                  />
                  <FieldError message={fieldErrors.managerOtherContact} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrGender" className="text-xs">
                    Gender
                  </Label>
                  <NativeSelect
                    id="mgrGender"
                    value={formData.managerGender}
                    onChange={(e) => setFormData({ ...formData, managerGender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="mgrAddress" className="text-xs">
                    Address
                  </Label>
                  <Input
                    id="mgrAddress"
                    placeholder="e.g. House 12, Sector C, Wah Cantt"
                    value={formData.managerAddress}
                    onChange={(e) => setFormData({ ...formData, managerAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {!editingBranch ? (
              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs text-purple-900 flex items-start gap-2">
                <KeyRound className="size-4 shrink-0 text-purple-700 mt-0.5" />
                <span>
                  Password is auto-generated and emailed to the manager. If the email succeeds, you are done. If
                  email fails, a key icon appears on the row so you can reset &amp; resend credentials.
                </span>
              </div>
            ) : null}

            <DialogFooter className="pt-3">
              <DialogCancelButton disabled={mutating} />
              <Button
                type="submit"
                disabled={mutating}
                className="text-white font-semibold"
                style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
              >
                {mutating ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Saving…
                  </>
                ) : editingBranch ? (
                  'Save Changes'
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmStatusOpen}
        onOpenChange={setConfirmStatusOpen}
        title={
          targetBranch?.status === 'open' ? 'Block Branch Access' : 'Open & Activate Branch'
        }
        description={
          targetBranch?.status === 'open' ? (
            <>
              Are you sure you want to block <strong>&quot;{targetBranch?.name}&quot;</strong>?
              <br />
              All users of this branch (manager, inventory, cashier, and other roles) will be
              unable to log in on web and desktop until the branch is opened again. Data is kept.
            </>
          ) : (
            <>
              Are you sure you want to open and activate <strong>&quot;{targetBranch?.name}&quot;</strong>?
              <br />
              Branch users who were active before the block will be able to log in again.
            </>
          )
        }
        confirmLabel={targetBranch?.status === 'open' ? 'Yes, Block Branch' : 'Yes, Open Branch'}
        // Block uses Ban (not trash); open uses Unlock
        icon={targetBranch?.status === 'open' ? Ban : Unlock}
        variant={targetBranch?.status === 'open' ? 'destructive' : 'success'}
        loading={mutating}
        onConfirm={handleConfirmToggleStatus}
      />

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Reset manager password"
        description={
          <>
            Credentials email did not go through for{' '}
            <strong>{resetTarget?.manager?.email || 'this branch manager'}</strong>. Generate a new
            temporary password and try sending again. Their previous password will stop working
            immediately.
          </>
        }
        confirmLabel="Reset & send"
        variant="default"
        loading={mutating}
        onConfirm={handleConfirmResetPassword}
      />

      <DeleteEntityDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        entityName={deleteTarget?.name}
        title={deleteTarget ? `Remove “${deleteTarget.name}”?` : 'Remove branch?'}
        description={
          deleteTarget ? (
            <>
              Permanently remove <strong>{deleteTarget.name}</strong> and its branch manager login?
              Prefer <strong>Block</strong> if you only want to stop access — sales and staff history stay
              intact.
            </>
          ) : null
        }
        softLabel="Block branch"
        softHint="Recommended when the branch has (or may have) staff, sales, or inventory history."
        hardLabel="Permanently delete"
        hardHint="Only use when this outlet was created by mistake and has no linked staff."
        showSoftAction={deleteShowSoft}
        canHardDelete={deleteCanHard}
        hardDisabledReason={
          deleteHasStaff
            ? `This branch has ${deleteTarget.totalStaff} staff member(s). Block it instead of permanent delete.`
            : 'Permanent delete is unavailable while linked records may exist.'
        }
        loading={mutating}
        onSoftDelete={handleSoftDeleteFromTrash}
        onHardDelete={handleHardDeleteBranch}
      />
    </div>
  )
}

export default BranchesPage
