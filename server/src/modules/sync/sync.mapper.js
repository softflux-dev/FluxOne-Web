// Dual cloud + POS field names for bootstrap/delta responses.
//
// FluxOne-POS invoice slip policies:
// See ./posSlipPolicies.contract.js — after sync, print company.slipPolicies
// (or returnInstructions fallback) on the sale receipt footer.
//
// FluxOne-POS offline login:
// See ./posOfflineAuth.contract.js + POS_OFFLINE_AUTH_REPORT.md
//
// Product / variant catalog:
// See ./posProductCatalog.contract.js

import {
  POS_SLIP_POLICY_FIELDS,
  resolveSlipPoliciesForPrint,
  formatSlipPolicyPrintLines,
} from './posSlipPolicies.contract.js'
import { POS_OFFLINE_AUTH_FIELDS } from './posOfflineAuth.contract.js'

export {
  POS_SLIP_POLICY_FIELDS,
  resolveSlipPoliciesForPrint,
  formatSlipPolicyPrintLines,
  POS_OFFLINE_AUTH_FIELDS,
}

function mapUser(user) {
  // bcrypt hash for offline POS login — never plaintext. See posOfflineAuth.contract.js
  const passwordHash = user.passwordHash || user.password_hash || null
  return {
    id: user.id,
    loginId: user.loginId,
    email: user.loginId,
    role: user.role,
    fullName: user.fullName,
    name: user.fullName,
    branchId: user.branchId,
    tenantId: user.tenantId,
    isActive: user.isActive,
    passwordHash,
    // Alias some POS builds expect
    password: passwordHash,
  }
}

function mapProduct(product) {
  const isActive = product.status === 'active'
  return {
    ...product,
    sku: product.itemCode,
    price: product.sellingPrice,
    currency: product.priceCurrency || product.currency || null,
    isActive,
    // Variant fields — additive; see posProductCatalog.contract.js
    parentId: product.parentId ?? null,
    variantLabel: product.variantLabel ?? null,
    variantOptions: Array.isArray(product.variantOptions) ? product.variantOptions : [],
  }
}

function mapTax(tax) {
  return {
    ...tax,
    rate: tax.ratePercent,
  }
}

function flattenProductTaxes(products) {
  const productTaxes = []
  for (const product of products) {
    for (const taxId of product.taxIds || []) {
      productTaxes.push({ productId: product.id, taxId })
    }
  }
  return productTaxes
}

export function mapSnapshotForPos(snapshot) {
  const users = (snapshot.users || []).map(mapUser)
  const products = (snapshot.products || []).map(mapProduct)
  const taxes = (snapshot.taxes || []).map(mapTax)
  const productTaxes = flattenProductTaxes(products)

  // Enabled Admin policies for POS receipt footer (FluxOne-POS must print these)
  const slipPolicies = Array.isArray(snapshot.company?.slipPolicies)
    ? snapshot.company.slipPolicies
    : snapshot.policies || []

  const company = snapshot.company
    ? {
        ...snapshot.company,
        phone: snapshot.company.contactPhone ?? snapshot.company.phone ?? null,
        address: snapshot.company.address ?? null,
        slipPolicies,
      }
    : snapshot.company

  return {
    ...snapshot,
    users,
    products,
    taxes,
    productTaxes,
    policies: slipPolicies,
    company,
  }
}
