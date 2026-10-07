import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { formatOfferOptionLabel, promoFromOfferId } from '@/lib/addItem'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'

const EMPTY_BULK = {
  purchasePrice: '',
  sellingPrice: '',
  openingStock: '',
  lowStockThreshold: '',
  offerId: '',
}

function offerPatchFromId(offerId, offers) {
  const promo = promoFromOfferId(offerId, offers)
  return {
    offerId: offerId || '',
    discountPercent:
      promo.discountPercent == null ? '' : String(promo.discountPercent),
  }
}

// Editable matrix — row select + bulk Apply (all / selected)
// stockMode: 'create' | 'edit' — edit locks stock on existing rows (Control owns qty)
export function CombinationTable({
  rows = [],
  onChangeRow,
  selectedKeys = [],
  onSelectedKeysChange,
  stockMode = 'create',
  offers = [],
}) {
  const [bulk, setBulk] = useState(EMPTY_BULK)
  const isEdit = stockMode === 'edit'

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const allKeys = useMemo(() => rows.map((r) => r.key), [rows])
  const allSelected = rows.length > 0 && selectedKeys.length === rows.length
  const someSelected = selectedKeys.length > 0
  const applyLabel = someSelected ? 'Apply to selected' : 'Apply to all rows'

  function toggleOne(key) {
    if (selectedSet.has(key)) {
      onSelectedKeysChange?.(selectedKeys.filter((k) => k !== key))
    } else {
      onSelectedKeysChange?.([...selectedKeys, key])
    }
  }

  function toggleAll() {
    onSelectedKeysChange?.(allSelected ? [] : allKeys)
  }

  function patchBulk(field, value) {
    setBulk((prev) => ({ ...prev, [field]: value }))
  }

  function handleApply() {
    const patch = {}
    if (bulk.purchasePrice !== '') patch.purchasePrice = bulk.purchasePrice
    if (bulk.sellingPrice !== '') patch.sellingPrice = bulk.sellingPrice
    if (bulk.openingStock !== '') patch.openingStock = bulk.openingStock
    if (bulk.lowStockThreshold !== '') patch.lowStockThreshold = bulk.lowStockThreshold
    if (bulk.offerId === '__none__') Object.assign(patch, offerPatchFromId('', offers))
    else if (bulk.offerId) Object.assign(patch, offerPatchFromId(bulk.offerId, offers))
    if (!Object.keys(patch).length) return

    const targets = someSelected ? selectedKeys : allKeys
    for (const key of targets) {
      const row = rows.find((r) => r.key === key)
      const rowPatch = { ...patch }
      // Existing SKUs: stock is Control-only
      if (isEdit && row?.productId && 'openingStock' in rowPatch) {
        delete rowPatch.openingStock
      }
      if (Object.keys(rowPatch).length) onChangeRow?.(key, rowPatch)
    }
  }

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Select variant types and values first — combinations will appear here.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white px-3 py-3 shadow-sm">
        <p className="mb-1.5 text-sm font-semibold text-slate-800 whitespace-nowrap">
          {applyLabel}:
        </p>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Purchase</Label>
          <WholeNumberInput
            min={0}
            value={bulk.purchasePrice}
            onChange={(e) => patchBulk('purchasePrice', e.target.value)}
            className="h-9 w-28"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Selling</Label>
          <WholeNumberInput
            min={0}
            value={bulk.sellingPrice}
            onChange={(e) => patchBulk('sellingPrice', e.target.value)}
            className="h-9 w-28"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">
            {isEdit ? 'Stock (new only)' : 'Stock'}
          </Label>
          <WholeNumberInput
            min={0}
            value={bulk.openingStock}
            onChange={(e) => patchBulk('openingStock', e.target.value)}
            className="h-9 w-24"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Threshold</Label>
          <WholeNumberInput
            min={0}
            value={bulk.lowStockThreshold}
            onChange={(e) => patchBulk('lowStockThreshold', e.target.value)}
            className="h-9 w-24"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-slate-500">Discount / Offer</Label>
          <NativeSelect
            value={bulk.offerId}
            onChange={(e) => patchBulk('offerId', e.target.value)}
            className="h-9 min-w-[10rem]"
          >
            <option value="">— leave unchanged —</option>
            <option value="__none__">No discount</option>
            {(offers || []).map((offer) => (
              <option key={offer.id} value={offer.id}>
                {formatOfferOptionLabel(offer)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          style={{ color: BRAND.deep, borderColor: BRAND.purple }}
          onClick={handleApply}
        >
          Apply
        </Button>
        {someSelected ? (
          <p className="mb-1.5 text-[11px] text-slate-400">{selectedKeys.length} selected</p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-[1120px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={toggleAll}
                  aria-label="Select all combinations"
                />
              </th>
              <th className="px-3 py-2.5 font-semibold">Combination</th>
              <th className="px-3 py-2.5 font-semibold">SKU</th>
              <th className="px-3 py-2.5 font-semibold">Barcode</th>
              <th className="px-3 py-2.5 font-semibold">Purchase</th>
              <th className="px-3 py-2.5 font-semibold">Selling</th>
              <th className="px-3 py-2.5 font-semibold">Discount / Offer</th>
              <th className="px-3 py-2.5 font-semibold">Stock</th>
              <th className="px-3 py-2.5 font-semibold">Threshold</th>
              <th className="px-3 py-2.5 font-semibold">Daily price</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const inactive = row.status === 'inactive'
              const checked = selectedSet.has(row.key)
              const stockLocked = isEdit && Boolean(row.productId)
              return (
                <tr
                  key={row.key}
                  className={cn(
                    'border-b border-border/70',
                    inactive && 'bg-slate-50/80 opacity-80',
                    checked && 'bg-violet-50/40',
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={checked}
                      onChange={() => toggleOne(row.key)}
                      aria-label={`Select ${row.label}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                    {row.label}
                    {isEdit && !row.productId ? (
                      <span className="ml-1.5 text-[10px] font-semibold text-violet-600">NEW</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {isEdit && row.productId && row.sku ? (
                      <Input
                        value={row.sku}
                        disabled
                        className="h-8 min-w-[120px] bg-slate-50 font-mono text-xs text-slate-600"
                        title="System-owned item code"
                      />
                    ) : (
                      <Input
                        value=""
                        disabled
                        placeholder="System auto-generated"
                        className="h-8 min-w-[120px] bg-slate-50 font-mono text-xs text-slate-500"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEdit && row.productId && row.barcode ? (
                      <Input
                        value={row.barcode}
                        disabled
                        className="h-8 min-w-[110px] bg-slate-50 font-mono text-xs text-slate-600"
                        title="System-owned barcode"
                      />
                    ) : (
                      <Input
                        value=""
                        disabled
                        placeholder="System auto-generated"
                        className="h-8 min-w-[110px] bg-slate-50 font-mono text-xs text-slate-500"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <WholeNumberInput
                      min={0}
                      value={row.purchasePrice}
                      disabled={inactive}
                      onChange={(e) => onChangeRow?.(row.key, { purchasePrice: e.target.value })}
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <WholeNumberInput
                      min={0}
                      value={row.sellingPrice}
                      disabled={inactive}
                      onChange={(e) => onChangeRow?.(row.key, { sellingPrice: e.target.value })}
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <NativeSelect
                      value={row.offerId || ''}
                      disabled={inactive}
                      onChange={(e) =>
                        onChangeRow?.(row.key, offerPatchFromId(e.target.value, offers))
                      }
                      className="h-8 min-w-[9.5rem]"
                    >
                      {!offers.length ? (
                        <option value="">No Discount/Offer Available</option>
                      ) : (
                        <>
                          <option value="">No Discount</option>
                          {offers.map((offer) => (
                            <option key={offer.id} value={offer.id}>
                              {formatOfferOptionLabel(offer)}
                            </option>
                          ))}
                        </>
                      )}
                      {row.offerId && !offers.some((o) => o.id === row.offerId) ? (
                        <option value={row.offerId}>
                          {row.offerName || `Current · ${row.discountPercent || ''}%`}
                        </option>
                      ) : null}
                    </NativeSelect>
                  </td>
                  <td className="px-3 py-2">
                    {stockLocked ? (
                      <span
                        className="inline-flex h-8 min-w-[4.5rem] items-center px-2 font-mono text-xs text-slate-600"
                        title="Change stock in Inventory Control"
                      >
                        {row.openingStock === '' || row.openingStock == null
                          ? '0'
                          : String(row.openingStock)}
                      </span>
                    ) : (
                      <WholeNumberInput
                        min={0}
                        value={row.openingStock}
                        disabled={inactive}
                        onChange={(e) => onChangeRow?.(row.key, { openingStock: e.target.value })}
                        className="h-8 w-20"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <WholeNumberInput
                      min={0}
                      value={row.lowStockThreshold}
                      disabled={inactive}
                      onChange={(e) =>
                        onChangeRow?.(row.key, { lowStockThreshold: e.target.value })
                      }
                      className="h-8 w-20"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(row.dailyPriceChange)}
                        disabled={inactive}
                        onChange={(e) =>
                          onChangeRow?.(row.key, { dailyPriceChange: e.target.checked })
                        }
                      />
                      On
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className={cn(
                        'cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        row.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-200 text-slate-600',
                      )}
                      onClick={() =>
                        onChangeRow?.(row.key, {
                          status: row.status === 'active' ? 'inactive' : 'active',
                        })
                      }
                    >
                      {row.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="border-t border-border bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          {isEdit
            ? 'SKU & barcode are system-owned. Existing stock is read-only (use Control). New combinations get codes on save. Active rows need purchase & selling.'
            : 'SKU & barcode are system auto-generated on save. Tick rows for “Apply to selected”, or leave none selected to apply to all. Active rows need purchase & selling.'}
        </p>
      </div>
    </div>
  )
}

/** Tax % / Profit % — pre-filled from Admin defaults on create; editable override. */
export function TaxProfitFields({ form, patch, idPrefix = 'item' }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-tax`}>Tax %</Label>
        <WholeNumberInput
          id={`${idPrefix}-tax`}
          min={0}
          max={100}
          value={form.taxPercent}
          onChange={(e) => patch('taxPercent', e.target.value)}
        />
        <p className="text-[11px] text-slate-400">
          Pre-filled from Admin defaults — change to override for this product only.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-profit`}>Profit %</Label>
        <WholeNumberInput
          id={`${idPrefix}-profit`}
          min={0}
          max={100}
          value={form.profitPercent}
          onChange={(e) => patch('profitPercent', e.target.value)}
        />
        <p className="text-[11px] text-slate-400">
          Pre-filled from Admin defaults — change to override for this product only.
        </p>
      </div>
    </>
  )
}

export function NormalProductFields({ form, patch, stockMode = 'create', offers = [] }) {
  const stockLocked = stockMode === 'edit'
  const isEdit = stockMode === 'edit'
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="normal-sku">SKU / Item code</Label>
        <Input
          id="normal-sku"
          value={isEdit ? form.sku || '—' : ''}
          disabled
          placeholder="System auto-generated on create"
          className="bg-slate-50 font-mono text-slate-500"
        />
        {!isEdit ? (
          <p className="text-[11px] text-slate-400">
            System-owned — assigned automatically when you create the product.
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="normal-barcode">Barcode</Label>
        <Input
          id="normal-barcode"
          value={isEdit ? form.barcode || '—' : ''}
          disabled
          placeholder="System auto-generated on create"
          className="bg-slate-50 font-mono text-slate-500"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="normal-purchase">Purchase price</Label>
        <WholeNumberInput
          id="normal-purchase"
          min={0}
          value={form.purchasePrice}
          onChange={(e) => patch('purchasePrice', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="normal-selling">Selling price</Label>
        <WholeNumberInput
          id="normal-selling"
          min={0}
          value={form.sellingPrice}
          onChange={(e) => patch('sellingPrice', e.target.value)}
        />
      </div>
      <TaxProfitFields form={form} patch={patch} idPrefix="normal" />
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="normal-discount-offer">Discount / Offer</Label>
        <NativeSelect
          id="normal-discount-offer"
          value={form.offerId || ''}
          onChange={(e) => patch(offerPatchFromId(e.target.value, offers))}
        >
          {!offers.length ? (
            <option value="">No Discount/Offer Available</option>
          ) : (
            <>
              <option value="">No Discount</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {formatOfferOptionLabel(offer)}
                </option>
              ))}
            </>
          )}
          {form.offerId && !offers.some((o) => o.id === form.offerId) ? (
            <option value={form.offerId}>
              {form.offerName || `Current · ${form.discountPercent || ''}%`}
            </option>
          ) : null}
        </NativeSelect>
        {!offers.length ? (
          <p className="text-[11px] text-slate-400">No discount or offer configured yet.</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="normal-stock">{stockLocked ? 'Current stock' : 'Opening stock'}</Label>
        {stockLocked ? (
          <Input
            id="normal-stock"
            value={String(form.openingStock ?? '0')}
            disabled
            className="font-mono"
            title="Change stock in Inventory Control"
          />
        ) : (
          <WholeNumberInput
            id="normal-stock"
            min={0}
            value={form.openingStock}
            onChange={(e) => patch('openingStock', e.target.value)}
          />
        )}
        {stockLocked ? (
          <p className="text-[11px] text-slate-400">Managed in Inventory Control (Stock In / Out).</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="normal-threshold">Low stock threshold</Label>
        <WholeNumberInput
          id="normal-threshold"
          min={0}
          value={form.lowStockThreshold}
          onChange={(e) => patch('lowStockThreshold', e.target.value)}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(form.dailyPriceChange)}
            onChange={(e) => patch('dailyPriceChange', e.target.checked)}
          />
          Daily price changes
        </label>
      </div>
      {stockMode === 'edit' ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Status</Label>
          <div className="flex gap-2">
            {['active', 'inactive'].map((s) => {
              const on = (form.status || 'active') === s
              return (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    'cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold capitalize',
                    on ? 'text-white' : 'bg-slate-100 text-slate-600',
                  )}
                  style={on ? { background: BRAND.purple } : undefined}
                  onClick={() => patch('status', s)}
                >
                  {s === 'active' ? 'Active' : 'Inactive'}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
