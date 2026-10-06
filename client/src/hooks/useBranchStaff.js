// useBranchStaff — RTK branchStaff slice wrapper (Express → RTK → hook → UI)
import { useCallback, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult } from '@/rtk/asResult'
import {
  STAFF_PAGE_SIZE,
  buildStaffPayload,
  patchStaffFilters,
  fetchBranchStaff,
  createStaff as createStaffThunk,
  updateStaff as updateStaffThunk,
  setStaffStatus as setStaffStatusThunk,
  deleteStaff as deleteStaffThunk,
  exportBranchStaffCsv as exportBranchStaffCsvThunk,
} from '@/rtk/features/branch/branchStaffSlice'

export { STAFF_PAGE_SIZE as DEFAULT_LIMIT }
export { buildStaffPayload }

const EMPTY_FILTERS = {}

export function useBranchStaff(initialFilters = EMPTY_FILTERS) {
  const dispatch = useAppDispatch()
  const { items, pagination, filters, loading, mutating, exporting, error } = useAppSelector(
    (state) => state.branchStaff,
  )
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (initialFilters && Object.keys(initialFilters).length) {
      dispatch(patchStaffFilters(initialFilters))
    }
  }, [dispatch, initialFilters])

  useEffect(() => {
    void dispatch(fetchBranchStaff(filters))
  }, [dispatch, filters])

  const updateFilters = useCallback(
    (patch) => {
      dispatch(patchStaffFilters(patch))
    },
    [dispatch],
  )

  return {
    items,
    pagination,
    filters,
    loading,
    mutating,
    exporting,
    error,
    updateFilters,
    setPage: (page) => updateFilters({ page }),
    reload: () => dispatch(fetchBranchStaff(filtersRef.current)),
    createStaff: (fields) => asResult(dispatch(createStaffThunk(fields)).unwrap()),
    updateStaff: (id, fields) =>
      asResult(dispatch(updateStaffThunk({ id, fields })).unwrap()),
    setStaffStatus: (id, status) =>
      asResult(dispatch(setStaffStatusThunk({ id, status })).unwrap()),
    deleteStaff: (id) => asResult(dispatch(deleteStaffThunk(id)).unwrap()),
    // Dedicated /branch/staff/export — respects current roster filters
    exportCsv: () => asResult(dispatch(exportBranchStaffCsvThunk()).unwrap()),
  }
}
