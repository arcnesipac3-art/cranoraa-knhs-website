import { Link } from 'react-router-dom';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';
import { PageHero, SectionHeading } from '../components/public';

const Contact = () => {
  const { content, loading } = useWebsiteContent();

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 space-y-5 max-w-4xl mx-auto">
        <Skeleton.Banner className="h-48 md:h-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.AnnouncementRow key={i} />)}
        </div>
      </div>
    );
  }

  const infoItems = [
    {
      label: 'Address',
      value: content.contact_address?.content || 'Kiwalan, Philippines',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      label: 'Email',
      value: content.contact_email?.content || 'info@kiwalan-nhs.edu.ph',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    },
    {
      label: 'Phone',
      value: content.contact_phone?.content || '(123) 456-7890',
      icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    },
    {
      label: 'Office hours',
      value: content.contact_office_hours?.content || 'Mon – Fri: 7:00 AM – 5:00 PM',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  return (
    <div className="bg-white">
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}
        kicker="Contact the school"
        title={content.contact_title?.content || 'Get in touch'}
        lead={
          content.contact_subtitle?.content ||
          'Have questions about enrollment or our programs? We are here to help.'
        }
        actions={
          <Link to="/enroll" className="public-btn-primary">
            Apply for enrollment
          </Link>
        }
      />

      {/* ── Contact details + map ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Contact information"
            title="How to reach the school"
            lead="Reach the school office by email, phone or letter, or visit us during office hours."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Info list */}
            <dl className="public-card divide-y divide-slate-200 self-start lg:col-span-2">
              {infoItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={item.icon} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <dt className="public-dl-label">{item.label}</dt>
                    <dd className="public-dl-value mt-1 break-words">{item.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            {/* Map */}
            <div className="lg:col-span-3">
              <div className="public-card overflow-hidden">
                {content.contact_map_url?.content ? (
                  <iframe
                    src={content.contact_map_url.content}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '480px' }}
                    allowFullScreen=""
                    loading="lazy"
                    title="School Location"
                  />
                ) : (
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3948.2297046439908!2d124.27159847501021!3d8.27992249175451!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x325576cc580e692d%3A0x1ee65da2c86ad0a6!2sKiwalan%20National%20High%20School!5e0!3m2!1sen!2sph!4v1779569511724!5m2!1sen!2sph"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '480px' }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="School Location"
                  />
                )}

                {/* Plain caption bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Kiwalan National High School</p>
                    <p className="mt-0.5 text-xs text-slate-500">Main campus · Kiwalan, Philippines</p>
                  </div>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Kiwalan+National+High+School"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="public-btn-secondary"
                  >
                    Directions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Enrollment CTA ── */}
      <section className="public-section-alt">
        <div className="public-shell-narrow">
          <div className="public-card p-8 text-center">
            <p className="public-kicker">Enrollment</p>
            <h2 className="public-heading mt-2">Ready to enroll?</h2>
            <p className="public-lead mx-auto max-w-xl">Applications are open for SY 2026&ndash;2027.</p>
            <div className="mt-5 flex justify-center">
              <Link to="/enroll" className="public-btn-primary">
                Apply now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
