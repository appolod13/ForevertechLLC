
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FusionAI } from './FusionAI';
import React from 'react';

// Mock fetch and WebSocket
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const webSocketSpy = vi.fn();
class WebSocketMock {
  url: string;
  close = vi.fn();
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    webSocketSpy(url);
  }
}
global.WebSocket = WebSocketMock as unknown as typeof WebSocket;

describe('FusionAI Component', () => {
  const onImageGenerated = vi.fn();

  global.FileReader = class FileReaderMock {
    result: string | ArrayBuffer | null = null;
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => unknown) | null = null;
    readAsDataURL() {
      this.result = 'data:image/png;base64,AAAA';
      if (this.onload) this.onload.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
    }
  } as unknown as typeof FileReader;

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
    const fuseButton = screen.getByRole('button', { name: /Fuse/i });
    expect(fuseButton).toBeDisabled();
  });

  it('handles file uploads and displays previews', async () => {
    render(<FusionAI prompt="a valid prompt" onImageGenerated={onImageGenerated} />);
    fireEvent.click(screen.getByText('Advanced Fusion Extension'));

    const file = new File(['(⌐□_□)'], 'chuck.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    await waitFor(() => {
        fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });
    });

    expect(screen.getByAltText('Preview')).toBeInTheDocument();
    expect(screen.getByText(/Fuse 1 Image with Prompt/i)).not.toBeDisabled();
  });

  it('shows an error for invalid file types or sizes', async () => {
    render(<FusionAI prompt="a valid prompt" onImageGenerated={onImageGenerated} />);
    fireEvent.click(screen.getByText('Advanced Fusion Extension'));

    const largeFile = new File([new ArrayBuffer(21 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    const invalidTypeFile = new File(['test'], 'text.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();

    await waitFor(() => {
        fireEvent.change(fileInput as HTMLInputElement, { target: { files: [largeFile, invalidTypeFile] } });
    });

    expect(screen.getByText(/Some files were rejected/i)).toBeInTheDocument();
  });

  it('initiates fusion process and shows progress', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ jobId: 'test-job-123' }) });

    render(<FusionAI prompt="a valid prompt" onImageGenerated={onImageGenerated} />);
    fireEvent.click(screen.getByText('Advanced Fusion Extension'));

    const file = new File(['(⌐□_□)'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    await waitFor(() => {
        fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });
    });

    const fuseButton = screen.getByText(/Fuse 1 Image with Prompt/i);
    fireEvent.click(fuseButton);

    await waitFor(() => {
        expect(screen.getByText(/Initializing/i)).toBeInTheDocument();
        expect(webSocketSpy).toHaveBeenCalledWith('ws://localhost:8000/progress/test-job-123');
    });
  });
});
