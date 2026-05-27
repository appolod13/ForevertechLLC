'use client';

import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Trash2, ShoppingBag, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function CartPage() {
  const { items, removeFromCart, clearCart, total, isLoading } = useCart();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="animate-pulse text-zinc-400">Loading cart...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-zinc-900 p-6 mb-6">
          <ShoppingBag className="h-12 w-12 text-zinc-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Your cart is empty</h1>
        <p className="text-zinc-400 mb-8 max-w-md">
          Looks like you haven&apos;t added any items to your cart yet. Browse our catalog to find something unique.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Shopping Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:bg-zinc-900"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                {item.imageError ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 p-1 text-center">
                    <AlertTriangle className="mb-1 h-5 w-5 text-amber-500" />
                    <p className="text-[8px] font-medium text-zinc-400">Image Failed</p>
                    <p className="text-[8px] text-zinc-600 font-mono break-all line-clamp-2 w-full">
                      {item.originalPrompt || 'Unknown'}
                    </p>
                  </div>
                ) : item.imageUrl ? (
                  <Image 
                    src={item.imageUrl} 
                    alt={item.title} 
                    fill 
                    className="object-cover"
                    onError={(e) => {
                       // If image fails here too, fallback?
                       // We can't easily change state here without a wrapper component or more complex logic.
                       // For now, rely on CatalogItem's detection or simple replacement.
                       e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-600">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  {item.imageError && (
                    <p className="text-xs text-amber-500/80 mt-0.5">
                      Prompt: {item.originalPrompt}
                    </p>
                  )}
                  <p className="text-sm text-zinc-400">{item.description?.substring(0, 60)}...</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">
                    Qty: <span className="text-white">{item.quantity || 1}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-white">
                      ${(Number(item.price) * (item.quantity || 1)).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="rounded-full p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button 
            onClick={clearCart}
            className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
            data-testid="clear-cart"
          >
            Clear Cart
          </button>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white">Order Summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal</span>
                <span className="text-white">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Shipping</span>
                <span className="text-emerald-400">Free</span>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex justify-between font-semibold text-white text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <Link 
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary/90 transition-colors"
              data-testid="checkout-link"
            >
              Checkout <ArrowRight className="h-4 w-4" />
            </Link>
            
            {!user && (
              <p className="text-xs text-center text-zinc-500">
                <Link href="/login" className="underline hover:text-white">Log in</Link> to save your order history.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
