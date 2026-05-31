'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { CartItem } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function extractCartQrUrl(items: CartItem[]): string {
  for (const it of items) {
    const meta = isRecord(it.metadata) ? (it.metadata as Record<string, unknown>) : null;
    const disabled = meta && meta.qrDisabled === true;
    if (disabled) continue;
    const v = meta && typeof meta.qrUrl === 'string' ? meta.qrUrl : '';
    const t = String(v || '').trim();
    if (t) return t;
  }
  return '';
}

function extractCartQrDisabled(items: CartItem[]): boolean {
  for (const it of items) {
    const meta = isRecord(it.metadata) ? (it.metadata as Record<string, unknown>) : null;
    const disabled = meta && meta.qrDisabled === true;
    if (disabled) return true;
  }
  return false;
}

export default function CheckoutPage() {
  const { items, total } = useCart();
  const { user, isLoading } = useAuth();

  const quantumFeeUsd = Number(process.env.NEXT_PUBLIC_QUANTUM_VERIFIED_FEE_USD || 4.99);
  const [quantumVerified, setQuantumVerified] = useState(false);
  const quantumFee = quantumVerified ? (Number.isFinite(quantumFeeUsd) ? quantumFeeUsd : 4.99) : 0;
  const [quantumAvailable, setQuantumAvailable] = useState<boolean>(true);
  const [quantumUnavailableReason, setQuantumUnavailableReason] = useState<string>('');

  type ShippingOption = { id: string; label: string; amountUsd: number; eta?: string };
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingOptionId, setShippingOptionId] = useState<string>('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const shippingUsd = useMemo(() => {
    const opt = shippingOptions.find(o => o.id === shippingOptionId) || shippingOptions[0];
    return opt ? opt.amountUsd : 0;
  }, [shippingOptions, shippingOptionId]);

  const grandTotal = total + quantumFee + shippingUsd;

  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    qrUrl: '',
    qrDisabled: false,
    address: '',
    address2: '',
    city: '',
    region: '',
    country: 'US',
    zip: '',
    callOptIn: true
  });

  useEffect(() => {
    const disabled = extractCartQrDisabled(items);
    const suggested = extractCartQrUrl(items);
    setFormData((prev) => {
      const cur = String(prev.qrUrl || '').trim();
      const next: typeof prev = { ...prev };
      next.qrDisabled = disabled;
      if (disabled) next.qrUrl = '';
      if (!disabled && suggested && !cur) next.qrUrl = suggested;
      return next;
    });
  }, [items]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + (it.quantity || 1), 0), [items]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/quantum/status', { cache: 'no-store' });
        const json: unknown = await res.json().catch(() => null);
        const ok = isRecord(json) && json.success === true && isRecord(json.data);
        if (!ok) {
          if (!cancelled) {
            setQuantumAvailable(false);
            setQuantumUnavailableReason('temporarily_unavailable');
            setQuantumVerified(false);
          }
          return;
        }
        const data = (json as Record<string, unknown>).data as Record<string, unknown>;
        const available = data.available === true;
        const reason = typeof data.reason === 'string' ? data.reason : '';
        if (!cancelled) {
          setQuantumAvailable(available);
          setQuantumUnavailableReason(reason);
          if (!available) setQuantumVerified(false);
        }
      } catch {
        if (!cancelled) {
          setQuantumAvailable(false);
          setQuantumUnavailableReason('temporarily_unavailable');
          setQuantumVerified(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const country = (formData.country || '').trim();
    if (!items.length) return;
    if (!country) return;

    let cancelled = false;

    const run = async () => {
      setShippingLoading(true);
      setShippingError(null);
      try {
        const res = await fetch('/api/shipping/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            country,
            zip: formData.zip,
            region: formData.region,
            city: formData.city,
            itemCount,
          }),
        });
        const json: unknown = await res.json().catch(() => null);
        const ok = isRecord(json) && json.success === true;
        if (!res.ok || !ok) {
          const err = isRecord(json) && typeof json.error === 'string' ? json.error : `shipping_http_${res.status}`;
          if (!cancelled) setShippingError(String(err));
          return;
        }
        const data = isRecord(json) && isRecord(json.data) ? (json.data as Record<string, unknown>) : {};
        const optionsValue = data.options;
        const opts: unknown[] = Array.isArray(optionsValue) ? (optionsValue as unknown[]) : [];
        const normalized: ShippingOption[] = opts
          .map((o: unknown) => {
            const r = isRecord(o) ? o : {};
            return {
              id: typeof r.id === 'string' ? r.id : String(r.id || ''),
              label: typeof r.label === 'string' ? r.label : String(r.label || ''),
              amountUsd: typeof r.amountUsd === 'number' ? r.amountUsd : Number(r.amountUsd || 0),
              eta: typeof r.eta === 'string' ? r.eta : undefined,
            };
          })
          .filter((o) => o.id && Number.isFinite(o.amountUsd));
        if (!cancelled) {
          setShippingOptions(normalized);
          const first = normalized[0]?.id || '';
          setShippingOptionId((cur) => (cur && normalized.some((o) => o.id === cur) ? cur : first));
        }
      } catch (e) {
        if (!cancelled) setShippingError(e instanceof Error ? e.message : 'shipping_failed');
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [formData.city, formData.country, formData.region, formData.zip, itemCount, items.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setCheckoutError(null);
    try {
      const deviceId = localStorage.getItem('device_id') || 'anonymous';
      const shippingId = shippingOptionId || (shippingOptions[0]?.id || '');
      const qrUrlRaw = (formData.qrUrl || '').trim();
      const qrDisabled = formData.qrDisabled === true;
      const qrUrl =
        !qrDisabled && qrUrlRaw && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(qrUrlRaw) ? `https://${qrUrlRaw}` : qrUrlRaw;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items,
          quantumVerified,
          shippingOptionId: shippingId,
          shippingCountry: formData.country,
          customerName: formData.name,
          customerEmail: formData.email,
          userId: user?.id || '',
          deviceId,
          qrUrl,
          qrDisabled,
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
      if (!data || typeof data.url !== 'string' || !data.url) {
        throw new Error('Stripe checkout URL missing');
      }
      window.location.href = data.url;
      return;
    } catch (error) {
      console.error('Checkout failed', error);
      const msg = error instanceof Error ? error.message : 'Checkout failed';
      setCheckoutError(msg);
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
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">QR Link (optional)</label>
                <input
                  type="text"
                  name="qrUrl"
                  value={formData.qrUrl}
                  onChange={handleChange}
                  placeholder="https://yourbusiness.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-white focus:border-primary focus:outline-none"
                  data-testid="input-qr-url"
                />
                <div className="mt-1 space-y-1 text-[11px] text-zinc-500">
                  <div className="font-mono">https://yourbusiness.com</div>
                  <div>This link will be encoded into the QR stamp on the back.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Shipping Options</h2>
            {shippingLoading ? (
              <div className="text-sm text-zinc-400">Calculating shipping…</div>
            ) : shippingError ? (
              <div className="text-sm text-yellow-400">Shipping: {shippingError}</div>
            ) : shippingOptions.length ? (
              <div className="space-y-2">
                {shippingOptions.map((o) => (
                  <label key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 text-sm cursor-pointer">
                    <span className="text-zinc-200">
                      <span className="font-semibold">{o.label}</span>
                      {o.eta ? <span className="ml-2 text-xs text-zinc-500">{o.eta}</span> : null}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-white">${o.amountUsd.toFixed(2)}</span>
                      <input
                        type="radio"
                        name="shippingOption"
                        checked={shippingOptionId === o.id}
                        onChange={() => setShippingOptionId(o.id)}
                        className="h-4 w-4 accent-primary"
                      />
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">Enter your country and ZIP to see shipping.</div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">Payment Method</h2>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
              Payments are processed securely by Stripe (card).
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isProcessing || (shippingOptions.length > 0 && !(shippingOptionId || shippingOptions[0]?.id))}
            className="w-full rounded-lg bg-primary py-4 font-bold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="submit-payment"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Redirecting to Stripe...
              </>
            ) : (
              `Proceed to Stripe Checkout ($${grandTotal.toFixed(2)})`
            )}
          </button>
          {checkoutError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {checkoutError}
            </div>
          ) : null}
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

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <label className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <span className="block font-semibold text-white">Quantum Verified Premium</span>
                  <span className="block text-xs text-zinc-400">
                    Uses a real IBM Quantum hardware job to generate a verifiable quantum seed for this order.
                    {!quantumAvailable ? ` Unavailable right now (${quantumUnavailableReason || 'offline'}).` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-white">+${(Number.isFinite(quantumFeeUsd) ? quantumFeeUsd : 4.99).toFixed(2)}</span>
                  <input
                    type="checkbox"
                    checked={quantumVerified}
                    onChange={(e) => setQuantumVerified(e.target.checked)}
                    disabled={!quantumAvailable}
                    className="h-4 w-4 accent-primary"
                  />
                </span>
              </label>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-white">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Shipping</span>
                <span className="text-white">${shippingUsd.toFixed(2)}</span>
              </div>
              {quantumVerified ? (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Quantum Verified</span>
                  <span className="text-white">${quantumFee.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-white pt-2">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
