// useInventoryControl — RTK control slice wrapper (Express → RTK → hook → UI)
import { useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/rtk/hooks'
import { asResult, catalogActiveOnly } from '@/rtk/asResult'
import { CONTROL_UI_TAB } from '@/lib/controlTabs'
import { MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import {
  CONTROL_PAGE_SIZE,
  ensureControlType,
  patchControlFilters,
  patchGlobalFilters,
  resetGlobalFilters,
  setControlPage,
  loadControlCatalog,
  fetchControlMovements,
  fetchControlThresholds,
  fetchControlSummary,
  createMovement as createMovementThunk,
  updateMovement as updateMovementThunk,
  deleteMovement as deleteMovementThunk,
  stockInFromOrder as stockInFromOrderThunk,
  fetchControlProductOptions,
  fetchControlProductDetail,
  fetchControlSuppliers,
  fetchApprovedPurchaseOrders,
  fetchPurchaseOrderDetail,
  fetchEmployeeLookups,
  defaultGlobalFilters,
} from '@/rtk/features/control/controlSlice'

export { CONTROL_PAGE_SIZE }
export {
  fetchControlProductOptions,
  fetchControlProductDetail,
  fetchControlSuppliers,
  fetchApprovedPurchaseOrders,
  fetchPurchaseOrderDetail,
  fetchEmployeeLookups,
}

const EMPTY_FILTERS = {}

const EMPTY_BUCKET = {
  items: [],
  pagination: {
    page: 1,
    limit: CONTROL_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
  filters: {
    page: 1,
    limit: CONTROL_PAGE_SIZE,
  },
  loading: true,
  mutating: false,
  error: null,
}

export function useInventoryControl(movementType, initialFilters = EMPTY_FILTERS) {
  const dispatch = useAppDispatch()
  const catalogRaw = useAppSelector((state) => state.control.catalog)
  const catalogLoading = useAppSelector((state) => state.control.catalogLoading)
  const globalFilters = useAppSelector((state) => state.control.globalFilters)
  const summary = useAppSelector((state) => state.control.summary)
  const summaryLoading = useAppSelector((state) => state.control.summaryLoading)
  const bucket = useAppSelector(
    (state) => state.control.byType[movementType] || EMPTY_BUCKET,
  )
  const bucketFilters = bucket.filters
  const filtersKey = JSON.stringify({ globalFilters, bucketFilters })
  const globalFiltersKey = JSON.stringify(globalFilters)

  // UI sees one merged filter object (global + page/limit).
  const filters = useMemo(
    () => ({
      ...defaultGlobalFilters(),
      ...globalFilters,
      page: bucketFilters.page || 1,
      limit: bucketFilters.limit || CONTROL_PAGE_SIZE,
    }),
    [globalFilters, bucketFilters],
  )

  const catalog = useMemo(() => catalogActiveOnly(catalogRaw), [catalogRaw])

  useEffect(() => {
    dispatch(ensureControlType({ movementType, initialFilters }))
  }, [dispatch, movementType, initialFilters])

  useEffect(() => {
    void dispatch(loadControlCatalog())
  }, [dispatch])

  useEffect(() => {
    if (!movementType) return
    if (movementType === CONTROL_UI_TAB.THRESHOLDS) {
      void dispatch(
        fetchControlThresholds({
          filters: bucketFilters,
          globalFilters,
        }),
      )
    } else {
      void dispatch(
        fetchControlMovements({
          movementType,
          filters: bucketFilters,
          globalFilters,
        }),
      )
    }
    // filtersKey serializes globalFilters + bucketFilters (page/limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional serialized key
  }, [dispatch, movementType, filtersKey])

  useEffect(() => {
    void dispatch(fetchControlSummary({ globalFilters }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional serialized key
  }, [dispatch, globalFiltersKey])

  const updateFilters = useCallback(
    (patch) => {
      dispatch(patchControlFilters({ movementType, patch }))
    },
    [dispatch, movementType],
  )

  const setGlobalFilters = useCallback(
    (patch) => {
      dispatch(patchGlobalFilters(patch))
    },
    [dispatch],
  )

  const clearFilters = useCallback(() => {
    dispatch(resetGlobalFilters())
  }, [dispatch])

  const setPage = useCallback(
    (page) => {
      dispatch(setControlPage({ movementType, page }))
    },
    [dispatch, movementType],
  )

  const selectedCategorySubs = useMemo(() => {
    if (!filters.categoryId) return []
    return catalog.childrenByParent.get(filters.categoryId) || []
  }, [catalog, filters.categoryId])

  const createMovement = useCallback(
    (body) =>
      asResult(dispatch(createMovementThunk({ movementType, body })).unwrap()),
    [dispatch, movementType],
  )

  // Post to a specific ledger bucket (e.g. damaged from Add Adjustment).
  const createMovementForType = useCallback(
    (targetType, body) =>
      asResult(dispatch(createMovementThunk({ movementType: targetType, body })).unwrap()),
    [dispatch],
  )

  // Always posts to stock-in regardless of active tab (global Add Stock In CTA).
  const createStockIn = useCallback(
    (body) =>
      asResult(
        dispatch(
          createMovementThunk({ movementType: MOVEMENT_TYPES.IN, body }),
        ).unwrap(),
      ),
    [dispatch],
  )

  const updateMovement = useCallback(
    (id, body) =>
      asResult(dispatch(updateMovementThunk({ movementType, id, body })).unwrap()),
    [dispatch, movementType],
  )

  const deleteMovement = useCallback(
    (id) => asResult(dispatch(deleteMovementThunk({ movementType, id })).unwrap()),
    [dispatch, movementType],
  )

  // Always refresh Stock In bucket — Order Demand is a global header CTA.
  const stockInFromOrder = useCallback(
    (purchaseOrderId) =>
      asResult(
        dispatch(
          stockInFromOrderThunk({
            movementType: MOVEMENT_TYPES.IN,
            purchaseOrderId,
          }),
        ).unwrap(),
      ),
    [dispatch],
  )

  return {
    movementType,
    items: bucket.items,
    pagination: bucket.pagination,
    filters,
    globalFilters,
    summary,
    summaryLoading,
    loading: bucket.loading,
    mutating: bucket.mutating,
    error: bucket.error,
    catalog,
    catalogLoading,
    selectedCategorySubs,
    updateFilters,
    setGlobalFilters,
    clearFilters,
    setPage,
    reload: () =>
      movementType === CONTROL_UI_TAB.THRESHOLDS
        ? dispatch(
            fetchControlThresholds({
              filters: bucketFilters,
              globalFilters,
            }),
          )
        : dispatch(
            fetchControlMovements({
              movementType,
              filters: bucketFilters,
              globalFilters,
            }),
          ),
    reloadSummary: () => dispatch(fetchControlSummary({ globalFilters })),
    loadCatalog: ({ force = false } = {}) =>
      dispatch(loadControlCatalog({ force })).unwrap(),
    createMovement,
    createMovementForType,
    createStockIn,
    updateMovement,
    deleteMovement,
    stockInFromOrder,
  }
}
