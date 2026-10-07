import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { FieldError } from '@/components/shared/FieldError'
import { PhoneInput } from '@/components/shared/PhoneInput'
import { TimePicker } from '@/components/shared/TimePicker'
import { WorkingDaysPicker } from '@/components/shared/WorkingDaysPicker'
import { BRAND } from '@/lib/constants'
import { displayBranchRef } from '@/lib/formatDisplayId'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { KeyRound, Loader2 } from 'lucide-react'

export function BranchFormDialog({
  open,
  onOpenChange,
  dirty,
  editingBranch,
  formData,
  setFormData,
  fieldErrors,
  formError,
  clearField,
  mutating,
  onSubmit,
}) {
  return (
          <Dialog open={open} onOpenChange={onOpenChange} dirty={dirty}>
            <DialogContent className="max-w-full sm:max-w-xl md:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingBranch ? 'Edit Branch Details' : 'Add New Branch'}</DialogTitle>
                <DialogDescription>
                  {editingBranch
                    ? 'Update branch location and manager profile. Use the key icon on the row to reset password.'
                    : 'Register a new branch. An auto-generated temporary password is emailed to the manager (or logged if SMTP is unset).'}
                </DialogDescription>
              </DialogHeader>

              {formError ? (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              ) : null}

              <form onSubmit={onSubmit} className="space-y-4 pt-2" noValidate>
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                    Branch Details
                  </h5>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="branchId" className="text-xs">
                        Branch ID
                      </Label>
                      <Input
                        id="branchId"
                        value={editingBranch ? displayBranchRef(editingBranch) : formData.id}
                        disabled
                        title={editingBranch?.id || undefined}
                        className="bg-slate-50 font-bold text-purple-900 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="createdAt" className="text-xs">
                        Created Date / Time
                      </Label>
                      <Input
                        id="createdAt"
                        value={formData.createdAt}
                        disabled
                        className="bg-slate-50 text-slate-600 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="branchName" className="text-xs">
                        Name of branch *
                      </Label>
                      <Input
                        id="branchName"
                        placeholder="e.g. Wah Cantt SoftFlux"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value })
                          clearField('name')
                        }}
                        aria-invalid={Boolean(fieldErrors.name)}
                        className={fieldErrorClass(fieldErrors.name)}
                      />
                      <FieldError message={fieldErrors.name} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="branchLocation" className="text-xs">
                        Location *
                      </Label>
                      <Input
                        id="branchLocation"
                        placeholder="e.g. Main GT Road, Wah Cantt"
                        value={formData.location}
                        onChange={(e) => {
                          setFormData({ ...formData, location: e.target.value })
                          clearField('location')
                        }}
                        aria-invalid={Boolean(fieldErrors.location)}
                        className={fieldErrorClass(fieldErrors.location)}
                      />
                      <FieldError message={fieldErrors.location} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="branchOpeningTime" className="text-xs">
                        Opening time
                      </Label>
                      <TimePicker
                        id="branchOpeningTime"
                        value={formData.openingTime}
                        onChange={(e) => {
                          setFormData({ ...formData, openingTime: e.target.value })
                          clearField('openingTime')
                          clearField('closingTime')
                        }}
                        aria-invalid={Boolean(fieldErrors.openingTime)}
                        className={fieldErrorClass(fieldErrors.openingTime)}
                      />
                      <FieldError message={fieldErrors.openingTime} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="branchClosingTime" className="text-xs">
                        Closing time
                      </Label>
                      <TimePicker
                        id="branchClosingTime"
                        value={formData.closingTime}
                        onChange={(e) => {
                          setFormData({ ...formData, closingTime: e.target.value })
                          clearField('openingTime')
                          clearField('closingTime')
                        }}
                        aria-invalid={Boolean(fieldErrors.closingTime)}
                        className={fieldErrorClass(fieldErrors.closingTime)}
                      />
                      <FieldError message={fieldErrors.closingTime} />
                    </div>

                    <p className="text-[11px] text-slate-500 sm:col-span-2">
                      Optional. Same-day window only (opening before closing). Staff shifts must fall inside
                      these hours when set.
                    </p>

                    <div className="space-y-1.5">
                      <Label id="branchWorkingDays" className="text-xs">
                        Working days *
                      </Label>
                      <WorkingDaysPicker
                        value={formData.workingDays}
                        onChange={(days) => {
                          setFormData({ ...formData, workingDays: days })
                          clearField('workingDays')
                        }}
                      />
                      <FieldError message={fieldErrors.workingDays} />
                      <p className="text-[11px] text-slate-500">
                        Staff schedules can only use days within this branch calendar.
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <ImageUploadField
                        id="branchImage"
                        label="Branch image"
                        optionalLabel="(optional)"
                        value={formData.imageFile}
                        existingImageUrl={editingBranch?.image || null}
                        onChange={(file) => setFormData({ ...formData, imageFile: file })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900 border-b border-slate-100 pb-1">
                    Set Branch Manager
                  </h5>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <ImageUploadField
                        id="managerProfileImage"
                        label="Branch manager image"
                        optionalLabel="(optional)"
                        value={formData.managerImageFile}
                        existingImageUrl={editingBranch?.manager?.profileImage || null}
                        onChange={(file) => setFormData({ ...formData, managerImageFile: file })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="mgrName" className="text-xs">
                        Name of branch manager *
                      </Label>
                      <Input
                        id="mgrName"
                        placeholder="e.g. Farhan Ali"
                        value={formData.managerName}
                        onChange={(e) => {
                          setFormData({ ...formData, managerName: e.target.value })
                          clearField('managerName')
                        }}
                        aria-invalid={Boolean(fieldErrors.managerName)}
                        className={fieldErrorClass(fieldErrors.managerName)}
                      />
                      <FieldError message={fieldErrors.managerName} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="mgrEmail" className="text-xs">
                        Email (login) *
                      </Label>
                      <Input
                        id="mgrEmail"
                        type="email"
                        placeholder="e.g. bm.wah@softwareflux.com"
                        value={formData.managerEmail}
                        disabled={Boolean(editingBranch)}
                        onChange={(e) => {
                          if (editingBranch) return
                          setFormData({ ...formData, managerEmail: e.target.value })
                          clearField('managerEmail')
                        }}
                        aria-invalid={Boolean(fieldErrors.managerEmail)}
                        className={
                          editingBranch
                            ? 'bg-slate-50 text-slate-600 text-xs'
                            : fieldErrorClass(fieldErrors.managerEmail)
                        }
                      />
                      <FieldError message={fieldErrors.managerEmail} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="mgrContact" className="text-xs">
                        Contact number *
                      </Label>
                      <PhoneInput
                        id="mgrContact"
                        value={formData.managerContact}
                        onChange={(val) => {
                          setFormData({ ...formData, managerContact: val })
                          clearField('managerContact')
                        }}
                        aria-invalid={Boolean(fieldErrors.managerContact)}
                        className={fieldErrorClass(fieldErrors.managerContact)}
                      />
                      <FieldError message={fieldErrors.managerContact} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="mgrOtherContact" className="text-xs">
                        Other contact number
                      </Label>
                      <PhoneInput
                        id="mgrOtherContact"
                        value={formData.managerOtherContact}
                        onChange={(val) => {
                          setFormData({ ...formData, managerOtherContact: val })
                          clearField('managerOtherContact')
                        }}
                        aria-invalid={Boolean(fieldErrors.managerOtherContact)}
                        className={fieldErrorClass(fieldErrors.managerOtherContact)}
                      />
                      <FieldError message={fieldErrors.managerOtherContact} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="mgrGender" className="text-xs">
                        Gender
                      </Label>
                      <NativeSelect
                        id="mgrGender"
                        value={formData.managerGender}
                        onChange={(e) => setFormData({ ...formData, managerGender: e.target.value })}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </NativeSelect>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="mgrAddress" className="text-xs">
                        Address
                      </Label>
                      <Input
                        id="mgrAddress"
                        placeholder="e.g. House 12, Sector C, Wah Cantt"
                        value={formData.managerAddress}
                        onChange={(e) => setFormData({ ...formData, managerAddress: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {!editingBranch ? (
                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs text-purple-900 flex items-start gap-2">
                    <KeyRound className="size-4 shrink-0 text-purple-700 mt-0.5" />
                    <span>
                      Password is auto-generated and emailed to the manager. If the email succeeds, you are done. If
                      email fails, a key icon appears on the row so you can reset &amp; resend credentials.
                    </span>
                  </div>
                ) : null}

                <DialogFooter className="pt-3">
                  <DialogCancelButton disabled={mutating} />
                  <Button
                    type="submit"
                    disabled={mutating}
                    className="text-white font-semibold"
                    style={{ background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})` }}
                  >
                    {mutating ? (
                      <>
                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                        Saving…
                      </>
                    ) : editingBranch ? (
                      'Save Changes'
                    ) : (
                      'Save'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
  )
}
