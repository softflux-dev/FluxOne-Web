import {
  emptyCatalog,
  emptyCatalogDefaults,
} from '@/lib/productCatalogCache'

// Shared helper — normalize RTK thunk results for hooks / UI
export function asResult(promise) {
  return promise
    .then((data) => {
      if (data && typeof data === 'object' && 'success' in data) return data
      return { success: true, data }
    })
    .catch((err) => ({
      success: false,
      error: typeof err === 'string' ? err : err?.message || 'Request failed',
    }))
}

// Rebuild Map for UI code that calls childrenByParent.get(...)
export function catalogForUi(catalog) {
  if (!catalog) {
    return emptyCatalog({ childrenAsMap: true })
  }
  const raw = catalog.childrenByParent
  const childrenByParent =
    raw instanceof Map ? raw : new Map(Object.entries(raw || {}))
  return {
    parents: catalog.parents || [],
    childrenByParent,
    all: catalog.all || [],
    taxes: catalog.taxes || [],
    offers: catalog.offers || [],
    defaults: emptyCatalogDefaults(catalog.defaults),
  }
}

// Inventory control + product forms — active categories/subcategories only.
export function catalogActiveOnly(catalog) {
  const ui = catalogForUi(catalog)
  const parents = (ui.parents || []).filter((row) => row.isActive !== false)
  const childrenByParent = new Map()

  for (const parent of parents) {
    const children = (ui.childrenByParent.get(parent.id) || []).filter(
      (row) => row.isActive !== false,
    )
    childrenByParent.set(parent.id, children)
  }

  return {
    ...ui,
    parents,
    childrenByParent,
  }
}
