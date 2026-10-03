import { Link } from 'react-router-dom';
import { PageHero, SectionHeading } from '../components/public';

const Portals = () => {
  const portals = [
    {
      name: 'Kiwalan NHS portal',
      desc: 'Official student and teacher portal for grades, attendance, and school activities',
      url: '/login',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      internal: true
    },
    {
      name: 'DepEd Commons',
      desc: 'Official DepEd portal for learning resources, modules, and educational materials',
      url: 'https://commons.deped.gov.ph',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      internal: false
    },
    {
      name: 'LIS (Learner Information System)',
      desc: 'DepEd LIS for student enrollment, records, and academic information',
      url: 'https://lis.deped.gov.ph',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      internal: false
    },
    {
      name: 'DepEd Email',
      desc: 'Official email system for DepEd employees and authorized personnel',
      url: 'https://mail.deped.gov.ph',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      internal: false
    }
  ];

  return (
    <div className="bg-white">
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Portals' }]}
        kicker="Online access"
        title="Portals and systems"
        lead="Access official school and DepEd online systems."
        actions={
          <Link to="/contact" className="public-btn-secondary">
            Contact the school
          </Link>
        }
      />

      {/* ── Portal directory ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Directory"
            title="School and DepEd systems"
            lead="Open the system you need. Links to external DepEd websites open in a new tab."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {portals.map((portal) => (
              portal.internal ? (
                <Link
                  key={portal.url}
                  to={portal.url}
                  className="public-card-interactive group flex items-start gap-4 p-6"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={portal.icon} />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="public-subheading block">{portal.name}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">{portal.desc}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-800 transition-colors group-hover:text-violet-600">
                      Access portal
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </span>
                </Link>
              ) : (
                <a
                  key={portal.url}
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="public-card-interactive group flex items-start gap-4 p-6"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={portal.icon} />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="public-subheading block">{portal.name}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">{portal.desc}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-800 transition-colors group-hover:text-violet-600">
                      Visit website
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </span>
                  </span>
                </a>
              )
            ))}
          </div>
        </div>
      </section>

      {/* ── Support ── */}
      <section className="public-section-alt">
        <div className="public-shell-narrow text-center">
          <SectionHeading
            align="center"
            kicker="Technical support"
            title="Need help?"
            lead="For portal access issues or technical support, please contact the school ICT office during office hours."
          />
          <div className="mt-6 flex justify-center">
            <Link to="/contact" className="public-btn-primary">
              Contact ICT support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Portals;
