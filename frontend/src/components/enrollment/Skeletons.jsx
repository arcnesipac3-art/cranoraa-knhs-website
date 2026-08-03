import { cn } from '../../styles/designSystem';

/**
 * Enrollment-specific skeleton loaders.
 * Content-aware shapes that match the real layouts.
 * Uses skeleton-shimmer for hardware-accelerated animation.
 */

const TableRowSkeleton = ({ className }) => (
  <tr className={cn('border-b border-slate-100', className)}>
    <td className="px-3 py-3"><div className="skeleton-shimmer h-4 w-4 rounded bg-slate-200" /></td>
    <td className="px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="skeleton-shimmer w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="skeleton-shimmer h-3.5 w-28 rounded bg-slate-200" />
          <div className="skeleton-shimmer h-2.5 w-20 rounded bg-slate-200" />
        </div>
      </div>
    </td>
    <td className="px-3 py-3"><div className="skeleton-shimmer h-3 w-16 rounded bg-slate-200" /></td>
    <td className="px-3 py-3"><div className="skeleton-shimmer h-3 w-12 rounded bg-slate-200" /></td>
    <td className="px-3 py-3"><div className="skeleton-shimmer h-3 w-20 rounded bg-slate-200" /></td>
    <td className="px-3 py-3"><div className="skeleton-shimmer h-5 w-16 rounded-full bg-slate-200" /></td>
    <td className="px-3 py-3 hidden md:table-cell"><div className="skeleton-shimmer h-3 w-16 rounded bg-slate-200" /></td>
    <td className="px-3 py-3"><div className="skeleton-shimmer h-6 w-20 rounded bg-slate-200 mx-auto" /></td>
  </tr>
);

const ApplicationsTableSkeleton = ({ rows = 8, className }) => (
  <div className={cn('bg-white border border-slate-200 rounded-xl overflow-hidden', className)}>
    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <div className="skeleton-shimmer h-4 w-32 rounded bg-slate-200" />
      <div className="flex gap-2">
        <div className="skeleton-shimmer h-7 w-20 rounded-lg bg-slate-200" />
        <div className="skeleton-shimmer h-7 w-20 rounded-lg bg-slate-200" />
      </div>
    </div>
    <div className="md:hidden divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1">
              <div className="skeleton-shimmer h-3.5 w-28 rounded bg-slate-200" />
              <div className="skeleton-shimmer h-2.5 w-20 rounded bg-slate-200" />
            </div>
            <div className="skeleton-shimmer h-5 w-16 rounded-full bg-slate-200" />
          </div>
          <div className="flex gap-3 mt-2">
            <div className="skeleton-shimmer h-2.5 w-16 rounded bg-slate-200" />
            <div className="skeleton-shimmer h-2.5 w-12 rounded bg-slate-200" />
            <div className="skeleton-shimmer h-2.5 w-20 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            {['#', 'Applicant', 'Enrollment #', 'Grade', 'Type', 'Status', 'Date', 'Actions'].map((h, i) => (
              <th key={i} className="px-3 py-2.5">
                <div className="skeleton-shimmer h-2.5 w-12 rounded bg-slate-200" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} />)}
        </tbody>
      </table>
    </div>
  </div>
);

const ClassroomGridSkeleton = ({ count = 8, className }) => (
  <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border-2 border-slate-200 bg-white p-3 md:p-4">
        <div className="skeleton-shimmer w-7 h-7 md:w-8 md:h-8 rounded-lg bg-slate-200 mb-2" />
        <div className="skeleton-shimmer h-3.5 w-20 rounded bg-slate-200 mb-2" />
        <div className="skeleton-shimmer h-2.5 w-12 rounded bg-slate-200" />
      </div>
    ))}
  </div>
);

const EnrolledListSkeleton = ({ rows = 5, className }) => (
  <div className={cn('bg-white border border-slate-200 rounded-xl overflow-hidden', className)}>
    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
      <div className="skeleton-shimmer h-4 w-28 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-7 w-48 rounded-lg bg-slate-200" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
          <div className="skeleton-shimmer w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton-shimmer h-3.5 w-28 rounded bg-slate-200" />
            <div className="skeleton-shimmer h-2.5 w-20 rounded bg-slate-200" />
          </div>
          <div className="skeleton-shimmer h-6 w-16 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  </div>
);

export { ApplicationsTableSkeleton, ClassroomGridSkeleton, EnrolledListSkeleton };
