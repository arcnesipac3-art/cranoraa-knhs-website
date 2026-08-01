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
    {/* top: icon placeholder */}
    <div className="skeleton-shimmer w-10 h-10 md:w-11 md:h-11 rounded-md bg-slate-200" />
    {/* bottom: label + value + sub */}
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
    {/* time block */}
    <div className="space-y-1.5 min-w-[56px] shrink-0">
      <div className="skeleton-shimmer h-3 w-10 rounded bg-slate-200" />
      <div className="skeleton-shimmer h-2.5 w-8 rounded bg-slate-200" />
    </div>
    {/* subject / classroom */}
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

export { Skeleton };
export default Skeleton;
