
'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, DollarSign, Activity } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  timestamp: string;
  cardNumberMasked?: string;
}

interface Card {
  id: string;
  number: string;
  expiry: string;
  name: string;
}

export function WalletPanel() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const fetchWallet = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/payment/wallet');
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setTransactions(data.transactions);
        setCards(data.cards);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWallet();
    const interval = setInterval(fetchWallet, 5000); // Live updates
    return () => clearInterval(interval);
  }, []);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/payment/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCard)
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         alert('Server error: Invalid response');
         return;
      }
      
      const data = await res.json();
      if (data.success) {
        setShowAddCard(false);
        setNewCard({ number: '', expiry: '', cvv: '', name: '' });
        fetchWallet();
      } else {
        alert('Failed to add card');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="text-green-400" />
          AI Wallet
        </h2>
        <div className="text-right">
          <p className="text-sm text-gray-400">Current Balance</p>
          <p className="text-2xl font-bold text-green-400">${balance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-300">Payment Methods</h3>
            <button 
              onClick={() => setShowAddCard(!showAddCard)}
              className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          
          {showAddCard && (
            <form onSubmit={handleAddCard} className="bg-gray-900 p-4 rounded-lg mb-4 space-y-3 border border-gray-600">
              <input 
                placeholder="Card Number" 
                className="w-full bg-black/30 border border-gray-700 rounded p-2 text-sm"
                value={newCard.number}
                onChange={e => setNewCard({...newCard, number: e.target.value})}
              />
              <div className="flex gap-2">
                <input 
                  placeholder="MM/YY" 
                  className="w-1/2 bg-black/30 border border-gray-700 rounded p-2 text-sm"
                  value={newCard.expiry}
                  onChange={e => setNewCard({...newCard, expiry: e.target.value})}
                />
                <input 
                  placeholder="CVV" 
                  className="w-1/2 bg-black/30 border border-gray-700 rounded p-2 text-sm"
                  value={newCard.cvv}
                  onChange={e => setNewCard({...newCard, cvv: e.target.value})}
                />
              </div>
              <input 
                placeholder="Cardholder Name" 
                className="w-full bg-black/30 border border-gray-700 rounded p-2 text-sm"
                value={newCard.name}
                onChange={e => setNewCard({...newCard, name: e.target.value})}
              />
              <button type="submit" className="w-full bg-green-600 py-2 rounded text-sm font-bold">Save Card</button>
            </form>
          )}

          <div className="space-y-2">
            {cards.map(card => (
              <div key={card.id} className="bg-gray-700/50 p-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-gray-400" />
                  <div>
                    <p className="font-mono text-sm">{card.number}</p>
                    <p className="text-xs text-gray-500">{card.name}</p>
                  </div>
                </div>
                <span className="text-xs bg-gray-600 px-2 py-1 rounded">{card.expiry}</span>
              </div>
            ))}
            {cards.length === 0 && <p className="text-gray-500 text-sm italic">No cards stored</p>}
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h3 className="font-medium text-gray-300 mb-4">Recent Transactions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {transactions.slice().reverse().map(tx => (
              <div key={tx.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded border border-gray-800">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium">{tx.type === 'voice_payment' ? 'Voice Payment' : tx.type}</p>
                    <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-mono">+${tx.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{tx.cardNumberMasked}</p>
                </div>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-gray-500 text-sm italic">No transactions yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
