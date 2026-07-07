import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MerchPreviewPanel } from './MerchPreviewPanel';

describe('MerchPreviewPanel', () => {
  it('uses responsive mobile-first sizing for the buyer preview stage', () => {
    render(
      <MerchPreviewPanel
        imageUrl="https://example.com/design.png"
        productName="Premium Tee"
        printType="standard"
      />,
    );

    const stage = screen.getByTestId('buyer-preview-stage');
    expect(stage.className).toContain('min-h-[');
    expect(stage.className).toContain('lg:min-h-[');
  });
});
