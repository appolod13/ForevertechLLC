
'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';

interface Proposal {
  id: number;
  title: string;
  description: string;
  votes: {
    yes: number;
    no: number;
  };
  status: 'active' | 'closed';
  deadline: number;
}

export default function GovernancePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/governance/proposals')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }
        return res.json();
      })
      .then(data => {
        setProposals(data.proposals);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch proposals:', err);
        setLoading(false);
      });
  }, []);

  const vote = async (id: number, option: 'yes' | 'no') => {
    try {
      const res = await fetch('http://localhost:3001/api/governance/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: id, vote: option, userId: 'user-123' }) // Mock User ID
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format');
      }

      const data = await res.json();
      if (data.success) {
        // Optimistic update
        setProposals(prev => prev.map(p => {
          if (p.id === id) {
            return {
              ...p,
              votes: {
                ...p.votes,
                [option]: (p.votes[option] || 0) + 1
              }
            };
          }
          return p;
        }));
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Community Governance</h1>
          <div className="bg-purple-900/50 px-4 py-2 rounded-full border border-purple-500/30 text-purple-300">
            🐑 Sheep DAO Active
          </div>
        </div>

        <p className="text-gray-400 mb-12 text-lg">
          Vote on platform upgrades, fee structures, and feature requests. Your voice matters in the decentralized ecosystem.
        </p>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading proposals...</div>
        ) : (
          <div className="grid gap-6">
            {proposals.map((p) => {
              const total = (p.votes.yes || 0) + (p.votes.no || 0);
              const yesPercent = total ? ((p.votes.yes || 0) / total) * 100 : 0;
              
              return (
                <div key={p.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{p.title}</h3>
                      <p className="text-gray-400 text-sm">{p.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Approval</span>
                      <span>{yesPercent.toFixed(1)}% ({total} votes)</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${yesPercent}%` }}></div>
                    </div>
                  </div>

                  {p.status === 'active' && (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => vote(p.id, 'yes')}
                        className="flex-1 bg-gray-700 hover:bg-green-900/50 hover:text-green-300 border border-gray-600 hover:border-green-500 py-2 rounded-lg transition-all"
                      >
                        Yes ({p.votes.yes || 0})
                      </button>
                      <button 
                        onClick={() => vote(p.id, 'no')}
                        className="flex-1 bg-gray-700 hover:bg-red-900/50 hover:text-red-300 border border-gray-600 hover:border-red-500 py-2 rounded-lg transition-all"
                      >
                        No ({p.votes.no || 0})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
