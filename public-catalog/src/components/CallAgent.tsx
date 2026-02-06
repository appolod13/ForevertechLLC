
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { Phone, PhoneOff, Mic, MicOff, User, History, Activity, BookUser, Plus, Save } from 'lucide-react';

interface CallAgentProps {
  identity?: string;
}

export function CallAgent({ identity = 'support-agent-1' }: CallAgentProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [connection, setConnection] = useState<Call | null>(null);
  const [status, setStatus] = useState<string>('Offline');
  const [number, setNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'contacts'>('history');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Twilio Device
  useEffect(() => {
    const initDevice = async () => {
      try {
        setStatus('Initializing...');
        // Fetch capability token from backend
        const res = await fetch('http://localhost:3001/api/voice/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity })
        });
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
             throw new Error('Invalid server response (not JSON)');
        }

        const data = await res.json();
        
        if (data.token === 'mock-token-for-testing') {
            setToken('mock');
            setStatus('Ready (Mock Mode)');
            return;
        }

        const newDevice = new Device(data.token, {
            logLevel: 1,
            // codecPreferences: ['opus', 'pcmu'], // Removed to avoid TS strict type issues
        });

        newDevice.on('ready', () => setStatus('Ready'));
        newDevice.on('error', (error) => {
            console.error('Device Error:', error);
            setStatus(`Error: ${error.message}`);
        });
        newDevice.on('connect', (conn) => {
            setConnection(conn);
            setStatus('In Call');
        });
        newDevice.on('disconnect', () => {
            setConnection(null);
            setStatus('Ready');
        });
        newDevice.on('incoming', (conn) => {
            setConnection(conn);
            setStatus('Incoming Call...');
            // Auto answer for demo purposes or show accept UI
            // conn.accept(); 
        });

        await newDevice.register();
        setDevice(newDevice);
      } catch (e) {
        console.error(e);
        setStatus('Initialization Failed');
      }
    };

    initDevice();

    // Cleanup
    return () => {
      if (device) device.destroy();
    };
  }, [identity]);

  // Fetch logs periodically
  useEffect(() => {
      // Initial contacts fetch
      fetch('http://localhost:3001/api/agent/contacts')
        .then(res => res.json())
        .then(data => setContacts(data.contacts || []))
        .catch(console.error);

      const interval = setInterval(() => {
          fetch('http://localhost:3001/api/voice/logs')
            .then(res => res.json())
            .then(data => setLogs(data.logs || []))
            .catch(e => console.error(e));
      }, 5000);
      return () => clearInterval(interval);
  }, []);

  const saveContact = async () => {
      if (!contactPhone || !contactName) return;
      
      // Basic validation
      if (!/^\+?[1-9]\d{1,14}$/.test(contactPhone)) {
          alert('Invalid phone format');
          return;
      }

      setIsSaving(true);
      try {
          const res = await fetch('http://localhost:3001/api/agent/contacts', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ name: contactName, phone: contactPhone })
          });
          
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
               throw new Error('Server error: Invalid response');
          }

          const data = await res.json();
          if (data.success) {
              setContacts(data.contacts);
              setContactName('');
              setContactPhone('');
          } else {
              console.error(data.error);
              alert(data.error);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleCall = async () => {
    if (!number) return;

    if (token === 'mock') {
        setStatus('Calling (Mock)...');
        // Use new dedicated /api/call endpoint
        try {
            const res = await fetch('http://localhost:3001/api/call', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' 
                },
                body: JSON.stringify({ phone: number })
            });
            
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(err.message || 'Call failed');
            }
            
            const data = await res.json();
            console.log('Call Initiated:', data);
            setStatus('In Call (Mock)');
        } catch (e: any) {
            console.error('Call Error:', e);
            setStatus(`Error: ${e.message}`);
        }
        return;
    }

    if (device) {
      try {
        const conn = await device.connect({ params: { To: number } });
        setConnection(conn);
      } catch (e: any) {
        setStatus(`Call Failed: ${e.message}`);
      }
    }
  };

  const handleHangup = () => {
    if (token === 'mock') {
        setStatus('Ready (Mock Mode)');
        setConnection(null);
        return;
    }
    if (connection) {
      connection.disconnect();
    }
  };

  const toggleMute = () => {
    if (connection) {
      const newState = !isMuted;
      connection.mute(newState);
      setIsMuted(newState);
    } else if (token === 'mock') {
        setIsMuted(!isMuted);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl w-full max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${status.includes('Ready') || status.includes('In Call') ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-bold text-white">Agent Panel</span>
        </div>
        <div className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
          {status}
        </div>
      </div>

      {/* Dialer */}
      <div className="p-6">
        <div className="mb-6">
          <input 
            type="tel" 
            placeholder="+1 (555) 000-0000"
            className="w-full bg-black/20 border border-gray-600 rounded-lg p-4 text-2xl text-center text-white tracking-wider focus:border-blue-500 focus:outline-none"
            value={number}
            onChange={e => setNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(n => (
            <button 
              key={n}
              onClick={() => setNumber(prev => prev + n)}
              className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg text-xl font-bold transition-colors"
            >
              {n}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-6">
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full ${isMuted ? 'bg-yellow-600 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </button>
          
          {(status.includes('In Call') || status.includes('Calling')) ? (
            <button 
              onClick={handleHangup}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          ) : (
            <button 
              onClick={handleCall}
              className="p-4 rounded-full bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-500/30"
            >
              <Phone className="w-8 h-8" />
            </button>
          )}
        </div>
      </div>

      {/* Recent Activity / Contacts */}
      <div className="bg-gray-800/50 p-0 border-t border-gray-700">
        <div className="flex border-b border-gray-700">
            <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 p-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <History className="w-3 h-3" /> Recent Calls
            </button>
            <button 
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 p-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${activeTab === 'contacts' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <BookUser className="w-3 h-3" /> Contacts
            </button>
        </div>

        <div className="max-h-48 overflow-y-auto p-4">
          {activeTab === 'history' ? (
            <div className="space-y-2">
              {logs.slice().reverse().map((log: any, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-white/5 rounded">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-gray-300">{log.to || 'Unknown'}</span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {log.status} {log.duration ? `(${log.duration}s)` : ''}
                  </span>
                </div>
              ))}
              {logs.length === 0 && <p className="text-gray-500 text-center py-2">No logs yet</p>}
            </div>
          ) : (
            <div className="space-y-4">
                {/* Add Contact Form */}
                <div className="bg-black/20 p-3 rounded-lg space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Add New Contact</h4>
                    <div className="space-y-2">
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Name</label>
                            <input 
                                className="w-full bg-black/40 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" 
                                placeholder="Enter name" 
                                value={contactName}
                                onChange={e => setContactName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Phone Number</label>
                            <input 
                                type="tel"
                                className="w-full bg-black/40 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" 
                                placeholder="+1234567890" 
                                value={contactPhone}
                                onChange={e => setContactPhone(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={saveContact}
                            disabled={!contactPhone || !contactName || isSaving}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded text-xs font-bold flex items-center justify-center transition-all"
                        >
                            {isSaving ? 'Saving...' : <><Save className="w-3 h-3 mr-1" /> Save Contact</>}
                        </button>
                    </div>
                </div>
                
                {/* List */}
                <div className="space-y-1 mt-2">
                    {contacts.map((c: any) => (
                        <div key={c.id} className="flex justify-between items-center bg-black/20 p-2 rounded hover:bg-black/40 cursor-pointer group" onClick={() => setNumber(c.phone)}>
                            <span className="text-sm text-white font-medium">{c.name}</span>
                            <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{c.phone}</span>
                        </div>
                    ))}
                    {contacts.length === 0 && <p className="text-gray-500 text-center text-xs py-2">No contacts saved</p>}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
