import { EmptyState } from '@/components/shared/EmptyState'
import { EntityStatusToggle } from '@/components/shared/EntityStatusToggle'
import { ParentChildRowActions } from '@/components/shared/ActionIconButton'
import {
  Table,
  TableActionsCell,
  TableActionsHead,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from '@/components/ui/table'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { formatDateLine } from '@/lib/formatDateTime'
import { cn } from '@/lib/utils'

//
// Balanced column layout — name capped, status/count/actions get breathing room.
//
const COL = {
  parentName: 'w-[36%]',
  parentNameWithMeta: 'w-[30%]',
  status: 'w-[16%]',
  count: 'w-[16%]',
  configured: 'w-[16%]',
  actions: 'w-[22%] min-w-[9.5rem]',
  childName: 'w-[30%]',
  childParent: 'w-[28%]',
  childStatus: 'w-[18%]',
  childActions: 'w-[24%] min-w-[7.5rem]',
}

//
// Parent tab — name + child summary, status, count, optional configured date, actions.
//
export function ParentEntityTable({
  rows = [],
  loading = false,
  emptyIcon,
  emptyTitle = 'Nothing here yet.',
  labels = {},
  showConfiguredColumn = false,
  configuredPrefix = 'Configured',
  countSuffix = 'values',
  statusUpdatingId = null,
  onEdit,
  onToggleActive,
  onDelete,
  onAddChild,
  addChildLabel = 'Add Values',
  renderNameLeading,
  pagination = null,
}) {
  const {
    name: nameCol = 'Name',
    status: statusCol = 'Status',
    count: countCol = 'Number of Values',
    configured: configuredCol = 'Configured',
    parentSummaryEmpty = 'No items yet',
  } = labels

  const nameWidth = showConfiguredColumn ? COL.parentNameWithMeta : COL.parentName

  if (loading) {
    return (
      <div className="p-4">
        <TableRowsSkeleton rows={5} />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="p-6">
        <EmptyState icon={emptyIcon} title={emptyTitle} compact />
      </div>
    )
  }

  return (
    <>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className={nameWidth}>{nameCol}</TableHead>
            <TableHead className={COL.status}>{statusCol}</TableHead>
            <TableHead className={COL.count}>{countCol}</TableHead>
            {showConfiguredColumn ? (
              <TableHead className={COL.configured}>{configuredCol}</TableHead>
            ) : null}
            <TableActionsHead className={COL.actions} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const children = row.children || []
            const count = row.valuesCount ?? children.length
            const summary =
              children.length > 0
                ? children.map((c) => c.name).join(', ')
                : parentSummaryEmpty
            const inactive = row.isActive === false
            const raw = row._raw || row
            const configuredAt = raw.updatedAt || raw.createdAt

            return (
              <TableRow key={row.id} className={cn(inactive && 'opacity-80')}>
                <TableCell className={cn(nameWidth, 'align-middle')}>
                  <div className="flex min-w-0 items-start gap-2.5 pr-2">
                    {renderNameLeading ? renderNameLeading(row) : null}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{row.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{summary}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cn(COL.status, 'align-middle')}>
                  <EntityStatusToggle
                    interactive={false}
                    status={inactive ? 'inactive' : 'active'}
                  />
                </TableCell>
                <TableCell className={cn(COL.count, 'align-middle tabular-nums text-slate-700')}>
                  {count}
                  {countSuffix ? (
                    <span className="ml-1 text-xs font-normal text-slate-400">{countSuffix}</span>
                  ) : null}
                </TableCell>
                {showConfiguredColumn ? (
                  <TableCell className={cn(COL.configured, 'align-middle text-sm text-slate-600')}>
                    {configuredAt ? (
                      <>
                        <span className="text-slate-400">{configuredPrefix} · </span>
                        {formatDateLine(configuredAt)}
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                ) : null}
                <TableActionsCell className={cn(COL.actions, 'align-middle')}>
                  <ParentChildRowActions
                    isActive={!inactive}
                    statusLoading={statusUpdatingId === row.id}
                    onEdit={() => onEdit?.(row)}
                    onToggleActive={(next) => onToggleActive?.(row, next)}
                    onDelete={() => onDelete?.(row)}
                    onAddChild={() => onAddChild?.(row)}
                    showAddChild={Boolean(onAddChild)}
                    addChildLabel={addChildLabel}
                    className="gap-1.5"
                  />
                </TableActionsCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {pagination ? <div className="px-4 pb-4">{paginationNode(pagination)}</div> : null}
    </>
  )
}

//
// Children tab — value/subcategory name, parent name, status, actions.
//
export function ChildEntityTable({
  rows = [],
  loading = false,
  emptyIcon,
  emptyTitle = 'Nothing here yet.',
  labels = {},
  statusUpdatingId = null,
  onEdit,
  onToggleActive,
  onDelete,
  renderNameLeading,
  pagination = null,
}) {
  const {
    name: nameCol = 'Value Name',
    parent: parentCol = 'Parent',
    status: statusCol = 'Status',
  } = labels

  if (loading) {
    return (
      <div className="p-4">
        <TableRowsSkeleton rows={5} />
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="p-6">
        <EmptyState icon={emptyIcon} title={emptyTitle} compact />
      </div>
    )
  }

  return (
    <>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className={COL.childName}>{nameCol}</TableHead>
            <TableHead className={COL.childParent}>{parentCol}</TableHead>
            <TableHead className={COL.childStatus}>{statusCol}</TableHead>
            <TableActionsHead className={COL.childActions} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const inactive = row.isActive === false
            return (
              <TableRow key={row.id} className={cn(inactive && 'opacity-80')}>
                <TableCell className={cn(COL.childName, 'align-middle')}>
                  <div className="flex min-w-0 items-center gap-2.5 pr-2">
                    {renderNameLeading ? renderNameLeading(row) : null}
                    <span className="truncate font-medium text-slate-900">{row.name}</span>
                  </div>
                </TableCell>
                <TableCell className={cn(COL.childParent, 'align-middle text-slate-600')}>
                  <span className="truncate">{row.parentName || '—'}</span>
                </TableCell>
                <TableCell className={cn(COL.childStatus, 'align-middle')}>
                  <EntityStatusToggle
                    interactive={false}
                    status={inactive ? 'inactive' : 'active'}
                  />
                </TableCell>
                <TableActionsCell className={cn(COL.childActions, 'align-middle')}>
                  <ParentChildRowActions
                    isActive={!inactive}
                    statusLoading={statusUpdatingId === row.id}
                    onEdit={() => onEdit?.(row)}
                    onToggleActive={(next) => onToggleActive?.(row, next)}
                    onDelete={() => onDelete?.(row)}
                    className="gap-1.5"
                  />
                </TableActionsCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {pagination ? <div className="px-4 pb-4">{paginationNode(pagination)}</div> : null}
    </>
  )
}

function paginationNode(pagination) {
  return (
    <TablePagination
      page={pagination.page}
      pageCount={pagination.pageCount}
      totalItems={pagination.total}
      pageSize={pagination.pageSize}
      loading={pagination.loading}
      onPageChange={pagination.onPageChange}
      onPageSizeChange={pagination.onPageSizeChange}
    />
  )
}

export default ParentEntityTable
