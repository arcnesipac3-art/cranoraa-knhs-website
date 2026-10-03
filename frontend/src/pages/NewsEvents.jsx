import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Skeleton } from '../components/ui';
import { PageHero, SectionHeading } from '../components/public';

const categoryStyles = {
  emergency: 'border-red-200 bg-red-50 text-red-700',
  events: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  holiday: 'border-amber-200 bg-amber-50 text-amber-700',
  academic: 'border-violet-200 bg-violet-50 text-violet-800',
};

const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const NewsEvents = () => {
  const { data: announcements, loading } = useFetch('/announcements/public/');
  const [filter, setFilter] = useState('all');

  const filteredAnnouncements = filter === 'all' 
    ? announcements 
    : announcements.filter(a => a.category === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 space-y-5 max-w-4xl mx-auto">
        <Skeleton.Banner className="h-48 md:h-64" />
        <Skeleton.CardGrid count={6} cols={3} />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'News and events' }]}
        kicker="News and events"
        title="News and events"
        lead="Stay updated with the latest announcements, activities, and events at Kiwalan NHS."
      />

      {/* ── Filters & announcements ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Announcements"
            title="Latest news"
            lead="Browse official announcements by category, or select all to see everything the school has posted."
          />

          {/* Filters */}
          <div className="mt-7 flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'academic', label: 'Academic' },
              { key: 'events', label: 'Events' },
              { key: 'emergency', label: 'Important' },
              { key: 'holiday', label: 'Holidays' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded border px-4 py-2 text-sm font-semibold transition-colors ${
                  filter === f.key
                    ? 'border-violet-300 bg-violet-50 text-violet-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Announcements grid */}
          {filteredAnnouncements.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-700">No announcements found</p>
              <p className="mt-1 text-sm text-slate-500">Try a different category to see more posts.</p>
            </div>
          ) : (
            <div className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAnnouncements.map(announcement => (
                <article key={announcement.id} className="public-card overflow-hidden p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`rounded border px-2.5 py-1 text-[11px] font-semibold ${
                      categoryStyles[announcement.category] || categoryStyles.academic
                    }`}>
                      {capitalize(announcement.category)}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="public-subheading mt-3">
                    {announcement.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">
                    {announcement.content}
                  </p>
                  {announcement.event_date && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-violet-800">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(announcement.event_date).toLocaleDateString()}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Calendar CTA ── */}
      <section className="public-section-alt">
        <div className="public-shell-narrow text-center">
          <SectionHeading
            align="center"
            kicker="School calendar"
            title="View the full calendar"
            lead="Check all upcoming events, holidays, and important dates in one place."
          />
          <div className="mt-6 flex justify-center">
            <Link to="/calendar" className="public-btn-primary">
              Open school calendar
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewsEvents;
