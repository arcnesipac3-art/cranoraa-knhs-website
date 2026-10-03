import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * SearchBar Component with Suggestions
 * 
 * Features:
 * - Debounced search input (300ms default)
 * - Suggestion dropdown with keyboard navigation
 * - Category grouping for suggestions
 * - Accessible with ARIA attributes
 * - Styled with Tailwind CSS
 * 
 * @param {Object} props
 * @param {string} props.placeholder - Placeholder text for search input
 * @param {function} props.onSearch - Callback when search is performed
 * @param {Array} props.suggestions - Array of suggestion objects
 * @param {number} props.debounceMs - Debounce delay in milliseconds (default 300)
 * @param {string} props.className - Additional CSS classes
 */
export const SearchBar = ({
  placeholder = 'Search features...',
  onSearch,
  suggestions = [],
  debounceMs = 300,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const updateDropdownPos = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Filter suggestions based on debounced query
  useEffect(() => {
    if (debouncedQuery.trim() === '') {
      setFilteredSuggestions([]);
      setIsOpen(false);
      return;
    }

    const filtered = suggestions.filter(suggestion =>
      suggestion.label.toLowerCase().includes(debouncedQuery.toLowerCase())
    );

    setFilteredSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setSelectedIndex(-1);

    // Call onSearch callback if provided
    if (onSearch) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, suggestions, onSearch]);

  // Group suggestions by category
  const groupedSuggestions = useCallback(() => {
    const groups = {};
    
    filteredSuggestions.forEach(suggestion => {
      const category = suggestion.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(suggestion);
    });

    return groups;
  }, [filteredSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          handleSuggestionClick(filteredSuggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      
      default:
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.label);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (suggestion.path) {
      navigate(suggestion.path);
    }
    
    if (onSearch) {
      onSearch(suggestion.label);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  // Handle input focus
  const handleInputFocus = () => {
    updateDropdownPos();
    if (filteredSuggestions.length > 0) {
      setIsOpen(true);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const groups = groupedSuggestions();
  const categories = Object.keys(groups);

  return (
    <div className={`relative ${className}`} role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:border-violet-400 transition-all"
          aria-label="Search features"
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
          }
        />
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-suggestions"
          role="listbox"
          className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-[110]"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {categories.map((category, categoryIndex) => (
            <div key={category}>
              {/* Category Header */}
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
                {category}
              </div>

              {/* Suggestions in Category */}
              <div>
                {groups[category].map((suggestion, index) => {
                  const globalIndex = filteredSuggestions.findIndex(
                    s => s === suggestion
                  );
                  const isSelected = selectedIndex === globalIndex;

                  return (
                    <div
                      key={`${category}-${index}`}
                      id={`suggestion-${globalIndex}`}
                      role="option"
                      aria-selected={isSelected}
                      data-index={globalIndex}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`
                        px-4 py-3 cursor-pointer transition-colors
                        ${isSelected
                          ? 'bg-violet-50 text-violet-700'
                          : 'hover:bg-slate-50 text-slate-700'
                        }
                        ${index === groups[category].length - 1 && categoryIndex === categories.length - 1
                          ? ''
                          : 'border-b border-slate-100'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {/* Icon placeholder */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-violet-100' : 'bg-slate-100'
                        }`}>
                          <svg
                            className={`w-4 h-4 ${isSelected ? 'text-violet-600' : 'text-slate-600'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                        
                        {/* Suggestion Label */}
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {suggestion.label}
                          </div>
                          {suggestion.description && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {suggestion.description}
                            </div>
                          )}
                        </div>

                        {/* Keyboard shortcut hint */}
                        {isSelected && (
                          <div className="text-xs text-slate-400">
                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded">
                              Enter
                            </kbd>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.trim() !== '' && filteredSuggestions.length === 0 && (
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-[110]"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          <div className="text-center text-slate-500 text-sm">
            No results found for &apos;{query}&apos;
          </div>
        </div>
      )}
    </div>
  );
};
