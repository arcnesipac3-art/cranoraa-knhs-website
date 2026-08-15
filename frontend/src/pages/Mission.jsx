import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';

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
      {/* Hero Banner */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-semibold text-violet-200 tracking-widest mb-4">Our Purpose</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
                {content.about_mission_title?.content || 'Our Mission'}
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                The guiding principle that drives everything we do at Kiwalan National High School
              </p>
            </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-lg">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-900 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Mission Statement</h2>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                  {content.about_mission_content?.content || "To provide quality education that develops students' academic excellence, moral character, and practical skills for lifelong learning and productive citizenship."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Our Core Values</h2>
            <p className="text-gray-600">The principles that guide our actions and decisions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div key={i} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <div className="w-14 h-14 rounded-xl bg-violet-900 flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={value.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{value.title}</h3>
                <p className="text-gray-700 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission in Action */}
      <section className="py-16 md:py-20 bg-violet-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Mission in Action</h2>
            <p className="text-violet-100">How we fulfill our mission every day</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              'Quality Teaching: Our dedicated faculty employ innovative, student-centered teaching methods',
              'Holistic Development: We nurture not just academic skills, but character, values, and social responsibility',
              'Modern Facilities: We provide well-equipped classrooms, laboratories, and learning resources',
              'Community Partnership: We actively engage with parents, local organizations, and the wider community'
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-white/10 rounded-xl border border-white/20">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm font-bold">{i + 1}</span>
                </div>
                <p className="text-white leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Mission;
