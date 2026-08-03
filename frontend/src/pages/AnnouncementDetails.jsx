import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';

import { Skeleton } from '../components/ui';

const AnnouncementDetails = () => {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/website-content/public/')
      .then(r => setContent(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 space-y-5 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton.Banner className="h-48" />
      </div>
    );
  }

  return (
    <div className="bg-white">

      {/* ── Hero ── */}
      <section className="bg-slate-900 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">Announcements</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">Announcement Details</h1>
          <p className="text-slate-400">Latest news and updates from Kiwalan National High School</p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="bg-white rounded-2xl border border-slate-100 p-8 md:p-10 mb-6">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold border border-violet-100 uppercase tracking-wider">
                {content.announcement_details_category || 'Academic'}
              </span>
              <span className="text-sm text-slate-400">
                {content.announcement_details_date || 'December 15, 2025'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6 leading-tight">
              {content.announcement_details_title || 'Enrollment for SY 2026–2027 Now Open'}
            </h2>

            {/* Body */}
            <div className="text-slate-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
              {content.announcement_details_content || `We are pleased to announce that enrollment for the upcoming school year 2026-2027 is now open. Registration is accepting applications for all grade levels from Grade 7 to Grade 12.

Requirements for Enrollment:
- Report Card (Form 138)
- Certificate of Good Moral Character
- Birth Certificate (NSO copy)
- 2x2 ID Pictures (2 copies)
- Learner Reference Number (LRN)

Enrollment Schedule:
- Monday to Friday: 8:00 AM - 4:00 PM
- Saturday: 8:00 AM - 12:00 PM

For inquiries, please visit our school office or contact us through the provided contact information.`}
            </div>

            {/* Back */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-8 text-center">
            <h3 className="text-xl font-black text-slate-900 mb-2">Ready to Enroll?</h3>
            <p className="text-slate-500 text-sm mb-5">Start your enrollment process today by filling out our online application form.</p>
            <Link
              to="/enroll"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
            >
              Apply for Enrollment
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
};

export default AnnouncementDetails;
