// Products Slice — Express /api/inventory/products → RTK → useProducts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { API_BASE_URL } from '@/lib/constants'
import {
  mapProduct,
  splitProductWrite,
} from '@/lib/mapProduct'
import { exportProductsToStyledExcel } from '@/lib/productExport'
import {
  catalogToState,
  getProductCatalog,
  invalidateProductCatalog,
  patchCatalogCategoryActive,
  peekProductCatalog,
  refreshProductCategories,
} from '@/lib/productCatalogCache'
import { tokenStorage } from '@/api/tokenStorage'

export const PRODUCTS_PAGE_SIZE = 8

// Match pending combination image Files to saved SKU ids (by productId or label)
async function uploadVariantImages(variantImages = [], savedVariants = []) {
  if (!Array.isArray(variantImages) || !variantImages.length) return null
  const byLabel = new Map(
    (savedVariants || []).map((v) => [String(v.label || v.variantLabel || '').trim(), v]),
  )
  let failCount = 0
  for (const entry of variantImages) {
    const file = entry?.file
    if (!(file instanceof File) || file.size <= 0) continue
    let childId = entry.productId || null
    if (!childId && entry.label) {
      childId = byLabel.get(String(entry.label).trim())?.id || null
    }
    if (!childId) {
      failCount += 1
      continue
    }
    const form = new FormData()
    form.append('image', file)
    const imageResult = await apiClient.patch(endpoints.products.update(childId), form)
    if (!imageResult.success) failCount += 1
  }
  if (!failCount) return null
  return 'Product saved but some variant images failed to upload. Edit the product to retry.'
}

// Optimistic isActive patch on Redux catalog (mirrors patchCatalogCategoryActive)
function patchStateCatalogActive(state, id, isActive) {
  if (!id || !state.catalog) return
  const parents = state.catalog.parents || []
  const isParent = parents.some((row) => row.id === id)
  const shouldPatch = (row) => {
    if (row.id === id) return true
    if (!isActive && isParent && row.parentId === id) return true
    return false
  }
  const patchRow = (row) => (shouldPatch(row) ? { ...row, isActive } : row)

  state.catalog.parents = parents.map(patchRow)
  const children = state.catalog.childrenByParent || {}
  for (const key of Object.keys(children)) {
    children[key] = (children[key] || []).map(patchRow)
  }
  state.catalog.childrenByParent = children
  state.catalog.all = (state.catalog.all || []).map(patchRow)
}

function defaultFilters(overrides = {}) {
  return {
    q: '',
    type: '',
    categoryId: '',
    subcategoryId: '',
    productId: '',
    variantTypeId: '',
    variantValueId: '',
    status: 'active',
    page: 1,
    limit: PRODUCTS_PAGE_SIZE,
    ...overrides,
  }
}

const initialState = {
  items: [],
  pagination: {
    page: 1,
    limit: PRODUCTS_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
  filters: defaultFilters(),
  loading: false,
  catalogLoading: !peekProductCatalog(),
  mutating: false,
  error: null,
  catalog: catalogToState(peekProductCatalog()),
  bundleOptions: [],
  bundleOptionsLoading: false,
}

// Load shared category / tax / offer catalog
export const loadProductCatalog = createAsyncThunk(
  'products/loadCatalog',
  async ({ force = false, categoryActive = 'active' } = {}) => {
    const next = await getProductCatalog({ force, categoryActive })
    return catalogToState(next)
  },
)

export const reloadProductCategories = createAsyncThunk(
  'products/reloadCategories',
  async (categoryActive) => catalogToState(await refreshProductCategories(categoryActive)),
)

export const fetchProducts = createAsyncThunk(
  'products/fetchList',
  async (filters, { rejectWithValue }) => {
    const next = filters || defaultFilters()
    const result = await apiClient.get(endpoints.products.list, {
      page: next.page || 1,
      limit: next.limit || PRODUCTS_PAGE_SIZE,
      q: next.q || undefined,
      type: next.type || undefined,
      categoryId: next.categoryId || undefined,
      subcategoryId: next.subcategoryId || undefined,
      productId: next.productId || undefined,
      variantTypeId: next.variantTypeId || undefined,
      variantValueId: next.variantValueId || undefined,
      status: next.status || 'active',
    })
    if (!result.success) {
      return rejectWithValue(result.error || 'Failed to load products')
    }
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
    return {
      items: rows.map(mapProduct),
      pagination:
        data.pagination || {
          page: next.page || 1,
          limit: next.limit || PRODUCTS_PAGE_SIZE,
          total: rows.length,
          pageCount: 1,
        },
    }
  },
)

// Parents for bundle picker: singles + variant parents (children loaded on select).
export const loadBundleOptions = createAsyncThunk('products/loadBundleOptions', async () => {
  const collected = []
  let page = 1
  let pageCount = 1
  do {
    const result = await apiClient.get(endpoints.products.list, {
      status: 'active',
      page,
      limit: 50,
    })
    if (!result.success) return []
    const data = result.data || {}
    const rows = Array.isArray(data.items) ? data.items : []
    collected.push(
      ...rows
        .map(mapProduct)
        .filter((row) => row.type !== 'bundle'),
    )
    pageCount = data.pagination?.pageCount || 1
    page += 1
  } while (page <= pageCount)
  return collected
})

export const createProduct = createAsyncThunk(
  'products/create',
  async (fields, { getState, dispatch, rejectWithValue }) => {
    const variantImages = Array.isArray(fields._variantImages) ? fields._variantImages : []
    const { json, image } = splitProductWrite(fields, { withConfirmed: true })
    // Strip client-only keys if present
    delete json._variantImages
    const path =
      fields.type === 'bundle' ? endpoints.products.bundles : endpoints.products.create
    const result = await apiClient.post(path, json)
    if (!result.success) return rejectWithValue(result.error || 'Create failed')

    const product = mapProduct(result.data || {})
    let imageWarning = null
    if (image && product.id) {
      const form = new FormData()
      form.append('image', image)
      const imageResult = await apiClient.patch(endpoints.products.update(product.id), form)
      if (!imageResult.success) {
        imageWarning =
          imageResult.error ||
          'Product created but image upload failed. Edit the product to retry.'
      }
    }

    const variantImageWarning = await uploadVariantImages(
      variantImages,
      product.variants || result.data?.variants || [],
    )
    if (variantImageWarning) imageWarning = imageWarning || variantImageWarning

    const filters = { ...getState().products.filters, page: 1 }
    dispatch(setProductFilters(filters))
    // Refresh list + catalog so filters pick up newly upserted variant types/values
    invalidateProductCatalog()
    void dispatch(loadProductCatalog({ force: true }))
    void dispatch(fetchProducts(filters))
    return { success: true, data: product, imageWarning }
  },
)

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, fields }, { getState, dispatch, rejectWithValue }) => {
    const variantImages = Array.isArray(fields._variantImages) ? fields._variantImages : []
    const { json, image } = splitProductWrite(fields, { withConfirmed: false })
    const patchBody = { ...json }
    delete patchBody.confirmed
    delete patchBody._variantImages
    // Variant parent: don't send dummy purchase/selling (type often omitted on edit)
    if (fields.type === 'variant' || Array.isArray(fields.variants)) {
      delete patchBody.purchasePrice
      delete patchBody.sellingPrice
    }
    const result = await apiClient.patch(endpoints.products.update(id), patchBody)
    if (!result.success) return rejectWithValue(result.error || 'Update failed')
    if (image) {
      const form = new FormData()
      form.append('image', image)
      const imageResult = await apiClient.patch(endpoints.products.update(id), form)
      if (!imageResult.success) {
        return rejectWithValue(
          imageResult.error ||
          'Details saved but image upload failed. Try again from Edit.',
        )
      }
    }

    const savedVariants =
      result.data?.variants ||
      fields.variants?.map((v) => ({ id: v.id, label: v.label })) ||
      []
    const variantImageWarning = await uploadVariantImages(variantImages, savedVariants)
    if (variantImageWarning) {
      return rejectWithValue(variantImageWarning)
    }

    // Refresh list + catalog after custom variant upserts
    invalidateProductCatalog()
    void dispatch(loadProductCatalog({ force: true }))
    void dispatch(fetchProducts(getState().products.filters))
    return { success: true, data: mapProduct(result.data || { id, ...fields }) }
  },
)

export const setProductStatus = createAsyncThunk(
  'products/setStatus',
  async ({ id, status }, { rejectWithValue }) => {
    const result = await apiClient.patch(endpoints.products.update(id), { status })
    if (!result.success) return rejectWithValue(result.error || 'Status update failed')
    return { id, status }
  },
)

export const fetchProductDeleteInfo = createAsyncThunk(
  'products/fetchDeleteInfo',
  async (id, { rejectWithValue }) => {
    const result = await apiClient.get(endpoints.products.deleteInfo(id))
    if (!result.success) return rejectWithValue(result.error || 'Failed to load delete info')
    return result.data || {}
  },
)

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async ({ id, permanent = false }, { getState, dispatch, rejectWithValue }) => {
    const path = permanent
      ? `${endpoints.products.remove(id)}?permanent=true`
      : endpoints.products.remove(id)
    const result = await apiClient.delete(path)
    if (!result.success) return rejectWithValue(result.error || 'Delete failed')
    void dispatch(fetchProducts(getState().products.filters))
    return { success: true, permanent }
  },
)

export const exportProductsCsv = createAsyncThunk(
  'products/exportCsv',
  async (_, { rejectWithValue }) => {
    // Server flat rows (parents + variants + bundle items) → styled Excel
    const result = await apiClient.get(endpoints.products.export)
    if (!result.success) return rejectWithValue(result.error || 'Export failed')
    const rows = Array.isArray(result.data?.rows) ? result.data.rows : []
    if (!rows.length) return rejectWithValue('No products to export')
    const { exported } = exportProductsToStyledExcel(rows)
    return {
      success: true,
      data: {
        exported: result.data?.exported ?? exported,
      },
    }
  },
)

export const importProducts = createAsyncThunk(
  'products/import',
  async (rows, { getState, dispatch, rejectWithValue }) => {
    // Normalize legacy sku → itemCode for API
    const payloadRows = (rows || []).map((row) => ({
      ...row,
      itemCode: row.itemCode || row.sku || undefined,
      sku: row.sku || row.itemCode || undefined,
      quantity: row.quantity ?? row.stockQuantity,
      reorderPoint: row.reorderPoint ?? row.threshold,
    }))
    const result = await apiClient.post(endpoints.products.import, { rows: payloadRows }, { timeoutMs: 300_000 })
    if (!result.success) return rejectWithValue(result.error || 'Import failed')
    const filters = { ...getState().products.filters, page: 1, status: 'all' }
    dispatch(setProductFilters(filters))
    void dispatch(fetchProducts(filters))
    void dispatch(reloadProductCategories())
    return result
  },
)

export const scanBarcode = createAsyncThunk('products/scanBarcode', async (barcode) => {
  return apiClient.post(endpoints.products.scan, { barcode })
})

export const fetchProductDetail = createAsyncThunk(
  'products/fetchDetail',
  async (id, { rejectWithValue }) => {
    const result = await apiClient.get(endpoints.products.detail(id))
    if (!result.success) return rejectWithValue(result.error || 'Not found')
    return { success: true, data: mapProduct(result.data) }
  },
)

export const fetchBarcodePng = createAsyncThunk(
  'products/fetchBarcodePng',
  async (id, { rejectWithValue }) => {
    const token = tokenStorage.getToken()
    const response = await fetch(`${API_BASE_URL}${endpoints.products.barcode(id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) return rejectWithValue(`HTTP ${response.status}`)
    const blob = await response.blob()
    return { success: true, data: URL.createObjectURL(blob) }
  },
)

export const createCategory = createAsyncThunk(
  'products/createCategory',
  async ({ name, parentId, image }, { dispatch, rejectWithValue }) => {
    let body
    if (image instanceof File && image.size > 0) {
      body = new FormData()
      body.append('name', name)
      if (parentId) body.append('parentId', parentId)
      body.append('image', image)
    } else {
      body = { name, ...(parentId ? { parentId } : {}) }
    }
    const path = parentId ? endpoints.products.subcategories : endpoints.products.categories
    const result = await apiClient.post(path, body)
    if (!result.success) return rejectWithValue(result.error || 'Create category failed')
    await dispatch(reloadProductCategories())
    return result
  },
)

export const updateCategory = createAsyncThunk(
  'products/updateCategory',
  async ({ id, name, image }, { dispatch, rejectWithValue }) => {
    let body
    if (image instanceof File && image.size > 0) {
      body = new FormData()
      if (name) body.append('name', name)
      body.append('image', image)
    } else {
      body = { name }
    }
    const result = await apiClient.patch(endpoints.products.category(id), body)
    if (!result.success) return rejectWithValue(result.error || 'Update category failed')
    await dispatch(reloadProductCategories())
    return result
  },
)

export const deleteCategory = createAsyncThunk(
  'products/deleteCategory',
  async (id, { dispatch, rejectWithValue }) => {
    const result = await apiClient.delete(endpoints.products.category(id))
    if (!result.success) return rejectWithValue(result.error || 'Delete category failed')
    // Hard delete — reload catalog so the row disappears
    await dispatch(reloadProductCategories())
    return { ...(result.data || {}), id, deleted: true }
  },
)

export const setCategoryActive = createAsyncThunk(
  'products/setCategoryActive',
  async ({ id, isActive }, { dispatch, rejectWithValue }) => {
    const result = await apiClient.patch(endpoints.products.category(id), { isActive })
    if (!result.success) return rejectWithValue(result.error || 'Status update failed')
    // Patch cache first so UI drops inactive rows before reload settles
    patchCatalogCategoryActive(id, isActive)
    await dispatch(reloadProductCategories())
    return { id, isActive }
  },
)

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProductFilters(state, action) {
      state.filters = action.payload
    },
    patchProductFilters(state, action) {
      const patch = action.payload || {}
      const next = { ...state.filters, ...patch }
      const resetsPage =
        patch.q !== undefined ||
        patch.type !== undefined ||
        patch.categoryId !== undefined ||
        patch.subcategoryId !== undefined ||
        patch.productId !== undefined ||
        patch.variantTypeId !== undefined ||
        patch.variantValueId !== undefined ||
        patch.status !== undefined ||
        patch.limit !== undefined
      if (resetsPage && patch.page === undefined) next.page = 1
      state.filters = next
    },
    clearProductsError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProductCatalog.pending, (state) => {
        if (!state.catalog?.parents?.length) state.catalogLoading = true
      })
      .addCase(loadProductCatalog.fulfilled, (state, action) => {
        state.catalog = action.payload
        state.catalogLoading = false
      })
      .addCase(loadProductCatalog.rejected, (state) => {
        state.catalogLoading = false
      })
      .addCase(reloadProductCategories.fulfilled, (state, action) => {
        state.catalog = action.payload
      })
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.items
        state.pagination = action.payload.pagination
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false
        state.items = []
        state.error = action.payload || action.error.message
      })
      .addCase(loadBundleOptions.pending, (state) => {
        state.bundleOptionsLoading = true
      })
      .addCase(loadBundleOptions.fulfilled, (state, action) => {
        state.bundleOptionsLoading = false
        state.bundleOptions = action.payload
      })
      .addCase(loadBundleOptions.rejected, (state) => {
        state.bundleOptionsLoading = false
        state.bundleOptions = []
      })
      .addCase(createProduct.pending, (state) => {
        state.mutating = true
      })
      .addCase(createProduct.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(createProduct.rejected, (state) => {
        state.mutating = false
      })
      .addCase(updateProduct.pending, (state) => {
        state.mutating = true
      })
      .addCase(updateProduct.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(updateProduct.rejected, (state) => {
        state.mutating = false
      })
      .addCase(setProductStatus.pending, (state) => {
        state.mutating = true
      })
      .addCase(setProductStatus.fulfilled, (state, action) => {
        state.mutating = false
        const { id, status } = action.payload
        const isActive = status !== 'inactive' && status !== 'close'
        const statusFilter = state.filters.status
        const shouldRemove =
          (statusFilter === 'active' && !isActive) ||
          (statusFilter === 'inactive' && isActive)
        if (shouldRemove) {
          state.items = state.items.filter((row) => row.id !== id)
          if (state.pagination.total > 0) state.pagination.total -= 1
        } else {
          state.items = state.items.map((row) => (row.id === id ? { ...row, status } : row))
        }
      })
      .addCase(setProductStatus.rejected, (state) => {
        state.mutating = false
      })
      .addCase(deleteProduct.pending, (state) => {
        state.mutating = true
      })
      .addCase(deleteProduct.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(deleteProduct.rejected, (state) => {
        state.mutating = false
      })
      .addCase(exportProductsCsv.pending, (state) => {
        state.mutating = true
      })
      .addCase(exportProductsCsv.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(exportProductsCsv.rejected, (state) => {
        state.mutating = false
      })
      .addCase(importProducts.pending, (state) => {
        state.mutating = true
      })
      .addCase(importProducts.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(importProducts.rejected, (state) => {
        state.mutating = false
      })
      .addCase(createCategory.pending, (state) => {
        state.mutating = true
      })
      .addCase(createCategory.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(createCategory.rejected, (state) => {
        state.mutating = false
      })
      .addCase(updateCategory.pending, (state) => {
        state.mutating = true
      })
      .addCase(updateCategory.fulfilled, (state) => {
        state.mutating = false
      })
      .addCase(updateCategory.rejected, (state) => {
        state.mutating = false
      })
      .addCase(deleteCategory.pending, (state) => {
        state.mutating = true
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.mutating = false
        // Immediate UI remove from Active filter (soft-delete → isActive false)
        const id = action.payload?.id
        if (id) patchStateCatalogActive(state, id, false)
      })
      .addCase(deleteCategory.rejected, (state) => {
        state.mutating = false
      })
      .addCase(setCategoryActive.pending, (state) => {
        state.mutating = true
      })
      .addCase(setCategoryActive.fulfilled, (state, action) => {
        state.mutating = false
        const { id, isActive } = action.payload || {}
        if (id != null) patchStateCatalogActive(state, id, Boolean(isActive))
      })
      .addCase(setCategoryActive.rejected, (state) => {
        state.mutating = false
      })
  },
})

export const { setProductFilters, patchProductFilters, clearProductsError } =
  productsSlice.actions
export default productsSlice.reducer
