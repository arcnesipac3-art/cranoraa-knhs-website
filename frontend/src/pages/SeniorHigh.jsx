import { Link } from 'react-router-dom';

const SeniorHigh = () => {
  const tracks = [
    {
      code: 'Academic',
      name: 'Academic Track',
      desc: 'Designed for students preparing for higher education and college degree programs. Builds strong foundations in liberal arts, sciences, and professional studies.',
      electives: ['Humanities & Social Sciences', 'Business & Economics', 'Sciences & Mathematics', 'Language & Communication'],
      careers: ['College Degree Programs', 'Professional Licensing', 'Research & Academe'],
      color: 'from-blue-600 to-violet-800'
    },
    {
      code: 'TechPro',
      name: 'Technical-Professional Track',
      desc: 'For students seeking technical and vocational skills for immediate employment or specialized training. Aligns with TESDA certifications and industry-ready competencies.',
      electives: ['ICT & Digital Arts', 'Industrial Arts', 'Home Economics', 'Agri-Fishery Arts', 'Sports & Recreation'],
      careers: ['TESDA Certified', 'Technical Specialist', 'Industry Professional', 'Entrepreneur'],
      color: 'from-yellow-600 to-orange-600'
    }
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-semibold text-violet-200 tracking-widest mb-4">Grades 11-12</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
                Senior High School
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                Strengthened SHS Curriculum — fewer core subjects, flexible electives, and career-ready tracks
              </p>
            </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-lg mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">About the Strengthened SHS Curriculum</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              The Department of Education rolled out the Strengthened Senior High School Curriculum, replacing the old strand system with a streamlined two-track model. Core subjects have been reduced from 15 to just 5, and former applied and specialized subjects are now flexible electives you can mix and match based on your interests or college course goals.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Duration', value: '2 Years' },
                { label: 'Grade Levels', value: '11 - 12' },
                { label: 'Core Subjects', value: '5 Only' },
                { label: 'Tracks', value: '2 Options' }
              ].map((info, i) => (
                <div key={i} className="text-center p-4 bg-slate-50 rounded-xl border border-violet-200">
                  <p className="text-2xl font-bold text-violet-800 mb-1">{info.value}</p>
                  <p className="text-xs text-gray-600 font-medium">{info.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Choose Your Track</h2>
            <p className="text-gray-600">Select a path that aligns with your goals</p>
          </div>

          <div className="space-y-6">
            {tracks.map((track, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all">
                <div className={`h-2 bg-gradient-to-r ${track.color}`} />
                <div className="p-3 sm:p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-4 py-2 bg-violet-900 text-white rounded-lg font-bold text-lg">{track.code}</span>
                        <h3 className="text-xl font-bold text-slate-900">{track.name}</h3>
                      </div>
                      <p className="text-gray-700 mb-4">{track.desc}</p>
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-violet-800 mb-2">Available Electives:</p>
                        <div className="flex flex-wrap gap-2">
                          {track.electives.map((el, j) => (
                            <span key={j} className="px-3 py-1 bg-slate-50 text-violet-900 rounded-full text-xs font-bold border border-violet-200">
                              {el}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-violet-800 mb-2">Career Paths:</p>
                        <p className="text-sm text-gray-600">{track.careers.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Link to="/enroll" className="px-6 py-3 bg-violet-900 text-white rounded-xl font-semibold text-sm hover:bg-violet-950 transition-colors">
                        Enroll Now
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Subjects */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Core Subjects</h2>
            <p className="text-gray-600">Required for all SHS students regardless of track</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { subject: 'Effective Communication', area: 'Languages' },
              { subject: 'General Mathematics', area: 'Math' },
              { subject: 'General Science', area: 'Science' },
              { subject: 'Life and Career Skills', area: 'Core' },
              { subject: 'Kasaysayan at Lipunang Filipino', area: 'Filipino' }
            ].map((sub, i) => (
              <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:bg-white transition-all">
                <p className="text-sm font-semibold text-slate-900">{sub.subject}</p>
                <p className="text-xs text-violet-800 mt-1">{sub.area}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SeniorHigh;
