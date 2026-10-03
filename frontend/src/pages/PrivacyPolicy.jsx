import { Link } from 'react-router-dom';
import { PageHero } from '../components/public';

const Section = ({ title, children }) => (
  <section className="mt-10">
    <h2 className="public-heading">{title}</h2>
    <div className="public-prose mt-4">{children}</div>
  </section>
);

const List = ({ children }) => (
  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
    {children}
  </ul>
);

const PrivacyPolicy = () => {
  const lastUpdated = 'May 24, 2026';

  return (
    <div className="bg-white">
      {/* Hero */}
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Privacy policy' }]}
        kicker="Legal"
        title="Privacy policy"
        lead="How Kiwalan National High School collects, uses and safeguards the personal information of students, parents, teachers and staff."
      />

      {/* Content */}
      <section className="public-section">
        <div className="public-shell-narrow">
          <div className="public-card p-6 md:p-10">
            <p className="public-kicker-muted">Last updated: {lastUpdated}</p>

            <div className="public-prose mt-5">
              <p>
                Kiwalan National High School (&ldquo;KNHS&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting the privacy of our students, parents, teachers, and staff. This privacy policy explains how we collect, use, and safeguard information when you use the KNHS Student Portal and public website.
              </p>
            </div>

            <Section title="1. Information we collect">
              <p><strong className="text-slate-900">Personal information:</strong> When you register or enroll, we collect your name, email address, date of birth, address, contact numbers, and parent/guardian information.</p>
              <p><strong className="text-slate-900">Academic records:</strong> Grades, attendance records, subject enrollments, and learning materials accessed through the portal.</p>
              <p><strong className="text-slate-900">Usage data:</strong> Log data including IP address, browser type, pages visited, and timestamps when you access the portal.</p>
              <p><strong className="text-slate-900">Uploaded files:</strong> Documents submitted during enrollment (birth certificates, report cards, etc.) are stored securely.</p>
            </Section>

            <Section title="2. How we use your information">
              <p>We use the information we collect to:</p>
              <List>
                <li>Manage student enrollment and academic records</li>
                <li>Provide access to the student portal and its features</li>
                <li>Send announcements, notifications, and school communications</li>
                <li>Generate academic reports and analytics for school administration</li>
                <li>Comply with DepEd regulations and reporting requirements</li>
                <li>Improve the portal&apos;s functionality and user experience</li>
              </List>
            </Section>

            <Section title="3. Data storage and security">
              <p>Your data is stored on secure cloud infrastructure (Supabase PostgreSQL). We implement industry-standard security measures including:</p>
              <List>
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>JWT-based authentication with token expiration</li>
                <li>Role-based access control (students, teachers, administrators)</li>
                <li>Regular database backups</li>
              </List>
              <p>We do not sell, trade, or rent your personal information to third parties.</p>
            </Section>

            <Section title="4. Information sharing">
              <p>We may share your information only in the following circumstances:</p>
              <List>
                <li><strong className="text-slate-900">School administration:</strong> Authorized school staff access records as needed for academic management</li>
                <li><strong className="text-slate-900">DepEd compliance:</strong> Required reporting to the Department of Education Philippines</li>
                <li><strong className="text-slate-900">Legal requirements:</strong> When required by law or court order</li>
              </List>
            </Section>

            <Section title="5. Cookies and tracking">
              <p>The portal uses browser localStorage to store authentication tokens for session management. We do not use third-party advertising cookies. Basic analytics may be collected to monitor system performance.</p>
            </Section>

            <Section title="6. Children's privacy">
              <p>Our portal serves students including minors. We collect only the minimum information necessary for educational purposes. Parent or guardian consent is obtained during the enrollment process. Parents may request access to or deletion of their child&apos;s data by contacting the school office.</p>
            </Section>

            <Section title="7. Your rights">
              <p>You have the right to:</p>
              <List>
                <li>Access your personal data stored in the portal</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your account (subject to academic record retention requirements)</li>
                <li>Withdraw consent for non-essential data processing</li>
              </List>
              <p>To exercise these rights, contact the school registrar or ICT coordinator.</p>
            </Section>

            <Section title="8. Data retention">
              <p>Academic records are retained in accordance with DepEd guidelines. Portal accounts are deactivated upon graduation or withdrawal but records may be retained for the legally required period. Enrollment documents are kept for the duration required by school policy.</p>
            </Section>

            <Section title="9. Changes to this policy">
              <p>We may update this privacy policy from time to time. Changes will be posted on this page with an updated date. Continued use of the portal after changes constitutes acceptance of the updated policy.</p>
            </Section>

            <section className="mt-10">
              <h2 className="public-heading">10. Contact us</h2>
              <div className="public-prose mt-4">
                <p>If you have questions about this privacy policy or how we handle your data, please contact:</p>
              </div>
              <div className="public-card-muted mt-4 p-5">
                <p className="text-sm font-bold text-slate-900">Kiwalan National High School</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">Kiwalan, Philippines</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">Email: info@kiwalan-nhs.edu.ph</p>
              </div>
            </section>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200 pt-6">
              <Link to="/" className="public-link inline-flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to home
              </Link>
              <Link to="/terms" className="public-link inline-flex items-center gap-2 text-sm">
                View terms of service
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
