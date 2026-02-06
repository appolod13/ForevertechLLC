'use client';

import React from 'react';

interface NavButtonProps {
  label: string;
  onActivate: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function NavButton({ label, onActivate, disabled, ariaLabel }: NavButtonProps) {
  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) onActivate();
    }
  };
  return (
    <button
      role="button"
      aria-label={ariaLabel || label}
      aria-disabled={disabled ? true : undefined}
      onClick={() => !disabled && onActivate()}
      onKeyDown={handleKey}
      className={`px-4 py-2 rounded-lg font-semibold transition ${
        disabled ? 'bg-gray-700 cursor-not-allowed text-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white'
      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400`}
    >
      {label}
    </button>
  );
}

