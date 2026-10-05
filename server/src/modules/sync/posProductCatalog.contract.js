/**
 * FluxOne-POS product catalog contract (bootstrap + delta)
 *
 * Snapshot path: data.products[]
 *
 * Common fields (all types):
 *   id, name, itemCode, sku (alias), barcode, type ('single' | 'bundle' | 'variant'),
 *   scale, sellingPrice, price (alias), priceCurrency, currency, discountPercent,
 *   status, isActive (derived), imageUrl, description, categoryId, subcategoryId,
 *   branchId, offerId, taxIds[], bundleItems[], variantOptions[],
 *   parentId, variantLabel, updatedAt
 *
 * Stock quantity lives in data.branchInventory[] (productId + quantity), not on the product row.
 *
 * Variant model:
 *   - Parent: type=variant, parentId=null, variantLabel usually null, variantOptions=[].
 *   - Child SKU: type=single (sellable), parentId=<parent uuid>, variantLabel human label,
 *     variantOptions=[{ typeName, valueName, sortOrder, isCustomType?, isCustomValue? }].
 *   - Sale lines use child product ids (or single/bundle ids as today).
 *
 * Users: data.users[] remains branch_manager + cashier only (see posOfflineAuth.contract.js).
 * inventory_manager is never in users[].
 */

export const POS_PRODUCT_CATALOG_FIELDS = Object.freeze({
  list: 'products',
  inventory: 'branchInventory',
  parentId: 'parentId',
  variantLabel: 'variantLabel',
  variantOptions: 'variantOptions',
})

/**
 * Example shapes (illustrative UUIDs):
 *
 * Single:
 * { "id": "...", "type": "single", "parentId": null, "variantLabel": null,
 *   "variantOptions": [], "sku": "SKU-001", "price": 100, "bundleItems": [] }
 *
 * Bundle:
 * { "id": "...", "type": "bundle", "parentId": null,
 *   "bundleItems": [{ "itemId": "...", "quantity": 2 }], "variantOptions": [] }
 *
 * Variant parent:
 * { "id": "...", "type": "variant", "parentId": null, "variantOptions": [] }
 *
 * Variant child (sellable):
 * { "id": "...", "type": "single", "parentId": "<parent-id>", "variantLabel": "Red / M",
 *   "variantOptions": [{ "typeName": "Color", "valueName": "Red", "sortOrder": 0 }] }
 */
