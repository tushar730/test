
import React, { useState, useRef, useEffect } from 'react';

type Option = {
    value: string;
    label: string;
};

interface CustomDropdownProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    theme: 'light' | 'dark';
    disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ options, value, onChange, theme, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const selectedOption = options.find(option => option.value === value);

    const dropdownButtonClasses = `w-full appearance-none font-semibold rounded-lg py-2.5 pl-4 pr-4 text-left transition-colors duration-300 disabled:opacity-50 flex justify-between items-center
    ${theme === 'dark' 
        ? 'bg-slate-700/50 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500' 
        : 'bg-slate-100 text-slate-800 border border-slate-300 focus:ring-2 focus:ring-blue-500'}`;

    const dropdownMenuClasses = `absolute w-full mt-2 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto
    ${theme === 'dark' 
        ? 'bg-[#1E293B] border border-slate-700' 
        : 'bg-white border border-slate-200'}`;

    const optionClasses = (isSelected: boolean) => `
        px-4 py-2 text-sm font-medium cursor-pointer transition-colors
        ${isSelected
            ? (theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
            : (theme === 'dark' 
                ? 'text-slate-300 hover:bg-slate-700' 
                : 'text-slate-700 hover:bg-slate-100')
        }
    `;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={dropdownButtonClasses}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{selectedOption?.label}</span>
                <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <ul
                    className={dropdownMenuClasses}
                    role="listbox"
                    aria-activedescendant={selectedOption?.value}
                >
                    {options.map(option => (
                        <li
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className={optionClasses(value === option.value)}
                            role="option"
                            aria-selected={value === option.value}
                            id={option.value}
                        >
                            {option.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CustomDropdown;
