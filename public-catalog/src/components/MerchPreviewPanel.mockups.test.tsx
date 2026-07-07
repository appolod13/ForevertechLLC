import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { MerchPreviewPanel } from './MerchPreviewPanel';

describe('MerchPreviewPanel Printify mockups', () => {
  it('shows the Printify sample image when provided', () => {
    render(<MerchPreviewPanel productName="Premium Tee" printType="standard" printifyPreviewUrl="https://printify.example/sample.png" />);

    const hero = screen.getByTestId('printify-mockup-hero');
    expect(hero).toHaveAttribute('src', 'https://printify.example/sample.png');
  });

  it('switches hero image between front/back/left/right when mockups are ready', () => {
    render(
      <MerchPreviewPanel
        imageUrl="https://example.com/design.png"
        productName="AOP Tee"
        printType="all_over_print"
        enablePrintifyMockups
        printifyPreviewUrl="https://printify.example/sample.png"
        printifyMockups={{
          status: 'ready',
          frontUrl: 'https://printify.example/front.png',
          backUrl: 'https://printify.example/back.png',
          leftUrl: 'https://printify.example/left.png',
          rightUrl: 'https://printify.example/right.png',
        }}
      />,
    );

    const hero = screen.getByTestId('printify-mockup-hero');
    expect(hero).toHaveAttribute('src', 'https://printify.example/sample.png');

    fireEvent.click(screen.getByRole('button', { name: 'Front' }));
    expect(hero).toHaveAttribute('src', 'https://printify.example/front.png');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(hero).toHaveAttribute('src', 'https://printify.example/back.png');
  });
});
