// Branch Staff Slice — Express /api/branch/staff → RTK → useBranchStaff
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'

export const STAFF_PAGE_SIZE = 8

// Build JSON or multipart body; never include branchId (server forces JWT branch).
export function buildStaffPayload(fields) {
  const {
    fullName,
    email,
    password,
    role,
    hardwareDeviceId,
    hardwareAllocationStart,
    hardwareAllocationEnd,
    scheduleStart,
    scheduleBreakStart,
    scheduleBreakEnd,
    scheduleEnd,
    workingDays,
    image,
  } = fields

  const days = Array.isArray(workingDays)
    ? workingDays.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
    : undefined

  const base = {
    fullName: String(fullName || '').trim(),
    email: String(email || '').trim(),
    role,
    // Always send so BM can clear an assignment (null = unassigned).
    hardwareDeviceId: String(hardwareDeviceId || '').trim() || null,
    hardwareAllocationStart: hardwareAllocationStart || undefined,
    hardwareAllocationEnd: hardwareAllocationEnd || undefined,
    scheduleStart: scheduleStart || undefined,
    scheduleBreakStart: scheduleBreakStart || undefined,
    scheduleBreakEnd: scheduleBreakEnd || undefined,
    scheduleEnd: scheduleEnd || undefined,
    ...(days !== undefined ? { workingDays: days } : {}),
  }

  if (password) base.password = password

  if (image instanceof File && image.size > 0) {
    const form = new FormData()
    Object.entries(base).forEach(([key, value]) => {
      if (key === 'hardwareDeviceId') {
        form.append(key, value || '')
        return
      }
      if (key === 'workingDays') {
        form.append(key, JSON.stringify(value || []))
        return
      }
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    })
    form.append('image', image)
    return form
  }

  return base
}

function defaultFilters(overrides = {}) {
  return {
    q: '',
    status: '',
    role: '',
    hardwareType: '',
    page: 1,
    limit: STAFF_PAGE_SIZE,
    ...overrides,
  }
}

const initialState = {
  items: [],
  pagination: {
    page: 1,
    limit: STAFF_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
  filters: defaultFilters(),
  loading: false,
  mutating: false,
  error: null,
}

export const fetchBranchStaff = createAsyncThunk(
  'branchStaff/fetchList',
  async (filters, { rejectWithValue }) => {
    const next = filters || defaultFilters()
    const result = await apiClient.get(endpoints.branch.staff.list, {
      page: next.page || 1,
      limit: next.limit || STAFF_PAGE_SIZE,
      q: next.q || undefined,
      status: next.status || undefined,
      role: next.role || undefined,
      // Server accepts hardwareType | type
      hardwareType: next.hardwareType || undefined,
      type: next.hardwareType || undefined,
    })
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load staff')
    }
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
    return {
      items: rows,
      pagination:
        data.pagination || {
          page: next.page || 1,
          limit: next.limit || STAFF_PAGE_SIZE,
          total: rows.length,
          pageCount: 1,
        },
    }
  },
)

export const createStaff = createAsyncThunk(
  'branchStaff/create',
  async (fields, { getState, dispatch, rejectWithValue }) => {
    const body = buildStaffPayload(fields)
    const result = await apiClient.post(endpoints.branch.staff.create, body)
    if (!result.success) return rejectWithValue(result.error || 'Create failed')
    const filters = { ...getState().branchStaff.filters, page: 1 }
    dispatch(setStaffFilters(filters))
    void dispatch(fetchBranchStaff(filters))
    return result
  },
)

export const updateStaff = createAsyncThunk(
  'branchStaff/update',
  async ({ id, fields }, { getState, dispatch, rejectWithValue }) => {
    const body = buildStaffPayload(fields)
    const result = await apiClient.patch(endpoints.branch.staff.update(id), body)
    if (!result.success) return rejectWithValue(result.error || 'Update failed')
    void dispatch(fetchBranchStaff(getState().branchStaff.filters))
    return result
  },
)

export const setStaffStatus = createAsyncThunk(
  'branchStaff/setStatus',
  async ({ id, status }, { rejectWithValue }) => {
    const result = await apiClient.patch(endpoints.branch.staff.status(id), { status })
    if (!result.success) return rejectWithValue(result.error || 'Status update failed')
    return { id, data: result.data || { status } }
  },
)

export const deleteStaff = createAsyncThunk(
  'branchStaff/delete',
  async (id, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.delete(endpoints.branch.staff.delete(id))
    if (!result.success) return rejectWithValue(result.error || 'Delete failed')
    void dispatch(fetchBranchStaff(getState().branchStaff.filters))
    return result
  },
)

const branchStaffSlice = createSlice({
  name: 'branchStaff',
  initialState,
  reducers: {
    setStaffFilters(state, action) {
      state.filters = action.payload
    },
    patchStaffFilters(state, action) {
      const patch = action.payload || {}
      const next = { ...state.filters, ...patch }
      if (
        patch.q !== undefined ||
        patch.status !== undefined ||
        patch.role !== undefined ||
        patch.hardwareType !== undefined ||
        patch.limit !== undefined
      ) {
        next.page = patch.page ?? 1
      }
      state.filters = next
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranchStaff.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBranchStaff.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.pagination = action.payload.pagination
      })
      .addCase(fetchBranchStaff.rejected, (state, action) => {
        state.loading = false
        state.items = []
        state.error = action.payload || action.error.message
      })
      .addCase(createStaff.pending, (state) => {
        state.mutating = true
      })
      .addCase(createStaff.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(createStaff.rejected, (state) => {
        state.mutating = false
      })
      .addCase(updateStaff.pending, (state) => {
        state.mutating = true
      })
      .addCase(updateStaff.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(updateStaff.rejected, (state) => {
        state.mutating = false
      })
      .addCase(setStaffStatus.pending, (state) => {
        state.mutating = true
      })
      .addCase(setStaffStatus.fulfilled, (state, action) => {
        state.mutating = false
        const { id, data } = action.payload
        const nextStatus = data?.status || 'active'
        const isActive = nextStatus === 'active'
        const statusFilter = state.filters.status
        const shouldRemove =
          (statusFilter === 'active' && !isActive) ||
          (statusFilter === 'inactive' && isActive)
        if (shouldRemove) {
          state.items = state.items.filter((row) => row.id !== id)
          if (state.pagination.total > 0) state.pagination.total -= 1
        } else {
          state.items = state.items.map((row) => (row.id === id ? { ...row, ...data } : row))
        }
      })
      .addCase(setStaffStatus.rejected, (state) => {
        state.mutating = false
      })
      .addCase(deleteStaff.pending, (state) => {
        state.mutating = true
      })
      .addCase(deleteStaff.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(deleteStaff.rejected, (state) => {
        state.mutating = false
      })
  },
})

export const { setStaffFilters, patchStaffFilters } = branchStaffSlice.actions
export default branchStaffSlice.reducer
