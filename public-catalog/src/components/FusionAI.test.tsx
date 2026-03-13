
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FusionAI } from './FusionAI';
import React from 'react';

// Mock fetch and WebSocket
global.fetch = vi.fn();
global.WebSocket = vi.fn(() => ({
  close: vi.fn(),
  onmessage: vi.fn(),
  onerror: vi.fn(),
})) as any;

describe('FusionAI Component', () => {
  const onImageGenerated = vi.fn();

  it('renders the trigger button and opens the modal', () => {
    render(<FusionAI prompt="test prompt" onImageGenerated={onImageGenerated} />);
    const triggerButton = screen.getByText('Advanced Fusion Extension');
    expect(triggerButton).toBeInTheDocument();
    fireEvent.click(triggerButton);
    expect(screen.getByText('Image Fusion Studio')).toBeInTheDocument();
  });

  it('disables the fuse button when no prompt or files are provided', () => {
    render(<FusionAI prompt="" onImageGenerated={onImageGenerated} />);
    fireEvent.click(screen.getByText('Advanced Fusion Extension'));
    const fuseButton = screen.getByText(/Fuse/i);
    expect(fuseButton).toBeDisabled();
  });

  it('handles file uploads and displays previews', async () => {
    render(<FusionAI prompt="a valid prompt" onImageGenerated={onImageGenerated} />);
    fireEvent.click(screen.getByText('Advanced Fusion Extension'));

    const file = new File(['(⌐□_□)'], 'chuck.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload/i);

    await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(screen.getByAltText('Preview')).toBeInTheDocument();
    expect(screen.getByText(/Fuse 1 Image with Prompt/i)).not.toBeDisabled();
  });

  it('shows an error for invalid file types or sizes', async () => {
    render(<FusionAI prompt="a valid prompt" onImageGenerated={onImageGenerated} />);
    fireEvent.click(screen.getByText('Advanced Fusion Extension'));

    const largeFile = new File([new ArrayBuffer(21 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const invalidTypeFile = new File(['test'], 'text.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload/i);

    await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [largeFile, invalidTypeFile] } });
    });

    expect(screen.getByText(/Some files were rejected/i)).toBeInTheDocument();
  });

  it('initiates fusion process and shows progress', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ jobId: 'test-job-123' }) });

    render(<FusionAI prompt="a valid prompt" onImageGenerated={onImageGenerated} />);
    fireEvent.click(screen.getByText('Advanced Fusion Extension'));

    const file = new File(['(⌐□_□)'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload/i);
    await waitFor(() => {
        fireEvent.change(fileInput, { target: { files: [file] } });
    });

    const fuseButton = screen.getByText(/Fuse 1 Image with Prompt/i);
    fireEvent.click(fuseButton);

    await waitFor(() => {
        expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
        expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8000/progress/test-job-123');
    });
  });
});
