'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, total, clearCart, removePurchasedItems } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    callOptIn: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Process payment
    try {
      const payRes = await fetch('http://localhost:3001/api/payment/process-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: { number: formData.cardNumber, expiry: formData.expiry, cvv: formData.cvv },
          amount: total
        })
      });
      const payType = payRes.headers.get('content-type');
      if (!payType || !payType.includes('application/json')) {
        throw new Error('Payment server returned invalid format');
      }
      const payData = await payRes.json();
      if (!payRes.ok || !payData.success) {
        throw new Error(payData.error || 'Payment failed');
      }

      const res = await fetch('http://localhost:3001/api/accounts/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: 'PURCHASE-' + Date.now(),
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          callOptIn: formData.callOptIn,
          items: items,
          total: total,
          transactionId: payData.transactionId
        })
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid format');
      }

      if (res.ok) {
        const data = await res.json();
        const purchasedIds = Array.isArray(data?.order?.items) ? data.order.items.map((i: { id: string }) => i.id) : [];
        if (purchasedIds.length > 0) {
          await removePurchasedItems(purchasedIds);
        } else {
          await clearCart();
        }
        setIsSuccess(true);
      }
    } catch (error) {
      console.error('Checkout failed', error);
    } finally {
      setIsProcessing(false);
    }
  };
 

  if (items.length === 0 && !isSuccess) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Cart is empty</h1>
        <Link href="/" className="text-primary hover:underline">Go back to shopping</Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center max-w-lg">
        <div className="rounded-full bg-emerald-500/10 p-6 mb-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-zinc-400 mb-8">
          Thank you for your purchase, {formData.name}. We&apos;ve sent a confirmation email to {formData.email}.
        </p>
        <p className="text-green-500 mb-8">
          Your cart has been cleared.
        </p>
        <Link 
          href="/" 
          className="rounded-full bg-white px-8 py-3 font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
        >
          Continue Shopping
        </Link>
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
          </div>

          <div className="space-y-4 pt-6 border-t border-zinc-800">
            <h2 className="text-xl font-semibold text-white">Payment Details</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Card Number</label>
                <input 
                  type="text" 
                  name="cardNumber" 
                  value={formData.cardNumber} 
                  onChange={handleChange}
                  required 
                  placeholder="0000 0000 0000 0000"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  data-testid="input-card"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Test with Mac Credit Card: 4111 1111 1111 1111</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Expiry Date</label>
                  <input 
                    type="text" 
                    name="expiry" 
                    value={formData.expiry} 
                    onChange={handleChange}
                    required 
                    placeholder="MM/YY"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                    data-testid="input-expiry"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">CVV</label>
                  <input 
                    type="text" 
                    name="cvv" 
                    value={formData.cvv} 
                    onChange={handleChange}
                    required 
                    placeholder="123"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                    data-testid="input-cvv"
                  />
                </div>
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
                Processing...
              </>
            ) : (
              `Pay $${total.toFixed(2)}`
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
