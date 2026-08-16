import { useState } from 'react';
import { administration, faculty, getInitials } from '../data/facultyData';

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
          <span className="text-3xl font-black text-violet-400 select-none">{initials}</span>
        </div>
      )}
    </div>
  );
}

// ── Regular faculty card ──────────────────────────────────────────────────────
function PersonCard({ person }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden
      hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
      <PhotoArea name={person.name} photo={person.photo} />
      <div className="px-3 py-3 text-center">
        <h3 className="text-[11px] font-black text-slate-900 leading-tight uppercase tracking-wide line-clamp-2">
          {person.name}
        </h3>
        <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeColor(person.position)}`}>
          {person.position}
        </span>
      </div>
    </div>
  );
}

// ── Admin card — featured, slightly wider feel ────────────────────────────────
function AdminCard({ person }) {
  return (
    <div className="bg-white rounded-xl border-2 border-violet-200 overflow-hidden
      hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150">
      <PhotoArea name={person.name} photo={person.photo} />
      <div className="px-3 py-3 text-center border-t-2 border-violet-100">
        <h3 className="text-xs font-black text-slate-900 leading-tight uppercase tracking-wide line-clamp-2">
          {person.name}
        </h3>
        <span className={`mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${badgeColor(person.position)}`}>
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
    <div className="bg-slate-50 min-h-screen">

      {/* ── Hero — compact ── */}
      <section className="bg-violet-950 py-10 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
            <div>
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">
                Kiwalan National High School · SY 2025–2026
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase leading-tight">
                Faculty & Staff
              </h1>
            </div>
            {/* Stats inline */}
            <div className="flex gap-2 sm:gap-3 flex-wrap w-full sm:w-auto justify-center sm:justify-end">
              {STATS.map((s) => (
                <div key={s.label} className="bg-white/10 border border-white/15 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-center min-w-[70px] sm:min-w-[80px]">
                  <div className="text-lg sm:text-xl font-black text-white">{s.value}</div>
                  <div className="text-[8px] sm:text-[9px] font-bold text-violet-300 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Search bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search name or position…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm
                focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
                placeholder:text-slate-400 bg-slate-50"
              aria-label="Search faculty and staff"
            />
          </div>
          {search && (
            <span className="text-xs text-slate-500 font-semibold">
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* ── School Administration ── */}
        {filteredAdmin.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div>
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Leadership</p>
                <h2 className="text-lg font-black text-slate-900 uppercase">School Administration</h2>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            {/* 4 cols — admin cards are wider so fewer per row is intentional */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {filteredAdmin.map((person) => (
                <AdminCard key={person.id} person={person} />
              ))}
            </div>
          </section>
        )}

        {/* ── Teaching Staff ── */}
        {filteredGroups.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div>
                <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Our Educators</p>
                <h2 className="text-lg font-black text-slate-900 uppercase">Teaching Staff</h2>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="space-y-8">
              {filteredGroups.map(({ position, members }) => (
                <div key={position}>
                  {/* Rank header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeColor(position)}`}>
                      {position}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {members.length} {members.length === 1 ? 'member' : 'members'}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* 6 cards per row on large screens — dense, clear grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                    {members.map((person) => (
                      <PersonCard key={person.id} person={person} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── No results ── */}
        {totalResults === 0 && search && (
          <div className="py-16 text-center">
            <p className="text-slate-400 font-semibold">No results for &ldquo;{search}&rdquo;</p>
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-sm font-bold text-violet-700 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      {/* ── CTA footer ── */}
      <section className="mt-6 py-10 bg-violet-950 text-white">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-xl font-black uppercase mb-2">Join Our Team</h2>
          <p className="text-violet-300 mb-5 text-sm">
            Looking for passionate educators to join the Kiwalan NHS family.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 bg-white text-violet-950 font-black uppercase
              tracking-wider text-xs px-5 py-2.5 rounded-lg hover:bg-violet-100 transition-colors"
          >
            Get in Touch
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

    </div>
  );
};

export default Faculty;
