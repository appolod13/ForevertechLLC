import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImagePreview } from '../../components/ImagePreview';

describe('ImagePreview', () => {
  it('shows loading state', () => {
    render(<ImagePreview isLoading={true} imageUrl={undefined} />);
    expect(screen.getByText('Generating your masterpiece...')).toBeDefined();
  });

  it('shows error and can retry', () => {
    const onRetry = vi.fn();
    render(<ImagePreview isLoading={false} error="Failed" imageUrl={undefined} onRetry={onRetry} />);
    expect(screen.getByText('Failed')).toBeDefined();
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders image and toggles metadata', () => {
    const metadata = { timestamp: new Date().toISOString(), model: 'TestModel', params: { width: 512 } };
    render(<ImagePreview isLoading={false} imageUrl="http://localhost/test.png" metadata={metadata} />);
    const infoButton = screen.getByTitle('Toggle Metadata');
    fireEvent.click(infoButton);
    expect(screen.getByText('Generation Metadata')).toBeDefined();
    expect(screen.getByText('TestModel')).toBeDefined();
  });
});
