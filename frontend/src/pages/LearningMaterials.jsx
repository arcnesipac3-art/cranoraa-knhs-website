import { Link } from 'react-router-dom';
import { PageHero, SectionHeading } from '../components/public';

const resources = [
  {
    title: 'Self-learning modules',
    desc: 'DepEd-approved SLMs for all grade levels and subjects',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
  },
  {
    title: 'Worksheets and activities',
    desc: 'Practice exercises and supplementary materials',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  },
  {
    title: 'Video lessons',
    desc: 'Educational videos and multimedia resources',
    icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
];

const LearningMaterials = () => {
  return (
    <div className="bg-white">
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Learning materials' }]}
        kicker="Resources"
        title="Learning materials"
        lead="Access educational resources, modules, and study materials through the school portal."
      />

      {/* ── Login required notice ── */}
      <section className="public-section">
        <div className="public-shell-narrow">
          <div className="public-card p-8 text-center sm:p-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <h2 className="public-heading mt-5">Portal login required</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Learning materials are available to enrolled students and faculty members through the
              school portal. Please log in to access modules, worksheets, and other educational
              resources.
            </p>
            <div className="mt-6 flex justify-center">
              <Link to="/login" className="public-btn-primary">
                Log in to the portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Available resources ── */}
      <section className="public-section-alt">
        <div className="public-shell">
          <SectionHeading
            align="center"
            kicker="In the portal"
            title="Available resources"
            lead="What you will find once you log in."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {resources.map((resource) => (
              <div key={resource.title} className="public-card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={resource.icon} />
                  </svg>
                </span>
                <h3 className="public-subheading mt-4">{resource.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{resource.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearningMaterials;
