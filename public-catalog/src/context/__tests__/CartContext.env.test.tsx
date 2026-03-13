import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';

function Probe() {
  const cart = useCart();
  return <div data-testid="count">{cart.itemCount}</div>;
}

describe('CartContext env defaults', () => {
  it('loads without NEXT_PUBLIC_CART_API_BASE set', () => {
    const prev = process.env.NEXT_PUBLIC_CART_API_BASE;
    delete process.env.NEXT_PUBLIC_CART_API_BASE;
    const { getByTestId } = render(
      <CartProvider>
        <Probe />
      </CartProvider>
    );
    expect(getByTestId('count').textContent).toBe('0');
    process.env.NEXT_PUBLIC_CART_API_BASE = prev;
  });
});
