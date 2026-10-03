import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useIsMobile } from '../hooks/useMediaQuery';
import { SearchBar } from './navigation';

/**
 * Navigation for the official school website.
 *
 * Kept flat and readable — labels are sentence case and weights stay at
 * 600/700 so the bar reads as institutional rather than promotional.
 */
const NAV_LINKS = [
  { key: 'home', label: 'Home', to: '/' },
  {
    key: 'about',
    label: 'About',
    children: [
      { label: 'About the School', to: '/about' },
      { label: 'Mission', to: '/mission' },
      { label: 'Vision', to: '/vision' },
      { label: 'Faculty & Staff', to: '/faculty' },
      { label: 'School Programs', to: '/programs' },
    ],
  },
  {
    key: 'academics',
    label: 'Academics',
    children: [
      { label: 'K to 12 Programs', to: '/k12-programs' },
      { label: 'Senior High School', to: '/senior-high' },
      { label: 'News & Events', to: '/news-events' },
    ],
  },
  {
    key: 'resources',
    label: 'Resources',
    children: [
      { label: 'Learning Materials', to: '/learning-materials' },
      { label: 'School Calendar', to: '/calendar' },
      { label: 'Portals & Systems', to: '/portals' },
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

/** Flatten the nav tree so site search can reach every public page. */
const SEARCH_INDEX = NAV_LINKS.flatMap((group) =>
  group.children
    ? group.children.map((child) => ({
        label: child.label,
        path: child.to,
        category: group.label,
        description: `${group.label} · Kiwalan National High School`,
      }))
    : [{ label: group.label, path: group.to, category: 'General', description: 'Kiwalan National High School' }],
);

const DEPED_SEAL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Seal_of_the_Department_of_Education_of_the_Philippines.png/960px-Seal_of_the_Department_of_Education_of_the_Philippines.png';

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

  // Swipe gestures for mobile menu
  const isMobile = useIsMobile();
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => setMobileOpen(false),
    threshold: 60,
    disabled: !isMobile || !mobileOpen,
  });
  const contentSwipeHandlers = useSwipeGesture({
    onSwipeRight: () => !mobileOpen && setMobileOpen(true),
    threshold: 60,
    disabled: !isMobile || mobileOpen,
  });

  const searchSuggestions = useMemo(() => SEARCH_INDEX, []);

  return (
    <div className="public-page min-h-screen flex flex-col">
      {/* ═══════════════════════════════════════════════════════════
          UTILITY BAR — government provenance + quick links
          ═══════════════════════════════════════════════════════════ */}
      <div className="bg-violet-900 text-violet-100">
        <div className="public-shell flex flex-col gap-1 py-1.5 text-[11px] leading-relaxed sm:flex-row sm:items-center sm:justify-between">
          <p className="tracking-wide">
            Republic of the Philippines&nbsp; · &nbsp;Department of Education&nbsp; · &nbsp;Region X
            &nbsp; · &nbsp;Division of Iligan City
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.deped.gov.ph/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline text-violet-200 hover:text-white transition-colors"
            >
              deped.gov.ph
            </a>
            <Link to="/portals" className="hidden sm:inline text-violet-200 hover:text-white transition-colors">
              Portals
            </Link>
            <Link to="/login" className="text-violet-200 hover:text-white transition-colors">
              Portal Login
            </Link>
          </div>
        </div>
      </div>
      {/* ═══════════════════════════════════════════════════════════
          MASTHEAD — seals flanking the school identity
          ═══════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-slate-200">
        <div className="public-shell grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 md:gap-6 md:py-6">
          <img
            src={DEPED_SEAL}
            alt="Seal of the Department of Education"
            width={72}
            height={72}
            className="h-14 w-14 object-contain md:h-[72px] md:w-[72px]"
            loading="eager"
            onError={(event) => {
              event.target.onerror = null;
              event.target.src = '/icons/school-logo-source.png';
            }}
          />

          <div className="min-w-0 text-center">
            <p className="public-kicker hidden sm:block">Official School Website</p>
            <h1 className="mt-1 font-display text-lg font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
              Kiwalan National High School
            </h1>
            <p className="mt-1 text-[11px] font-medium text-slate-500 sm:text-xs">
              K to 12 Basic Education School &nbsp;·&nbsp; Iligan City, Lanao del Norte
            </p>
          </div>

          <img
            src="/icons/school-logo-source.png"
            alt="Seal of Kiwalan National High School"
            width={72}
            height={72}
            className="h-14 w-14 object-contain md:h-[72px] md:w-[72px]"
            loading="eager"
          />
        </div>
      </header>
      {/* ═══════════════════════════════════════════════════════════
          PRIMARY NAVIGATION — sticky
          ═══════════════════════════════════════════════════════════ */}
      <nav
        ref={navRef}
        aria-label="Primary"
        className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
      >
        <div className="public-shell">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-1 lg:flex-none">
              <Link
                to="/"
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-violet-50 hover:text-violet-800"
                aria-label="Go to home page"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>

              <div className="hidden lg:flex items-stretch">
                {NAV_LINKS.map((item) => {
                  if (item.to) {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.key}
                        to={item.to}
                        aria-current={active ? 'page' : undefined}
                        className={`inline-flex h-14 items-center border-b px-3 text-[13px] font-semibold transition-colors xl:px-4 ${
                          active
                            ? 'border-violet-700 text-violet-900'
                            : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-violet-800'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  const open = desktopDropdown === item.key;
                  const active = isGroupActive(item.children) || open;

                  return (
                    <div
                      key={item.key}
                      className="relative"
                      onMouseEnter={() => setDesktopDropdown(item.key)}
                      onMouseLeave={() => setDesktopDropdown('')}
                    >
                      <button
                        type="button"
                        aria-haspopup="true"
                        aria-expanded={open}
                        className={`inline-flex h-14 items-center gap-1.5 border-b px-3 text-[13px] font-semibold transition-colors xl:px-4 ${
                          active
                            ? 'border-violet-700 text-violet-900'
                            : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-violet-800'
                        }`}
                      >
                        {item.label}
                        <svg
                          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute left-0 top-full z-[60] w-60 overflow-hidden rounded-b-lg border border-slate-200 bg-white shadow-lg"
                          >
                            <ul>
                              {item.children.map((child) => (
                                <li key={child.to}>
                                  <Link
                                    to={child.to}
                                    className={`block border-b border-slate-100 px-4 py-2.5 text-sm font-medium transition-colors last:border-b-0 ${
                                      isActive(child.to)
                                        ? 'bg-violet-50 text-violet-900'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-violet-800'
                                    }`}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <div className="w-48 xl:w-60">
                <SearchBar placeholder="Search the site" suggestions={searchSuggestions} />
              </div>

              {user ? (
                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowProfileMenu((prev) => !prev)}
                    aria-haspopup="true"
                    aria-expanded={showProfileMenu}
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-800"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-800">
                      {(user.first_name || user.username || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate">{user.first_name || user.username}</span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg z-[60]"
                      >
                        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                          <p className="public-dl-label">Signed in as</p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user.email}</p>
                        </div>
                        <Link
                          to="/dashboard"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Portal Dashboard
                        </Link>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-11V7" />
                          </svg>
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" className="public-btn-primary !px-5 !py-2">
                  Portal Login
                </Link>
              )}
            </div>

            <div className={`flex items-center justify-end gap-2 lg:hidden ${user ? 'flex-1' : ''}`}>
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileOpen}
                className="rounded-lg p-2 text-slate-600 hover:bg-violet-50 hover:text-violet-800"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-t border-slate-200 bg-white lg:hidden overflow-hidden"
              {...swipeHandlers}
            >
              <div className="max-h-[75vh] overflow-y-auto px-4 py-3">
                <div className="mb-2 pb-3 border-b border-slate-100">
                  <SearchBar placeholder="Search the site" suggestions={searchSuggestions} />
                </div>

                {NAV_LINKS.map((item) => (
                  <div key={item.key} className="border-b border-slate-100 last:border-b-0">
                    {item.to ? (
                      <Link
                        to={item.to}
                        className={`flex items-center py-3.5 text-sm font-semibold ${
                          isActive(item.to) ? 'text-violet-900' : 'text-slate-700'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleMobileSection(item.key)}
                          aria-expanded={mobileExpanded === item.key}
                          className={`flex w-full items-center justify-between py-3.5 text-left text-sm font-semibold ${
                            mobileExpanded === item.key || isGroupActive(item.children)
                              ? 'text-violet-900'
                              : 'text-slate-700'
                          }`}
                        >
                          <span>{item.label}</span>
                          <svg
                            className={`h-4 w-4 transition-transform ${mobileExpanded === item.key ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
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
                              className="overflow-hidden pb-3 pl-3"
                            >
                              {item.children.map((child) => (
                                <Link
                                  key={child.to}
                                  to={child.to}
                                  className={`flex items-center gap-2.5 py-2.5 text-sm font-medium ${
                                    isActive(child.to) ? 'text-violet-900' : 'text-slate-600'
                                  }`}
                                >
                                  <span className="h-1 w-1 rounded-full bg-violet-400" aria-hidden="true" />
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

                {user ? (
                  <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4">
                    <p className="public-dl-label">Signed in as</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{user.email}</p>
                    <div className="mt-3 flex gap-2">
                      <Link
                        to="/dashboard"
                        className="flex-1 rounded-lg bg-violet-800 px-4 py-2 text-center text-xs font-semibold text-white"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <Link to="/login" className="public-btn-primary w-full">
                      Portal Login
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <main className="flex-grow overflow-hidden" {...contentSwipeHandlers}>
        <Outlet />
      </main>
      {/* ═══════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════ */}
      <footer className="mt-auto border-t-4 border-violet-700 bg-violet-950 text-violet-100">
        <div className="public-shell py-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-start gap-3">
                <img
                  src="/icons/school-logo-source.png"
                  alt=""
                  aria-hidden="true"
                  className="h-12 w-12 shrink-0 object-contain"
                  loading="lazy"
                />
                <div>
                  <h2 className="font-display text-base font-bold leading-snug text-white">
                    Kiwalan National High School
                  </h2>
                  <p className="public-kicker-muted !text-violet-300 mt-1">Official School Website</p>
                </div>
              </div>
              <address className="mt-4 space-y-2 not-italic text-sm leading-relaxed text-violet-200">
                <p>Kiwalan, Iligan City, Lanao del Norte, Philippines</p>
                <p>
                  <a href="mailto:info@kiwalan-nhs.edu.ph" className="hover:text-white transition-colors">
                    info@kiwalan-nhs.edu.ph
                  </a>
                </p>
                <p>
                  <a href="tel:+6322210000" className="hover:text-white transition-colors">
                    (022) 221-0000
                  </a>
                </p>
              </address>
              <p className="mt-4 text-xs text-violet-300">
                Office hours: Monday to Friday, 7:00 AM – 5:00 PM
              </p>
            </div>

            <nav aria-label="About the school">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-white">About</h2>
              <div className="mt-4 grid gap-2.5 text-sm">
                <Link to="/about" className="text-violet-200 hover:text-white transition-colors">About the School</Link>
                <Link to="/mission" className="text-violet-200 hover:text-white transition-colors">Mission</Link>
                <Link to="/vision" className="text-violet-200 hover:text-white transition-colors">Vision</Link>
                <Link to="/faculty" className="text-violet-200 hover:text-white transition-colors">Faculty &amp; Staff</Link>
                <Link to="/programs" className="text-violet-200 hover:text-white transition-colors">School Programs</Link>
              </div>
            </nav>

            <nav aria-label="Academics and resources">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-white">Academics &amp; Resources</h2>
              <div className="mt-4 grid gap-2.5 text-sm">
                <Link to="/k12-programs" className="text-violet-200 hover:text-white transition-colors">K to 12 Programs</Link>
                <Link to="/senior-high" className="text-violet-200 hover:text-white transition-colors">Senior High School</Link>
                <Link to="/learning-materials" className="text-violet-200 hover:text-white transition-colors">Learning Materials</Link>
                <Link to="/calendar" className="text-violet-200 hover:text-white transition-colors">School Calendar</Link>
                <Link to="/news-events" className="text-violet-200 hover:text-white transition-colors">News &amp; Events</Link>
              </div>
            </nav>

            <nav aria-label="Admissions and policies">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-white">Admissions &amp; Policies</h2>
              <div className="mt-4 grid gap-2.5 text-sm">
                <Link to="/enroll" className="text-violet-200 hover:text-white transition-colors">Apply for Enrollment</Link>
                <Link to="/track-enrollment" className="text-violet-200 hover:text-white transition-colors">Track Application</Link>
                <Link to="/portals" className="text-violet-200 hover:text-white transition-colors">Portals &amp; Systems</Link>
                <Link to="/contact" className="text-violet-200 hover:text-white transition-colors">Contact Office</Link>
                <Link to="/privacy" className="text-violet-200 hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="text-violet-200 hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </nav>
          </div>

          <div className="mt-10 border-t border-white/10 pt-5">
            <div className="flex flex-col gap-3 text-xs text-violet-300 md:flex-row md:items-center md:justify-between">
              <p>
                © {new Date().getFullYear()} Kiwalan National High School. All rights reserved.
              </p>
              <p>
                DepEd Order No. 38, s. 2016 (Data Privacy) ·{' '}
                <a
                  href="https://www.deped.gov.ph/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-200 underline-offset-4 hover:text-white hover:underline"
                >
                  Department of Education
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
