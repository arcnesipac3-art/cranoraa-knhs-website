import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';
import { PageHero, SectionHeading } from '../components/public';

const About = () => {
  const { content, loading } = useWebsiteContent();

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 space-y-5 max-w-4xl mx-auto">
        <Skeleton.Banner className="h-48 md:h-64" />
        <Skeleton.Text lines={4} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
        </div>
        <Skeleton.Text lines={3} lastLineWidth="60%" />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'About' }]}
        kicker="About the school"
        title={content.about_title?.content || 'About Our School'}
        lead={content.about_subtitle?.content || 'Learn about our history, mission, and the values that drive our commitment to excellence in education.'}
      />
      {/* ── Mission & Vision ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Our purpose"
            title="Mission and vision"
            lead="The statements that guide our work as a public secondary school."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Mission */}
            <article className="public-card p-6 md:p-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="public-heading mt-4">
                {content.about_mission_title?.content || 'Our Mission'}
              </h3>
              <div className="public-rule" aria-hidden="true" />
              <div className="public-prose mt-4">
                <p className="whitespace-pre-line">
                  {content.about_mission_content?.content || "To provide quality education that develops students' academic excellence, moral character, and practical skills."}
                </p>
              </div>
            </article>

            {/* Vision */}
            <article className="public-card p-6 md:p-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="public-heading mt-4">
                {content.about_vision_title?.content || 'Our Vision'}
              </h3>
              <div className="public-rule" aria-hidden="true" />
              <div className="public-prose mt-4">
                <p className="whitespace-pre-line">
                  {content.about_vision_content?.content || 'To be a leading educational institution recognized for academic excellence and innovative teaching methods.'}
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
      {/* ── School at a glance ── */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <SectionHeading
            kicker="At a glance"
            title="School overview"
            lead="Key figures that reflect the scale of the school and its community."
          />

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { val: '20+', label: 'Years of excellence', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { val: '1,200+', label: 'Current students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { val: '5,000+', label: 'Alumni', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { val: '80+', label: 'Faculty members', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            ].map((s, i) => (
              <div key={i} className="public-card flex flex-col items-center px-4 py-6 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={s.icon} />
                  </svg>
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{s.val}</p>
                <p className="mt-1 text-[11px] font-medium tracking-[0.1em] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── History ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Our legacy"
            title={content.about_history_title?.content || 'Our History'}
            lead="From a small community school to a comprehensive high school serving hundreds of learners."
          />

          <div className="public-card-muted mt-8 p-6 md:p-8">
            <div className="public-prose">
              <p className="whitespace-pre-line">
                {content.about_history_content?.content || 'Kiwalan National High School was established with the vision of providing accessible and quality education to the youth of Kiwalan and its neighboring communities. Over the years, we have grown from a small learning institution to a comprehensive high school serving hundreds of students.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
