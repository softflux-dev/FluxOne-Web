// Build variant type → values map from product variant combination rows.
export function deriveVariantAxes(variants = []) {
  const typeMap = new Map()
  for (const variant of variants) {
    for (const part of variant.parts || []) {
      const typeId = part.variantTypeId || part.typeId
      if (!typeId) continue
      if (!typeMap.has(typeId)) {
        typeMap.set(typeId, {
          id: typeId,
          name: part.typeName || 'Variant type',
          values: new Map(),
        })
      }
      const bucket = typeMap.get(typeId)
      const valueId = part.variantValueId || part.valueId
      if (valueId && !bucket.values.has(valueId)) {
        bucket.values.set(valueId, {
          id: valueId,
          name: part.valueName || 'Value',
        })
      }
    }
  }
  return [...typeMap.values()].map((type) => ({
    id: type.id,
    name: type.name,
    values: [...type.values.values()],
  }))
}
