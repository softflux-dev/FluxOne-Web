import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BRAND } from '@/lib/constants'
import { Settings } from 'lucide-react'

export function TaxProfitDefaultsDialog({
  open,
  onOpenChange,
  defaultTaxValue,
  setDefaultTaxValue,
  defaultProfitValue,
  setDefaultProfitValue,
  mutating,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-4 text-purple-600" />
            Set Default Tax & Profit
          </DialogTitle>
          <DialogDescription>
            Configure the default Tax % and Profit % for newly created products only.
            Existing products keep their current Tax % and Profit % values.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="defaultTaxInput" className="text-xs font-semibold">
              Default Tax %
            </Label>
            <WholeNumberInput
              id="defaultTaxInput"
              min={0}
              max={100}
              value={defaultTaxValue}
              onChange={(e) => setDefaultTaxValue(e.target.value)}
              placeholder="Enter tax percentage"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="defaultProfitInput" className="text-xs font-semibold">
              Default Profit %
            </Label>
            <WholeNumberInput
              id="defaultProfitInput"
              min={0}
              max={100}
              value={defaultProfitValue}
              onChange={(e) => setDefaultProfitValue(e.target.value)}
              placeholder="Enter profit percentage"
              required
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutating}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutating}
              className="text-white font-semibold text-xs cursor-pointer shadow-xs"
              style={{ background: BRAND.purple }}
            >
              {mutating ? 'Saving…' : 'Set Default'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TaxProfitBulkProfitDialog({
  open,
  onOpenChange,
  selectedCount,
  bulkProfitValue,
  setBulkProfitValue,
  mutating,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Profit Margin Percentage</DialogTitle>
          <DialogDescription>
            Apply a standardized profit percentage to {selectedCount} selected items
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="profitInput" className="text-xs font-semibold">
              Profit Margin (%)
            </Label>
            <WholeNumberInput
              id="profitInput"
              min={0}
              max={100}
              value={bulkProfitValue}
              onChange={(e) => setBulkProfitValue(e.target.value)}
              placeholder="e.g. 25"
              required
            />
            <p className="text-[11px] text-slate-500">
              Selling price is recalculated from purchase cost + profit % + tax % on cost.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutating}
              className="text-white font-semibold"
              style={{ background: BRAND.purple }}
            >
              {mutating ? 'Applying…' : 'Apply Profit %'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TaxProfitBulkTaxDialog({
  open,
  onOpenChange,
  selectedCount,
  bulkTaxValue,
  setBulkTaxValue,
  mutating,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Sales Tax Percentage</DialogTitle>
          <DialogDescription>
            Apply tax rate or exemption to {selectedCount} selected items
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="taxInput" className="text-xs font-semibold">
              Tax Percentage (%)
            </Label>
            <WholeNumberInput
              id="taxInput"
              min={0}
              max={100}
              value={bulkTaxValue}
              onChange={(e) => setBulkTaxValue(e.target.value)}
              placeholder="e.g. 5"
              required
            />
            <p className="text-[11px] text-slate-500">
              Enter 0 for tax-exempt essentials. Non-zero rates find or create a matching company tax.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutating}
              className="text-white font-semibold"
              style={{ background: BRAND.deep }}
            >
              {mutating ? 'Applying…' : 'Apply Tax %'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
