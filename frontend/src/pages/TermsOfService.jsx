import { Link } from 'react-router-dom';

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-lg font-black text-slate-900 mb-3 uppercase">{title}</h2>
    <div className="text-gray-700 leading-relaxed space-y-3 text-sm">{children}</div>
  </div>
);

const TermsOfService = () => {
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
              <h1 className="text-3xl md:text-4xl font-black text-white mb-3 uppercase">Terms of Service</h1>
              <p className="text-violet-100 text-sm">Last updated: {lastUpdated}</p>
            </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border-2 border-violet-200 p-8 md:p-12 shadow-sm">

            <p className="text-gray-700 leading-relaxed text-sm mb-10">
              These Terms of Service govern your use of the Kiwalan National High School (KNHS) Student Portal and public website. By accessing or using the portal, you agree to be bound by these terms. If you do not agree, please do not use the portal.
            </p>

            <Section title="1. Eligibility and Accounts">
              <p>The KNHS Portal is intended for:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li><strong className="text-gray-900">Students</strong> currently enrolled at Kiwalan National High School</li>
                <li><strong className="text-gray-900">Teachers and staff</strong> employed by KNHS</li>
                <li><strong className="text-gray-900">Administrators</strong> authorized by the school</li>
              </ul>
              <p>Accounts are created by school administrators. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
            </Section>

            <Section title="2. Acceptable Use">
              <p>You agree to use the portal only for lawful educational purposes. You must not:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Share your account credentials with others</li>
                <li>Attempt to access accounts or data that do not belong to you</li>
                <li>Upload or share harmful, offensive, or inappropriate content</li>
                <li>Use the messaging system to harass, bully, or threaten other users</li>
                <li>Attempt to disrupt, hack, or compromise the portal's systems</li>
                <li>Use the portal for commercial purposes or personal gain</li>
                <li>Impersonate another student, teacher, or staff member</li>
              </ul>
            </Section>

            <Section title="3. Messaging and Communication">
              <p>The portal includes a messaging system for school-related communication. All messages are subject to moderation by school administrators. Messages that violate school policy or these terms may be removed, and accounts may be suspended.</p>
              <p>Do not share personal contact information, inappropriate content, or engage in behavior that would violate the school's Code of Conduct through the messaging system.</p>
            </Section>

            <Section title="4. Academic Records and Data">
              <p>Grades, attendance records, and other academic data displayed in the portal are official school records. You must not:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Attempt to modify or falsify academic records</li>
                <li>Share screenshots of other students' grades or personal information</li>
                <li>Use academic data for purposes other than personal academic monitoring</li>
              </ul>
            </Section>

            <Section title="5. Enrollment Applications">
              <p>When submitting an enrollment application through the portal, you certify that all information provided is accurate and complete. Submission of false or misleading information may result in rejection of the application or cancellation of enrollment.</p>
              <p>Uploaded documents must be authentic. Submission of falsified documents is a serious violation and may be reported to appropriate authorities.</p>
            </Section>

            <Section title="6. Intellectual Property">
              <p>All content on the KNHS portal and website — including text, images, logos, and learning materials — is the property of Kiwalan National High School or its content providers. You may not reproduce, distribute, or use this content without written permission from the school.</p>
            </Section>

            <Section title="7. Account Suspension and Termination">
              <p>KNHS reserves the right to suspend or terminate portal access for:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Violation of these Terms of Service</li>
                <li>Violation of the school's Code of Conduct</li>
                <li>Graduation, withdrawal, or transfer from the school</li>
                <li>Any behavior deemed harmful to the school community</li>
              </ul>
              <p>Suspended users will be notified through their registered email address.</p>
            </Section>

            <Section title="8. Disclaimer of Warranties">
              <p>The portal is provided "as is" without warranties of any kind. While we strive to maintain uptime and data accuracy, KNHS does not guarantee uninterrupted access or error-free operation. Scheduled maintenance may temporarily affect availability.</p>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>KNHS shall not be liable for any indirect, incidental, or consequential damages arising from your use of the portal, including loss of data or unauthorized access resulting from your failure to maintain account security.</p>
            </Section>

            <Section title="10. Changes to These Terms">
              <p>We may update these Terms of Service at any time. Updated terms will be posted on this page with a revised date. Continued use of the portal after changes are posted constitutes your acceptance of the new terms.</p>
            </Section>

            <Section title="11. Governing Law">
              <p>These Terms of Service are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in accordance with applicable Philippine law and DepEd regulations.</p>
            </Section>

            <Section title="12. Contact">
              <p>For questions about these Terms of Service, contact:</p>
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
              <Link to="/privacy" className="inline-flex items-center gap-2 text-sm font-bold text-violet-800 hover:text-violet-950 transition-colors">
                View Privacy Policy
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4 4H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
