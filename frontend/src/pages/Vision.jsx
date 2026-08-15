import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';

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
      {/* Hero Banner */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-semibold text-violet-200 tracking-widest mb-4">Our Aspiration</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
                {content.about_vision_title?.content || 'Our Vision'}
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                The future we envision for Kiwalan National High School and our community
              </p>
            </div>
        </div>
      </section>

      {/* Vision Statement */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-lg">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-900 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Vision Statement</h2>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                  {content.about_vision_content?.content || 'To be a leading educational institution in the region, recognized for academic excellence, innovative teaching methods, and the holistic development of learners who are empowered to contribute meaningfully to society.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Goals */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Strategic Goals</h2>
            <p className="text-gray-600">Our roadmap to achieving our vision</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { year: '2027', title: 'Excellence', desc: 'Achieve 95% student success rate in all academic assessments' },
              { year: '2028', title: 'Innovation', desc: 'Integrate technology-enhanced learning across all grade levels' },
              { year: '2029', title: 'Infrastructure', desc: 'Complete modernization of all school facilities and equipment' },
              { year: '2030', title: 'Community', desc: 'Establish strong partnerships with industry and higher education' }
            ].map((goal, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <div className="text-5xl font-bold text-violet-300 mb-2">{goal.year}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{goal.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{goal.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future Impact */}
      <section className="py-16 md:py-20 bg-violet-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">The Future We're Building</h2>
              <p className="text-violet-100 text-lg leading-relaxed mb-6">
                Our vision extends beyond classroom walls. We are committed to developing well-rounded individuals who will become leaders, innovators, and responsible citizens.
              </p>
              <div className="space-y-4">
                {[
                  'Graduates equipped with 21st-century skills',
                  'Strong foundation in academics and technical skills',
                  'Values-driven, socially responsible citizens',
                  'Active contributors to national development'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-900 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-8 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { val: '100%', label: 'Student Success' },
                  { val: 'Top 5', label: 'Regional Ranking' },
                  { val: '50+', label: 'Community Partners' },
                  { val: '10k+', label: 'Alumni Network' }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">{stat.val}</div>
                    <div className="text-xs text-violet-200 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Vision;
