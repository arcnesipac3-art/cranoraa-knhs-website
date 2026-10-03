import { PageHero, SectionHeading } from '../components/public';

const K12Programs = () => {
  return (
    <div className="bg-white">
      {/* ── Page header ── */}
      <PageHero
        breadcrumb={[
          { label: 'Home', to: '/' },
          { label: 'Academics' },
          { label: 'K to 12 programs' },
        ]}
        kicker="DepEd curriculum"
        title="K to 12 programs"
        lead="Junior high school programs (Grades 7-10) following the enhanced K to 12 curriculum."
      />

      {/* ── Program overview ── */}
      <section className="public-section">
        <div className="public-shell">
          <div className="public-card p-6 md:p-10">
            <SectionHeading
              kicker="Junior high school"
              title="Grades 7 to 10"
              lead="The Junior High School program (Grades 7-10) implements the K-12 Basic Education Curriculum mandated by DepEd. Students develop foundational skills in core academic subjects while exploring their interests and aptitudes in preparation for Senior High School."
            />

            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-4">
              {[
                { label: 'Duration', value: '4 years' },
                { label: 'Grade levels', value: '7 - 10' },
                { label: 'Subjects', value: '8 - 10' },
                { label: 'Learning areas', value: 'Core and elective' },
              ].map((info) => (
                <div key={info.label} className="bg-white px-4 py-5 text-center">
                  <p className="text-2xl font-bold text-violet-800">{info.value}</p>
                  <p className="public-dl-label mt-1">{info.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Learning areas ── */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <SectionHeading
            kicker="Curriculum"
            title="Learning areas"
            lead="Core subjects and exploratory courses taken by every junior high school student."
            align="center"
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                area: 'Languages',
                subjects: ['English', 'Filipino', 'Mother Tongue (Grade 7)'],
                desc: 'Develop proficiency in communication and critical reading',
                icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
              },
              {
                area: 'Mathematics',
                subjects: ['Pre-Algebra (G7)', 'Algebra (G8)', 'Geometry (G9)', 'Statistics (G10)'],
                desc: 'Build problem-solving and quantitative reasoning skills',
                icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
              },
              {
                area: 'Science',
                subjects: ['Life Science', 'Physical Science', 'Biology', 'Chemistry', 'Physics'],
                desc: 'Explore scientific inquiry and experimentation',
                icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
              },
              {
                area: 'Araling Panlipunan',
                subjects: ['Philippine History', 'World History', 'Economics', 'Geography'],
                desc: 'Understand society, culture, and citizenship',
                icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
              },
              {
                area: 'MAPEH',
                subjects: ['Music', 'Arts', 'Physical Education', 'Health'],
                desc: 'Develop creativity, wellness, and holistic growth',
                icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
              },
              {
                area: 'TLE / Edukasyon sa Pagpapakatao',
                subjects: ['Technology & Livelihood Education', 'Values Education'],
                desc: 'Learn practical skills and ethical values',
                icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
              },
            ].map((area, i) => (
              <article key={i} className="public-card p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={area.icon} />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <h3 className="public-subheading">{area.area}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{area.desc}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {area.subjects.map((sub, j) => (
                    <span
                      key={j}
                      className="rounded border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Assessment & grading ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Assessment"
            title="Assessment system"
            lead="The K to 12 grading and evaluation framework used throughout the school year."
            align="center"
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { quarter: 'Term 1', weight: '33.3%', period: 'Jun - Oct' },
              { quarter: 'Term 2', weight: '33.3%', period: 'Nov - Mar' },
              { quarter: 'Term 3', weight: '33.3%', period: 'Apr - May' },
            ].map((q, i) => (
              <div key={i} className="public-card-muted p-6 text-center">
                <p className="text-3xl font-bold text-violet-800">{q.weight}</p>
                <h3 className="public-subheading mt-2">{q.quarter}</h3>
                <p className="mt-1 text-sm text-slate-600">{q.period}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-violet-200 bg-violet-50 p-6 text-center md:p-8">
            <p className="public-kicker">Passing grade</p>
            <p className="mt-2 text-4xl font-bold text-violet-900">75</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              Minimum grade required to pass each subject.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default K12Programs;
