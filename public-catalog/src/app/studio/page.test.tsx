import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudioPage from './page';
import { Providers } from '../../components/Providers';

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    usePathname: () => '/',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<Providers>{ui}</Providers>);
}

describe('StudioPage calendar date range', () => {
  it('renders the asset generator UI', () => {
    renderWithProviders(<StudioPage />);
    expect(screen.getByText('Creator Studio')).toBeDefined();
    expect(screen.getByText('AI Asset Generator')).toBeDefined();
    expect(screen.getByPlaceholderText('Describe the image and post content you want to generate...')).toBeDefined();
  });

  it('disables generate button until prompt is entered', () => {
    renderWithProviders(<StudioPage />);
    const btn = screen.getByRole('button', { name: 'Generate Asset & Content' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    const textarea = screen.getByPlaceholderText('Describe the image and post content you want to generate...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'quantum wormhole fractal' } });
    expect(btn.disabled).toBe(false);
  });

  it('toggles quantum mode and ipfs options', () => {
    renderWithProviders(<StudioPage />);
    const quantum = screen.getByLabelText('Quantum Mode (Wolfram + Qiskit)') as HTMLInputElement;
    const ipfs = screen.getByLabelText('Public Link Upload') as HTMLInputElement;
    expect(quantum.checked).toBe(false);
    expect(ipfs.checked).toBe(false);
    fireEvent.click(quantum);
    fireEvent.click(ipfs);
    expect(quantum.checked).toBe(true);
    expect(ipfs.checked).toBe(true);
  });
});
