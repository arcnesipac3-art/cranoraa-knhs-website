import { Link } from 'react-router-dom';

const LearningMaterials = () => {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-violet-950 py-10 sm:py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-3 sm:mb-4">Resources</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4 sm:mb-5 uppercase">
                Learning Materials
              </h1>
              <p className="text-violet-100 leading-relaxed text-base sm:text-lg">
                Access educational resources, modules, and study materials
              </p>
            </div>
        </div>
      </section>

      {/* Login Required Notice */}
      <section className="py-10 sm:py-16 md:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-violet-200 p-6 sm:p-8 md:p-12 text-center shadow-lg">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-violet-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 sm:mb-4 uppercase">Portal Login Required</h2>
            <p className="text-gray-700 mb-5 sm:mb-6 leading-relaxed text-sm sm:text-base">
              Learning materials are available to enrolled students and faculty members through the school portal. Please log in to access modules, worksheets, and other educational resources.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-violet-900 text-white rounded-xl font-black hover:bg-violet-950 transition-colors uppercase text-sm sm:text-base">
              Login to Portal
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Available Resources (Preview) */}
      <section className="py-10 sm:py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2 sm:mb-3 uppercase">Available Resources</h2>
            <p className="text-gray-600 text-sm sm:text-base">What you'll find in the portal</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { 
                title: 'Self-Learning Modules', 
                desc: 'DepEd-approved SLMs for all grade levels and subjects',
                icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
              },
              { 
                title: 'Worksheets & Activities', 
                desc: 'Practice exercises and supplementary materials',
                icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              },
              { 
                title: 'Video Lessons', 
                desc: 'Educational videos and multimedia resources',
                icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              }
            ].map((resource, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border-2 border-violet-200 p-5 sm:p-6 hover:shadow-lg transition-all">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-violet-900 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={resource.icon} />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1.5 sm:mb-2 uppercase">{resource.title}</h3>
                <p className="text-xs sm:text-sm text-gray-700">{resource.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearningMaterials;
