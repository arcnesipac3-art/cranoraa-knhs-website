import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';

import { Skeleton } from '../components/ui';
import { PageHero } from '../components/public';

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

  const title = content.announcement_details_title || 'Enrollment for SY 2026–2027 Now Open';
  const category = content.announcement_details_category || 'Academic';
  const date = content.announcement_details_date || 'December 15, 2025';

  return (
    <div className="bg-white">

      {/* ── Hero ── */}
      <PageHero
        breadcrumb={[
          { label: 'Home', to: '/' },
          { label: 'News & events', to: '/news-events' },
          { label: title },
        ]}
        kicker="Announcements"
        title="Announcement details"
        lead="Latest news and updates from Kiwalan National High School."
      />

      {/* ── Content ── */}
      <section className="public-section">
        <div className="public-shell-narrow">

          <article className="public-card p-6 md:p-10">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span className="public-badge">
                {category}
              </span>
              <span className="text-sm text-slate-500">
                {date}
              </span>
            </div>

            {/* Title */}
            <h2 className="public-title">
              {title}
            </h2>

            {/* Body */}
            <div className="public-prose mt-5 text-slate-600 leading-relaxed whitespace-pre-line text-sm md:text-base">
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
            <div className="mt-8 pt-6 border-t border-slate-200">
              <Link to="/" className="public-link inline-flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to home
              </Link>
            </div>
          </article>

          {/* CTA */}
          <div className="mt-6 bg-violet-50 border border-violet-200 rounded-lg p-6 md:p-8 text-center">
            <h3 className="public-heading">Ready to enroll?</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">Start your enrollment process today by filling out our online application form.</p>
            <Link
              to="/enroll"
              className="public-btn-primary mt-5"
            >
              Apply for enrollment
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
            </Link>
          </div>

        </div>
      </section>

    </div>
  );
};

export default AnnouncementDetails;
