//
// Shared parent/child list filter for Categories + Variant Management.
// Status: all | active | inactive. Search matches parent name or any child name.
//
export function filterParentChildRows(rows, statusFilter = 'all', query = '') {
  const list = Array.isArray(rows) ? rows : []

  let next = list
  if (statusFilter === 'active') {
    next = list
      .filter((row) => row.isActive !== false)
      .map((row) => ({
        ...row,
        children: (row.children || []).filter((child) => child.isActive !== false),
      }))
  } else if (statusFilter === 'inactive') {
    next = list
      .map((row) => {
        const inactiveChildren = (row.children || []).filter(
          (child) => child.isActive === false,
        )
        if (row.isActive === false) {
          return { ...row, children: inactiveChildren }
        }
        if (inactiveChildren.length > 0) {
          return { ...row, children: inactiveChildren }
        }
        return null
      })
      .filter(Boolean)
  }

  const needle = String(query || '')
    .trim()
    .toLowerCase()
  if (!needle) return next

  // Parent name hit keeps all (status-filtered) children; else only matching children.
  return next
    .map((row) => {
      const parentHit = String(row.name || '')
        .toLowerCase()
        .includes(needle)
      const matchedChildren = (row.children || []).filter((child) =>
        String(child.name || '')
          .toLowerCase()
          .includes(needle),
      )
      if (parentHit) return row
      if (matchedChildren.length) return { ...row, children: matchedChildren }
      return null
    })
    .filter(Boolean)
}

//
// Flatten parent rows → child rows for the “children” tab table.
//
export function flattenParentChildRows(parentRows) {
  const list = Array.isArray(parentRows) ? parentRows : []
  const flat = []
  for (const parent of list) {
    for (const child of parent.children || []) {
      flat.push({
        ...child,
        parentId: child.parentId ?? parent.id,
        parentName: parent.name,
        parentIsActive: parent.isActive,
        _rawParent: parent._raw ?? parent,
      })
    }
  }
  return flat
}

//
// Filter flat child rows (status, search, optional parent id).
//
export function filterFlatChildRows(
  flatRows,
  statusFilter = 'all',
  query = '',
  parentFilterId = 'all',
) {
  let next = Array.isArray(flatRows) ? flatRows : []

  if (parentFilterId && parentFilterId !== 'all') {
    next = next.filter(
      (row) => String(row.parentId) === String(parentFilterId),
    )
  }

  if (statusFilter === 'active') {
    next = next.filter((row) => row.isActive !== false)
  } else if (statusFilter === 'inactive') {
    next = next.filter((row) => row.isActive === false)
  }

  const needle = String(query || '')
    .trim()
    .toLowerCase()
  if (!needle) return next

  return next.filter((row) => {
    const nameHit = String(row.name || '')
      .toLowerCase()
      .includes(needle)
    const parentHit = String(row.parentName || '')
      .toLowerCase()
      .includes(needle)
    return nameHit || parentHit
  })
}
