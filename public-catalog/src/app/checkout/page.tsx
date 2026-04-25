'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, total } = useCart();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    address2: '',
    city: '',
    region: '',
    country: 'US',
    zip: '',
    callOptIn: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const deviceId = localStorage.getItem('device_id') || 'anonymous';
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items,
          customerName: formData.name,
          customerEmail: formData.email,
          userId: user?.id || '',
          deviceId,
          metadata: {
            phone: formData.phone,
            address: formData.address,
            address2: formData.address2,
            city: formData.city,
            region: formData.region,
            country: formData.country,
            zip: formData.zip
          }
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');
      
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout failed', error);
      setIsProcessing(false);
    }
  };
 

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Cart is empty</h1>
        <Link href="/" className="text-primary hover:underline">Go back to shopping</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !guestMode) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/50 p-8 shadow-2xl backdrop-blur-sm text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Checkout Options</h2>
          <p className="text-zinc-400 mb-8 text-sm">Log in to save your designs and access previous purchases, or continue as a guest.</p>
          
          <div className="space-y-4">
            <Link 
              href="/login?redirect=/checkout" 
              className="flex w-full justify-center rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90 transition-all"
            >
              Log In
            </Link>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="mx-4 flex-shrink-0 text-xs text-zinc-500 uppercase">Or</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>
            
            <button 
              onClick={() => setGuestMode(true)}
              className="w-full rounded-lg border border-zinc-700 bg-transparent py-3 font-semibold text-white hover:bg-zinc-800 transition-all"
            >
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Checkout</h1>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-6" data-testid="checkout-form">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Shipping Information</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  required 
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  data-testid="input-name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  required 
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  data-testid="input-email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Phone</label>
                <input 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  required 
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Address</label>
                <input 
                  type="text" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange}
                  required 
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  data-testid="input-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Address Line 2</label>
                  <input 
                    type="text" 
                    name="address2" 
                    value={formData.address2} 
                    onChange={handleChange}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                    data-testid="input-address2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Country (2-letter)</label>
                  <input 
                    type="text" 
                    name="country" 
                    value={formData.country} 
                    onChange={handleChange}
                    required 
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                    data-testid="input-country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">City</label>
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange}
                    required 
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">State / Region</label>
                  <input 
                    type="text" 
                    name="region" 
                    value={formData.region} 
                    onChange={handleChange}
                    required 
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                    data-testid="input-region"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">ZIP Code</label>
                <input 
                  type="text" 
                  name="zip" 
                  value={formData.zip} 
                  onChange={handleChange}
                  required 
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  data-testid="input-zip"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full rounded-lg bg-primary py-4 font-bold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="submit-payment"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              `Proceed to Payment ($${total.toFixed(2)})`
            )}
          </button>
        </form>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 h-fit">
          <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
          <div className="space-y-4">
            {items.map((item: CartItem) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-zinc-400">{item.title} x {item.quantity || 1}</span>
                <span className="text-white">${(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-zinc-800 pt-4 flex justify-between font-bold text-white">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-center">
        <button 
          onClick={() => router.push('/')}
          className="text-sm bg-white text-black font-bold px-8 py-3 rounded-full hover:bg-gray-200 transition-colors shadow-lg"
        >
          Done
        </button>
      </div>
    </div>
  );
}
