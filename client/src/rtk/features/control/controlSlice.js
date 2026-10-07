// Control Slice — Express /api/inventory/control → RTK → useInventoryControl
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { ADJUSTMENT_LEDGER_TYPES, CONTROL_UI_TAB } from '@/lib/controlTabs'
import { mapStockMovement, MOVEMENT_TYPES } from '@/lib/mapStockMovement'
import { mapPurchaseOrder } from '@/lib/mapPurchaseOrder'
import { mapProduct } from '@/lib/mapProduct'
import { mapSupplier } from '@/lib/mapSupplier'
import {
  getProductCatalog,
  peekProductCatalog,
} from '@/lib/productCatalogCache'

export const CONTROL_PAGE_SIZE = 8

export const LIST_PATH = {
  [MOVEMENT_TYPES.IN]: endpoints.control.stockIn,
  [MOVEMENT_TYPES.OUT]: endpoints.control.stockOut,
  [MOVEMENT_TYPES.ADJUSTMENT]: endpoints.control.adjustmentLedger,
  [MOVEMENT_TYPES.DAMAGED]: endpoints.control.damaged,
  [MOVEMENT_TYPES.EXPIRED]: endpoints.control.expired,
  [MOVEMENT_TYPES.OTHER]: endpoints.control.others,
}

const CREATE_PATH = {
  [MOVEMENT_TYPES.IN]: endpoints.control.stockIn,
  [MOVEMENT_TYPES.OUT]: endpoints.control.stockOut,
  [MOVEMENT_TYPES.ADJUSTMENT]: endpoints.control.adjustments,
  [MOVEMENT_TYPES.DAMAGED]: endpoints.control.damaged,
  [MOVEMENT_TYPES.EXPIRED]: endpoints.control.expired,
  [MOVEMENT_TYPES.OTHER]: endpoints.control.others,
}

const ITEM_PATH = {
  [MOVEMENT_TYPES.ADJUSTMENT]: endpoints.control.adjustment,
  [MOVEMENT_TYPES.DAMAGED]: endpoints.control.damagedItem,
  [MOVEMENT_TYPES.EXPIRED]: endpoints.control.expiredItem,
  [MOVEMENT_TYPES.OTHER]: endpoints.control.otherItem,
}

// Shared across tabs — page/limit stay per movement type.
export function defaultGlobalFilters(overrides = {}) {
  return {
    q: '',
    type: '',
    categoryId: '',
    subcategoryId: '',
    productId: '',
    variantTypeId: '',
    variantValueId: '',
    ledgerKind: '',
    scale: '',
    from: '',
    to: '',
    ...overrides,
  }
}

function emptyCatalog() {
  return {
    parents: [],
    childrenByParent: {},
    all: [],
    taxes: [],
    offers: [],
  }
}

function catalogToState(catalog) {
  if (!catalog) return emptyCatalog()
  const map = catalog.childrenByParent
  return {
    parents: catalog.parents || [],
    childrenByParent:
      map instanceof Map ? Object.fromEntries(map) : map || {},
    all: catalog.all || [],
    taxes: catalog.taxes || [],
    offers: catalog.offers || [],
  }
}

function defaultBucketFilters(overrides = {}) {
  return {
    page: 1,
    limit: CONTROL_PAGE_SIZE,
    ...overrides,
  }
}

function emptyBucket(overrides = {}) {
  return {
    items: [],
    pagination: {
      page: 1,
      limit: CONTROL_PAGE_SIZE,
      total: 0,
      pageCount: 1,
    },
    filters: defaultBucketFilters(overrides),
    loading: false,
    mutating: false,
    error: null,
  }
}

const initialState = {
  catalog: catalogToState(peekProductCatalog()),
  catalogLoading: !peekProductCatalog(),
  globalFilters: defaultGlobalFilters(),
  byType: {},
  summary: null,
  summaryLoading: false,
  summaryError: null,
}

function ensureBucket(state, movementType) {
  if (!state.byType[movementType]) {
    state.byType[movementType] = emptyBucket()
  }
  return state.byType[movementType]
}

// Merge global + per-tab page/limit for list API (AND across all applied fields).
export function buildListQuery(globalFilters, bucketFilters = {}) {
  const g = globalFilters || defaultGlobalFilters()
  return {
    page: bucketFilters.page || 1,
    limit: bucketFilters.limit || CONTROL_PAGE_SIZE,
    q: g.q || undefined,
    categoryId: g.categoryId || undefined,
    subcategoryId: g.subcategoryId || undefined,
    productId: g.productId || undefined,
    variantTypeId: g.variantTypeId || undefined,
    variantValueId: g.variantValueId || undefined,
    ledgerKind: g.ledgerKind || undefined,
    scale: g.scale || undefined,
    type: g.type || undefined,
    from: g.from || undefined,
    to: g.to || undefined,
  }
}

function resetBucketPages(state) {
  Object.keys(state.byType).forEach((key) => {
    const bucket = state.byType[key]
    if (bucket?.filters) bucket.filters = { ...bucket.filters, page: 1 }
  })
}

export const loadControlCatalog = createAsyncThunk(
  'control/loadCatalog',
  async ({ force = false, categoryActive = 'active' } = {}) =>
    catalogToState(await getProductCatalog({ force, categoryActive })),
)

export const fetchControlThresholds = createAsyncThunk(
  'control/fetchThresholds',
  async ({ filters, globalFilters }, { getState, rejectWithValue }) => {
    const state = getState().control
    const g = globalFilters || state.globalFilters
    const bucket = state.byType[CONTROL_UI_TAB.THRESHOLDS]
    const query = buildListQuery(g, filters || bucket?.filters || defaultBucketFilters())
    const result = await apiClient.get(endpoints.control.thresholds, {
      q: query.q,
      categoryId: query.categoryId,
      subcategoryId: query.subcategoryId,
      productId: query.productId,
      type: query.type,
    })
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load thresholds')
    }
    const rows = Array.isArray(result.data?.items) ? result.data.items : []
    return {
      movementType: CONTROL_UI_TAB.THRESHOLDS,
      items: rows,
      pagination: {
        page: 1,
        limit: rows.length || CONTROL_PAGE_SIZE,
        total: rows.length,
        pageCount: 1,
      },
    }
  },
)

export const fetchControlMovements = createAsyncThunk(
  'control/fetchList',
  async ({ movementType, filters, globalFilters }, { getState, rejectWithValue }) => {
    if (movementType === CONTROL_UI_TAB.THRESHOLDS) {
      return rejectWithValue('Use fetchControlThresholds')
    }
    const listPath = LIST_PATH[movementType]
    if (!listPath) return rejectWithValue('Unknown movement type')
    const state = getState().control
    const bucket = state.byType[movementType]
    const query = buildListQuery(
      globalFilters || state.globalFilters,
      filters || bucket?.filters || defaultBucketFilters(),
    )
    const result = await apiClient.get(listPath, query)
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load movements')
    }
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : []
    return {
      movementType,
      items: rows.map(mapStockMovement),
      pagination:
        data.pagination || {
          page: query.page || 1,
          limit: query.limit || CONTROL_PAGE_SIZE,
          total: rows.length,
          pageCount: 1,
        },
    }
  },
)

// Control summary — KPIs + tab counts (Phase 2).
export const fetchControlSummary = createAsyncThunk(
  'control/fetchSummary',
  async ({ globalFilters } = {}, { getState, rejectWithValue }) => {
    const state = getState().control
    const g = globalFilters || state.globalFilters || defaultGlobalFilters()
    const query = buildListQuery(g, { page: 1, limit: 1 })
    // Summary ignores page/limit
    const summaryQuery = { ...query }
    delete summaryQuery.page
    delete summaryQuery.limit
    const result = await apiClient.get(endpoints.control.summary, summaryQuery)
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load control summary')
    }
    return result.data || null
  },
)

function refetchWithState(dispatch, getState, movementType) {
  const state = getState().control
  const bucket = state.byType[movementType]
  void dispatch(
    fetchControlSummary({ globalFilters: state.globalFilters }),
  )
  return dispatch(
    fetchControlMovements({
      movementType,
      filters: bucket?.filters,
      globalFilters: state.globalFilters,
    }),
  )
}

export const createMovement = createAsyncThunk(
  'control/create',
  async ({ movementType, body }, { getState, dispatch, rejectWithValue }) => {
    const path = CREATE_PATH[movementType]
    if (!path) return rejectWithValue('Unknown movement type')
    const result = await apiClient.post(path, body)
    if (!result.success) return rejectWithValue(result.error || 'Create failed')
    void refetchWithState(dispatch, getState, movementType)
    if (ADJUSTMENT_LEDGER_TYPES.includes(movementType)) {
      void refetchWithState(dispatch, getState, MOVEMENT_TYPES.ADJUSTMENT)
    }
    return result
  },
)

export const updateMovement = createAsyncThunk(
  'control/update',
  async ({ movementType, id, body }, { getState, dispatch, rejectWithValue }) => {
    const pathFn = ITEM_PATH[movementType]
    if (!pathFn) return rejectWithValue('Edit not supported for this tab')
    const result = await apiClient.patch(pathFn(id), body)
    if (!result.success) return rejectWithValue(result.error || 'Update failed')
    void refetchWithState(dispatch, getState, movementType)
    return result
  },
)

export const deleteMovement = createAsyncThunk(
  'control/delete',
  async ({ movementType, id }, { getState, dispatch, rejectWithValue }) => {
    const pathFn = ITEM_PATH[movementType]
    if (!pathFn) return rejectWithValue('Delete not supported for this tab')
    const result = await apiClient.delete(pathFn(id))
    if (!result.success) return rejectWithValue(result.error || 'Delete failed')
    void refetchWithState(dispatch, getState, movementType)
    return result
  },
)

export const stockInFromOrder = createAsyncThunk(
  'control/stockInFromOrder',
  async ({ movementType, purchaseOrderId }, { getState, dispatch, rejectWithValue }) => {
    const result = await apiClient.post(endpoints.control.stockInFromOrder, {
      purchaseOrderId,
    })
    if (!result.success) return rejectWithValue(result.error || 'Stock-in failed')
    void refetchWithState(dispatch, getState, movementType)
    return result
  },
)

// Standalone helpers used by control dialogs (still Express → apiClient)
export async function fetchControlProductOptions({
  categoryId,
  subcategoryId,
  q,
  limit = 50,
} = {}) {
  const result = await apiClient.get(endpoints.products.list, {
    page: 1,
    limit,
    categoryId: categoryId || undefined,
    subcategoryId: subcategoryId || undefined,
    q: q || undefined,
    status: 'active',
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return { success: true, items: rows.map(mapProduct) }
}

export async function fetchControlProductDetail(id) {
  if (!id) return { success: false, error: 'Missing product id', data: null }
  const result = await apiClient.get(endpoints.products.detail(id))
  if (!result.success) return { success: false, error: result.error, data: null }
  return { success: true, data: mapProduct(result.data) }
}

export async function fetchControlSuppliers() {
  const result = await apiClient.get(endpoints.suppliers.list, {
    page: 1,
    limit: 50,
    active: 'active',
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return { success: true, items: rows.map(mapSupplier) }
}

export async function fetchApprovedPurchaseOrders() {
  const result = await apiClient.get(endpoints.orders.list, {
    page: 1,
    limit: 50,
    status: 'approved',
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return { success: true, items: rows.map(mapPurchaseOrder) }
}

export async function fetchPurchaseOrderDetail(id) {
  const result = await apiClient.get(endpoints.orders.detail(id))
  if (!result.success) return result
  return { success: true, data: mapPurchaseOrder(result.data) }
}

export async function fetchEmployeeLookups({ q } = {}) {
  const result = await apiClient.get(endpoints.lookups.employees, {
    page: 1,
    limit: 50,
    q: q || undefined,
  })
  if (!result.success) return { success: false, error: result.error, items: [] }
  const rows = Array.isArray(result.data?.items) ? result.data.items : []
  return {
    success: true,
    items: rows.map((row) => ({
      userId: row.userId,
      staffId: row.staffId,
      fullName: row.fullName || '',
      email: row.email || '',
      designation: row.designation || '',
    })),
  }
}

const GLOBAL_FILTER_KEYS = new Set([
  'q',
  'type',
  'categoryId',
  'subcategoryId',
  'productId',
  'variantTypeId',
  'variantValueId',
  'ledgerKind',
  'scale',
  'from',
  'to',
])

const controlSlice = createSlice({
  name: 'control',
  initialState,
  reducers: {
    ensureControlType(state, action) {
      const { movementType, initialFilters } = action.payload
      if (!state.byType[movementType]) {
        const pageLimit = {}
        if (initialFilters?.page != null) pageLimit.page = initialFilters.page
        if (initialFilters?.limit != null) pageLimit.limit = initialFilters.limit
        state.byType[movementType] = emptyBucket(pageLimit)
      }
    },
    // Prefer patchGlobalFilters for shared filters; keeps page/limit tab-local.
    patchControlFilters(state, action) {
      const { movementType, patch } = action.payload
      const bucket = ensureBucket(state, movementType)
      const globalPatch = {}
      const bucketPatch = {}
      Object.entries(patch || {}).forEach(([key, value]) => {
        if (GLOBAL_FILTER_KEYS.has(key)) globalPatch[key] = value
        else bucketPatch[key] = value
      })
      if (Object.keys(globalPatch).length) {
        state.globalFilters = { ...state.globalFilters, ...globalPatch }
        resetBucketPages(state)
      }
      if (Object.keys(bucketPatch).length) {
        const next = { ...bucket.filters, ...bucketPatch }
        if (bucketPatch.limit !== undefined && bucketPatch.page === undefined) {
          next.page = 1
        }
        bucket.filters = next
      }
    },
    patchGlobalFilters(state, action) {
      const patch = action.payload || {}
      state.globalFilters = { ...state.globalFilters, ...patch }
      resetBucketPages(state)
    },
    resetGlobalFilters(state) {
      state.globalFilters = defaultGlobalFilters()
      resetBucketPages(state)
    },
    setControlPage(state, action) {
      const { movementType, page } = action.payload
      const bucket = ensureBucket(state, movementType)
      bucket.filters = { ...bucket.filters, page }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadControlCatalog.pending, (state) => {
        if (!state.catalog?.parents?.length) state.catalogLoading = true
      })
      .addCase(loadControlCatalog.fulfilled, (state, action) => {
        state.catalog = action.payload
        state.catalogLoading = false
      })
      .addCase(loadControlCatalog.rejected, (state) => {
        state.catalogLoading = false
      })
      .addCase(fetchControlMovements.pending, (state, action) => {
        const movementType = action.meta.arg.movementType
        const bucket = ensureBucket(state, movementType)
        bucket.loading = true
        bucket.error = null
      })
      .addCase(fetchControlMovements.fulfilled, (state, action) => {
        const { movementType, items, pagination } = action.payload
        const bucket = ensureBucket(state, movementType)
        bucket.loading = false
        bucket.items = items
        bucket.pagination = pagination
      })
      .addCase(fetchControlMovements.rejected, (state, action) => {
        const movementType = action.meta.arg.movementType
        const bucket = ensureBucket(state, movementType)
        bucket.loading = false
        bucket.items = []
        bucket.error = action.payload || action.error.message
      })
      .addCase(fetchControlThresholds.pending, (state) => {
        const bucket = ensureBucket(state, CONTROL_UI_TAB.THRESHOLDS)
        bucket.loading = true
        bucket.error = null
      })
      .addCase(fetchControlThresholds.fulfilled, (state, action) => {
        const { movementType, items, pagination } = action.payload
        const bucket = ensureBucket(state, movementType)
        bucket.loading = false
        bucket.items = items
        bucket.pagination = pagination
      })
      .addCase(fetchControlThresholds.rejected, (state, action) => {
        const bucket = ensureBucket(state, CONTROL_UI_TAB.THRESHOLDS)
        bucket.loading = false
        bucket.items = []
        bucket.error = action.payload || action.error.message
      })
      .addCase(fetchControlSummary.pending, (state) => {
        state.summaryLoading = true
        state.summaryError = null
      })
      .addCase(fetchControlSummary.fulfilled, (state, action) => {
        state.summaryLoading = false
        state.summary = action.payload
      })
      .addCase(fetchControlSummary.rejected, (state, action) => {
        state.summaryLoading = false
        state.summaryError = action.payload || action.error.message
      })
      .addCase(createMovement.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(createMovement.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(createMovement.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(updateMovement.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(updateMovement.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(updateMovement.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(deleteMovement.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(deleteMovement.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(deleteMovement.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(stockInFromOrder.pending, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = true
      })
      .addCase(stockInFromOrder.fulfilled, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
      .addCase(stockInFromOrder.rejected, (state, action) => {
        ensureBucket(state, action.meta.arg.movementType).mutating = false
      })
  },
})

export const {
  ensureControlType,
  patchControlFilters,
  patchGlobalFilters,
  resetGlobalFilters,
  setControlPage,
} = controlSlice.actions
export default controlSlice.reducer
