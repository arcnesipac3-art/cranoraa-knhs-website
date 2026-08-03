/**
 * Skeleton — hardware-accelerated shimmer primitives.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32 rounded" />          // generic block
 *   <Skeleton.Avatar size="md" />                       // circular avatar
 *   <Skeleton.Text lines={3} lastLineWidth="60%" />     // text paragraph
 *   <Skeleton.StatCard />                               // matches StatCard layout
 *   <Skeleton.AnnouncementRow />                        // matches announcement list row
 *   <Skeleton.ClassCard />                              // matches classroom card
 *   <Skeleton.TableRow cols={6} />                      // generic table row
 *   <Skeleton.TableHeader cols={6} />                   // table header
 *   <Skeleton.PageHeader />                             // title + search + button bar
 *   <Skeleton.ListItem />                               // sidebar / list item
 *   <Skeleton.Form fields={4} />                        // form fields
 *   <Skeleton.CardGrid count={6} />                     // grid of card placeholders
 *   <Skeleton.TabBar tabs={4} />                        // tab navigation strip
 *   <Skeleton.Banner />                                 // hero / banner area
 *   <Skeleton.DataRow />                                // settings / status row
 *   <Skeleton.NotificationRow />                        // notification list item
 *   <Skeleton.AttendanceCard />                         // attendance stat card
 *
 * Accessibility:
 *   All containers carry role="status" aria-busy="true" aria-label="Loading…"
 *   prefers-reduced-motion: shimmer drops to a static low-opacity pulse
 */

import { cn } from '../../styles/designSystem';

// ─── Base shimmer block ────────────────────────────────────────────────────────
const Skeleton = ({ className, ...props }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn('skeleton-shimmer rounded bg-slate-200', className)}
    {...props}
  />
);

// ─── Circular / square avatar ─────────────────────────────────────────────────
const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-14 h-14' };
Skeleton.Avatar = ({ size = 'md', square = false, className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn(
      'skeleton-shimmer bg-slate-200 shrink-0',
      sizes[size],
      square ? 'rounded-md' : 'rounded-full',
      className,
    )}
  />
);

// ─── Multi-line text block ────────────────────────────────────────────────────
Skeleton.Text = ({ lines = 2, lastLineWidth = '75%', className }) => (
  <div role="status" aria-busy="true" aria-label="Loading…" className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="skeleton-shimmer h-3.5 rounded bg-slate-200"
        style={{ width: i === lines - 1 ? lastLineWidth : '100%' }}
      />
    ))}
  </div>
);

// ─── StatCard skeleton — mirrors min-h-[110px] layout exactly ────────────────
Skeleton.StatCard = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn(
      'rounded-xl border border-slate-200 border-l-4 border-l-slate-300 bg-white',
      'p-4 md:p-5 flex flex-col justify-between min-h-[110px] md:min-h-[130px]',
      className,
    )}
  >
    <div className="skeleton-shimmer w-10 h-10 md:w-11 md:h-11 rounded-md bg-slate-200" />
    <div className="mt-4 space-y-2">
      <div className="skeleton-shimmer h-2.5 w-20 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-7 w-14 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-2.5 w-16 rounded bg-slate-200" />
    </div>
  </div>
);

// ─── Announcement row skeleton ────────────────────────────────────────────────
Skeleton.AnnouncementRow = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn('p-3 rounded-xl border border-slate-200 bg-white space-y-2', className)}
  >
    <div className="skeleton-shimmer h-3.5 w-3/4 rounded bg-slate-200" />
    <div className="skeleton-shimmer h-3 w-full rounded bg-slate-200" />
    <div className="skeleton-shimmer h-3 w-5/6 rounded bg-slate-200" />
    <div className="skeleton-shimmer h-2.5 w-12 rounded bg-slate-200 mt-1" />
  </div>
);

// ─── Schedule row skeleton ────────────────────────────────────────────────────
Skeleton.ScheduleRow = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn('flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white', className)}
  >
    <div className="space-y-1.5 min-w-[56px] shrink-0">
      <div className="skeleton-shimmer h-3 w-10 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-2.5 w-8 rounded bg-slate-200" />
    </div>
    <div className="flex-1 space-y-1.5">
      <div className="skeleton-shimmer h-3.5 w-32 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-3 w-24 rounded bg-slate-200" />
    </div>
  </div>
);

// ─── Classroom card skeleton (Teacher Dashboard) ──────────────────────────────
Skeleton.ClassCard = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn(
      'p-4 rounded-xl border border-slate-200 bg-white space-y-3',
      className,
    )}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-1.5 flex-1">
        <div className="skeleton-shimmer h-3.5 w-28 rounded bg-slate-200" />
        <div className="skeleton-shimmer h-3 w-16 rounded bg-slate-200" />
      </div>
      <div className="skeleton-shimmer h-5 w-8 rounded bg-slate-200" />
    </div>
    <div className="flex items-center justify-between">
      <div className="skeleton-shimmer h-3 w-20 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-4 w-4 rounded bg-slate-200" />
    </div>
  </div>
);

// ─── Quick-access tile skeleton ───────────────────────────────────────────────
Skeleton.QuickTile = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn(
      'flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white',
      className,
    )}
  >
    <div className="skeleton-shimmer w-5 h-5 rounded bg-slate-200 shrink-0" />
    <div className="skeleton-shimmer h-3.5 flex-1 rounded bg-slate-200" />
  </div>
);

// ─── Table header skeleton ────────────────────────────────────────────────────
Skeleton.TableHeader = ({ cols = 5, className }) => (
  <thead className="bg-slate-50">
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <th key={i} className="px-4 py-3 text-left">
          <div className="skeleton-shimmer h-2.5 w-16 rounded bg-slate-200" />
        </th>
      ))}
    </tr>
  </thead>
);

// ─── Table row skeleton ───────────────────────────────────────────────────────
Skeleton.TableRow = ({ cols = 5, hasAvatar = true, className }) => (
  <tr className={cn('border-b border-slate-100', className)}>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        {i === 0 && hasAvatar ? (
          <div className="flex items-center gap-3">
            <Skeleton.Avatar size="sm" />
            <div className="space-y-1.5">
              <div className="skeleton-shimmer h-3.5 w-28 rounded bg-slate-200" />
              <div className="skeleton-shimmer h-2.5 w-20 rounded bg-slate-200" />
            </div>
          </div>
        ) : i === cols - 1 ? (
          <div className="skeleton-shimmer h-7 w-16 rounded-lg bg-slate-200" />
        ) : (
          <div className="skeleton-shimmer h-3.5 w-20 rounded bg-slate-200" />
        )}
      </td>
    ))}
  </tr>
);

// ─── Table skeleton (header + rows) ──────────────────────────────────────────
Skeleton.Table = ({ rows = 5, cols = 5, hasAvatar = true, className }) => (
  <div role="status" aria-busy="true" aria-label="Loading…" className={cn('bg-white border border-slate-200 rounded-xl overflow-hidden', className)}>
    <table className="w-full">
      <Skeleton.TableHeader cols={cols} />
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton.TableRow key={i} cols={cols} hasAvatar={hasAvatar} />
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Page header skeleton (title + search + button) ──────────────────────────
Skeleton.PageHeader = ({ hasButton = true, hasSearch = true, className }) => (
  <div role="status" aria-busy="true" aria-label="Loading…" className={cn('flex items-center justify-between gap-4', className)}>
    <div className="skeleton-shimmer h-7 w-48 rounded bg-slate-200" />
    <div className="flex items-center gap-3">
      {hasSearch && <div className="skeleton-shimmer h-9 w-48 rounded-lg bg-slate-200" />}
      {hasButton && <div className="skeleton-shimmer h-9 w-32 rounded-lg bg-slate-200" />}
    </div>
  </div>
);

// ─── List item skeleton (sidebar / people list) ──────────────────────────────
Skeleton.ListItem = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn('flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white', className)}
  >
    <Skeleton.Avatar size="sm" />
    <div className="flex-1 space-y-1.5">
      <div className="skeleton-shimmer h-3.5 w-28 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-2.5 w-20 rounded bg-slate-200" />
    </div>
    <div className="skeleton-shimmer h-6 w-16 rounded bg-slate-200" />
  </div>
);

// ─── Form skeleton (label + input fields) ────────────────────────────────────
Skeleton.Form = ({ fields = 4, cols = 2, className }) => (
  <div role="status" aria-busy="true" aria-label="Loading…" className={cn('space-y-5', className)}>
    {Array.from({ length: Math.ceil(fields / cols) }).map((_, row) => (
      <div key={row} className={cn('grid gap-5', cols === 2 ? 'md:grid-cols-2' : 'grid-cols-1')}>
        {Array.from({ length: Math.min(cols, fields - row * cols) }).map((_, col) => (
          <div key={col} className="space-y-2">
            <div className="skeleton-shimmer h-3 w-24 rounded bg-slate-200" />
            <div className="skeleton-shimmer h-10 w-full rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

// ─── Card grid skeleton ──────────────────────────────────────────────────────
Skeleton.CardGrid = ({ count = 6, cols = 3, className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn(
      'grid gap-3',
      cols === 2 && 'grid-cols-2',
      cols === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
      cols === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
      className,
    )}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton.Avatar size="sm" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton-shimmer h-3.5 w-24 rounded bg-slate-200" />
            <div className="skeleton-shimmer h-2.5 w-16 rounded bg-slate-200" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="skeleton-shimmer h-3 w-full rounded bg-slate-200" />
          <div className="skeleton-shimmer h-3 w-3/4 rounded bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Tab bar skeleton ────────────────────────────────────────────────────────
Skeleton.TabBar = ({ tabs = 4, className }) => (
  <div role="status" aria-busy="true" aria-label="Loading…" className={cn('flex gap-1 border-b border-slate-200', className)}>
    {Array.from({ length: tabs }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'skeleton-shimmer h-9 rounded-t-lg',
          i === 0 ? 'w-24 bg-slate-300' : 'w-20 bg-slate-200',
        )}
      />
    ))}
  </div>
);

// ─── Banner / hero skeleton ──────────────────────────────────────────────────
Skeleton.Banner = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn('skeleton-shimmer h-28 md:h-36 rounded-xl bg-slate-200', className)}
  />
);

// ─── Data row skeleton (settings / status) ───────────────────────────────────
Skeleton.DataRow = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn('flex items-center justify-between py-3 border-b border-slate-100', className)}
  >
    <div className="space-y-1.5">
      <div className="skeleton-shimmer h-3.5 w-32 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-2.5 w-48 rounded bg-slate-200" />
    </div>
    <div className="skeleton-shimmer h-5 w-12 rounded bg-slate-200" />
  </div>
);

// ─── Notification row skeleton ────────────────────────────────────────────────
Skeleton.NotificationRow = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn('flex items-start gap-4 px-5 py-4 border-b border-slate-100', className)}
  >
    <div className="skeleton-shimmer w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="skeleton-shimmer h-3.5 w-1/3 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-3 w-2/3 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-2.5 w-1/4 rounded bg-slate-200" />
    </div>
  </div>
);

// ─── Attendance stat card skeleton ────────────────────────────────────────────
Skeleton.AttendanceCard = ({ className }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading…"
    className={cn(
      'rounded-xl border border-slate-200 bg-white p-4 space-y-2 min-h-[96px]',
      className,
    )}
  >
    <div className="skeleton-shimmer h-3 w-16 rounded bg-slate-200" />
    <div className="skeleton-shimmer h-6 w-10 rounded bg-slate-200" />
    <div className="skeleton-shimmer h-2 w-20 rounded bg-slate-200" />
  </div>
);

// ─── Dashboard page skeleton (full page layout) ──────────────────────────────
Skeleton.DashboardPage = ({ statCards = 4, contentCards = 3, className }) => (
  <div role="status" aria-busy="true" aria-label="Loading…" className={cn('space-y-5', className)}>
    <Skeleton.Banner />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: statCards }).map((_, i) => <Skeleton.StatCard key={i} />)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {Array.from({ length: contentCards }).map((_, i) => <Skeleton.AnnouncementRow key={i} />)}
    </div>
  </div>
);

export { Skeleton };
export default Skeleton;
