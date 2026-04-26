'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplitButtonOption {
  id: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface SplitButtonProps {
  label: string;
  icon?: ReactNode;
  options: SplitButtonOption[];
  onMainClick?: () => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function SplitButton({
  label,
  icon,
  options,
  onMainClick,
  disabled = false,
  size = 'xs',
  variant = 'primary',
  className = '',
}: SplitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, showAbove: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = options.length * 52 + 8;
      const dropdownWidth = Math.max(180, rect.width);
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < dropdownHeight + 12;
      const left = Math.min(Math.max(8, rect.right - dropdownWidth), window.innerWidth - dropdownWidth - 8);
      
      setDropdownPosition({
        top: showAbove ? rect.top - dropdownHeight - 6 : rect.bottom + 6,
        left,
        width: dropdownWidth,
        showAbove,
      });
    }
  }, [isOpen, options.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const sizeClasses = {
    xs: 'text-xs px-2.5 py-1.5',
    sm: 'text-sm px-3 py-2',
    md: 'text-base px-4 py-2.5',
  };

  const iconSizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const variantClasses = {
    primary: 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white border-transparent',
    secondary: 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)]',
  };

  const baseClasses = `inline-flex items-center justify-center font-medium rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]}`;

  const dropdownMenu = isOpen && typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: dropdownPosition.showAbove ? 8 : -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: dropdownPosition.showAbove ? 8 : -8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          minWidth: dropdownPosition.width,
          zIndex: 9999,
        }}
        className="py-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xl modal-solid"
      >
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              option.onClick();
              setIsOpen(false);
            }}
            disabled={option.disabled}
            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {option.icon && <span className="w-4 h-4 flex-shrink-0">{option.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--text-primary)]">{option.label}</div>
              {option.description && (
                <div className="text-xs text-[var(--text-muted)] truncate">{option.description}</div>
              )}
            </div>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  const isFlexGrow = className.includes('flex-1');
  const handleMainClick = () => {
    if (disabled) return;
    if (onMainClick) {
      onMainClick();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`relative ${isFlexGrow ? 'flex flex-1' : 'inline-flex'} ${className.replace('flex-1', '').trim()}`}>
      <button
        type="button"
        onClick={handleMainClick}
        disabled={disabled}
        className={`${baseClasses} rounded-r-none border-r-0 flex-1 min-w-0`}
      >
        {icon && <span className={`${iconSizeClasses[size]} mr-1.5`}>{icon}</span>}
        {label}
      </button>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`${baseClasses} rounded-l-none px-1.5 border-l border-white/20`}
      >
        <ChevronDown className={`${iconSizeClasses[size]} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownMenu}
    </div>
  );
}
