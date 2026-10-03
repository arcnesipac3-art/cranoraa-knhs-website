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

const TermsOfService = () => {
  const lastUpdated = 'May 24, 2026';

  return (
    <div className="bg-white">
      {/* Hero */}
      <PageHero
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Terms of service' }]}
        kicker="Legal"
        title="Terms of service"
        lead="The conditions that apply when students, parents, teachers and staff use the KNHS student portal and public website."
      />

      {/* Content */}
      <section className="public-section">
        <div className="public-shell-narrow">
          <div className="public-card p-6 md:p-10">
            <p className="public-kicker-muted">Last updated: {lastUpdated}</p>

            <div className="public-prose mt-5">
              <p>
                These terms of service govern your use of the Kiwalan National High School (KNHS) Student Portal and public website. By accessing or using the portal, you agree to be bound by these terms. If you do not agree, please do not use the portal.
              </p>
            </div>

            <Section title="1. Eligibility and accounts">
              <p>The KNHS portal is intended for:</p>
              <List>
                <li><strong className="text-slate-900">Students</strong> currently enrolled at Kiwalan National High School</li>
                <li><strong className="text-slate-900">Teachers and staff</strong> employed by KNHS</li>
                <li><strong className="text-slate-900">Administrators</strong> authorized by the school</li>
              </List>
              <p>Accounts are created by school administrators. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
            </Section>

            <Section title="2. Acceptable use">
              <p>You agree to use the portal only for lawful educational purposes. You must not:</p>
              <List>
                <li>Share your account credentials with others</li>
                <li>Attempt to access accounts or data that do not belong to you</li>
                <li>Upload or share harmful, offensive, or inappropriate content</li>
                <li>Use the messaging system to harass, bully, or threaten other users</li>
                <li>Attempt to disrupt, hack, or compromise the portal&apos;s systems</li>
                <li>Use the portal for commercial purposes or personal gain</li>
                <li>Impersonate another student, teacher, or staff member</li>
              </List>
            </Section>

            <Section title="3. Messaging and communication">
              <p>The portal includes a messaging system for school-related communication. All messages are subject to moderation by school administrators. Messages that violate school policy or these terms may be removed, and accounts may be suspended.</p>
              <p>Do not share personal contact information, inappropriate content, or engage in behavior that would violate the school&apos;s code of conduct through the messaging system.</p>
            </Section>

            <Section title="4. Academic records and data">
              <p>Grades, attendance records, and other academic data displayed in the portal are official school records. You must not:</p>
              <List>
                <li>Attempt to modify or falsify academic records</li>
                <li>Share screenshots of other students&apos; grades or personal information</li>
                <li>Use academic data for purposes other than personal academic monitoring</li>
              </List>
            </Section>

            <Section title="5. Enrollment applications">
              <p>When submitting an enrollment application through the portal, you certify that all information provided is accurate and complete. Submission of false or misleading information may result in rejection of the application or cancellation of enrollment.</p>
              <p>Uploaded documents must be authentic. Submission of falsified documents is a serious violation and may be reported to appropriate authorities.</p>
            </Section>

            <Section title="6. Intellectual property">
              <p>All content on the KNHS portal and website — including text, images, logos, and learning materials — is the property of Kiwalan National High School or its content providers. You may not reproduce, distribute, or use this content without written permission from the school.</p>
            </Section>

            <Section title="7. Account suspension and termination">
              <p>KNHS reserves the right to suspend or terminate portal access for:</p>
              <List>
                <li>Violation of these terms of service</li>
                <li>Violation of the school&apos;s code of conduct</li>
                <li>Graduation, withdrawal, or transfer from the school</li>
                <li>Any behavior deemed harmful to the school community</li>
              </List>
              <p>Suspended users will be notified through their registered email address.</p>
            </Section>

            <Section title="8. Disclaimer of warranties">
              <p>The portal is provided &ldquo;as is&rdquo; without warranties of any kind. While we strive to maintain uptime and data accuracy, KNHS does not guarantee uninterrupted access or error-free operation. Scheduled maintenance may temporarily affect availability.</p>
            </Section>

            <Section title="9. Limitation of liability">
              <p>KNHS shall not be liable for any indirect, incidental, or consequential damages arising from your use of the portal, including loss of data or unauthorized access resulting from your failure to maintain account security.</p>
            </Section>

            <Section title="10. Changes to these terms">
              <p>We may update these terms of service at any time. Updated terms will be posted on this page with a revised date. Continued use of the portal after changes are posted constitutes your acceptance of the new terms.</p>
            </Section>

            <Section title="11. Governing law">
              <p>These terms of service are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in accordance with applicable Philippine law and DepEd regulations.</p>
            </Section>

            <section className="mt-10">
              <h2 className="public-heading">12. Contact</h2>
              <div className="public-prose mt-4">
                <p>For questions about these terms of service, contact:</p>
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
              <Link to="/privacy" className="public-link inline-flex items-center gap-2 text-sm">
                View privacy policy
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
