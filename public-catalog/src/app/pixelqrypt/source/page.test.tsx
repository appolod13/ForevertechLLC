import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import PixelQryptSourcePage from './page';

vi.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    useSearchParams: () =>
      new URLSearchParams({
        record: 'record-1',
      }),
  };
});

describe('PixelQryptSourcePage', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'foreverteck.pixelqrypt.sourceRecords',
      JSON.stringify([
        {
          id: 'record-1',
          createdAt: '2026-06-29T00:00:00.000Z',
          prompt: 'quantum flower over a neon city',
          imageUrl: 'https://example.com/art.png',
          model: 'Quantum-v1 (Wolfram+Qiskit)',
          metadata: {
            provider: 'ibm',
            backend: 'ibm_brisbane',
            jobId: 'job-123',
            seed: 42,
            qubit: '127',
            measurements: '001011',
          },
        },
      ]),
    );
  });

  it('renders a stored source record with IBM-linked verification details', () => {
    render(<PixelQryptSourcePage />);

    expect(screen.getByText('PixelQrypt Source Record')).toBeInTheDocument();
    expect(screen.getByText('quantum flower over a neon city')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('ibm_brisbane')).toBeInTheDocument();
    expect(screen.getByText('001011')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View IBM Quantum Reference' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://quantum.ibm.com'),
    );
  });
});
