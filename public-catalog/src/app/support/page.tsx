
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { CallAgent } from '../../components/CallAgent';

interface SupportStatus {
  agentsAvailable: number;
  queueLength: number;
  estimatedWait: number;
}

export default function SupportPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SupportStatus | null>(null);
  const [ticket, setTicket] = useState({ subject: '', message: '', email: '' });
  const [call, setCall] = useState({ phoneNumber: '', reason: '' });
  const [callStatus, setCallStatus] = useState('');
  const [viewMode, setViewMode] = useState<'customer' | 'agent'>('customer');
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/support/status');
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
          throw new Error(`Server returned ${res.status} ${res.statusText}`);
        }
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          console.error('Received non-JSON response:', text.slice(0, 100)); // Log first 100 chars
          throw new Error('Invalid response format from server');
        }
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error('Failed to load support status:', err);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await fetch('/api/admin/me', { cache: 'no-store' }).catch(() => null);
      const json: unknown = res ? await res.json().catch(() => null) : null;
      const ok = Boolean(res && res.ok && json && typeof json === 'object' && 'success' in json && (json as { success?: unknown }).success === true);
      if (!cancelled) setShowAdmin(ok);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showAdmin && viewMode === 'agent') setViewMode('customer');
  }, [showAdmin, viewMode]);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         throw new Error('Server returned invalid format');
      }
      
      const data = await res.json();
      alert(data.message || 'Ticket submitted');
      setTicket({ subject: '', message: '', email: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to submit ticket. Please try again.');
    }
  };

  const startCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setCallStatus('Connecting...');
    try {
      const res = await fetch('/api/support/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(call)
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
         throw new Error('Server returned invalid format');
      }

      const data = await res.json();
      if (data.success) {
        setCallStatus(`Call Initiated: ${data.callId}`);
      } else {
        setCallStatus('Failed to connect');
      }
    } catch (err) {
      console.error(err);
      setCallStatus('Connection Error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Customer Support Center</h1>
          <div className="flex gap-3">
            {showAdmin ? (
              <button
                onClick={() => setViewMode(viewMode === 'customer' ? 'agent' : 'customer')}
                className="text-xs bg-gray-800 border border-gray-600 px-3 py-1 rounded hover:bg-gray-700 transition-colors"
              >
                Switch to {viewMode === 'customer' ? 'Agent' : 'Customer'} View
              </button>
            ) : null}
            <button 
              onClick={() => router.push('/')}
              className="text-xs bg-white text-black font-bold px-4 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>

        <div className="mb-10 rounded-2xl border border-gray-700 bg-gray-900 p-6">
          <div className="text-lg font-semibold">ForeverTech Support</div>
          <div className="mt-2 grid gap-1 text-sm text-gray-300">
            <div>
              Email:{" "}
              <a className="text-blue-300 hover:text-blue-200" href="mailto:support@forevertech.tech">
                support@forevertech.tech
              </a>
            </div>
            <div>Address: 84 Luisa St, Brooklyn, NY 10223</div>
            <div>Hours: 24/7</div>
          </div>
        </div>
        
        {viewMode === 'agent' ? (
          <div className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">Agent Voice Console</h2>
            <div className="grid grid-cols-1 gap-8 w-full max-w-5xl">
              <div className="flex flex-col items-center">
                <CallAgent identity="support-agent-1" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Status Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-gray-400 text-sm">Agents Online</h3>
                <p className="text-3xl font-bold text-green-400">{status?.agentsAvailable ?? '-'}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-gray-400 text-sm">Queue Length</h3>
                <p className="text-3xl font-bold text-yellow-400">{status?.queueLength ?? '-'}</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-gray-400 text-sm">Est. Wait Time</h3>
                <p className="text-3xl font-bold text-blue-400">{status?.estimatedWait ?? '-'} min</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Ticket Form */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Open a Ticket</h2>
                <form onSubmit={submitTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                      value={ticket.email}
                      onChange={e => setTicket({...ticket, email: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Subject</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                      value={ticket.subject}
                      onChange={e => setTicket({...ticket, subject: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Message</label>
                    <textarea 
                      className="w-full bg-gray-800 border border-gray-700 rounded p-2 h-32"
                      value={ticket.message}
                      onChange={e => setTicket({...ticket, message: e.target.value})}
                      required
                    />
                  </div>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold w-full">
                    Submit Ticket
                  </button>
                </form>
              </div>

              {/* Call Center Widget */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Talk to an Agent</h2>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                  <p className="mb-4 text-gray-300">Need immediate assistance? Request a callback from our AI-powered call center.</p>
                  <form onSubmit={startCall} className="space-y-4">
                    <div>
                      <label className="block text-sm mb-1">Phone Number</label>
                      <input 
                        type="tel" 
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                        placeholder="+1 (555) 000-0000"
                        value={call.phoneNumber}
                        onChange={e => setCall({...call, phoneNumber: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Reason for Call</label>
                      <select 
                        className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                        value={call.reason}
                        onChange={e => setCall({...call, reason: e.target.value})}
                      >
                        <option value="">Select a reason...</option>
                        <option value="order">Order Issue</option>
                        <option value="payment">Payment Problem</option>
                        <option value="product">Product Inquiry</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button type="submit" className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold w-full flex items-center justify-center gap-2">
                      <span>📞</span> Request Call
                    </button>
                  </form>
                  {callStatus && (
                    <div className="mt-4 p-3 bg-gray-900 rounded text-center text-sm font-mono text-green-400">
                      {callStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
