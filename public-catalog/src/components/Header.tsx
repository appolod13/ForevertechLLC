'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { LiveBadge } from './LiveBadge';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const showDevTools = process.env.NODE_ENV !== 'production' || showAdmin;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await fetch('/api/admin/me', { cache: 'no-store' }).catch(() => null);
      const json: unknown = res ? await res.json().catch(() => null) : null;
      const ok = Boolean(res && res.ok && isRecord(json) && json.success === true);
      if (!cancelled) setShowAdmin(ok);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = [
    { href: '/', label: 'Latest Drops', visible: true },
    { href: '/about', label: 'About', visible: true },
    { href: '/governance', label: 'Governance', visible: true },
    { href: '/pixelqrypt', label: 'PixelQrypt™', visible: true },
    { href: '/studio', label: 'Studio', visible: true },
    { href: '/gallery', label: 'Gallery', visible: true },
    { href: '/faqs', label: 'FAQs', visible: true },
    { href: '/support', label: 'Support', visible: true },
    { href: '/privacy-policy', label: 'Privacy', visible: true },
    { href: '/admin', label: 'Admin', visible: showAdmin },
    { href: '/tools', label: 'Tools', visible: true },
    { href: '/scanner', label: 'Scanner', visible: showDevTools }
  ].filter((item) => item.visible);

  const selectedHref =
    navItems.find((item) => pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`)))
      ?.href ?? '';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white shadow-lg shadow-primary/20">
              <img
                src="/images/Forevertech_logo.jpg"
                alt="ForeverTech Logo"
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            <span className="hidden text-xl font-bold text-white sm:inline-block">
              ForeverTech <span className="text-zinc-500 font-normal">Catalog</span>
            </span>
          </Link>
          <div className="ml-2 hidden md:block">
            <LiveBadge />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-500">Navigate</span>
          <select
            aria-label="Navigate"
            value={selectedHref}
            onChange={(e) => {
              const href = e.target.value;
              if (!href) return;
              router.push(href);
            }}
            className="min-w-[220px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:ring-2 focus:ring-primary outline-none transition-all"
          >
            <option value="" disabled>
              Menu…
            </option>
            {navItems.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
          </select>
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
             <div className="hidden md:flex items-center gap-4">
               <Link href="/profile" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
                 <User className="h-4 w-4" />
                 <span>My Profile</span>
               </Link>
               <button onClick={logout} className="text-xs text-red-400 hover:text-red-300">Logout</button>
             </div>
          ) : (
            <Link href="/login" className="hidden md:flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
               <User className="h-4 w-4" />
               <span>Login</span>
            </Link>
          )}

          <Link href="/cart" className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors relative">
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          <button 
            className="md:hidden rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-4 animate-in slide-in-from-top-5 duration-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
               <span className="text-sm text-zinc-500">System Status</span>
               <LiveBadge />
            </div>
            
            {user ? (
               <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-300 flex items-center gap-2">
                    <User className="h-4 w-4" /> My Profile
                  </Link>
                  <button onClick={logout} className="text-sm text-red-400">Logout</button>
               </div>
            ) : (
               <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2">
                 Login / Register
               </Link>
            )}

            {showAdmin ? (
              <Link
                href="/admin"
                className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Admin
              </Link>
            ) : null}

            <Link 
              href="/" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Latest Drops
            </Link>
            <Link 
              href="/about" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              href="/governance" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Governance
            </Link>
            <Link 
              href="/studio" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Studio
            </Link>
            <Link
              href="/pixelqrypt"
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              PixelQrypt™
            </Link>
            <Link
              href="/tools"
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Tools
            </Link>
            {showDevTools ? (
              <Link
                href="/scanner"
                className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Scanner
              </Link>
            ) : null}
            <Link 
              href="/gallery" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Gallery
            </Link>
            <Link 
              href="/faqs" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              FAQs
            </Link>
            <Link 
              href="/support" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Support
            </Link>
            <Link 
              href="/privacy-policy" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
