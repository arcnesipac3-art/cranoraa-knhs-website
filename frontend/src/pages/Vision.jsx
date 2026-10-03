import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';
import { PageHero, SectionHeading } from '../components/public';

const Vision = () => {
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
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Vision' }]}
        kicker="About the school"
        title={content.about_vision_title?.content || 'Our Vision'}
        lead="The future we envision for Kiwalan National High School and our community"
      />
      {/* ── Vision statement ── */}
      <section className="public-section">
        <div className="public-shell-narrow">
          <SectionHeading
            kicker="Our aspiration"
            title="Vision statement"
            lead="The future we are working toward for every learner in our care."
          />

          <div className="public-card mt-8 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="public-prose">
                <p className="whitespace-pre-line md:text-lg">
                  {content.about_vision_content?.content || 'To be a leading educational institution in the region, recognized for academic excellence, innovative teaching methods, and the holistic development of learners who are empowered to contribute meaningfully to society.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ── Strategic goals ── */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <SectionHeading
            kicker="Roadmap"
            title="Strategic goals"
            lead="Our roadmap to achieving our vision."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { year: '2027', title: 'Excellence', desc: 'Achieve 95% student success rate in all academic assessments' },
              { year: '2028', title: 'Innovation', desc: 'Integrate technology-enhanced learning across all grade levels' },
              { year: '2029', title: 'Infrastructure', desc: 'Complete modernization of all school facilities and equipment' },
              { year: '2030', title: 'Community', desc: 'Establish strong partnerships with industry and higher education' }
            ].map((goal, i) => (
              <article key={i} className="public-card p-6">
                <span className="public-badge">{goal.year}</span>
                <h3 className="public-subheading mt-3">{goal.title}</h3>
                <div className="public-rule" aria-hidden="true" />
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{goal.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {/* ── Future impact ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Our impact"
            title="The future we&rsquo;re building"
            lead="Our vision extends beyond classroom walls. We are committed to developing well-rounded individuals who will become leaders, innovators, and responsible citizens."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Outcomes */}
            <div className="public-card p-6 md:p-8">
              <h3 className="public-subheading">The learners we aim to form</h3>
              <div className="public-rule" aria-hidden="true" />
              <ul className="mt-4 space-y-4">
                {[
                  'Graduates equipped with 21st-century skills',
                  'Strong foundation in academics and technical skills',
                  'Values-driven, socially responsible citizens',
                  'Active contributors to national development'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-violet-200 bg-violet-50 text-violet-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm leading-relaxed text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Target figures */}
            <div className="public-card p-6 md:p-8">
              <h3 className="public-subheading">Targets we track</h3>
              <div className="public-rule" aria-hidden="true" />
              <dl className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { val: '100%', label: 'Student success' },
                  { val: 'Top 5', label: 'Regional ranking' },
                  { val: '50+', label: 'Community partners' },
                  { val: '10k+', label: 'Alumni network' }
                ].map((stat, i) => (
                  <div key={i} className="public-card-muted px-4 py-5 text-center">
                    <dt className="text-2xl font-bold tracking-tight text-slate-900">{stat.val}</dt>
                    <dd className="mt-1 text-[11px] font-medium tracking-[0.1em] text-slate-500">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Vision;
