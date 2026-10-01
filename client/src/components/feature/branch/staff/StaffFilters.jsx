import { Search } from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { HARDWARE_TYPE_OPTIONS } from '@/lib/validation/branchForms'

// Light filters for BM staff list: search + role + status + hardware type.
export function StaffFilters({
  q = '',
  status = '',
  role = '',
  hardwareType = '',
  onChange,
  className,
}) {
  return (
    <SurfaceCard className={className} padding="compact">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5 basis-full sm:basis-auto sm:min-w-[12rem]">
          <Label htmlFor="staff-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="staff-search"
              value={q}
              placeholder="Search by name or ID…"
              className="pl-9"
              onChange={(event) => onChange?.({ q: event.target.value })}
            />
          </div>
        </div>

        <div className="w-full space-y-1.5 sm:w-48">
          <Label htmlFor="staff-role-filter">System Role</Label>
          <NativeSelect
            id="staff-role-filter"
            value={role}
            onChange={(event) => onChange?.({ role: event.target.value })}
          >
            <option value="">All roles</option>
            <option value="inventory_manager">Inventory Manager</option>
            <option value="cashier">Cashier</option>
            <option value="website_manager">Website Manager</option>
            <option value="production_staff">Production Staff</option>
            <option value="delivery_staff">Delivery Staff</option>
          </NativeSelect>
        </div>

        <div className="w-full space-y-1.5 sm:w-44">
          <Label htmlFor="staff-hardware-type-filter">Hardware type</Label>
          <NativeSelect
            id="staff-hardware-type-filter"
            value={hardwareType}
            onChange={(event) => onChange?.({ hardwareType: event.target.value })}
          >
            <option value="">All types</option>
            {HARDWARE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="w-full space-y-1.5 sm:w-44">
          <Label htmlFor="staff-status-filter">Status</Label>
          <NativeSelect
            id="staff-status-filter"
            value={status}
            onChange={(event) => onChange?.({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
        </div>
      </div>
    </SurfaceCard>
  )
}
