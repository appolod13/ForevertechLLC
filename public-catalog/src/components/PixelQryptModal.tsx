'use client';

import { useState } from 'react';
import { X, Zap, Lock, Unlock } from 'lucide-react';

interface PixelQryptModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryItemId?: string;
}

export default function PixelQryptModal({ isOpen, onClose, galleryItemId }: PixelQryptModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [hiddenMessage, setHiddenMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetrieve = async () => {
    if (!verificationCode.trim()) return;
    
    setLoading(true);
    setError(null);
    setHiddenMessage(null);

    try {
      const res = await fetch(`/api/pixelqrypt?code=${encodeURIComponent(verificationCode.trim())}`);
      const data = await res.json();
      
      if (data.success) {
        setHiddenMessage(data.hiddenMessage);
      } else {
        setError(data.error || 'Failed to retrieve message');
      }
    } catch (err) {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">PixelQrypt™</h2>
              <p className="text-zinc-400 text-sm">Retrieve Hidden Quantum Message</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {hiddenMessage ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400 font-semibold">
              <Unlock className="w-5 h-5" />
              Message Unlocked!
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p className="text-white whitespace-pre-wrap">{hiddenMessage}</p>
            </div>
            <button
              onClick={() => {
                setHiddenMessage(null);
                setVerificationCode('');
              }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Unlock Another Message
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">
                Quantum Verification Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter your PixelQrypt code..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleRetrieve()}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleRetrieve}
              disabled={loading || !verificationCode.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></span>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  Unlock Message
                </>
              )}
            </button>

            <p className="text-zinc-500 text-xs text-center mt-4">
              PixelQrypt™ uses real quantum computer verification codes for secure message retrieval
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
