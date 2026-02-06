import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudioPage from './page';
import { Providers } from '../../components/Providers';

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<Providers>{ui}</Providers>);
}

describe('StudioPage calendar date range', () => {
  it('shows selected range after choosing start and end dates', () => {
    renderWithProviders(<StudioPage />);
    const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const endInput = screen.getByLabelText('End date') as HTMLInputElement;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const startDay = '10';
    const endDay = '20';
    fireEvent.change(startInput, { target: { value: `${yyyy}-${mm}-${startDay}` } });
    fireEvent.change(endInput, { target: { value: `${yyyy}-${mm}-${endDay}` } });
    expect(screen.getByText(/Selected:/)).toBeDefined();
  });

  it('allows toggling individual dates when range mode is off', () => {
    renderWithProviders(<StudioPage />);
    const day5 = document.getElementById('calendar-day-5') as HTMLElement;
    if (!day5) throw new Error('Calendar day element not found');
    fireEvent.click(day5);
    expect(day5.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/Dates:/)).toBeDefined();
    fireEvent.click(day5);
    expect(day5.getAttribute('aria-selected')).not.toBe('true');
  });

  it('supports click-based range selection when range mode is on', () => {
    renderWithProviders(<StudioPage />);
    const toggleBtn = screen.getByLabelText('Toggle range selection mode');
    fireEvent.click(toggleBtn);
    const day10 = document.getElementById('calendar-day-10') as HTMLElement;
    const day13 = document.getElementById('calendar-day-13') as HTMLElement;
    if (!day10 || !day13) throw new Error('Calendar day elements not found');
    fireEvent.click(day10);
    fireEvent.click(day13);
    expect(screen.getByText(/Selected:/)).toBeDefined();
  });

  it('validates when end date is before start date', () => {
    renderWithProviders(<StudioPage />);
    const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const endInput = screen.getByLabelText('End date') as HTMLInputElement;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    fireEvent.change(startInput, { target: { value: `${yyyy}-${mm}-20` } });
    fireEvent.change(endInput, { target: { value: `${yyyy}-${mm}-10` } });
    expect(screen.getByText('End date must be after start date')).toBeDefined();
  });

  it('supports same-day range selection', () => {
    renderWithProviders(<StudioPage />);
    const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const endInput = screen.getByLabelText('End date') as HTMLInputElement;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = '15';
    fireEvent.change(startInput, { target: { value: `${yyyy}-${mm}-${dd}` } });
    fireEvent.change(endInput, { target: { value: `${yyyy}-${mm}-${dd}` } });
    expect(screen.getByText(/Selected:/)).toBeDefined();
  });

  it('keyboard navigation moves focus between calendar days', () => {
    renderWithProviders(<StudioPage />);
    const day15 = document.getElementById('calendar-day-15') as HTMLElement;
    const day16 = document.getElementById('calendar-day-16') as HTMLElement;
    if (!day15 || !day16) {
      throw new Error('Calendar day elements not found');
    }
    day15.focus();
    fireEvent.keyDown(day15, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(day16);
  });

  it('sets in-range aria-selected for a middle day', () => {
    renderWithProviders(<StudioPage />);
    const startInput = screen.getByLabelText('Start date') as HTMLInputElement;
    const endInput = screen.getByLabelText('End date') as HTMLInputElement;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    fireEvent.change(startInput, { target: { value: `${yyyy}-${mm}-10` } });
    fireEvent.change(endInput, { target: { value: `${yyyy}-${mm}-20` } });
    const mid = document.getElementById('calendar-day-15') as HTMLElement;
    expect(mid.getAttribute('aria-selected')).toBe('true');
  });
});
