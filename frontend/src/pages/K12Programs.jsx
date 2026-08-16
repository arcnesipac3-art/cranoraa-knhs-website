const K12Programs = () => {
  return (
    <div className="bg-white">
      {/* Hero Banner */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-4">DepEd Curriculum</p>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5 uppercase">
                K to 12 Programs
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                Junior High School Programs (Grades 7-10) following the enhanced K-12 curriculum
              </p>
            </div>
        </div>
      </section>

      {/* Program Overview */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border-2 border-violet-200 p-8 md:p-12 shadow-lg mb-12">
            <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase">Junior High School</h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              The Junior High School program (Grades 7-10) implements the K-12 Basic Education Curriculum mandated by DepEd. Students develop foundational skills in core academic subjects while exploring their interests and aptitudes in preparation for Senior High School.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Duration', value: '4 Years' },
                { label: 'Grade Levels', value: '7 - 10' },
                { label: 'Subjects', value: '8 - 10' },
                { label: 'Learning Areas', value: 'Core & Elective' }
              ].map((info, i) => (
                <div key={i} className="text-center p-4 bg-slate-50 rounded-xl border border-violet-200">
                  <p className="text-2xl font-black text-violet-800 mb-1">{info.value}</p>
                  <p className="text-xs text-gray-600 uppercase font-bold">{info.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Areas */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-3 uppercase">Learning Areas</h2>
            <p className="text-gray-600">Core subjects and exploratory courses</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { 
                area: 'Languages', 
                subjects: ['English', 'Filipino', 'Mother Tongue (Grade 7)'],
                desc: 'Develop proficiency in communication and critical reading',
                icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129'
              },
              { 
                area: 'Mathematics', 
                subjects: ['Pre-Algebra (G7)', 'Algebra (G8)', 'Geometry (G9)', 'Statistics (G10)'],
                desc: 'Build problem-solving and quantitative reasoning skills',
                icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'
              },
              { 
                area: 'Science', 
                subjects: ['Life Science', 'Physical Science', 'Biology', 'Chemistry', 'Physics'],
                desc: 'Explore scientific inquiry and experimentation',
                icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'
              },
              { 
                area: 'Araling Panlipunan', 
                subjects: ['Philippine History', 'World History', 'Economics', 'Geography'],
                desc: 'Understand society, culture, and citizenship',
                icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              },
              { 
                area: 'MAPEH', 
                subjects: ['Music', 'Arts', 'Physical Education', 'Health'],
                desc: 'Develop creativity, wellness, and holistic growth',
                icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
              },
              { 
                area: 'TLE / Edukasyon sa Pagpapakatao', 
                subjects: ['Technology & Livelihood Education', 'Values Education'],
                desc: 'Learn practical skills and ethical values',
                icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
              }
            ].map((area, i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-violet-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-900 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={area.icon} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-slate-900 uppercase mb-2">{area.area}</h3>
                    <p className="text-sm text-gray-600 mb-3">{area.desc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {area.subjects.map((sub, j) => (
                    <span key={j} className="px-3 py-1 bg-slate-50 text-violet-900 rounded-full text-xs font-bold border border-violet-200">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assessment & Grading */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3 uppercase">Assessment System</h2>
            <p className="text-gray-600">K-12 grading and evaluation framework</p>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quarter: 'Term 1', weight: '33.3%', period: 'Jun - Oct' },
              { quarter: 'Term 2', weight: '33.3%', period: 'Nov - Mar' },
              { quarter: 'Term 3', weight: '33.3%', period: 'Apr - May' }
            ].map((q, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border-2 border-violet-200 p-6 text-center">
                <div className="text-4xl font-black text-violet-800 mb-2">{q.weight}</div>
                <h3 className="text-lg font-black text-slate-900 uppercase mb-1">{q.quarter}</h3>
                <p className="text-sm text-gray-600">{q.period}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-violet-900 rounded-2xl p-8 text-white text-center">
            <p className="text-sm font-bold uppercase mb-2">Passing Grade</p>
            <p className="text-5xl font-black">75</p>
            <p className="text-sm text-violet-100 mt-2">Minimum grade required to pass each subject</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default K12Programs;
