import { useState } from 'react';
import { administration, faculty, getInitials } from '../data/facultyData';
import { PageHero, SectionHeading } from '../components/public';

// ── Position badge color mapping ─────────────────────────────────────────────
const BADGE_COLORS = {
  'School Principal I':           'bg-yellow-100 text-yellow-800 border-yellow-200',
  'School Guidance Designate':    'bg-blue-100 text-blue-800 border-blue-200',
  'Administrative Officer I':     'bg-slate-100 text-slate-700 border-slate-200',
  'Administrative Assistant III': 'bg-slate-100 text-slate-700 border-slate-200',
  'Master Teacher I':             'bg-violet-100 text-violet-800 border-violet-200',
  'Special Science Teacher I':    'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Teacher VI':                   'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Teacher V':                    'bg-purple-100 text-purple-800 border-purple-200',
  'Teacher IV':                   'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'Teacher III':                  'bg-sky-100 text-sky-800 border-sky-200',
  'Teacher II':                   'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Teacher I':                    'bg-teal-100 text-teal-800 border-teal-200',
  'ALS Teacher':                  'bg-orange-100 text-orange-800 border-orange-200',
};

function badgeColor(position) {
  return BADGE_COLORS[position] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

// Shared chip classes for a position / rank label
const POSITION_CHIP =
  "inline-block rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide";

// ── Avatar ────────────────────────────────────────────────────────────────────
// Photo fills the entire card top — no padding around it, maximises clarity.
function PhotoArea({ name, photo, tall = false }) {
  const [imgError, setImgError] = useState(false);
  const showPhoto = photo && !imgError;
  const initials = getInitials(name);

  return (
    // aspect-[3/4] gives a consistent portrait ratio regardless of card width
    <div className={`w-full ${tall ? 'aspect-[3/4]' : 'aspect-[3/4]'} bg-slate-100 overflow-hidden relative`}>
      {showPhoto ? (
        <img
          src={photo}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover object-top"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-violet-50">
          <span className="text-2xl font-bold text-violet-500 select-none">{initials}</span>
        </div>
      )}
    </div>
  );
}

// ── Regular faculty card ──────────────────────────────────────────────────────
function PersonCard({ person }) {
  return (
    <div className="public-card-interactive overflow-hidden">
      <PhotoArea name={person.name} photo={person.photo} />
      <div className="border-t border-slate-200 px-3 py-3 text-center">
        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
          {person.name}
        </h3>
        <span className={`mt-2 ${POSITION_CHIP} ${badgeColor(person.position)}`}>
          {person.position}
        </span>
      </div>
    </div>
  );
}

// ── Admin card — featured, slightly wider feel ────────────────────────────────
function AdminCard({ person }) {
  return (
    <div className="public-card-interactive overflow-hidden">
      <PhotoArea name={person.name} photo={person.photo} />
      <div className="border-t border-slate-200 px-4 py-3.5 text-center">
        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
          {person.name}
        </h3>
        <span className={`mt-2 ${POSITION_CHIP} ${badgeColor(person.position)}`}>
          {person.position}
        </span>
      </div>
    </div>
  );
}

// ── Group faculty by rank ─────────────────────────────────────────────────────
const RANK_ORDER = [
  'Master Teacher I',
  'Special Science Teacher I',
  'Teacher VI',
  'Teacher V',
  'Teacher IV',
  'Teacher III',
  'Teacher II',
  'Teacher I',
  'ALS Teacher',
];

function groupByPosition(list) {
  const groups = {};
  for (const person of list) {
    if (!groups[person.position]) groups[person.position] = [];
    groups[person.position].push(person);
  }
  const ordered = [];
  for (const rank of RANK_ORDER) {
    if (groups[rank]) ordered.push({ position: rank, members: groups[rank] });
  }
  for (const [pos, members] of Object.entries(groups)) {
    if (!RANK_ORDER.includes(pos)) ordered.push({ position: pos, members });
  }
  return ordered;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Administration',  value: administration.length },
  { label: 'Teaching Staff',  value: faculty.filter(f => !f.position.includes('ALS') && !f.position.includes('ALIVE')).length },
  { label: 'ALS',             value: faculty.filter(f => f.position.includes('ALS') || f.position.includes('ALIVE')).length },
  { label: 'Total Personnel', value: administration.length + faculty.length },
];

// ── Page ──────────────────────────────────────────────────────────────────────
const Faculty = () => {
  const [search, setSearch] = useState('');
  const groups = groupByPosition(faculty);

  const filteredAdmin = administration.filter(
    (p) =>
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.position.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      members: search
        ? g.members.filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.position.toLowerCase().includes(search.toLowerCase()),
          )
        : g.members,
    }))
    .filter((g) => g.members.length > 0);

  const totalResults =
    filteredAdmin.length + filteredGroups.reduce((s, g) => s + g.members.length, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Faculty & staff' }]}
        kicker="Kiwalan National High School · SY 2025–2026"
        title="Faculty & staff"
        lead="Meet the administrators, teachers and personnel who serve the Kiwalan NHS community."
      />
      {/* ── Personnel at a glance ── */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="public-shell py-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="public-card px-4 py-3.5 text-center">
                <div className="text-2xl font-bold leading-none text-slate-900">{s.value}</div>
                <div className="mt-1.5 text-[11px] font-semibold tracking-wide text-slate-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── Search bar (sits directly under the sticky site nav) ── */}
      <div className="sticky top-14 z-30 border-b border-slate-200 bg-white/95 backdrop-blur py-2.5">
        <div className="public-shell flex items-center gap-4">
          <div className="relative w-full sm:w-72">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search name or position…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm
                text-slate-700 placeholder:text-slate-400
                focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              aria-label="Search faculty and staff"
            />
          </div>
          {search && (
            <span className="hidden shrink-0 text-[13px] text-slate-500 sm:inline">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      {/* ── School administration ── */}
      {filteredAdmin.length > 0 && (
        <section className="public-section">
          <div className="public-shell">
            <SectionHeading
              kicker="Leadership"
              title="School administration"
              lead="The school leadership team overseeing academic and operational affairs."
            />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredAdmin.map((person) => (
                <AdminCard key={person.id} person={person} />
              ))}
            </div>
          </div>
        </section>
      )}
      {/* ── Teaching staff ── */}
      {filteredGroups.length > 0 && (
        <section className="public-section public-section-alt">
          <div className="public-shell">
            <SectionHeading
              kicker="Our educators"
              title="Teaching staff"
              lead="Classroom teachers grouped by rank, from master teachers to entry-level personnel."
            />

            <div className="mt-8 space-y-10">
              {filteredGroups.map(({ position, members }) => (
                <div key={position}>
                  {/* Rank header */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className={`${POSITION_CHIP} ${badgeColor(position)}`}>
                      {position}
                    </span>
                    <span className="text-[13px] text-slate-500">
                      {members.length} {members.length === 1 ? 'member' : 'members'}
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {members.map((person) => (
                      <PersonCard key={person.id} person={person} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* ── No results ── */}
      {totalResults === 0 && search && (
        <section className="public-section">
          <div className="public-shell text-center">
            <p className="public-heading">No results for &ldquo;{search}&rdquo;</p>
            <p className="public-lead">Try a different name or position, or clear the search.</p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="public-btn-secondary mt-5"
            >
              Clear search
            </button>
          </div>
        </section>
      )}
      {/* ── Join our team ── */}
      <section className="public-section border-t border-slate-200">
        <div className="public-shell">
          <div className="public-card mx-auto max-w-3xl px-6 py-9 text-center sm:px-10">
            <p className="public-kicker">Careers</p>
            <h2 className="public-heading mt-2">Join our team</h2>
            <div className="public-rule public-rule-center" aria-hidden="true" />
            <p className="public-lead">
              We are looking for passionate educators to join the Kiwalan NHS family.
            </p>
            <div className="mt-6">
              <a href="/contact" className="public-btn-primary">
                Get in touch
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.6}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Faculty;
