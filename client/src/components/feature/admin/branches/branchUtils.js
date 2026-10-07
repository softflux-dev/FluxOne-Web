import { formatDateTimeInline, formatClockTime } from '@/lib/formatDateTime'
import { toastSuccess } from '@/lib/toast'

export const DEFAULT_BRANCH_IMAGE =
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60'
const AVATAR_MALE =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
const AVATAR_FEMALE =
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'

export function formatCreatedAt(value) {
  return formatDateTimeInline(value)
}

export function managerAvatar(manager) {
  if (manager?.profileImage) return manager.profileImage
  return manager?.gender === 'Female' ? AVATAR_FEMALE : AVATAR_MALE
}

export function credentialsToast(prefix, credentials) {
  if (!credentials) {
    toastSuccess(prefix)
    return
  }
  if (credentials.emailed) {
    toastSuccess(`${prefix} Login credentials emailed to ${credentials.email}.`)
    return
  }
  if (credentials.temporaryPassword) {
    toastSuccess(
      `${prefix} Email failed — use the key icon to resend. Temp password: ${credentials.temporaryPassword}`,
    )
    return
  }
  toastSuccess(
    `${prefix} Email failed — use the key icon on the row to reset & resend credentials.`,
  )
}

export const emptyForm = {
  id: '',
  createdAt: '',
  name: '',
  location: '',
  openingTime: '',
  closingTime: '',
  workingDays: [],
  imageFile: null,
  managerImageFile: null,
  managerName: '',
  managerEmail: '',
  managerContact: '',
  managerOtherContact: '',
  managerGender: 'Male',
  managerAddress: '',
}

export function timeInputValue(value) {
  if (!value) return ''
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

export function formatHoursRange(openingTime, closingTime) {
  const open = formatClockTime(openingTime)
  const close = formatClockTime(closingTime)
  if (!open || !close) return null
  return `${open} – ${close}`
}

export const BRANCH_FIELD_IDS = {
  name: 'branchName',
  location: 'branchLocation',
  managerName: 'mgrName',
  managerEmail: 'mgrEmail',
  managerContact: 'mgrContact',
  managerOtherContact: 'mgrOtherContact',
  openingTime: 'branchOpeningTime',
  closingTime: 'branchClosingTime',
  workingDays: 'branchWorkingDays',
}

export const BRANCH_FIELD_ORDER = [
  'name',
  'location',
  'openingTime',
  'closingTime',
  'workingDays',
  'managerName',
  'managerEmail',
  'managerContact',
  'managerOtherContact',
]
