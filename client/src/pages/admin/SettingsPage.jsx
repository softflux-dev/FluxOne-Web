import { useEffect, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { EmptyState } from '@/components/shared/EmptyState'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { FieldError } from '@/components/shared/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { BRAND } from '@/lib/constants'
import { toastSuccess, toastError } from '@/lib/toast'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { HARDWARE_TYPE_OPTIONS } from '@/lib/validation/branchForms'
import { displayStaffRef } from '@/lib/formatDisplayId'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import {
  ADMIN_DEVICES_PAGE_SIZE,
  changeAdminPassword,
  useAdminCurrency,
  useAdminDevices,
} from '@/hooks/useAdminSettings'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAppDispatch } from '@/rtk/hooks'
import { setDefaultCurrency } from '@/rtk/features/auth/authSlice'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import {
  KeyRound,
  Monitor,
  Ban,
  CheckCircle2,
  Cpu,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Search,
  Loader2,
  MonitorOff,
  Coins,
  Building2,
} from 'lucide-react'

const PASSWORD_FIELD_IDS = {
  currentPassword: 'admin-current-password',
  newPassword: 'admin-new-password',
  confirmPassword: 'admin-confirm-password',
}
const PASSWORD_FIELD_ORDER = ['currentPassword', 'newPassword', 'confirmPassword']

export function SettingsPage() {
  const dispatch = useAppDispatch()
  const [activeTab, setActiveTab] = useState('security')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const {
    fieldErrors: passwordFieldErrors,
    formError: passwordFormError,
    setFormError: setPasswordFormError,
    resetErrors: resetPasswordErrors,
    clearField: clearPasswordField,
    applyErrors: applyPasswordErrors,
  } = useFieldErrors()

  // Currency Settings (local draft until Save)
  const {
    defaultCurrency,
    currencyLocked,
    options: currencyOptions,
    ratesToPkr,
    loading: currencyLoading,
    saving: currencySaving,
    error: currencyError,
    saveCurrency,
  } = useAdminCurrency()
  const [selectedCurrency, setSelectedCurrency] = useState('PKR')
  const [rateToPkr, setRateToPkr] = useState('')

  useEffect(() => {
    if (defaultCurrency) setSelectedCurrency(defaultCurrency)
  }, [defaultCurrency])

  useEffect(() => {
    if (selectedCurrency === 'PKR') {
      setRateToPkr('1')
      return
    }
    const existing = ratesToPkr?.[selectedCurrency]
    setRateToPkr(existing != null ? String(existing) : '')
  }, [selectedCurrency, ratesToPkr])

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery.trim(), 300)
  const [statusFilter, setStatusFilter] = useState('all')
  // Multi-branch + hardware type filters for System Access list
  const [branchFilter, setBranchFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [branchOptions, setBranchOptions] = useState([])
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(ADMIN_DEVICES_PAGE_SIZE)

  // Load company branches for the System Access dropdown
  useEffect(() => {
    let cancelled = false
    async function loadBranches() {
      const res = await apiClient.get(endpoints.admin.branches.list, { page: 1, limit: 100 })
      if (cancelled || !res.success) return
      const rows = res.data?.items || res.data || []
      setBranchOptions(
        (Array.isArray(rows) ? rows : []).map((b) => ({
          id: b.id,
          name: b.name || 'Branch',
        })),
      )
    }
    void loadBranches()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [debouncedQ, statusFilter, branchFilter, typeFilter])

  const {
    items: systems,
    stats,
    pagination,
    loading,
    error,
  } = useAdminDevices({
    q: debouncedQ,
    status: statusFilter,
    branchId: branchFilter,
    type: typeFilter,
    page,
    limit,
  })

  const slowHint = useSlowLoadingHint(loading && activeTab === 'systems')
  const hasDeviceFilters =
    Boolean(debouncedQ) ||
    statusFilter !== 'all' ||
    branchFilter !== 'all' ||
    typeFilter !== 'all'
  const savedRate = ratesToPkr?.[selectedCurrency]
  const rateDirty =
    selectedCurrency !== 'PKR' &&
    rateToPkr !== '' &&
    Number(rateToPkr) > 0 &&
    Number(rateToPkr) !== Number(savedRate)
  const currencyDirty = selectedCurrency !== defaultCurrency || rateDirty

  async function handleChangePassword(e) {
    e.preventDefault()
    const errors = {}
    if (!currentPassword) {
      errors.currentPassword = 'Please enter your current password'
    } else if (currentPassword.length < 8) {
      errors.currentPassword = 'Current password must be at least 8 characters'
    }
    if (newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters'
    } else if (newPassword.length > 72) {
      errors.newPassword = 'New password must be at most 72 characters'
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = 'New password must be different from current password'
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'New password and confirmation do not match'
    }

    if (Object.keys(errors).length) {
      applyPasswordErrors(errors, PASSWORD_FIELD_IDS, PASSWORD_FIELD_ORDER)
      return
    }
    resetPasswordErrors()

    setPasswordSaving(true)
    const result = await changeAdminPassword({
      currentPassword,
      newPassword,
    })
    setPasswordSaving(false)

    if (!result.success) {
      setPasswordFormError(result.error || 'Failed to update password')
      toastError(result.error || 'Failed to update password')
      return
    }

    toastSuccess('Password updated successfully')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    resetPasswordErrors()
  }

  async function handleSaveCurrency(e) {
    e.preventDefault()
    if (!selectedCurrency) {
      toastError('Please select a default currency')
      return
    }
    if (selectedCurrency !== 'PKR') {
      const rate = Number(rateToPkr)
      if (!Number.isFinite(rate) || rate <= 0) {
        toastError(`Enter how many PKR equal 1 ${selectedCurrency} (e.g. 230)`)
        return
      }
    }
    if (!currencyDirty) {
      toastSuccess('Currency is already up to date')
      return
    }

    const result = await saveCurrency(
      selectedCurrency,
      selectedCurrency === 'PKR' ? 1 : Number(rateToPkr),
    )
    if (!result.success) {
      toastError(result.error || 'Failed to save currency')
      return
    }

    // Sync session so products / invoices / reports pick up the new default
    dispatch(setDefaultCurrency(result.data?.defaultCurrency || selectedCurrency))
    const converted = result.data?.productsConverted || 0
    const changed = result.data?.currencyChanged
    toastSuccess(
      changed
        ? `Default currency saved. ${converted} product price(s) converted.`
        : 'Exchange rate updated. Totals will use the latest rate.',
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="System Configuration & Security"
          title="Admin Settings"
          description="Security, default currency, and assigned hardware system access controls"
        />
      </MotionHeader>

      <MotionReveal delay={0.05}>
        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'security'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <KeyRound className="size-4" />
            Security & Password Change
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'currency'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Coins className="size-4" />
            Currency Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('systems')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'systems'
                ? 'bg-white text-purple-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Monitor className="size-4" />
            All System Access ({stats.total})
          </button>
        </div>
      </MotionReveal>

      {activeTab === 'security' && (
        <MotionReveal delay={0.1}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <SurfaceCard className="p-6">
                <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: BRAND.purple }}
                  >
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Update Administrator Password
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ensure your account uses a long, unique password
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
                  {passwordFormError ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                      {passwordFormError}
                    </p>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="admin-current-password"
                      className="text-xs font-bold text-slate-700"
                    >
                      Current Password
                    </Label>
                    <Input
                      id="admin-current-password"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value)
                        clearPasswordField('currentPassword')
                      }}
                      className={`h-10 text-sm ${fieldErrorClass(passwordFieldErrors.currentPassword)}`}
                      autoComplete="current-password"
                      aria-invalid={Boolean(passwordFieldErrors.currentPassword)}
                    />
                    <FieldError message={passwordFieldErrors.currentPassword} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admin-new-password" className="text-xs font-bold text-slate-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="admin-new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password (min 8 characters)"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          clearPasswordField('newPassword')
                          clearPasswordField('confirmPassword')
                        }}
                        className={`h-10 text-sm pr-10 ${fieldErrorClass(passwordFieldErrors.newPassword)}`}
                        autoComplete="new-password"
                        aria-invalid={Boolean(passwordFieldErrors.newPassword)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <FieldError message={passwordFieldErrors.newPassword} />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="admin-confirm-password"
                      className="text-xs font-bold text-slate-700"
                    >
                      Confirm New Password
                    </Label>
                    <Input
                      id="admin-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        clearPasswordField('confirmPassword')
                      }}
                      className={`h-10 text-sm ${fieldErrorClass(passwordFieldErrors.confirmPassword)}`}
                      autoComplete="new-password"
                      aria-invalid={Boolean(passwordFieldErrors.confirmPassword)}
                    />
                    <FieldError message={passwordFieldErrors.confirmPassword} />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={passwordSaving}
                      className="w-full text-white font-semibold cursor-pointer shadow-sm"
                      style={{ background: BRAND.purple }}
                    >
                      {passwordSaving ? 'Updating…' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </SurfaceCard>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <SurfaceCard className="p-5">
                <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-purple-700" />
                  Security Protocols
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">Two-Factor Authentication</p>
                      <p className="text-[11px] text-slate-500">Email OTP verification for new terminals</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toastError('2FA is coming soon')}
                      className="h-7 text-xs font-bold bg-slate-100 text-slate-600"
                    >
                      Coming soon
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">Session Timeout Auto-Lock</p>
                      <p className="text-[11px] text-slate-500">Lock POS after 15 minutes of idle time</p>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                      15 mins
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70">
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-slate-900">Assigned Hardware Access</p>
                      <p className="text-[11px] text-slate-500">
                        View assigned terminals under All System Access
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      Read-only
                    </Badge>
                  </div>
                </div>
              </SurfaceCard>
            </div>
          </div>
        </MotionReveal>
      )}

      {activeTab === 'currency' && (
        <MotionReveal delay={0.1}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <SurfaceCard className="p-6">
                <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: BRAND.purple }}
                  >
                    <Coins className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Currency Settings</h3>
                    <p className="text-xs text-slate-500">
                      System-wide default for prices, orders, invoices, and reports
                    </p>
                  </div>
                </div>

                {currencyError ? (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {currencyError}
                  </div>
                ) : null}

                {currencyLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                    <Loader2 className="size-4 animate-spin" />
                    Loading currency settings…
                  </div>
                ) : (
                  <form onSubmit={handleSaveCurrency} className="space-y-4">
                    {currencyLocked ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-100">
                        Default currency is locked after the first save. Changes are only possible via
                        database (Supabase) for now.
                      </p>
                    ) : null}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">
                        Default Currency <span className="text-rose-600">*</span>
                      </Label>
                      <NativeSelect
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="h-10 text-sm"
                        required
                        disabled={currencyLocked}
                      >
                        {currencyOptions.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.label}
                          </option>
                        ))}
                      </NativeSelect>
                      <p className="text-[11px] text-slate-500">
                        {currencyLocked
                          ? 'Locked — contact a developer to change via Supabase if required.'
                          : 'Select the default currency to be used across the system. Locked after first save.'}
                      </p>
                    </div>

                    {selectedCurrency !== 'PKR' ? (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700">
                          Exchange rate <span className="text-rose-600">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-xs font-semibold text-slate-600">
                            1 {selectedCurrency} =
                          </span>
                          <Input
                            type="number"
                            min="0.000001"
                            step="any"
                            value={rateToPkr}
                            onChange={(e) => setRateToPkr(e.target.value)}
                            placeholder="e.g. 230"
                            className="h-10"
                            required
                            disabled={currencyLocked}
                          />
                          <span className="shrink-0 text-xs font-semibold text-slate-600">PKR</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {currencyLocked
                            ? 'Rate updates are locked with the default currency.'
                            : 'Latest rate is used for totals. Update anytime before the first lock.'}
                        </p>
                      </div>
                    ) : null}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={currencySaving || !currencyDirty || currencyLocked}
                        className="w-full text-white font-semibold cursor-pointer shadow-sm disabled:opacity-60"
                        style={{ background: BRAND.purple }}
                      >
                        {currencyLocked
                          ? 'Currency locked'
                          : currencySaving
                            ? 'Saving…'
                            : 'Save'}
                      </Button>
                    </div>
                  </form>
                )}
              </SurfaceCard>
            </div>

            <div className="lg:col-span-5">
              <SurfaceCard className="p-5">
                <h4 className="font-bold text-sm text-slate-900 mb-2">How it applies</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Saving a new default currency converts live product prices using your rate and
                  stamps new sales/invoices in that currency. Past invoices keep their original
                  currency (e.g. old PKR bills stay PKR). Dashboard income totals convert past sales
                  with the <strong>latest</strong> rate you enter.
                </p>
              </SurfaceCard>
            </div>
          </div>
        </MotionReveal>
      )}

      {activeTab === 'systems' && (
        <MotionReveal delay={0.1}>
          <div className="space-y-5">
            <SlowLoadingBanner show={slowHint} />

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: BRAND.purple }}
                >
                  <Monitor className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Registered Systems
                  </p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">
                    {loading ? '—' : stats.total}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Active & Authorized
                  </p>
                  <p className="text-lg font-bold text-emerald-700 leading-tight">
                    {loading ? '—' : stats.active}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <Ban className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Blocked Systems
                  </p>
                  <p className="text-lg font-bold text-rose-700 leading-tight">
                    {loading ? '—' : stats.blocked}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-2xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Hardware ID, Name, Branch, or Employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-slate-50/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-purple-300 focus:bg-white focus:ring-1 focus:ring-purple-300"
                />
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <span className="shrink-0 text-xs font-semibold text-slate-500">Status:</span>
                <div className="flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                  {[
                    { key: 'all', label: `All (${stats.total})` },
                    { key: 'active', label: `Active (${stats.active})` },
                    { key: 'blocked', label: `Blocked (${stats.blocked})` },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setStatusFilter(opt.key)}
                      className={`shrink-0 cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition-all ${statusFilter === opt.key
                          ? 'bg-white font-bold text-purple-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Hardware type filter — Computers / Scanners / Printers / … */}
                <label className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-slate-50/70 px-2.5 py-1.5 text-xs">
                  <Cpu className="size-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-500">Type</span>
                  <NativeSelect
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-7 min-w-[8.5rem] border-0 bg-transparent py-0 text-xs font-semibold text-slate-800 shadow-none focus:ring-0"
                  >
                    <option value="all">All Types</option>
                    {HARDWARE_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </NativeSelect>
                </label>

                {/* Branch filter — multi-branch companies */}
                <label className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-slate-50/70 px-2.5 py-1.5 text-xs">
                  <Building2 className="size-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-500">Branch</span>
                  <NativeSelect
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="h-7 min-w-[8.5rem] border-0 bg-transparent py-0 text-xs font-semibold text-slate-800 shadow-none focus:ring-0"
                  >
                    <option value="all">All Branches</option>
                    {branchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            </div>

            <SurfaceCard
              title="List of System Access Terminals"
              description="Assigned branch hardware, employee binding and authorization status"
            >
              {loading && systems.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" />
                  Loading devices…
                </div>
              ) : systems.length === 0 ? (
                <EmptyState
                  icon={MonitorOff}
                  title={
                    hasDeviceFilters
                      ? 'No devices match these filters'
                      : 'No hardware devices assigned yet'
                  }
                  description={
                    hasDeviceFilters
                      ? 'Clear search, status, type, or branch filters to see assigned systems.'
                      : 'Devices appear here after a branch manager creates hardware and assigns it to an employee.'
                  }
                  compact
                />
              ) : (
                <>
                  <ResponsiveDataShell
                    mobile={systems.map((sys) => {
                      const isActive = sys.status === 'active'
                      return (
                        <DataCard key={sys.id}>
                          <div className="flex items-start gap-3">
                            {sys.imageUrl ? (
                              <img
                                src={sys.imageUrl}
                                alt=""
                                className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-border"
                              />
                            ) : (
                              <div
                                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${
                                  isActive ? 'bg-purple-900' : 'bg-rose-600'
                                }`}
                              >
                                <Cpu className="size-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {sys.deviceName}
                                  </p>
                                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-purple-900">
                                    {sys.hardwareCode || '—'}
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                                    {sys.hardwareType || '—'}
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                    <Building2 className="size-3 shrink-0 text-slate-400" />
                                    {sys.branch || 'Unassigned'}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    isActive
                                      ? 'shrink-0 border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700'
                                      : 'shrink-0 border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-700'
                                  }
                                >
                                  {isActive ? 'Active' : 'Blocked'}
                                </Badge>
                              </div>
                              <div className="mt-3 flex items-center gap-2.5">
                                <UserAvatar
                                  name={sys.userName}
                                  imageUrl={sys.employeeImageUrl}
                                  className="size-9"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-slate-900">
                                    {sys.userName}
                                  </p>
                                  <p className="font-mono text-[11px] text-slate-500">
                                    {displayStaffRef({ id: sys.staffId })}
                                  </p>
                                  <p className="truncate text-[11px] text-slate-400">
                                    {sys.designation || '—'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </DataCard>
                      )
                    })}
                    desktop={
                      <Table className="min-w-[52rem] w-full text-left text-sm">
                        <TableHeader>
                          <TableRow className="text-xs text-slate-500 uppercase">
                            <TableHead className="px-4 py-3 font-medium">Hardware</TableHead>
                            <TableHead className="px-4 py-3 font-medium">Hardware Type</TableHead>
                            <TableHead className="px-4 py-3 font-medium">Branch</TableHead>
                            <TableHead className="px-4 py-3 font-medium">
                              Assigned Employee
                            </TableHead>
                            <TableHead className="px-4 py-3 font-medium">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {systems.map((sys) => {
                            const isActive = sys.status === 'active'
                            return (
                              <TableRow
                                key={sys.id}
                                className="group transition-colors hover:bg-slate-50/70"
                              >
                                <TableCell className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    {sys.imageUrl ? (
                                      <img
                                        src={sys.imageUrl}
                                        alt=""
                                        className="size-9 shrink-0 rounded-xl object-cover ring-1 ring-border"
                                      />
                                    ) : (
                                      <div
                                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${
                                          isActive ? 'bg-purple-900' : 'bg-rose-600'
                                        }`}
                                      >
                                        <Cpu className="size-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs leading-tight font-semibold text-slate-900">
                                        {sys.deviceName}
                                      </p>
                                      <p className="mt-0.5 font-mono text-[11px] font-semibold text-purple-900">
                                        {sys.hardwareCode || '—'}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="px-4 py-3.5 text-xs font-medium text-slate-700">
                                  {sys.hardwareType || '—'}
                                </TableCell>

                                <TableCell className="px-4 py-3.5">
                                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                    <Building2 className="size-3.5 shrink-0 text-slate-400" />
                                    {sys.branch || 'Unassigned'}
                                  </p>
                                </TableCell>

                                <TableCell className="px-4 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <UserAvatar
                                      name={sys.userName}
                                      imageUrl={sys.employeeImageUrl}
                                      className="size-9"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-semibold text-slate-900">
                                        {sys.userName}
                                      </p>
                                      <p className="font-mono text-[11px] text-slate-500">
                                        {displayStaffRef({ id: sys.staffId })}
                                      </p>
                                      <p className="truncate text-[11px] text-slate-400">
                                        {sys.designation || '—'}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className="px-4 py-3.5 whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className={
                                      isActive
                                        ? 'border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700'
                                        : 'border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-700'
                                    }
                                  >
                                    {isActive ? 'Active' : 'Blocked'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    }
                  />

                  <TablePagination
                    page={pagination.page || page}
                    pageCount={pagination.pageCount || 1}
                    totalItems={pagination.total || 0}
                    pageSize={limit}
                    onPageChange={setPage}
                    onPageSizeChange={(next) => {
                      setLimit(next)
                      setPage(1)
                    }}
                    loading={loading}
                  />
                </>
              )}
            </SurfaceCard>
          </div>
        </MotionReveal>
      )}
    </div>
  )
}

export default SettingsPage
