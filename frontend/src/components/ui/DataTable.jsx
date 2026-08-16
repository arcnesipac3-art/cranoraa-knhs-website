/**
 * DataTable — consistent table wrapper with sticky header, responsive overflow, pagination, and empty state.
 *
 * Features:
 *   - Sticky header
 *   - Loading skeleton
 *   - Empty state with icon/message
 *   - Optional client-side pagination
 *   - Sortable columns (visual indicators)
 *   - Row hover states
 *   - Mobile card view (vertical stacking on small screens)
 *
 * Usage:
 *   <DataTable
 *     columns={[{ key: 'name', label: 'Name', sortable: true }, ...]}
 *     data={rows}
 *     loading={loading}
 *     emptyTitle="No records found"
 *     emptyDescription="Try adjusting your filters."
 *     renderRow={(row) => <tr key={row.id}>...</tr>}
 *     renderMobileCard={(row) => <div key={row.id}>...</div>}
 *     pagination={{ page: 1, pageSize: 10, total: 100, onPageChange: setPage }}
 *   />
 */
import { useState } from 'react';
import { EmptyState } from './EmptyState';
import Button from './Button';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No data found',
  emptyDescription = '',
  emptyIcon,
  renderRow,
  renderMobileCard,
  className = '',
  stickyHeader = true,
  pagination = null,
  onSort = null,
  sortConfig = null,
}) => {
  const [internalPage, setInternalPage] = useState(1);
  
  const page = pagination?.page ?? internalPage;
  const pageSize = pagination?.pageSize ?? 10;
  const total = pagination?.total ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const onPageChange = pagination?.onPageChange ?? setInternalPage;

  const loadingSkeleton = (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-slate-100 last:border-b-0">
          <div className="space-y-2">
            {columns.slice(0, 3).map((col) => (
              <div key={col.key} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-20 shrink-0">{col.label}</span>
                <div className="h-4 bg-slate-100 rounded animate-pulse flex-1" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  const emptyState = (
    <EmptyState
      icon={emptyIcon || (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      title={emptyTitle}
      description={emptyDescription}
    />
  );

  const paginationBlock = pagination && totalPages > 1 && (
    <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs font-medium text-slate-500">
        Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="text-xs font-bold text-slate-600 px-2">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
      {/* Desktop: Traditional table view */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-left">
          <thead className={`bg-slate-50 border-b border-slate-200 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700 transition-colors' : ''}`}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && sortConfig?.key === col.key && (
                      <svg className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    {col.sortable && sortConfig?.key !== col.key && (
                      <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3.5">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState}
                </td>
              </tr>
            ) : (
              data.map((row, i) => renderRow(row, i))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Stacked card view */}
      <div className="sm:hidden">
        {loading ? (
          loadingSkeleton
        ) : data.length === 0 ? (
          <div className="p-4">
            {emptyState}
          </div>
        ) : renderMobileCard ? (
          <div className="divide-y divide-slate-100">
            {data.map((row, i) => renderMobileCard(row, i, columns))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((row, i) => (
              <MobileCardRow key={row.id || i} row={row} columns={columns} index={i} />
            ))}
          </div>
        )}
      </div>

      {paginationBlock}
    </div>
  );
};

/**
 * Default mobile card renderer when no renderMobileCard is provided.
 * Shows each row as a card with label-value pairs.
 */
function MobileCardRow({ row, columns, index }) {
  return (
    <div className="p-4 hover:bg-slate-50 transition-colors">
      {/* Primary field (first column) as card header */}
      {columns.length > 0 && (
        <div className="mb-2">
          <span className="text-sm font-bold text-slate-900 truncate block">
            {row[columns[0].key] ?? '—'}
          </span>
        </div>
      )}
      {/* Remaining fields as stacked label-value pairs */}
      <div className="space-y-1.5">
        {columns.slice(1).map((col) => {
          const value = row[col.key];
          if (value === undefined || value === null || value === '') return null;
          return (
            <div key={col.key} className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 min-w-[80px]">
                {col.label}
              </span>
              <span className="text-xs text-slate-700 text-right min-w-0">
                {typeof value === 'string' || typeof value === 'number' ? value : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DataTable;
