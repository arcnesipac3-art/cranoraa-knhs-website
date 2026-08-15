import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_SECTION = [
  {
    title: 'Getting Started',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    items: [
      {
        q: 'How do I log in to the portal?',
        a: 'Go to the login page and enter your Student LRN (12 digits) or registered email/username. First-time users should use the default password provided by the ICT office. You will be required to change your password on first login.'
      },
      {
        q: 'I forgot my password. What should I do?',
        a: 'For students, click "Forgot Password" on the login page and follow the instructions. For staff and admin, contact the ICT office or your administrator to reset your password. Parents can use the password reset link sent to their registered email.'
      },
      {
        q: 'The portal says "Wrong Portal." How do I fix this?',
        a: 'Each account has a designated role (Student, Staff, or Parent). Make sure you are logging in through the correct portal tab. If you are a teacher, use the Staff portal. If you are a student, use the Student portal.'
      },
    ]
  },
  {
    title: 'Enrollment',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    items: [
      {
        q: 'How do I apply for enrollment?',
        a: 'Go to the Enrollment page from the sidebar or visit the public enrollment form at /enroll. Fill out the required information, upload the required documents, and submit your application. You will receive a confirmation email.'
      },
      {
        q: 'How do I track my enrollment application?',
        a: 'Visit the Track Enrollment page from the login screen or navigation menu. Enter your email address to check the current status of your application (Pending, Under Review, Approved, or Enrolled).'
      },
      {
        q: 'My application was rejected. Can I reapply?',
        a: 'Yes. Check the rejection reason in your application status, fix the issues mentioned, and submit a new application. Make sure all required documents are complete before reapplying.'
      },
      {
        q: 'What documents are required for enrollment?',
        a: 'Typically required documents include: Birth Certificate, Form 138 (Report Card), Good Moral Certificate, and a valid ID. Additional documents may be required depending on your grade level or strand. Check the enrollment form for the complete list.'
      }
    ]
  },
  {
    title: 'Grades & Attendance',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    items: [
      {
        q: 'Where can I view my grades?',
        a: 'Students can view their grades in the "My Classes" section. Parents can check their child\'s grades from the Parent Dashboard. Teachers can input and manage grades through Grade Management.'
      },
      {
        q: 'How do I submit my grades? (Teachers)',
        a: 'Go to Grade Submission from the sidebar. Select the class and quarter, fill in the grades for each student, and click Save. Make sure to submit before the deadline set by the admin. You can also export a SF9 report card from here.'
      },
      {
        q: 'How is attendance recorded?',
        a: 'Teachers record attendance through the Attendance Dashboard. Students\' attendance is marked as Present, Late, Excused, or Absent. Students and parents can view attendance records in My Attendance.'
      },
      {
        q: 'I was marked absent but I was present. What do I do?',
        a: 'Contact your class adviser or teacher to correct the attendance record. If the issue persists, file an excuse slip through the portal or visit the guidance office.'
      }
    ]
  },
  {
    title: 'Account & Profile',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    items: [
      {
        q: 'How do I change my password?',
        a: 'Go to Settings from the sidebar, then navigate to the Security section. Click "Change Password" and enter your current and new password. You will be logged out after changing your password.'
      },
      {
        q: 'How do I update my profile information?',
        a: 'Go to Settings from the sidebar. You can update your name, contact information, and profile picture from the Profile section. Some fields may require admin approval to change.'
      },
      {
        q: 'How do I change my notification sound?',
        a: 'Go to Settings > Notifications. You can toggle notification sounds on or off and choose from available sound options.'
      }
    ]
  },
  {
    title: 'Troubleshooting',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    items: [
      {
        q: 'The page is loading slowly or not loading at all.',
        a: 'Check your internet connection. Try refreshing the page (Ctrl+R or F5). If the problem persists, clear your browser cache and cookies, then log in again.'
      },
      {
        q: "I'm seeing a '403 Forbidden' or 'Access Denied' error.",
        a: 'This means you don\'t have permission to access that page. Make sure you are logged in with the correct account. If you believe this is an error, contact your administrator.'
      },
      {
        q: 'The page shows a blank screen or React error.',
        a: 'Try refreshing the page. If the error persists, clear your browser cache. On mobile, try using a different browser. If the issue continues, contact ICT support with a screenshot of the error.'
      },
      {
        q: 'My session keeps expiring. I have to log in repeatedly.',
        a: 'Sessions expire after a period of inactivity for security. If you are being logged out too frequently, make sure cookies are enabled in your browser and you are not using a private/incognito window.'
      },
      {
        q: "I can't upload files or documents.",
        a: 'Check that the file is under 10MB and is in an accepted format (PDF, JPG, PNG). Try using a different browser if the upload keeps failing. Ensure you have a stable internet connection.'
      },
      {
        q: 'Notifications are not showing up.',
        a: 'Make sure notification sounds are enabled in Settings > Notifications. Refresh the page to load new notifications. Check if your browser blocks pop-ups or notifications from the site.'
      },
      {
        q: "I'm locked out after too many failed login attempts.",
        a: 'Wait for the lockout timer to expire (usually a few minutes), then try again. Make sure Caps Lock is off and you\'re entering the correct credentials. Contact ICT support if you need immediate access.'
      }
    ]
  },
  {
    title: 'For Teachers',
    icon: 'M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z',
    items: [
      {
        q: 'How do I encode lesson plans?',
        a: 'Go to Lesson Plans from the sidebar. Click "Create New" to add a lesson plan for your subject and class. Fill in the objectives, content, materials, and activities. Save as draft or submit for compliance review.'
      },
      {
        q: 'How do I submit compliance documents?',
        a: 'Go to My Compliance from the sidebar. Upload the required documents (e.g., lesson plans, grades, attendance summaries) for the current compliance period. Check the deadline and requirements set by the admin.'
      },
      {
        q: 'How do I create a class section?',
        a: 'Only administrators can create class sections. Contact your admin to assign you as an adviser or to set up new sections for the school year.'
      },
      {
        q: 'How do I encode attendance?',
        a: 'Go to Attendance Dashboard, select the class and date, then mark each student as Present, Late, Excused, or Absent. Save the attendance record. Students can view their attendance in My Attendance.'
      }
    ]
  },
  {
    title: 'For Admins',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    items: [
      {
        q: 'How do I grant admin privileges to a teacher?',
        a: 'Go to People Directory > Teachers tab. Click the action menu (three dots) next to the teacher\'s name and select "Make Admin." The teacher will then have access to both admin and teacher portals via the portal switcher in the sidebar.'
      },
      {
        q: 'How do I reset a user\'s password?',
        a: 'Go to People Directory, find the user, click the action menu, and select "Reset Password." A temporary password will be generated. Share it securely with the user. They will be required to change it on first login.'
      },
      {
        q: 'How do I set up the school year and quarters?',
        a: 'Go to Academic Setup from the sidebar. Create a new academic year, set the start and end dates, and configure the quarterly periods. Make sure to set one year as "Active" for the portal to function correctly.'
      },
      {
        q: 'How do I approve enrollment applications?',
        a: 'Go to Enrollment from the sidebar. Review each application, verify the uploaded documents, and click "Approve" or "Reject." Approved students can then be enrolled into a class section.'
      }
    ]
  }
];

const FaqItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
        <svg className={`w-4 h-4 text-violet-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-semibold text-slate-800">{item.q}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 pl-11">
              <p className="text-sm text-slate-600 leading-relaxed">{item.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ContactButton = ({ children, onClick, variant = 'primary' }) => {
  return (
    <button onClick={onClick}
      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${variant === 'primary' ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/25' : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'}`}>
      {children}
    </button>
  );
};

const HelpCenter = () => {
  const [activeSection, setActiveSection] = useState(null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Help Center</h1>
              <p className="text-lg text-slate-500">Find answers to common questions and troubleshoot issues</p>
            </div>
          </div>
          <ContactButton onClick={() => alert('Contact ICT Support!')}>Contact ICT Support</ContactButton>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center">
            <div className="text-2xl font-bold text-violet-600">24/7</div>
            <div className="text-sm text-slate-500">Support Available</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center">
            <div className="text-2xl font-bold text-blue-600">50+</div>
            <div className="text-sm text-slate-500">FAQ Topics</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center">
            <div className="text-2xl font-bold text-green-600">99%</div>
            <div className="text-sm text-slate-500">Satisfaction Rate</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center">
            <div className="text-2xl font-bold text-orange-600">10min</div>
            <div className="text-sm text-slate-500">Avg. Response</div>
          </motion.div>
        </div>

        {/* Section Nav */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveSection(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!activeSection ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            All
          </button>
          {FAQ_SECTION.map((section) => (
            <button key={section.title} onClick={() => setActiveSection(section.title)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeSection === section.title ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {section.title}
              </button>
          ))
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {FAQ_SECTION.filter(s => !activeSection || s.title === activeSection).map((section) => (
            <div key={section.title} className="border-l-4 border-violet-500">
              <div className="flex items-center gap-2 px-4 py-3">
                <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                </svg>
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider">{section.title}</h2>
              </div>
              <div className="px-4 py-4">
                {section.items.map((item, i) => (
                  <FaqItem key={i} item={item} />
                ))}
              </div>
            </div>
          ))
        </div>
      </motion.div>
    </div>
  );
};

export default HelpCenter;