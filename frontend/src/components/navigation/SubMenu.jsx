import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

/**
 * SubMenu Component
 * 
 * Displays a navigation item with a dropdown sub-menu on hover/click.
 * Requirement 1.5: Sub-menus for features with sub-pages
 * WCAG 2.1 AA compliant with keyboard navigation support
 * 
 * @param {Object} props
 * @param {string} props.label - Main menu item label
 * @param {Array} props.items - Sub-menu items [{label, path, icon}]
 * @param {string} props.icon - Optional icon component for main item
 * @param {string} props.className - Additional CSS classes
 */
const SubMenu = ({ label, items = [], icon: Icon, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);
  const location = useLocation();

  // Check if any sub-item is active
  const hasActiveChild = items.some(item => location.pathname.startsWith(item.path));

  // Handle mouse enter with delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      if (!isFocused) {
        setIsOpen(false);
      }
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      menuRef.current?.querySelector('button')?.focus();
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const firstLink = menuRef.current?.querySelector('a');
      firstLink?.focus();
    }
  };

  // Handle focus within menu
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    // Check if focus is moving outside the menu
    if (!menuRef.current?.contains(e.relatedTarget)) {
      setIsFocused(false);
      setIsOpen(false);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className={`relative sub-menu ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Main Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
          transition-colors duration-200
          ${hasActiveChild || isOpen
            ? 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20'
            : 'text-slate-700 hover:text-violet-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:text-violet-400 dark:hover:bg-gray-800'
          }
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${label} menu`}
      >
        {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
        <span>{label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-56 z-[110] animate-in fade-in slide-in-from-top-2 duration-200"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`${label}-menu-button`}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1">
            {items.map((item, index) => {
              const ItemIcon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={index}
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 text-sm
                    transition-colors duration-150
                    ${isActive
                      ? 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20'
                      : 'text-slate-700 hover:text-violet-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:text-violet-400 dark:hover:bg-gray-700'
                    }
                    focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500
                  `}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      e.currentTarget.nextElementSibling?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      e.currentTarget.previousElementSibling?.focus();
                    } else if (e.key === 'Escape') {
                      setIsOpen(false);
                      menuRef.current?.querySelector('button')?.focus();
                    }
                  }}
                >
                  {ItemIcon && (
                    <ItemIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400" aria-label="Current page" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubMenu;
