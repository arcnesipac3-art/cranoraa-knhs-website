import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { Skeleton } from '../components/ui';

const Contact = () => {
  const { content, loading } = useWebsiteContent();

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 space-y-5 max-w-4xl mx-auto">
        <Skeleton.Banner className="h-48 md:h-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.AnnouncementRow key={i} />)}
        </div>
      </div>
    );
  }

  const infoItems = [
    {
      label: 'Address',
      value: content.contact_address?.content || 'Kiwalan, Philippines',
      icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      label: 'Email',
      value: content.contact_email?.content || 'info@kiwalan-nhs.edu.ph',
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    },
    {
      label: 'Phone',
      value: content.contact_phone?.content || '(123) 456-7890',
      icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    },
    {
      label: 'Office Hours',
      value: content.contact_office_hours?.content || 'Mon – Fri: 7:00 AM – 5:00 PM',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
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
              <p className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-4">Contact Information</p>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
                {content.contact_title?.content || 'Get in Touch'}
              </h1>
              <p className="text-violet-100 leading-relaxed text-lg">
                {content.contact_subtitle?.content || 'Have questions about enrollment or our programs? We are here to help.'}
              </p>
            </div>
        </div>
      </section>

      {/* ── Contact Info + Map ── */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

            {/* Info cards */}
            <div className="lg:col-span-2 space-y-4">
              {infoItems.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border-2 border-violet-200 p-6 flex items-start gap-4 hover:shadow-lg hover:border-violet-400 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 border-2 border-violet-200 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-900 transition-colors">
                    <svg className="w-6 h-6 text-violet-800 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-violet-800 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-gray-800">{item.value}</p>
                  </div>
                </div>
              ))}

              {/* Quick CTA */}
              <div className="bg-violet-900 rounded-2xl p-6 text-white border-2 border-violet-900">
                <p className="text-base font-black mb-1 uppercase">Ready to Enroll?</p>
                <p className="text-sm text-violet-100 mb-4">Applications are open for SY 2026–2027.</p>
                <a href="/enroll" className="inline-flex items-center gap-1.5 text-sm font-black bg-white text-violet-900 px-5 py-2.5 rounded-lg hover:bg-violet-50 transition-colors uppercase">
                  Apply Now
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
                </a>
              </div>
            </div>

            {/* Map */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border-2 border-violet-200 overflow-hidden h-full min-h-[480px] relative shadow-sm">
                {content.contact_map_url?.content ? (
                  <iframe
                    src={content.contact_map_url.content}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '480px' }}
                    allowFullScreen=""
                    loading="lazy"
                    title="School Location"
                  />
                ) : (
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3948.2297046439908!2d124.27159847501021!3d8.27992249175451!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x325576cc580e692d%3A0x1ee65da2c86ad0a6!2sKiwalan%20National%20High%20School!5e0!3m2!1sen!2sph!4v1779569511724!5m2!1sen!2sph"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '480px' }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="School Location"
                  />
                )}

                {/* Floating label */}
                <div className="absolute bottom-4 left-4 right-4 bg-violet-950/95 backdrop-blur-sm rounded-xl p-4 hidden sm:flex items-center justify-between gap-4 border-2 border-violet-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-violet-900 text-sm font-black flex-shrink-0">KN</div>
                    <div>
                      <p className="text-white text-sm font-black leading-none">Kiwalan National High School</p>
                      <p className="text-violet-200 text-xs mt-0.5">Main Campus · Kiwalan, Philippines</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-white text-violet-900 rounded-lg text-xs font-black hover:bg-violet-50 transition-colors flex-shrink-0 uppercase">
                    Directions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Contact;
