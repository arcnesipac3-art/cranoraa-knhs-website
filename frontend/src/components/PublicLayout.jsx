import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { key: 'home', label: 'Home', to: '/' },
  {
    key: 'about',
    label: 'About',
    children: [
      { label: 'Mission', to: '/mission' },
      { label: 'Vision', to: '/vision' },
      { label: 'Faculty & Staff', to: '/faculty' },
    ],
  },
  {
    key: 'academics',
    label: 'Academics',
    children: [
      { label: 'K to 12 Programs', to: '/k12-programs' },
      { label: 'Senior High School', to: '/senior-high' },
      { label: 'Calendar', to: '/calendar' },
    ],
  },
  {
    key: 'resources',
    label: 'Resources',
    children: [
      { label: 'Learning Materials', to: '/learning-materials' },
      { label: 'Portals & Systems', to: '/portals' },
      { label: 'News & Events', to: '/news-events' },
    ],
  },
  {
    key: 'admissions',
    label: 'Admissions',
    children: [
      { label: 'Apply for Enrollment', to: '/enroll' },
      { label: 'Track Application', to: '/track-enrollment' },
    ],
  },
  { key: 'contact', label: 'Contact', to: '/contact' },
];

const PublicLayout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [desktopDropdown, setDesktopDropdown] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState('');

  useEffect(() => {
    setShowProfileMenu(false);
    setDesktopDropdown('');
    setMobileOpen(false);
    setMobileExpanded('');
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMobileOpen(false);
        setDesktopDropdown('');
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const isActive = (path) => location.pathname === path;
  const isGroupActive = (children = []) => children.some((child) => isActive(child.to));
  const toggleMobileSection = (key) => setMobileExpanded((prev) => (prev === key ? '' : key));

  return (
    <div className="public-page min-h-screen flex flex-col">
      <div className="bg-violet-950 text-violet-100">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[10px] font-semibold tracking-wide">
          <span>Republic of the Philippines</span>
          <span className="text-violet-200">Department of Education</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-5">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-6">
            <div className="flex items-center justify-start">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Seal_of_the_Department_of_Education_of_the_Philippines.png/960px-Seal_of_the_Department_of_Education_of_the_Philippines.png"
                alt="Department of Education seal"
                className="w-14 h-14 md:w-20 md:h-20 object-contain"
                onError={(event) => {
                  event.target.onerror = null;
                  event.target.src = '/icons/school-logo-source.png';
                }}
              />
            </div>

            <div className="text-center min-w-0">
              <p className="text-[9px] md:text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-800">
                Official School Website
              </p>
              <h1 className="text-sm md:text-2xl font-bold tracking-tight text-slate-900">
                Kiwalan National High School
              </h1>
              <p className="text-[10px] md:text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                Iligan City, Lanao del Norte
              </p>
            </div>

            <div className="flex items-center justify-end">
              <img
                src="/icons/school-logo-source.png"
                alt="Kiwalan National High School seal"
                className="w-14 h-14 md:w-20 md:h-20 object-contain"
              />
            </div>
          </div>
        </div>

        <nav ref={navRef} className="border-t border-slate-200 bg-violet-950 text-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between gap-3 h-14">
              <div className="flex items-center gap-1 lg:flex-none">
                <Link
                  to="/"
                  className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl p-2 text-violet-100 hover:bg-violet-900"
                  aria-label="Go to home page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </Link>

                <div className="hidden lg:flex items-stretch">
                  {NAV_LINKS.map((item) => {
                    if (item.to) {
                      return (
                        <Link
                          key={item.key}
                          to={item.to}
                          className={`px-3 xl:px-5 h-14 inline-flex items-center text-[13px] font-semibold tracking-wide transition-colors ${
                            isActive(item.to) ? 'bg-violet-900 text-white' : 'text-violet-100 hover:bg-violet-900'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={item.key}
                        className="relative"
                        onMouseEnter={() => setDesktopDropdown(item.key)}
                        onMouseLeave={() => setDesktopDropdown('')}
                      >
                        <button
                          className={`px-3 xl:px-5 h-14 inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide transition-colors ${
                            isGroupActive(item.children) || desktopDropdown === item.key
                              ? 'bg-violet-900 text-white'
                              : 'text-violet-100 hover:bg-violet-900'
                          }`}
                        >
                          {item.label}
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        <AnimatePresence>
                          {desktopDropdown === item.key && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="absolute left-0 top-full w-64 overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-xl z-[60]"
                            >
                              {item.children.map((child) => (
                                <Link
                                  key={child.to}
                                  to={child.to}
                                  className={`block px-4 py-3 text-sm font-semibold transition-colors ${
                                    isActive(child.to)
                                      ? 'bg-violet-50 text-violet-900'
                                      : 'text-slate-700 hover:bg-slate-50 hover:text-violet-900'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search public website"
                    className="w-48 xl:w-64 rounded-full border border-violet-800 bg-violet-900/80 py-2 pl-10 pr-4 text-sm text-white placeholder:text-violet-300 focus:border-violet-300 focus:bg-violet-900 transition-all"
                  />
                  <svg className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {user ? (
                  <div ref={profileMenuRef} className="relative">
                    <button
                      onClick={() => setShowProfileMenu((prev) => !prev)}
                      className="flex items-center gap-2 rounded-xl bg-violet-900 px-3 py-2 text-xs font-bold hover:bg-violet-800"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[11px] font-black">
                        {(user.first_name || user.username || '?').charAt(0).toUpperCase()}
                      </span>
                      <span className="max-w-[120px] truncate">{user.first_name || user.username}</span>
                      <svg className={`w-3.5 h-3.5 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {showProfileMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-[60]"
                        >
                          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">Signed in as</p>
                            <p className="mt-1 truncate text-sm font-bold text-slate-900">{user.email}</p>
                          </div>
                          <Link
                            to="/dashboard"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Portal Dashboard
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-11V7" />
                            </svg>
                            Sign Out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-6 py-2 text-xs font-bold text-white hover:bg-violet-600 transition-colors shadow-md"
                  >
                    Portal Login
                  </Link>
                )}
              </div>

              <div className={`flex items-center justify-end gap-2 lg:hidden ${user ? 'flex-1' : ''}`}>
                <button
                  onClick={() => setMobileOpen((prev) => !prev)}
                  className="rounded-xl p-2 hover:bg-violet-900"
                  aria-label="Toggle public navigation"
                >
                  {mobileOpen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="border-t border-violet-900 bg-violet-950 lg:hidden overflow-hidden"
              >
                <div className="max-h-[75vh] overflow-y-auto px-4 py-3">
                  <div className="mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search public website"
                        className="w-full rounded-2xl border border-violet-800 bg-violet-900 py-3 pl-10 pr-4 text-sm text-white placeholder:text-violet-300"
                      />
                      <svg className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {NAV_LINKS.map((item) => (
                    <div key={item.key} className="border-b border-violet-900/70 last:border-b-0">
                      {item.to ? (
                        <Link
                          to={item.to}
                          className={`flex items-center px-1 py-4 text-sm font-semibold tracking-wide ${
                            isActive(item.to) ? 'text-white' : 'text-violet-100'
                          }`}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleMobileSection(item.key)}
                            className={`flex w-full items-center justify-between px-1 py-4 text-sm font-semibold tracking-wide ${
                              mobileExpanded === item.key || isGroupActive(item.children) ? 'text-white' : 'text-violet-100'
                            }`}
                          >
                            <span>{item.label}</span>
                            <svg className={`w-4 h-4 transition-transform ${mobileExpanded === item.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          <AnimatePresence>
                            {mobileExpanded === item.key && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pb-3 pl-4 overflow-hidden"
                              >
                                {item.children.map((child) => (
                                  <Link
                                    key={child.to}
                                    to={child.to}
                                    className={`flex items-center gap-2 py-3 text-sm font-semibold ${
                                      isActive(child.to) ? 'text-violet-200' : 'text-violet-300'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />
                                    {child.label}
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  ))}

                  {user && (
                    <div className="mt-4 rounded-2xl border border-violet-900 bg-violet-900/70 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Signed in as</p>
                      <p className="mt-1 text-sm font-bold text-white">{user.email}</p>
                      <div className="mt-4 flex gap-2">
                        <Link to="/dashboard" className="flex-1 rounded-xl bg-white px-4 py-2 text-center text-xs font-bold text-violet-950">
                          Dashboard
                        </Link>
                        <button onClick={handleLogout} className="flex-1 rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-white">
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      <main className="flex-grow overflow-hidden">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-violet-900/20 bg-violet-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Official Contact</p>
              <h3 className="mt-3 text-lg font-bold">Kiwalan National High School</h3>
              <div className="mt-4 space-y-2 text-sm text-violet-100">
                <p>Kiwalan, Iligan City, Lanao del Norte, Philippines</p>
                <p>info@kiwalan-nhs.edu.ph</p>
                <p>(123) 456-7890</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Site Directory</p>
              <div className="mt-4 grid gap-2 text-sm font-medium text-violet-100">
                <Link to="/" className="hover:text-white">Home</Link>
                <Link to="/mission" className="hover:text-white">Mission</Link>
                <Link to="/vision" className="hover:text-white">Vision</Link>
                <Link to="/faculty" className="hover:text-white">Faculty & Staff</Link>
                <Link to="/k12-programs" className="hover:text-white">K to 12 Programs</Link>
                <Link to="/senior-high" className="hover:text-white">Senior High School</Link>
                <Link to="/enroll" className="hover:text-white">Apply for Enrollment</Link>
                <Link to="/track-enrollment" className="hover:text-white">Track Application</Link>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Policies</p>
              <div className="mt-4 space-y-2 text-sm font-medium text-violet-100">
                <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-white">Terms of Service</Link>
                <Link to="/contact" className="hover:text-white">Contact Office</Link>
                <Link to="/portals" className="hover:text-white">Portals & Systems</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-5 text-xs tracking-wide text-violet-200">
            © {new Date().getFullYear()} Kiwalan National High School. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
