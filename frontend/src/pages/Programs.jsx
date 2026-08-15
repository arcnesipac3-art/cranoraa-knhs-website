import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';

const Programs = () => {
  const { content, loading } = useWebsiteContent();

  const handleViewDetails = (program) => {
    const detailKey = `programs_${program.key}_details`;
    const details = content[detailKey]?.content || 'Details for this program are coming soon. Please check back later or contact the school office for more information.';
    Swal.fire({
      title: `<span class="text-xl font-black text-gray-900">${program.title}</span>`,
      html: `
        <div class="text-left">
          <div class="w-full h-44 rounded-xl overflow-hidden mb-5">
            <img src="${program.image}" class="w-full h-full object-cover" />
          </div>
          <p class="text-gray-600 leading-relaxed whitespace-pre-line text-sm font-medium">${details}</p>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      width: '560px',
      padding: '2rem',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-2xl border border-violet-200 shadow-2xl',
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

      {/* ── Hero Banner ── */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
              <p className="text-xs font-semibold text-violet-200 tracking-widest mb-4">Academic Excellence</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
                {content.programs_title?.content || 'Our Programs'}
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                {content.programs_subtitle?.content || 'Discover the diverse educational opportunities we offer, designed to prepare students for a bright future.'}
              </p>
            </div>
        </div>
      </section>

      {/* ── Programs Grid ── */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {programList.map((program, i) => (
              <div key={i} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-violet-300 transition-all duration-300 flex flex-col">
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                   <img src={program.image} alt={program.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-violet-900/30 to-transparent" />
                  {/* Number badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/20 border border-white/40 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-sm font-bold text-white">0{i + 1}</span>
                  </div>
                  {/* Icon */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-violet-900 flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={program.icon} />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white drop-shadow-lg">{program.title}</h3>
                  </div>
                </div>
                {/* Content */}
                <div className="p-3 sm:p-6 flex-1 flex flex-col">
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{program.content}</p>
                  <div className="mt-5 pt-4 border-t border-violet-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-800">DepEd Curriculum</span>
                    <button
                      onClick={() => handleViewDetails(program)}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-900 hover:text-slate-900 transition-colors"
                    >
                      View Details
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-violet-950 rounded-3xl px-8 py-14 md:px-16 md:py-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-semibold text-violet-200 tracking-widest mb-3">Start Your Journey</p>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">Ready to Enroll?</h2>
                <p className="text-violet-100 leading-relaxed mb-6">Our comprehensive curriculum is designed to challenge and inspire students at every level.</p>
                <div className="flex flex-wrap gap-2">
                  {['Science & Tech', 'Liberal Arts', 'Engineering', 'Vocational'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="lg:text-right">
                <Link to="/enroll" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-violet-900 font-bold text-sm hover:bg-violet-50 transition-colors shadow-2xl">
                  Apply for Admission
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Programs;
