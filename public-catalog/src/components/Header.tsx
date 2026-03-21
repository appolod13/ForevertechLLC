'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { LiveBadge } from './LiveBadge';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white shadow-lg shadow-primary/20">
              <Image 
                src="/images/Forevertech_logo.jpg" 
                alt="ForeverTeck Logo" 
                fill
                className="object-cover"
                sizes="48px"
                priority
              />
            </div>
            <span className="hidden text-xl font-bold text-white sm:inline-block">
              ForeverTeck <span className="text-zinc-500 font-normal">Catalog</span>
            </span>
          </Link>
          <div className="ml-2 hidden md:block">
            <LiveBadge />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Latest Drops
          </Link>
          <Link href="/governance" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Governance
          </Link>
          <Link href="/studio" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Studio
          </Link>
          <Link href="/gallery" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Gallery
          </Link>
          <Link href="/support" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Support
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
             <div className="hidden md:flex items-center gap-2">
               <span className="text-sm text-zinc-400">Hi, {user.name}</span>
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
                  <span className="text-zinc-300">Signed in as {user.name}</span>
                  <button onClick={logout} className="text-sm text-red-400">Logout</button>
               </div>
            ) : (
               <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2">
                 Login / Register
               </Link>
            )}

            <Link 
              href="/" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Latest Drops
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
              href="/gallery" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Gallery
            </Link>
            <Link 
              href="/support" 
              className="text-base font-medium text-zinc-300 hover:text-white transition-colors py-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Support
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
