import React from 'react';
import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { LiveStatusProvider, useLiveStatus } from './LiveStatusContext';

function TestConsumer() {
  const { isConnected, lastUpdate, latestPost } = useLiveStatus();
  return (
    <div>
      <span data-testid="connected">{isConnected ? '1' : '0'}</span>
      <span data-testid="last-update">{lastUpdate ? '1' : '0'}</span>
      <span data-testid="latest-post">{latestPost ? '1' : '0'}</span>
    </div>
  );
}

describe('LiveStatusContext', () => {
  it('renders provider and consumer without crashing', () => {
    render(
      <LiveStatusProvider>
        <TestConsumer />
      </LiveStatusProvider>
    );
  });
});
