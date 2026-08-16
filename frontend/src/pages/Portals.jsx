import { Link } from 'react-router-dom';

const Portals = () => {
  const portals = [
    {
      name: 'Kiwalan NHS Portal',
      desc: 'Official student and teacher portal for grades, attendance, and school activities',
      url: '/login',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      color: 'purple',
      internal: true
    },
    {
      name: 'DepEd Commons',
      desc: 'Official DepEd portal for learning resources, modules, and educational materials',
      url: 'https://commons.deped.gov.ph',
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      color: 'blue',
      internal: false
    },
    {
      name: 'LIS (Learner Information System)',
      desc: 'DepEd LIS for student enrollment, records, and academic information',
      url: 'https://lis.deped.gov.ph',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      color: 'green',
      internal: false
    },
    {
      name: 'DepEd Email',
      desc: 'Official email system for DepEd employees and authorized personnel',
      url: 'https://mail.deped.gov.ph',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      color: 'red',
      internal: false
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      purple: 'from-violet-900 to-violet-950 hover:from-violet-900 hover:to-violet-900',
      blue: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
      green: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
      red: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-4">Online Access</p>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5 uppercase">
                Portals & Systems
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                Access official school and DepEd online systems
              </p>
            </div>
        </div>
      </section>

      {/* Portals Grid */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {portals.map((portal, i) => (
              portal.internal ? (
                <Link
                  key={i}
                  to={portal.url}
                  className={`group bg-gradient-to-br ${getColorClasses(portal.color)} rounded-3xl p-8 text-white hover:shadow-2xl transition-all`}
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={portal.icon} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2 uppercase">{portal.name}</h3>
                      <p className="text-white/90 leading-relaxed mb-4">{portal.desc}</p>
                      <div className="inline-flex items-center gap-2 text-sm font-bold">
                        Access Portal
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <a
                  key={i}
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group bg-gradient-to-br ${getColorClasses(portal.color)} rounded-3xl p-8 text-white hover:shadow-2xl transition-all`}
                >
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={portal.icon} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-black mb-2 uppercase">{portal.name}</h3>
                      <p className="text-white/90 leading-relaxed mb-4">{portal.desc}</p>
                      <div className="inline-flex items-center gap-2 text-sm font-bold">
                        Visit Website
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </a>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase">Need Help?</h2>
          <p className="text-gray-700 mb-6">
            For portal access issues or technical support, please contact the school ICT office during office hours.
          </p>
          <Link to="/contact" className="inline-flex items-center gap-2 px-8 py-4 bg-violet-900 text-white rounded-xl font-black hover:bg-violet-950 transition-colors uppercase">
            Contact ICT Support
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Portals;
