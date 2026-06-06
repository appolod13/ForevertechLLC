"use client";

import { useEffect, useState } from 'react';

export default function DebugEnvPage() {
  const [apiBase, setApiBase] = useState('Loading...');

  useEffect(() => {
    // This ensures we read the value on the client-side
    const envValue = process.env.NEXT_PUBLIC_API_BASE || 'Not Set';
    setApiBase(envValue);
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', fontSize: '16px' }}>
      <h1>Environment Variable Debug</h1>
      <p style={{ marginTop: '1rem' }}>
        The current value of <strong>NEXT_PUBLIC_API_BASE</strong> is:
      </p>
      <pre
        style={{
          marginTop: '0.5rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ccc',
          borderRadius: '4px',
          color: '#333',
        }}
      >
        {apiBase}
      </pre>
      <p style={{ marginTop: '1rem', color: 'red', fontWeight: 'bold' }}>
        This page is for debugging only and should be deleted after the issue is resolved.
      </p>
    </div>
  );
}
