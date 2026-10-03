import { Link } from 'react-router-dom';
import { PageHero, SectionHeading } from '../components/public';

const SeniorHigh = () => {
  const tracks = [
    {
      code: 'Academic',
      name: 'Academic track',
      desc: 'Designed for students preparing for higher education and college degree programs. Builds strong foundations in liberal arts, sciences, and professional studies.',
      electives: ['Humanities and social sciences', 'Business and economics', 'Sciences and mathematics', 'Language and communication'],
      careers: ['College degree programs', 'Professional licensing', 'Research and academe'],
    },
    {
      code: 'TechPro',
      name: 'Technical-professional track',
      desc: 'For students seeking technical and vocational skills for immediate employment or specialized training. Aligns with TESDA certifications and industry-ready competencies.',
      electives: ['ICT and digital arts', 'Industrial arts', 'Home economics', 'Agri-fishery arts', 'Sports and recreation'],
      careers: ['TESDA certified', 'Technical specialist', 'Industry professional', 'Entrepreneur'],
    },
  ];

  return (
    <div className="bg-white">
      {/* ── Page header ── */}
      <PageHero
        breadcrumb={[
          { label: 'Home', to: '/' },
          { label: 'Academics' },
          { label: 'Senior high school' },
        ]}
        kicker="Grades 11-12"
        title="Senior high school"
        lead="Strengthened SHS curriculum — fewer core subjects, flexible electives, and career-ready tracks."
        actions={
          <Link to="/enroll" className="public-btn-primary">Apply for enrollment</Link>
        }
      />

      {/* ── Curriculum overview ── */}
      <section className="public-section">
        <div className="public-shell">
          <div className="public-card p-6 md:p-10">
            <SectionHeading
              kicker="Strengthened SHS curriculum"
              title="About the strengthened SHS curriculum"
              lead="The Department of Education rolled out the Strengthened Senior High School Curriculum, replacing the old strand system with a streamlined two-track model. Core subjects have been reduced from 15 to just 5, and former applied and specialized subjects are now flexible electives you can mix and match based on your interests or college course goals."
            />

            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-4">
              {[
                { label: 'Duration', value: '2 years' },
                { label: 'Grade levels', value: '11 - 12' },
                { label: 'Core subjects', value: '5 only' },
                { label: 'Tracks', value: '2 options' },
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

      {/* ── Tracks ── */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <SectionHeading
            kicker="Two-track model"
            title="Choose your track"
            lead="Select a path that aligns with your goals."
            align="center"
          />

          <div className="mt-8 space-y-6">
            {tracks.map((track, i) => (
              <article key={i} className="public-card-interactive p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="public-badge">{track.code}</span>
                      <h3 className="public-heading">{track.name}</h3>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{track.desc}</p>

                    <div className="mt-5">
                      <p className="public-kicker-muted">Available electives</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {track.electives.map((el, j) => (
                          <span
                            key={j}
                            className="rounded border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
                          >
                            {el}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="public-kicker-muted">Career paths</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{track.careers.join(', ')}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Link to="/enroll" className="public-btn-primary">Enroll now</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core subjects ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Curriculum"
            title="Core subjects"
            lead="Required for all SHS students regardless of track."
            align="center"
          />

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { subject: 'Effective communication', area: 'Languages' },
              { subject: 'General mathematics', area: 'Math' },
              { subject: 'General science', area: 'Science' },
              { subject: 'Life and career skills', area: 'Core' },
              { subject: 'Kasaysayan at Lipunang Filipino', area: 'Filipino' },
            ].map((sub, i) => (
              <div key={i} className="public-card-muted p-4">
                <p className="text-sm font-semibold text-slate-900">{sub.subject}</p>
                <p className="mt-1 text-xs text-violet-700">{sub.area}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SeniorHigh;
