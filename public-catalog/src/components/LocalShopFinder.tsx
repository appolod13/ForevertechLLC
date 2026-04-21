'use client';

import React, { useState } from 'react';
import { Map, Search, MapPin, Building2, Phone, UserPlus } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: string;
  rating: number;
}

const MOCK_SHOPS: Shop[] = [
  { id: '1', name: 'City Print Tees', address: '123 Main St, Downtown', phone: '+12125551001', distance: '0.8 mi', rating: 4.8 },
  { id: '2', name: 'Quantum Threads', address: '456 Tech Blvd, Innovation District', phone: '+12125551002', distance: '1.2 mi', rating: 4.9 },
  { id: '3', name: 'Forever Custom Shirts', address: '789 Creative Way, Arts District', phone: '+12125551003', distance: '2.5 mi', rating: 4.6 },
  { id: '4', name: 'Neighborhood Prints', address: '321 Local Ave, Suburbia', phone: '+12125551004', distance: '3.1 mi', rating: 4.7 }
];

export function LocalShopFinder() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Shop[]>([]);
  const [addedShops, setAddedShops] = useState<Set<string>>(new Set());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Simulate network delay for Google Maps API search
    setTimeout(() => {
      // Filter mock results loosely based on query or just return all
      const filtered = MOCK_SHOPS.filter(shop => 
        shop.name.toLowerCase().includes(query.toLowerCase()) || 
        shop.address.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase() === 'tshirt' || 
        query.toLowerCase() === 't-shirt'
      );
      setResults(filtered.length > 0 ? filtered : MOCK_SHOPS);
      setIsSearching(false);
    }, 800);
  };

  const addToSupportContacts = async (shop: Shop) => {
    try {
      const res = await fetch('/api/agent/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Local Shop: ${shop.name}`, phone: shop.phone })
      });
      
      if (res.ok) {
        setAddedShops(new Set(addedShops).add(shop.id));
        alert(`Successfully added ${shop.name} to the Support Center contacts! Our AI agent will contact them directly regarding your order.`);
      } else {
        alert('Failed to add to contacts. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while adding contact.');
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-600/20 rounded-lg">
          <Map className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Google Maps Shop Finder</h2>
          <p className="text-gray-400 text-sm">Find your closest T-Shirt shop and connect them with our AI Support Agent.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 'T-Shirt shop near me' or enter a zipcode..."
            className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none text-white"
          />
        </div>
        <button 
          type="submit" 
          disabled={isSearching}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 transition-colors"
        >
          {isSearching ? 'Searching...' : 'Search Maps'}
        </button>
      </form>

      {/* Simulated Map & Results Area */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulated Google Maps Iframe Area */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden min-h-[400px] relative">
            <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=New+York,NY&zoom=13&size=600x400&maptype=roadmap&style=feature:all|element:labels|visibility:off&style=feature:water|color:0x1a1a1a&style=feature:landscape|color:0x2a2a2a&style=feature:poi|color:0x333333&style=feature:road|color:0x444444')] bg-cover bg-center opacity-50 mix-blend-luminosity"></div>
            
            {/* Map Markers */}
            {results.map((shop, i) => (
              <div 
                key={`marker-${shop.id}`} 
                className="absolute flex flex-col items-center"
                style={{ 
                  left: `${20 + (i * 25)}%`, 
                  top: `${30 + (i % 2 === 0 ? 20 : -10)}%` 
                }}
              >
                <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg shadow-red-900/50 mb-1 z-10 whitespace-nowrap">
                  {shop.name}
                </div>
                <MapPin className="w-8 h-8 text-red-500 fill-red-500/20" />
              </div>
            ))}
            
            <div className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded text-xs text-gray-300 font-mono">
              Google Maps (Simulated)
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {results.map((shop) => (
              <div key={shop.id} className="bg-gray-900 p-4 rounded-lg border border-gray-700 hover:border-blue-500/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-blue-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    {shop.name}
                  </h3>
                  <span className="text-sm bg-gray-800 px-2 py-1 rounded text-gray-300">{shop.distance}</span>
                </div>
                
                <p className="text-gray-400 text-sm mb-1">{shop.address}</p>
                <p className="text-gray-300 text-sm font-mono flex items-center gap-2 mb-4">
                  <Phone className="w-3 h-3" /> {shop.phone}
                </p>

                <button
                  onClick={() => addToSupportContacts(shop)}
                  disabled={addedShops.has(shop.id)}
                  className={`w-full py-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                    addedShops.has(shop.id) 
                      ? 'bg-green-600/20 text-green-400 border border-green-600/50 cursor-not-allowed' 
                      : 'bg-gray-800 hover:bg-blue-600 text-white border border-gray-600 hover:border-blue-500'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  {addedShops.has(shop.id) ? 'Added to Agent Contacts' : 'Add to Agent Contacts'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}