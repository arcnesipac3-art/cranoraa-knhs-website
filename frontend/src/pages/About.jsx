import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';

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

      {/* ── Hero Banner ── */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-violet-950 via-violet-900 to-violet-800" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-semibold text-violet-200 tracking-widest mb-4">About Kiwalan NHS</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
                {content.about_title?.content || 'About Our School'}
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                {content.about_subtitle?.content || 'Learn about our history, mission, and the values that drive our commitment to excellence in education.'}
              </p>
            </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* Mission */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-violet-900 flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {content.about_mission_title?.content || 'Our Mission'}
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {content.about_mission_content?.content || "To provide quality education that develops students' academic excellence, moral character, and practical skills."}
              </p>
            </div>

            {/* Vision */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-violet-900 flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {content.about_vision_title?.content || 'Our Vision'}
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {content.about_vision_content?.content || 'To be a leading educational institution recognized for academic excellence and innovative teaching methods.'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { val: '20+', label: 'Years of Excellence', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { val: '1,200+', label: 'Current Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { val: '5,000+', label: 'Alumni', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { val: '80+', label: 'Faculty Members', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 text-center hover:border-violet-300 hover:bg-violet-50 transition-all">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-violet-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-violet-800 mb-1">{s.val}</p>
                <p className="text-xs font-medium text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── History ── */}
      <section className="py-16 md:py-20 bg-violet-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold text-violet-200 tracking-widest mb-3">Our Legacy</p>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {content.about_history_title?.content || 'Our History'}
              </h2>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
              <p className="text-white leading-relaxed whitespace-pre-line text-base">
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
