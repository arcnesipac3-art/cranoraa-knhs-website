import { Link } from 'react-router-dom';

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-lg font-black text-slate-900 mb-3 uppercase">{title}</h2>
    <div className="text-gray-700 leading-relaxed space-y-3 text-sm">{children}</div>
  </div>
);

const PrivacyPolicy = () => {
  const lastUpdated = 'May 24, 2026';

  return (
    <div className="bg-white">

      {/* Hero */}
      <section className="bg-violet-950 py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
              <p className="text-xs font-bold text-violet-200 uppercase tracking-widest mb-3">Legal</p>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-3 uppercase">Privacy Policy</h1>
              <p className="text-violet-100 text-sm">Last updated: {lastUpdated}</p>
            </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border-2 border-violet-200 p-8 md:p-12 shadow-sm">

            <p className="text-gray-700 leading-relaxed text-sm mb-10">
              Kiwalan National High School ("KNHS", "we", "our", or "us") is committed to protecting the privacy of our students, parents, teachers, and staff. This Privacy Policy explains how we collect, use, and safeguard information when you use the KNHS Student Portal and public website.
            </p>

            <Section title="1. Information We Collect">
              <p><strong className="text-gray-900">Personal Information:</strong> When you register or enroll, we collect your name, email address, date of birth, address, contact numbers, and parent/guardian information.</p>
              <p><strong className="text-gray-900">Academic Records:</strong> Grades, attendance records, subject enrollments, and learning materials accessed through the portal.</p>
              <p><strong className="text-gray-900">Usage Data:</strong> Log data including IP address, browser type, pages visited, and timestamps when you access the portal.</p>
              <p><strong className="text-gray-900">Uploaded Files:</strong> Documents submitted during enrollment (birth certificates, report cards, etc.) are stored securely.</p>
            </Section>

            <Section title="2. How We Use Your Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Manage student enrollment and academic records</li>
                <li>Provide access to the student portal and its features</li>
                <li>Send announcements, notifications, and school communications</li>
                <li>Generate academic reports and analytics for school administration</li>
                <li>Comply with DepEd regulations and reporting requirements</li>
                <li>Improve the portal's functionality and user experience</li>
              </ul>
            </Section>

            <Section title="3. Data Storage and Security">
              <p>Your data is stored on secure cloud infrastructure (Supabase PostgreSQL). We implement industry-standard security measures including:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>JWT-based authentication with token expiration</li>
                <li>Role-based access control (students, teachers, administrators)</li>
                <li>Regular database backups</li>
              </ul>
              <p>We do not sell, trade, or rent your personal information to third parties.</p>
            </Section>

            <Section title="4. Information Sharing">
              <p>We may share your information only in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li><strong className="text-gray-900">School Administration:</strong> Authorized school staff access records as needed for academic management</li>
                <li><strong className="text-gray-900">DepEd Compliance:</strong> Required reporting to the Department of Education Philippines</li>
                <li><strong className="text-gray-900">Legal Requirements:</strong> When required by law or court order</li>
              </ul>
            </Section>

            <Section title="5. Cookies and Tracking">
              <p>The portal uses browser localStorage to store authentication tokens for session management. We do not use third-party advertising cookies. Basic analytics may be collected to monitor system performance.</p>
            </Section>

            <Section title="6. Children's Privacy">
              <p>Our portal serves students including minors. We collect only the minimum information necessary for educational purposes. Parent or guardian consent is obtained during the enrollment process. Parents may request access to or deletion of their child's data by contacting the school office.</p>
            </Section>

            <Section title="7. Your Rights">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Access your personal data stored in the portal</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your account (subject to academic record retention requirements)</li>
                <li>Withdraw consent for non-essential data processing</li>
              </ul>
              <p>To exercise these rights, contact the school registrar or ICT coordinator.</p>
            </Section>

            <Section title="8. Data Retention">
              <p>Academic records are retained in accordance with DepEd guidelines. Portal accounts are deactivated upon graduation or withdrawal but records may be retained for the legally required period. Enrollment documents are kept for the duration required by school policy.</p>
            </Section>

            <Section title="9. Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the portal after changes constitutes acceptance of the updated policy.</p>
            </Section>

            <Section title="10. Contact Us">
              <p>If you have questions about this Privacy Policy or how we handle your data, please contact:</p>
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border-2 border-violet-200">
                <p className="font-bold text-slate-900">Kiwalan National High School</p>
                <p>Kiwalan, Philippines</p>
                <p>Email: info@kiwalan-nhs.edu.ph</p>
              </div>
            </Section>

            <div className="pt-6 border-t-2 border-violet-100 flex flex-wrap gap-4">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-violet-800 hover:text-violet-950 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Home
              </Link>
              <Link to="/terms" className="inline-flex items-center gap-2 text-sm font-bold text-violet-800 hover:text-violet-950 transition-colors">
                View Terms of Service
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
