import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { DateRangeFields } from '@/components/shared/DateRangeFields'
import { SearchableMultiSelect } from '@/components/feature/products/add-item/SearchableMultiSelect'
import { AdminLogsTabFilters } from '@/components/feature/admin/logs/AdminLogsTabFilters'
import {
  ADMIN_LOG_CATEGORIES,
  ADMIN_LOG_CATEGORY_LABELS,
  ADMIN_LOG_ROLE_OPTIONS,
  ADMIN_LOGS_MAX_RANGE_DAYS,
  localDateInputValue,
} from '@/lib/adminLogs'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

function hasActiveFilters(filters = {}) {
  const today = localDateInputValue()
  const dateIsDefault = filters.from === today && filters.to === today
  return Boolean(
    filters.branchId ||
      filters.actorRole ||
      filters.actorUserId ||
      (Array.isArray(filters.categories) && filters.categories.length > 0) ||
      filters.action ||
      (Array.isArray(filters.actions) && filters.actions.length > 0) ||
      filters.entityId ||
      filters.productType ||
      filters.variantTypeId ||
      filters.supplierId ||
      filters.orderStatus ||
      filters.settingCategory ||
      filters.q?.trim() ||
      !dateIsDefault,
  )
}

// Child: universal + tab filter bar — Parent: AdminLogsPage owns filter state
export function AdminLogsFilters({ filters, onChange, onClear }) {
  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadBranches() {
      setBranchesLoading(true)
      const res = await apiClient.get(endpoints.admin.branches.list, { page: 1, limit: 100 })
      if (cancelled) return
      setBranchesLoading(false)
      if (res.success) {
        const rows = res.data?.items || res.data || []
        setBranches(Array.isArray(rows) ? rows : [])
      }
    }
    void loadBranches()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!filters.branchId) {
      setEmployees([])
      return undefined
    }
    let cancelled = false
    async function loadEmployees() {
      setEmployeesLoading(true)
      const params = { branchId: filters.branchId }
      if (filters.actorRole) params.actorRole = filters.actorRole
      const res = await apiClient.get(endpoints.admin.logs.actors, params)
      if (cancelled) return
      setEmployeesLoading(false)
      if (res.success) {
        setEmployees(res.data?.items || [])
      } else {
        setEmployees([])
      }
    }
    void loadEmployees()
    return () => {
      cancelled = true
    }
  }, [filters.branchId, filters.actorRole])

  const roleDisabled = !filters.branchId
  const employeeDisabled = !filters.branchId
  const showClear = hasActiveFilters(filters) || Boolean(filters.from || filters.to)

  let rangeHint = null
  if (filters.from && filters.to) {
    const fromMs = new Date(`${filters.from}T00:00:00`).getTime()
    const toMs = new Date(`${filters.to}T00:00:00`).getTime()
    if (!Number.isNaN(fromMs) && !Number.isNaN(toMs)) {
      const spanDays = (toMs - fromMs) / (1000 * 60 * 60 * 24)
      if (toMs < fromMs) rangeHint = 'End date must be on or after start date.'
      else if (spanDays > ADMIN_LOGS_MAX_RANGE_DAYS) {
        rangeHint = `Date range cannot exceed ${ADMIN_LOGS_MAX_RANGE_DAYS} days.`
      }
    }
  }

  return (
    <SurfaceCard padding="compact">
      <div className="space-y-3">
        <DateRangeFields
          from={filters.from || ''}
          to={filters.to || ''}
          onChange={({ from, to }) => onChange({ from, to })}
          idPrefix="admin-logs"
        />
        {rangeHint ? (
          <p className="text-xs font-medium text-amber-700">{rangeHint}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-logs-branch">Branch</Label>
            <NativeSelect
              id="admin-logs-branch"
              value={filters.branchId || ''}
              disabled={branchesLoading}
              onChange={(e) =>
                onChange({
                  branchId: e.target.value,
                  actorRole: '',
                  actorUserId: '',
                  entityId: '',
                  productType: '',
                  variantTypeId: '',
                  supplierId: '',
                })
              }
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || b.id}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-logs-role">Designation / Role</Label>
            <NativeSelect
              id="admin-logs-role"
              value={filters.actorRole || ''}
              disabled={roleDisabled}
              onChange={(e) =>
                onChange({
                  actorRole: e.target.value,
                  actorUserId: '',
                })
              }
            >
              <option value="">{roleDisabled ? 'Select a branch first' : 'All roles'}</option>
              {ADMIN_LOG_ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-logs-employee">Employee</Label>
            <NativeSelect
              id="admin-logs-employee"
              value={filters.actorUserId || ''}
              disabled={employeeDisabled || employeesLoading}
              onChange={(e) => onChange({ actorUserId: e.target.value })}
            >
              <option value="">
                {employeeDisabled
                  ? 'Select a branch first'
                  : employeesLoading
                    ? 'Loading…'
                    : 'All employees'}
              </option>
              {employees.map((emp) => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.fullName}
                </option>
              ))}
            </NativeSelect>
          </div>

          {filters.tab === 'all' ? (
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <SearchableMultiSelect
                label="Category"
                options={ADMIN_LOG_CATEGORIES.map((id) => ({
                  id,
                  label: ADMIN_LOG_CATEGORY_LABELS[id],
                }))}
                value={filters.categories || []}
                onChange={(next) => onChange({ categories: next })}
                placeholder="All categories"
                emptyText="No categories"
              />
            </div>
          ) : (
            <div className="hidden lg:block" aria-hidden />
          )}
        </div>

        <AdminLogsTabFilters tab={filters.tab} filters={filters} onChange={onChange} />

        {showClear ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  )
}

export default AdminLogsFilters
