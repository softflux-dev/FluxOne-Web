import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DeleteEntityDialog } from '@/components/shared/DeleteEntityDialog'
import { Ban, Unlock } from 'lucide-react'

export function BranchConfirmDialogs({
  confirmStatusOpen,
  setConfirmStatusOpen,
  targetBranch,
  resetDialogOpen,
  setResetDialogOpen,
  resetTarget,
  deleteTarget,
  setDeleteTarget,
  deleteShowSoft,
  deleteCanHard,
  deleteHasStaff,
  mutating,
  onConfirmToggleStatus,
  onConfirmResetPassword,
  onSoftDelete,
  onHardDelete,
}) {
  return (
    <>
            <ConfirmDialog
              open={confirmStatusOpen}
              onOpenChange={setConfirmStatusOpen}
              title={
                targetBranch?.status === 'open' ? 'Block Branch Access' : 'Open & Activate Branch'
              }
              description={
                targetBranch?.status === 'open' ? (
                  <>
                    Are you sure you want to block <strong>&quot;{targetBranch?.name}&quot;</strong>?
                    <br />
                    All users of this branch (manager, inventory, cashier, and other roles) will be
                    unable to log in on web and desktop until the branch is opened again. Data is kept.
                  </>
                ) : (
                  <>
                    Are you sure you want to open and activate <strong>&quot;{targetBranch?.name}&quot;</strong>?
                    <br />
                    Branch users who were active before the block will be able to log in again.
                  </>
                )
              }
              confirmLabel={targetBranch?.status === 'open' ? 'Yes, Block Branch' : 'Yes, Open Branch'}
              // Block uses Ban (not trash); open uses Unlock
              icon={targetBranch?.status === 'open' ? Ban : Unlock}
              variant={targetBranch?.status === 'open' ? 'destructive' : 'success'}
              loading={mutating}
              onConfirm={onConfirmToggleStatus}
            />

            <ConfirmDialog
              open={resetDialogOpen}
              onOpenChange={setResetDialogOpen}
              title="Reset manager password"
              description={
                <>
                  Credentials email did not go through for{' '}
                  <strong>{resetTarget?.manager?.email || 'this branch manager'}</strong>. Generate a new
                  temporary password and try sending again. Their previous password will stop working
                  immediately.
                </>
              }
              confirmLabel="Reset & send"
              variant="default"
              loading={mutating}
              onConfirm={onConfirmResetPassword}
            />

            <DeleteEntityDialog
              open={Boolean(deleteTarget)}
              onOpenChange={(open) => {
                if (!open) setDeleteTarget(null)
              }}
              entityName={deleteTarget?.name}
              title={deleteTarget ? `Remove “${deleteTarget.name}”?` : 'Remove branch?'}
              description={
                deleteTarget ? (
                  <>
                    Permanently remove <strong>{deleteTarget.name}</strong> and its branch manager login?
                    Prefer <strong>Block</strong> if you only want to stop access — sales and staff history stay
                    intact.
                  </>
                ) : null
              }
              softLabel="Block branch"
              softHint="Recommended when the branch has (or may have) staff, sales, or inventory history."
              hardLabel="Permanently delete"
              hardHint="Only use when this outlet was created by mistake and has no linked staff."
              showSoftAction={deleteShowSoft}
              canHardDelete={deleteCanHard}
              hardDisabledReason={
                deleteHasStaff
                  ? `This branch has ${deleteTarget.totalStaff} staff member(s). Block it instead of permanent delete.`
                  : 'Permanent delete is unavailable while linked records may exist.'
              }
              loading={mutating}
              onSoftDelete={onSoftDelete}
              onHardDelete={onHardDelete}
            />
    </>
  )
}
