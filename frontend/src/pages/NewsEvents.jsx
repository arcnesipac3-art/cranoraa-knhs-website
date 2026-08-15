import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { Skeleton } from '../components/ui';

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
      {/* Hero */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-semibold text-violet-200 tracking-widest mb-4">What's Happening</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
                News & Events
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                Stay updated with the latest announcements, activities, and events at Kiwalan NHS
              </p>
            </div>
        </div>
      </section>

      {/* Filters & Content */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-10 justify-center">
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
                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  filter === f.key 
                    ? 'bg-violet-900 text-white shadow-lg' 
                    : 'bg-white text-violet-900 border border-slate-200 hover:border-violet-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Announcements Grid */}
          {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-600">No announcements found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnnouncements.map(announcement => (
                <div key={announcement.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all group">
                  <div className={`h-2 ${
                    announcement.category === 'emergency' ? 'bg-red-500' :
                    announcement.category === 'events' ? 'bg-green-500' :
                    announcement.category === 'holiday' ? 'bg-yellow-500' :
                    'bg-slate-500'
                  }`} />
                  <div className="p-3 sm:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                        announcement.category === 'emergency' ? 'bg-red-100 text-red-700' :
                        announcement.category === 'events' ? 'bg-green-100 text-green-700' :
                        announcement.category === 'holiday' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-violet-100 text-violet-900'
                      }`}>
                        {announcement.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-violet-900 transition-colors">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 mb-4">
                      {announcement.content}
                    </p>
                    {announcement.event_date && (
                      <div className="flex items-center gap-2 text-violet-800 text-sm font-bold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(announcement.event_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Calendar CTA */}
      <section className="py-16 bg-violet-950 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">View Full Calendar</h2>
          <p className="text-violet-100 mb-6">Check all upcoming events, holidays, and important dates</p>
          <Link to="/calendar" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-violet-900 rounded-xl font-bold hover:bg-violet-50 transition-colors">
            Open School Calendar
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default NewsEvents;
