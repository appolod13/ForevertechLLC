'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DataDashboardButtonProps {
  label?: string;
  className?: string;
}

export function DataDashboardButton({ label = 'View Data Dashboard', className }: DataDashboardButtonProps) {
  return (
    <Link
      href="/factory-dashboard"
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400 focus:ring-offset-gray-900 transition',
        className,
      )}
    >
      {label}
    </Link>
  );
}
