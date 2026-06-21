'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from '../../components/Header';
import { DataDashboardButton } from '../../components/DataDashboardButton';
import { FusionAI } from '../../components/FusionAI';
import { Send, Sparkles } from 'lucide-react';
import styles from './page.module.css';

import { MIRROR_API_URL } from '@/lib/utils';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioPageInner />
    </Suspense>
  );
}

function StudioPageInner() {
  const searchParams = useSearchParams();
  const testMode = (searchParams?.get('test') || '') === '1';
  const scannedBackText = (searchParams?.get('back') || '').trim();
  const sharedImage = (searchParams?.get('shareImage') || '').trim();
  const sharedText = (searchParams?.get('shareText') || '').trim();
  const sharedPrompt = (searchParams?.get('sharePrompt') || '').trim();

  const [hydrated, setHydrated] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [crossOptimizeLoading, setCrossOptimizeLoading] = useState(false);
  const [crossOptimizeError, setCrossOptimizeError] = useState<string | null>(null);
  const [crossOptimizeReports, setCrossOptimizeReports] = useState<Array<{ model: string; role: string; output: string; error?: string }> | null>(null);
  const [generatedImage, setGeneratedImage] = useState('');
  const [latestDropImageUrl, setLatestDropImageUrl] = useState<string | null>(null);
  const [generatedTextContent, setGeneratedTextContent] = useState('');
  const [draftImage, setDraftImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationAttempt, setGenerationAttempt] = useState(0);

  // ✅ Updated type
  const [generationMetadata, setGenerationMetadata] = useState<{
    timestamp: string;
    model: string;
    params: Record<string, unknown>;
    fractal_dimension?: { value: number; method: string; label: string };
    quantum_provenance?: { provider: string; jobId: string; backend: string; seed: string; shots: number; createdAt: string };
    quantumSeed?: string;
  } | undefined>(undefined);

  const [catalogPosts, setCatalogPosts] = useState<Array<{ id: string; content: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [ipfsEnabled, setIpfsEnabled] = useState<boolean>(false);
  const [quantumMode, setQuantumMode] = useState<boolean>(false);
  const [postingStatus, setPostingStatus] = useState<string | null>(null);

  type SocialAccount = { authenticated: boolean; screenName?: string };
  const [socialAccounts, setSocialAccounts] = useState<Record<string, SocialAccount | null>>({
    twitter: null, telegram: null, instagram: null, tiktok: null, youtube: null
  });

  const [posterAttachedImage, setPosterAttachedImage] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeMode, setRangeMode] = useState<boolean>(false);
  const [lastGenTimestamp, setLastGenTimestamp] = useState<number>(Date.now());
  const [chatUser, setChatUser] = useState<string>('Guest');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatConnected, setChatConnected] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; time: string; user: string; text: string; assetUrl?: string }>>([]);

  const [pipelineStage, setPipelineStage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [generationMaxAttempts, setGenerationMaxAttempts] = useState<number>(10);
  const [logs, setLogs] = useState<{ time: string; msg: string; code?: string; type: 'info' | 'error' | 'warn' | 'success' }[]>([]);

  const addLog = (msg: string, type: 'info' | 'error' | 'warn' | 'success' = 'info', code?: string) => {
    const t = new Date();
    const time = t.toISOString().split('T')[1]?.slice(0, 8) || t.toISOString();
    setLogs((prev) => [...prev, { time, msg, type, code }]);
  };

  // ==================== buildDraftPreview ====================
  const buildDraftPreview = (text: string, w = 1024, h = 1024) => {
    try {
      if (typeof document === 'undefined') return '';
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      let seed = 0;
      for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0xffffffff;
      };

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#7FAAE6');
      grad.addColorStop(0.55, '#F1A487');
      grad.addColorStop(1, '#0b0b12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath