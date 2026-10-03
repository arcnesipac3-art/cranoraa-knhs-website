import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';
import { PageHero, SectionHeading } from '../components/public';

const Programs = () => {
  const { content, loading } = useWebsiteContent();

  const handleViewDetails = (program) => {
    const detailKey = `programs_${program.key}_details`;
    const details = content[detailKey]?.content || 'Details for this program are coming soon. Please check back later or contact the school office for more information.';
    Swal.fire({
      title: `<span class="text-xl font-bold text-slate-900">${program.title}</span>`,
      html: `
        <div class="text-left">
          <div class="mb-5 h-44 w-full overflow-hidden rounded-lg border border-slate-200">
            <img src="${program.image}" alt="" class="h-full w-full object-cover" />
          </div>
          <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600">${details}</p>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      width: '560px',
      padding: '2rem',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-lg border border-slate-200 shadow-xl',
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 space-y-5 max-w-4xl mx-auto">
        <Skeleton.Banner className="h-48 md:h-64" />
        <Skeleton.CardGrid count={4} cols={2} />
      </div>
    );
  }

  const programList = [
    {
      key: 'academic',
      title: content.programs_academic_title?.content || 'Academic Programs',
      content: content.programs_academic_content?.content || 'Our academic programs provide a strong foundation in core subjects including Mathematics, Science, English, Filipino, and Social Studies.',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      image: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      key: 'tech',
      title: content.programs_tech_title?.content || 'Technical-Vocational Programs',
      content: content.programs_tech_content?.content || 'We offer technical-vocational education and training programs under the Technical-Professional (TechPro) track that equip students with practical skills in various fields.',
      icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      key: 'sports',
      title: content.programs_sports_title?.content || 'Sports Development',
      content: content.programs_sports_content?.content || 'Our sports program focuses on developing athletic skills, teamwork, and discipline through various sporting activities.',
      icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
    {
      key: 'arts',
      title: content.programs_arts_title?.content || 'Arts and Culture',
      content: content.programs_arts_content?.content || 'Nurture your creative talents through our arts program, offering visual arts, music, dance, and theater classes.',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      image: 'https://images.unsplash.com/photo-1460661419201-fd4ce18a802f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    },
  ];

  return (
    <div className="bg-white">
      {/* ── Page header ── */}
      <PageHero
        breadcrumb={[
          { label: 'Home', to: '/' },
          { label: 'About' },
          { label: 'School programs' },
        ]}
        kicker="Academic excellence"
        title={content.programs_title?.content || 'Our Programs'}
        lead={content.programs_subtitle?.content || 'Discover the diverse educational opportunities we offer, designed to prepare students for a bright future.'}
        actions={
          <Link to="/enroll" className="public-btn-primary">Apply for enrollment</Link>
        }
      />
      {/* ── Program offerings ── */}
      <section className="public-section">
        <div className="public-shell">
          <SectionHeading
            kicker="Program offerings"
            title="Programs offered"
            lead="Four program areas that develop the academic, technical, artistic and athletic potential of every learner under the DepEd basic education curriculum."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {programList.map((program, i) => (
              <article key={program.key} className="public-card-interactive flex flex-col overflow-hidden">
                {/* Image */}
                <div className="relative h-44 overflow-hidden border-b border-slate-200">
                  <img
                    src={program.image}
                    alt={program.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-slate-900/10 to-transparent"
                  />
                  <span className="absolute left-3 top-3 rounded border border-white/60 bg-white/85 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-slate-600">
                    {`0${i + 1}`}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={program.icon} />
                      </svg>
                    </span>
                    <h3 className="public-subheading">{program.title}</h3>
                  </div>

                  <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{program.content}</p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="public-badge">DepEd curriculum</span>
                    <button
                      type="button"
                      onClick={() => handleViewDetails(program)}
                      className="public-link inline-flex items-center gap-1.5 text-sm"
                    >
                      View details
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 8l4 4m0 0l-4 4m4 4H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      {/* ── Admissions call to action ── */}
      <section className="public-section public-section-alt">
        <div className="public-shell">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
            <SectionHeading
              kicker="Admissions"
              title="Ready to enroll?"
              lead="Our curriculum is designed to challenge and inspire students at every level. Speak with the school office or start your application online."
            />

            <div className="public-card p-6">
              <p className="public-kicker-muted">Areas of study</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Science and tech', 'Liberal arts', 'Engineering', 'Vocational'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                <Link to="/enroll" className="public-btn-primary">Apply for admission</Link>
                <Link to="/contact" className="public-btn-secondary">Contact the school office</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Programs;
