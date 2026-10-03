import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';
import { PageHero, SectionHeading } from '../components/public';

const Mission = () => {
  const { content, loading } = useWebsiteContent();

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 space-y-5 max-w-4xl mx-auto">
        <Skeleton.Banner className="h-48 md:h-64" />
        <Skeleton.Text lines={4} />
        <Skeleton.CardGrid count={3} cols={3} />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Mission' }]}
        kicker="About the school"
        title={content.about_mission_title?.content || 'Our Mission'}
        lead="The guiding principle that drives everything we do at Kiwalan National High School"
      />

      {/* ── Mission statement ── */}
      <section className="public-section">
        <div className="public-shell-narrow">
          <SectionHeading
            kicker="Our purpose"
            title="Mission statement"
            lead="The commitment we make to every learner, parent and partner we serve."
          />

          <div className="public-card mt-8 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="public-prose">
                <p className="whitespace-pre-line md:text-lg">
                  {content.about_mission_content?.content || "To provide quality education that develops students' academic excellence, moral character, and practical skills for lifelong learning and productive citizenship."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core values ── */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <SectionHeading
            kicker="What we stand for"
            title="Our core values"
            lead="The principles that guide our actions and decisions."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: 'Excellence',
                desc: 'We strive for the highest standards in education, continuously improving our teaching methods and curricula.',
                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
              },
              {
                title: 'Integrity',
                desc: 'We uphold honesty, transparency, and ethical conduct in all aspects of school life.',
                icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
              },
              {
                title: 'Community',
                desc: 'We foster a supportive, inclusive environment where every member is valued and respected.',
                icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z'
              }
            ].map((value, i) => (
              <article key={i} className="public-card p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={value.icon} />
                  </svg>
                </div>
                <h3 className="public-subheading mt-4">{value.title}</h3>
                <div className="public-rule" aria-hidden="true" />
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{value.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission in action ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="In practice"
            title="Mission in action"
            lead="How we fulfil our mission every day."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                title: 'Quality teaching',
                desc: 'Our dedicated faculty employ innovative, student-centered teaching methods.'
              },
              {
                title: 'Holistic development',
                desc: 'We nurture not just academic skills, but character, values, and social responsibility.'
              },
              {
                title: 'Modern facilities',
                desc: 'We provide well-equipped classrooms, laboratories, and learning resources.'
              },
              {
                title: 'Community partnership',
                desc: 'We actively engage with parents, local organizations, and the wider community.'
              }
            ].map((item, i) => (
              <article key={i} className="public-card-muted flex items-start gap-4 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-800">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="public-subheading">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Mission;
