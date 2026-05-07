import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

/** Inner fill matches section panel (orange-50, blue-50, …); outline stays grey */
const SURFACE_FILL = {
  default: 'bg-white',
  orange: 'bg-orange-50',
  blue: 'bg-blue-50',
  teal: 'bg-teal-50',
  amber: 'bg-amber-50',
  green: 'bg-green-50',
  indigo: 'bg-indigo-50',
  slate: 'bg-slate-50',
};

const SearchableSelect = React.forwardRef(
  (
    {
      value,
      onChange,
      options,
      placeholder = 'Select...',
      className = '',
      disabled = false,
      hasError = false,
      surface = 'default',
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = React.useRef(null);

    const setRootRef = useCallback(
      (el) => {
        dropdownRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref != null) ref.current = el;
      },
      [ref]
    );

    useEffect(() => {
      if (disabled) setIsOpen(false);
    }, [disabled]);

    const filteredOptions = searchTerm.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
      : options;

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
      };
      if (isOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const selected = options.find((o) => o.value === (value ?? ''));
    const surfaceKey = SURFACE_FILL[surface] ? surface : 'default';
    const fill = SURFACE_FILL[surfaceKey];

    const triggerBase =
      'w-full min-w-[180px] px-4 py-2.5 border border-gray-300 rounded-xl flex items-center justify-between text-left transition-colors hover:border-gray-400 focus-within:ring-2 focus-within:ring-gray-200 focus-within:border-gray-400';
    const triggerState = disabled
      ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
      : hasError
        ? 'bg-red-50 border-red-400 focus-within:ring-red-200'
        : fill;

    return (
      <div className={`relative ${className}`} ref={setRootRef} tabIndex={-1}>
        <div
          className={`${triggerBase} ${triggerState}`}
          onClick={() => {
            if (disabled) return;
            setIsOpen((o) => !o);
            setSearchTerm('');
          }}
        >
          <span
            className={
              selected ? 'text-gray-900 truncate pr-2' : 'text-gray-500 truncate pr-2'
            }
          >
            {selected ? selected.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 flex-shrink-0 ${isOpen && !disabled ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {isOpen && !disabled && (
          <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-56 overflow-hidden">
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredOptions.length ? (
                filteredOptions.map((opt) => (
                  <div
                    key={`${String(opt.value)}:${opt.label}`}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                  >
                    {opt.label}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-gray-500 text-sm text-center">No options</div>
              )}
            </div>
          </div>
        )}
      </div>
    );  
  }
);
SearchableSelect.displayName = 'SearchableSelect';

export default SearchableSelect;
