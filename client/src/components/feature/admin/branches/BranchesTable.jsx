import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { DataCard, ResponsiveDataShell } from '@/components/shared/ResponsiveDataShell'
import { displayBranchRef } from '@/lib/formatDisplayId'
import { formatWorkingDaysShort } from '@/lib/validation/branchForms'
import { Ban, CheckCircle, Loader2, Mail, MapPin, Phone, Users } from 'lucide-react'
import { BranchRowActions } from './BranchRowActions'
import {
  DEFAULT_BRANCH_IMAGE,
  formatCreatedAt,
  formatHoursRange,
  managerAvatar,
} from './branchUtils'

export function BranchesTable({
  loading,
  items,
  filteredBranches,
  pagedBranches,
  mutating,
  page,
  pageCount,
  total,
  pageSize,
  setPage,
  setPageSize,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}) {
  return (
            <SurfaceCard
              title="List of branches"
              description="Registered branch network, branch manager assignments, locations & access statuses"
            >
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
                  <Loader2 className="size-4 animate-spin" />
                  Loading branches…
                </div>
              ) : filteredBranches.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No branches match the filter criteria. Add a branch to start the SoftFlux upward flow.
                </p>
              ) : (
                <ResponsiveDataShell
                  mobile={pagedBranches.map((b) => {
                    const isOpen = b.status === 'open'
                    const imageSrc = b.image || DEFAULT_BRANCH_IMAGE
                    return (
                      <DataCard key={b.id}>
                        <div className="flex items-start gap-3">
                          <img
                            src={imageSrc}
                            alt={b.name}
                            className="size-12 shrink-0 rounded-md border border-slate-200 object-cover shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">{b.name}</p>
                                {/* Human-readable ID; title shows full UUID on hover */}
                                <p
                                  title={b.id || undefined}
                                  className="mt-0.5 font-mono text-[11px] font-semibold text-purple-800"
                                >
                                  {displayBranchRef(b)}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  isOpen
                                    ? 'shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                                    : 'shrink-0 bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                }
                              >
                                {isOpen ? (
                                  <CheckCircle className="mr-1 size-3 text-emerald-600" />
                                ) : (
                                  <Ban className="mr-1 size-3 text-rose-600" />
                                )}
                                {isOpen ? 'Open' : 'Blocked'}
                              </Badge>
                            </div>
                            <p className="mt-1.5 flex items-start gap-1 text-xs text-slate-500">
                              <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />
                              <span className="line-clamp-2">{b.location || '—'}</span>
                            </p>
                            {formatHoursRange(b.openingTime, b.closingTime) ? (
                              <p className="mt-0.5 text-[10px] font-medium text-purple-800">
                                Hours {formatHoursRange(b.openingTime, b.closingTime)}
                              </p>
                            ) : null}
                            {formatWorkingDaysShort(b.workingDays) ? (
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                Days {formatWorkingDaysShort(b.workingDays)}
                              </p>
                            ) : null}
                            <div className="mt-2 flex items-center gap-2">
                              <img
                                src={managerAvatar(b.manager)}
                                alt={b.manager?.name || 'Manager'}
                                className="size-8 shrink-0 rounded-full border border-slate-200 object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-900">
                                  {b.manager?.name || '—'}
                                </p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {b.manager?.email || '—'}
                                </p>
                              </div>
                            </div>
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <Users className="size-3.5 text-slate-400" />
                              Branch Staff:{' '}
                              <span className="font-bold text-purple-900">
                                {Number(b.totalStaff) || 0}
                              </span>
                            </p>
                            <div className="mt-3 flex justify-end">
                              <BranchRowActions
                                branch={b}
                                mutating={mutating}
                                onEdit={onEdit}
                                onResetPassword={onResetPassword}
                                onToggleStatus={onToggleStatus}
                                onDelete={onDelete}
                              />
                            </div>
                          </div>
                        </div>
                      </DataCard>
                    )
                  })}
                  desktop={
                    <Table className="min-w-[42rem] w-full text-left text-sm sm:min-w-[52rem]">
                      <TableHeader>
                        <TableRow className="text-xs text-slate-500 uppercase">
                          <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Branch ID</TableHead>
                          <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Image</TableHead>
                          <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3 min-w-[10rem]">Branch</TableHead>
                          <TableHead className="hidden px-2 py-3 font-medium whitespace-nowrap sm:table-cell sm:px-3 min-w-[9rem]">
                            Location
                          </TableHead>
                          <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3 min-w-[12rem]">
                            Manager
                          </TableHead>
                          <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">
                            Branch Staff
                          </TableHead>
                          <TableHead className="px-2 py-3 font-medium whitespace-nowrap sm:px-3">Status</TableHead>
                          <TableHead className="sticky right-0 z-[1] bg-slate-200/80 px-2 py-3 font-medium whitespace-nowrap sm:px-3">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedBranches.map((b) => {
                          const isOpen = b.status === 'open'
                          const imageSrc = b.image || DEFAULT_BRANCH_IMAGE
                          return (
                            <TableRow key={b.id} className="group hover:bg-slate-50/80">
                              {/* Compact ID cell — aligned with other modules (no pill / truncation) */}
                              <TableCell className="px-2 py-3 align-middle whitespace-nowrap sm:px-3">
                                <span
                                  title={b.id || undefined}
                                  className="font-mono text-xs font-bold text-purple-800 select-all"
                                >
                                  {displayBranchRef(b)}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                                <img
                                  src={imageSrc}
                                  alt={b.name}
                                  className="size-9 sm:size-11 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs"
                                />
                              </TableCell>
                              <TableCell className="px-2 py-3 sm:px-3">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm">{b.name}</p>
                                <span className="text-[10px] sm:text-[11px] text-slate-400 whitespace-nowrap">
                                  Est. {formatCreatedAt(b.createdAt)}
                                </span>
                                {formatHoursRange(b.openingTime, b.closingTime) ? (
                                  <p className="mt-0.5 text-[10px] font-medium text-purple-800 whitespace-nowrap">
                                    Hours {formatHoursRange(b.openingTime, b.closingTime)}
                                  </p>
                                ) : null}
                                {formatWorkingDaysShort(b.workingDays) ? (
                                  <p className="mt-0.5 text-[10px] text-slate-500 whitespace-nowrap">
                                    Days {formatWorkingDaysShort(b.workingDays)}
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell className="hidden px-2 py-3 text-xs text-slate-600 sm:table-cell sm:px-3">
                                <div className="flex items-start gap-1">
                                  <MapPin className="mt-0.5 size-3.5 text-slate-400 shrink-0" />
                                  <span className="line-clamp-2">{b.location || '—'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-2 py-3 sm:px-3">
                                <div className="flex items-center gap-2 sm:gap-2.5">
                                  <img
                                    src={managerAvatar(b.manager)}
                                    alt={b.manager?.name || 'Manager'}
                                    className="size-8 sm:size-9 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-slate-900 text-xs truncate">
                                        {b.manager?.name || '—'}
                                      </p>
                                      {b.manager?.gender ? (
                                        <span className="hidden text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium shrink-0 sm:inline">
                                          {b.manager.gender}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                      <Mail className="size-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{b.manager?.email || '—'}</span>
                                    </p>
                                    <p className="hidden text-[11px] text-slate-400 truncate sm:flex items-center gap-1">
                                      <Phone className="size-3 text-slate-400 shrink-0" />
                                      <span className="whitespace-nowrap">{b.manager?.contact || '—'}</span>
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/80 px-2 py-1 text-xs font-bold text-purple-900">
                                  <Users className="size-3.5 text-purple-600" />
                                  {Number(b.totalStaff) || 0}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-3 whitespace-nowrap sm:px-3">
                                <Badge
                                  variant="outline"
                                  className={
                                    isOpen
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold whitespace-nowrap'
                                      : 'bg-rose-50 text-rose-700 border-rose-200 font-bold whitespace-nowrap'
                                  }
                                >
                                  {isOpen ? (
                                    <CheckCircle className="mr-1 size-3 text-emerald-600" />
                                  ) : (
                                    <Ban className="mr-1 size-3 text-rose-600" />
                                  )}
                                  {isOpen ? 'Open' : 'Blocked'}
                                </Badge>
                              </TableCell>
                              <TableCell className="sticky right-0 z-[1] bg-white px-1.5 py-3 whitespace-nowrap sm:px-3 group-hover:bg-slate-50/80">
                                <BranchRowActions
                                  branch={b}
                                  mutating={mutating}
                                  onEdit={onEdit}
                                  onResetPassword={onResetPassword}
                                  onToggleStatus={onToggleStatus}
                                  onDelete={onDelete}
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  }
                />
              )}

              <TablePagination
                page={page}
                pageCount={pageCount}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </SurfaceCard>
  )
}
