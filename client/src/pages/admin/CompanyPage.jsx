import { useEffect, useMemo, useState } from 'react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { ImageUploadField } from '@/components/shared/ImageUploadField'
import { FieldError } from '@/components/shared/FieldError'
import { SlowLoadingBanner, useSlowLoadingHint } from '@/components/shared/SlowLoadingBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PhoneInput } from '@/components/shared/PhoneInput'
import { PoliciesTable } from '@/components/feature/admin/company/PoliciesTable'
import { useAdminCompany } from '@/hooks/useAdminCompany'
import { useAdminPolicies } from '@/hooks/useAdminPolicies'
import { BRAND } from '@/lib/constants'
import { referenceFromUuid } from '@/lib/formatDisplayId'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  validateEmail,
  validatePhone,
  validateUrl,
} from '@/lib/validation/formValidators'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/useFieldErrors'
import { useFormBaseline } from '@/hooks/useFormBaseline'

const COMPANY_FIELD_IDS = {
  name: 'companyName',
  contactNumbers: 'contacts',
  whatsappNumber: 'whatsapp',
  facebookUrl: 'facebook',
  instagramUrl: 'instagram',
  supportEmail: 'supportEmail',
}

const COMPANY_FIELD_ORDER = [
  'name',
  'contactNumbers',
  'whatsappNumber',
  'supportEmail',
  'facebookUrl',
  'instagramUrl',
]

const POLICY_FIELD_IDS = { name: 'polName', detail: 'polDetail' }
const POLICY_FIELD_ORDER = ['name', 'detail']
import {
  Building2,
  Phone,
  MessageCircle,
  FileCheck,
  ShieldAlert,
  Plus,
  Search,
  Save,
  FileText,
  Store,
  MapPin,
  Mail,
  Loader2,
} from 'lucide-react'
import { FacebookIcon, InstagramIcon } from '@/components/shared/BrandIcons'

// Default policy types for Policies & Governance (TC-002F)
const POLICY_TYPES = ['Return', 'Refund', 'Exchange', 'Wholesale']
const DEFAULT_POLICY_TYPE = 'Return'
const CATEGORIES = ['all', ...POLICY_TYPES]
const POLICY_TYPE_OPTIONS = POLICY_TYPES

// Map legacy category labels → current policy types
const LEGACY_POLICY_TYPE_MAP = {
  'Return Operations': 'Return',
  'Refund Operations': 'Refund',
  'Exchange Operations': 'Exchange',
  'Wholesale Operations': 'Wholesale',
  'Retail Operations': 'Return',
  'Finance & Billing': 'Refund',
}

function normalizePolicyType(value) {
  if (!value) return DEFAULT_POLICY_TYPE
  if (POLICY_TYPES.includes(value)) return value
  return LEGACY_POLICY_TYPE_MAP[value] || DEFAULT_POLICY_TYPE
}

const CATEGORY_CONFIG = {
  Return: {
    icon: Store,
    accentBorder: 'border-l-purple-600',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconBg: 'bg-purple-50 text-purple-700',
  },
  Refund: {
    icon: Building2,
    accentBorder: 'border-l-blue-600',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-50 text-blue-700',
  },
  Exchange: {
    icon: ShieldAlert,
    accentBorder: 'border-l-amber-600',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-50 text-amber-700',
  },
  Wholesale: {
    icon: FileText,
    accentBorder: 'border-l-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-50 text-emerald-700',
  },
}

const EMPTY_FORM = {
  name: '',
  contactNumbers: '',
  whatsappNumber: '',
  facebookUrl: '',
  instagramUrl: '',
  registrationTaxId: '',
  businessAddress: '',
  supportEmail: '',
  logoFile: null,
}

export function CompanyPage() {
  const [activeTab, setActiveTab] = useState('details')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formHydrated, setFormHydrated] = useState(false)

  const {
    company,
    loading: companyLoading,
    mutating: companyMutating,
    error: companyError,
    updateCompany,
  } = useAdminCompany()

  const [policySearch, setPolicySearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [policyForm, setPolicyForm] = useState({
    name: '',
    detail: '',
    category: DEFAULT_POLICY_TYPE,
    printOnSlip: false,
  })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTargetPolicy, setDeleteTargetPolicy] = useState(null)
  const [viewPolicy, setViewPolicy] = useState(null)
  const {
    fieldErrors: companyFieldErrors,
    formError: companyFormError,
    setFormError: setCompanyFormError,
    resetErrors: resetCompanyErrors,
    clearField: clearCompanyField,
    applyErrors: applyCompanyErrors,
  } = useFieldErrors()
  const {
    fieldErrors: policyFieldErrors,
    formError: policyFormError,
    setFormError: setPolicyFormError,
    resetErrors: resetPolicyErrors,
    clearField: clearPolicyField,
    applyErrors: applyPolicyErrors,
  } = useFieldErrors()

  const {
    items: policies,
    loading: policiesLoading,
    mutating: policiesMutating,
    error: policiesError,
    createPolicy,
    updatePolicy,
    setPrintOnSlip,
    deletePolicy,
  } = useAdminPolicies({ limit: 100 })

  const { captureBaseline, isDirty } = useFormBaseline(policyDialogOpen)
  const slowCompany = useSlowLoadingHint(companyLoading)
  const slowPolicies = useSlowLoadingHint(policiesLoading)

  useEffect(() => {
    if (!policyDialogOpen) return
    captureBaseline(policyForm)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- capture once per open
  }, [policyDialogOpen, captureBaseline])

  useEffect(() => {
    if (companyLoading || formHydrated) return
    // Legacy comma-lists → first number only (PhoneInput is single-value)
    const rawContact = company.contactNumbers || ''
    const primaryContact =
      rawContact
        .split(/[,;/|]+/)
        .map((p) => p.trim())
        .filter(Boolean)[0] || ''
    setForm({
      name: company.name || '',
      contactNumbers: primaryContact,
      whatsappNumber: company.whatsappNumber || '',
      facebookUrl: company.facebookUrl || '',
      instagramUrl: company.instagramUrl || '',
      registrationTaxId: company.registrationTaxId || '',
      businessAddress: company.businessAddress || '',
      supportEmail: company.supportEmail || '',
      logoFile: null,
    })
    setFormHydrated(true)
  }, [company, companyLoading, formHydrated])

  async function handleSaveCompanyDetails(e) {
    e.preventDefault()
    const errors = {}
    if (!form.name.trim()) {
      errors.name = 'Please enter the registered company name'
    }
    // Single E.164 value from PhoneInput (same rules as WhatsApp)
    const contactErr = validatePhone(form.contactNumbers, {
      required: true,
      fieldName: 'Contact number',
    })
    if (contactErr) errors.contactNumbers = contactErr

    if (form.whatsappNumber?.trim()) {
      const waErr = validatePhone(form.whatsappNumber, {
        required: false,
        fieldName: 'WhatsApp number',
      })
      if (waErr) errors.whatsappNumber = waErr
    }

    if (form.supportEmail?.trim()) {
      const emailErr = validateEmail(form.supportEmail, {
        required: false,
        fieldName: 'Support Email',
      })
      if (emailErr) errors.supportEmail = emailErr
    }

    if (form.facebookUrl?.trim()) {
      const fbErr = validateUrl(form.facebookUrl, {
        required: false,
        fieldName: 'Facebook URL',
      })
      if (fbErr) errors.facebookUrl = fbErr
    }

    if (form.instagramUrl?.trim()) {
      const igErr = validateUrl(form.instagramUrl, {
        required: false,
        fieldName: 'Instagram URL',
      })
      if (igErr) errors.instagramUrl = igErr
    }

    if (Object.keys(errors).length) {
      applyCompanyErrors(errors, COMPANY_FIELD_IDS, COMPANY_FIELD_ORDER)
      return
    }
    resetCompanyErrors()

    const result = await updateCompany({
      name: form.name,
      contactNumbers: form.contactNumbers,
      whatsappNumber: form.whatsappNumber,
      facebookUrl: form.facebookUrl,
      instagramUrl: form.instagramUrl,
      registrationTaxId: form.registrationTaxId,
      businessAddress: form.businessAddress,
      supportEmail: form.supportEmail,
      logo: form.logoFile || undefined,
    })

    if (!result.success) {
      setCompanyFormError(result.error || 'Failed to save company details')
      return
    }

    setForm((prev) => ({ ...prev, logoFile: null }))
    toastSuccess('Company details saved successfully')
  }

  function handleOpenAddPolicy() {
    setEditingPolicy(null)
    resetPolicyErrors()
    setPolicyForm({
      name: '',
      detail: '',
      category: DEFAULT_POLICY_TYPE,
      printOnSlip: false,
    })
    setPolicyDialogOpen(true)
  }

  function handleOpenEditPolicy(policy) {
    setEditingPolicy(policy)
    resetPolicyErrors()
    setPolicyForm({
      name: policy.name,
      detail: policy.detail,
      category: normalizePolicyType(policy.category),
      printOnSlip: Boolean(policy.printOnSlip),
    })
    setPolicyDialogOpen(true)
  }

  function handlePromptDelete(policy) {
    setDeleteTargetPolicy(policy)
    setDeleteConfirmOpen(true)
  }

  async function handleConfirmDelete() {
    if (!deleteTargetPolicy) return
    const result = await deletePolicy(deleteTargetPolicy.id)
    if (!result.success) {
      toastError(result.error || 'Failed to delete policy')
      return
    }
    toastSuccess(`Policy "${deleteTargetPolicy.name}" deleted successfully`)
    setDeleteTargetPolicy(null)
    setDeleteConfirmOpen(false)
  }

  async function handleTogglePrintOnSlip(policy, next) {
    const result = await setPrintOnSlip(policy.id, next)
    if (!result.success) {
      toastError(result.error || 'Failed to update print-on-slip setting')
      return
    }
    toastSuccess(
      next
        ? `"${policy.name}" will be printed on the customer invoice`
        : `"${policy.name}" will not appear on the invoice`,
    )
  }

  async function handleSubmitPolicy(e) {
    e.preventDefault()
    const errors = {}
    if (!policyForm.name.trim()) {
      errors.name = 'Please provide a policy name and description'
    }
    if (!policyForm.detail.trim()) {
      errors.detail = 'Please provide a policy name and description'
    }
    if (Object.keys(errors).length) {
      applyPolicyErrors(errors, POLICY_FIELD_IDS, POLICY_FIELD_ORDER)
      return
    }
    resetPolicyErrors()

    if (editingPolicy) {
      const result = await updatePolicy(editingPolicy.id, policyForm)
      if (!result.success) {
        setPolicyFormError(result.error || 'Failed to update policy')
        return
      }
      toastSuccess('Policy updated successfully')
    } else {
      const result = await createPolicy(policyForm)
      if (!result.success) {
        setPolicyFormError(result.error || 'Failed to create policy')
        return
      }
      toastSuccess('New policy created and published')
    }

    setPolicyDialogOpen(false)
  }

  // Client-side filter for snappy search within loaded page
  const filteredPolicies = useMemo(() => {
    return policies
      .filter((p) => {
        const policyType = normalizePolicyType(p.category)
        const matchesCategory =
          selectedCategory === 'all' || policyType === selectedCategory
        const q = policySearch.toLowerCase().trim()
        const displayId = referenceFromUuid(p.id, 'POL').toLowerCase()
        const matchesSearch =
          !q ||
          p.name?.toLowerCase().includes(q) ||
          p.detail?.toLowerCase().includes(q) ||
          displayId.includes(q) ||
          String(p.id).toLowerCase().includes(q) ||
          policyType.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        return matchesCategory && matchesSearch
      })
      .map((p) => ({ ...p, category: normalizePolicyType(p.category) }))
  }, [policies, selectedCategory, policySearch])

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Corporate Identity & Governance"
          title="Company Details & Policies"
          description="Manage corporate entity profiles, social presence, tax registrations, and store policy handbooks"
          actions={
            <Button
              type="button"
              onClick={() => {
                setActiveTab('policies')
                handleOpenAddPolicy()
              }}
              disabled={policiesLoading}
              className="text-white font-semibold cursor-pointer shadow-xs"
              style={{
                background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})`,
              }}
            >
              <Plus className="mr-1.5 size-4" />
              Add New Policy
            </Button>
          }
        />
      </MotionHeader>

      <MotionReveal delay={0.05}>
        <div className="flex rounded-xl bg-muted p-1 border border-border w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'details'
                ? 'bg-card text-foreground shadow-xs font-bold dark:bg-primary dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Building2 className="size-4" />
            Company Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${activeTab === 'policies'
                ? 'bg-card text-foreground shadow-xs font-bold dark:bg-primary dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <FileText className="size-4" />
            Policies & Governance ({policies.length})
          </button>
        </div>
      </MotionReveal>

      {activeTab === 'details' && (
        <MotionReveal delay={0.1}>
          {companyError ? (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {companyError}
            </p>
          ) : null}
          {slowCompany ? <SlowLoadingBanner show className="mb-3" /> : null}

          <SurfaceCard
            title="Company Information & Contact Channels"
            description="Official corporate registration details and customer service links displayed across invoices and receipts"
          >
            {companyLoading && !formHydrated ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading company details…
              </div>
            ) : (
              <form onSubmit={handleSaveCompanyDetails} className="space-y-5" noValidate>
                {companyFormError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {companyFormError}
                  </p>
                ) : null}
                <div className="flex flex-col sm:flex-row items-start gap-4 pb-4 border-b border-slate-100">
                  <div className="w-full sm:flex-1">
                    <ImageUploadField
                      id="companyLogo"
                      label="Company logo"
                      optionalLabel="(optional)"
                      value={form.logoFile}
                      existingImageUrl={company.logoUrl || null}
                      onChange={(file) => setForm({ ...form, logoFile: file })}
                    />
                  </div>
                  <div className="flex-1 space-y-1 w-full">
                    <Label htmlFor="companyName" className="text-xs font-semibold">
                      Registered Company Name *
                    </Label>
                    <Input
                      id="companyName"
                      value={form.name}
                      onChange={(e) => {
                        setForm({ ...form, name: e.target.value })
                        clearCompanyField('name')
                      }}
                      placeholder="e.g. FluxOne Enterprise Solutions Ltd."
                      aria-invalid={Boolean(companyFieldErrors.name)}
                      className={fieldErrorClass(companyFieldErrors.name)}
                    />
                    <FieldError message={companyFieldErrors.name} />
                    <p className="text-[11px] text-slate-400">
                      This name appears on wholesale supplier bills, tax invoices, and branch headers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contacts" className="text-xs font-semibold flex items-center gap-1.5">
                      <Phone className="size-3.5 text-purple-600" />
                      Official Contact Numbers *
                    </Label>
                    <PhoneInput
                      id="contacts"
                      value={form.contactNumbers}
                      onChange={(val) => {
                        setForm({ ...form, contactNumbers: val })
                        clearCompanyField('contactNumbers')
                      }}
                      aria-invalid={Boolean(companyFieldErrors.contactNumbers)}
                      className={fieldErrorClass(companyFieldErrors.contactNumbers)}
                    />
                    <FieldError message={companyFieldErrors.contactNumbers} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="whatsapp" className="text-xs font-semibold flex items-center gap-1.5">
                      <MessageCircle className="size-3.5 text-emerald-600" />
                      WhatsApp Customer Care (Optional)
                    </Label>
                    <PhoneInput
                      id="whatsapp"
                      value={form.whatsappNumber}
                      onChange={(val) => {
                        setForm({ ...form, whatsappNumber: val })
                        clearCompanyField('whatsappNumber')
                      }}
                      aria-invalid={Boolean(companyFieldErrors.whatsappNumber)}
                      className={fieldErrorClass(companyFieldErrors.whatsappNumber)}
                    />
                    <FieldError message={companyFieldErrors.whatsappNumber} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="facebook" className="text-xs font-semibold flex items-center gap-1.5">
                      <FacebookIcon className="text-[#1877F2]" />
                      Facebook Page Link (Optional URL)
                    </Label>
                    <Input
                      id="facebook"
                      type="url"
                      value={form.facebookUrl}
                      onChange={(e) => {
                        setForm({ ...form, facebookUrl: e.target.value })
                        clearCompanyField('facebookUrl')
                      }}
                      placeholder="https://facebook.com/your-business"
                      aria-invalid={Boolean(companyFieldErrors.facebookUrl)}
                      className={fieldErrorClass(companyFieldErrors.facebookUrl)}
                    />
                    <FieldError message={companyFieldErrors.facebookUrl} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="instagram" className="text-xs font-semibold flex items-center gap-1.5">
                      <InstagramIcon className="text-[#E4405F]" />
                      Instagram Page Link (Optional URL)
                    </Label>
                    <Input
                      id="instagram"
                      type="url"
                      value={form.instagramUrl}
                      onChange={(e) => {
                        setForm({ ...form, instagramUrl: e.target.value })
                        clearCompanyField('instagramUrl')
                      }}
                      placeholder="https://instagram.com/your-business"
                      aria-invalid={Boolean(companyFieldErrors.instagramUrl)}
                      className={fieldErrorClass(companyFieldErrors.instagramUrl)}
                    />
                    <FieldError message={companyFieldErrors.instagramUrl} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="supportEmail" className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="size-3.5 text-slate-700" />
                      Support Email (Optional)
                    </Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={form.supportEmail}
                      onChange={(e) => {
                        setForm({ ...form, supportEmail: e.target.value })
                        clearCompanyField('supportEmail')
                      }}
                      placeholder="support@company.com"
                      aria-invalid={Boolean(companyFieldErrors.supportEmail)}
                      className={fieldErrorClass(companyFieldErrors.supportEmail)}
                    />
                    <FieldError message={companyFieldErrors.supportEmail} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="taxReg" className="text-xs font-semibold flex items-center gap-1.5">
                      <FileCheck className="size-3.5 text-slate-700" />
                      Registration / NTN / Tax ID (Optional)
                    </Label>
                    <Input
                      id="taxReg"
                      value={form.registrationTaxId}
                      onChange={(e) =>
                        setForm({ ...form, registrationTaxId: e.target.value })
                      }
                      placeholder="e.g. NTN-8923410-7 (FBR Registered)"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address" className="text-xs font-semibold flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-slate-700" />
                      Business Address (Optional)
                    </Label>
                    <Textarea
                      id="address"
                      rows={2}
                      value={form.businessAddress}
                      onChange={(e) =>
                        setForm({ ...form, businessAddress: e.target.value })
                      }
                      placeholder="Registered office / HQ address"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    disabled={companyMutating}
                    className="text-white font-semibold cursor-pointer gap-1.5 shadow-sm"
                    style={{
                      background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})`,
                    }}
                  >
                    {companyMutating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {companyMutating ? 'Saving…' : 'Save Company Details'}
                  </Button>
                </div>
              </form>
            )}
          </SurfaceCard>
        </MotionReveal>
      )}

      {activeTab === 'policies' && (
        <MotionReveal delay={0.1}>
          {policiesError ? (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {policiesError}
            </p>
          ) : null}
          {slowPolicies ? <SlowLoadingBanner show className="mb-3" /> : null}

          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search policies by name, clause, ID, or policy type..."
                  value={policySearch}
                  onChange={(e) => setPolicySearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/70 py-2 pl-9 pr-4 text-xs sm:text-sm text-foreground outline-none focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-card border border-border shadow-2xs">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat
                const count =
                  cat === 'all'
                    ? policies.length
                    : policies.filter((p) => normalizePolicyType(p.category) === cat).length

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                  >
                    <span>{cat === 'all' ? 'All Policies' : cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="space-y-4">
              {policiesLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading policies…
                </div>
              ) : (
                <PoliciesTable
                  items={filteredPolicies}
                  loading={false}
                  mutating={policiesMutating}
                  categoryConfig={CATEGORY_CONFIG}
                  onView={setViewPolicy}
                  onEdit={handleOpenEditPolicy}
                  onDelete={handlePromptDelete}
                  onTogglePrintOnSlip={handleTogglePrintOnSlip}
                />
              )}
            </div>
          </div>
        </MotionReveal>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open)
          if (!open) setDeleteTargetPolicy(null)
        }}
        title="Delete Corporate Policy"
        description={
          deleteTargetPolicy ? (
            <>
              Are you sure you want to delete &quot;{deleteTargetPolicy.name}&quot; (
              {referenceFromUuid(deleteTargetPolicy.id, 'POL')})?
            </>
          ) : null
        }
        warning="This action cannot be undone and will immediately unpublish this policy across all branch portals."
        confirmLabel="Delete Policy"
        variant="destructive"
        loading={policiesMutating}
        onConfirm={handleConfirmDelete}
      />

      <Dialog open={Boolean(viewPolicy)} onOpenChange={(open) => !open && setViewPolicy(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewPolicy?.name || 'Policy details'}</DialogTitle>
            <DialogDescription>
              {viewPolicy
                ? `${referenceFromUuid(viewPolicy.id, 'POL')} · ${normalizePolicyType(viewPolicy.category)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700">
            <p className="whitespace-pre-line">{viewPolicy?.detail}</p>
          </div>
          {viewPolicy ? (
            <p className="text-xs text-slate-500">
              Print on invoice:{' '}
              <strong className={viewPolicy.printOnSlip ? 'text-emerald-700' : 'text-slate-600'}>
                {viewPolicy.printOnSlip ? 'Printed' : 'Hidden'}
              </strong>
            </p>
          ) : null}
          <DialogFooter>
            <DialogCancelButton />
            <Button
              type="button"
              className="text-white font-semibold"
              style={{ background: BRAND.purple }}
              onClick={() => {
                const policy = viewPolicy
                setViewPolicy(null)
                if (policy) handleOpenEditPolicy(policy)
              }}
            >
              Edit Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        dirty={isDirty(policyForm)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPolicy ? 'Edit Policy' : 'Add New Corporate Policy'}
            </DialogTitle>
            <DialogDescription>
              Define customer return policies, wholesale terms, or branch compliance guidelines
            </DialogDescription>
          </DialogHeader>

          {policyFormError ? (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {policyFormError}
            </p>
          ) : null}

          <form onSubmit={handleSubmitPolicy} className="space-y-4 pt-2" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="polName" className="text-xs font-semibold">
                Policy Name *
              </Label>
              <Input
                id="polName"
                placeholder="e.g. 7-Day Return & Replacement Policy"
                value={policyForm.name}
                onChange={(e) => {
                  setPolicyForm({ ...policyForm, name: e.target.value })
                  clearPolicyField('name')
                }}
                aria-invalid={Boolean(policyFieldErrors.name)}
                className={fieldErrorClass(policyFieldErrors.name)}
              />
              <FieldError message={policyFieldErrors.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="polCat" className="text-xs font-semibold">
                Policy Type
              </Label>
              <NativeSelect
                id="polCat"
                value={policyForm.category}
                onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
              >
                {POLICY_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="polDetail" className="text-xs font-semibold">
                Policy Details & Rules *
              </Label>
              <Textarea
                id="polDetail"
                rows={4}
                placeholder="Describe the conditions, timeframe, receipts required, and branch handling procedures..."
                value={policyForm.detail}
                onChange={(e) => {
                  setPolicyForm({ ...policyForm, detail: e.target.value })
                  clearPolicyField('detail')
                }}
                aria-invalid={Boolean(policyFieldErrors.detail)}
                className={fieldErrorClass(policyFieldErrors.detail)}
              />
              <FieldError message={policyFieldErrors.detail} />
            </div>

            <label
              htmlFor="polPrintOnSlip"
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
            >
              <Checkbox
                id="polPrintOnSlip"
                checked={Boolean(policyForm.printOnSlip)}
                onChange={(e) =>
                  setPolicyForm({ ...policyForm, printOnSlip: e.target.checked })
                }
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  Print on Invoice
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  When selected, this policy will be printed on the customer invoice/receipt. When unselected, the policy will not appear on the invoice.
                </span>
              </span>
            </label>

            <DialogFooter className="pt-2">
              <DialogCancelButton disabled={policiesMutating} />
              <Button
                type="submit"
                disabled={policiesMutating}
                className="text-white font-semibold"
                style={{ background: BRAND.purple }}
              >
                {policiesMutating
                  ? 'Saving…'
                  : editingPolicy
                    ? 'Update Policy'
                    : 'Save & Publish Policy'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CompanyPage
