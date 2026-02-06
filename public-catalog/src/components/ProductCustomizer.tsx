'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, Shirt, Coffee, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  variants: string[];
  colors: string[];
  image: string;
}

export function ProductCustomizer({ initialImageUrl }: { initialImageUrl: string | null }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch('http://localhost:3001/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.products);
          if (data.products.length > 0) {
            setSelectedProduct(data.products[0]);
            setSelectedVariant(data.products[0].variants[0]);
            setSelectedColor(data.products[0].colors[0]);
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleOrder = async () => {
    if (!selectedProduct) return;
    setOrderStatus('processing');
    try {
        const res = await fetch('http://localhost:3001/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{
                    productId: selectedProduct.id,
                    variant: selectedVariant,
                    color: selectedColor,
                    customImage: initialImageUrl,
                    quantity: 1,
                    price: selectedProduct.basePrice
                }],
                shippingAddress: {
                    name: "Test User",
                    line1: "123 Tech Lane",
                    city: "San Francisco",
                    country: "US"
                },
                totalAmount: selectedProduct.basePrice
            })
        });
        const data = await res.json();
        if (data.success) {
            setOrderStatus('success');
        } else {
            setOrderStatus('error');
        }
    } catch (e) {
        setOrderStatus('error');
    }
  };

  if (loading) return <div className="animate-pulse h-96 bg-zinc-900 rounded-xl"></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Preview Area */}
      <div className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
         {/* Product Base Layer */}
         <div className="absolute inset-0 flex items-center justify-center opacity-50">
             {selectedProduct?.id.includes('mug') ? <Coffee size={300} className="text-zinc-700" /> : <Shirt size={400} className="text-zinc-700" />}
         </div>
         
         {/* AI Image Overlay */}
         {initialImageUrl && (
             <div className="relative w-1/2 h-1/2 shadow-2xl mix-blend-overlay opacity-90">
                 <Image 
                    src={initialImageUrl} 
                    alt="Design" 
                    fill 
                    className="object-contain" 
                    unoptimized={initialImageUrl.startsWith('http://localhost')}
                 />
             </div>
         )}
         
         <div className="absolute bottom-4 right-4 bg-black/80 px-4 py-2 rounded-full text-xs text-white backdrop-blur">
             Preview Mode
         </div>
      </div>

      {/* Controls */}
      <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold mb-2">Customize Your Gear</h1>
            <p className="text-zinc-400">Apply your generated artwork to premium products.</p>
        </div>

        <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300">Select Product</label>
            <div className="grid grid-cols-2 gap-4">
                {products.map(p => (
                    <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setSelectedVariant(p.variants[0]); setSelectedColor(p.colors[0]); }}
                        className={cn(
                            "p-4 rounded-xl border text-left transition-all",
                            selectedProduct?.id === p.id 
                                ? "border-primary bg-primary/10 ring-1 ring-primary" 
                                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                        )}
                    >
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-sm text-zinc-400">${p.basePrice}</div>
                    </button>
                ))}
            </div>
        </div>
        
        {selectedProduct && (
            <div className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-zinc-300 mb-3 block">Size / Variant</label>
                    <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants.map(v => (
                            <button
                                key={v}
                                onClick={() => setSelectedVariant(v)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                                    selectedVariant === v
                                        ? "border-white bg-white text-black"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-zinc-300 mb-3 block">Color</label>
                    <div className="flex flex-wrap gap-2">
                        {selectedProduct.colors.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedColor(c)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                                    selectedColor === c
                                        ? "border-white bg-white text-black"
                                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                                )}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        <div className="pt-6 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-6">
                <div className="text-zinc-400">Total</div>
                <div className="text-2xl font-bold">${selectedProduct?.basePrice.toFixed(2)}</div>
            </div>
            
            <button 
                onClick={handleOrder}
                disabled={orderStatus === 'processing' || orderStatus === 'success'}
                className={cn(
                    "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                    orderStatus === 'success' 
                        ? "bg-green-500 text-white" 
                        : "bg-white text-black hover:bg-zinc-200"
                )}
            >
                {orderStatus === 'processing' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>}
                {orderStatus === 'success' ? 'Order Placed!' : 'Add to Cart & Checkout'}
                {orderStatus === 'idle' && <ArrowRight className="w-5 h-5" />}
            </button>
            {orderStatus === 'success' && (
                <p className="text-green-500 text-center mt-2 text-sm">
                    Order confirmed! Check your email for tracking.
                </p>
            )}
        </div>
      </div>
    </div>
  );
}
