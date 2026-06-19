# Dynamic general fractal generator - any words control pattern

import numpy as np
import matplotlib.pyplot as plt

def generate_fractal(prompt, width=800, height=800):
    # Parse prompt for keywords to choose type
    prompt_lower = prompt.lower()
    if 'sierpinski' in prompt_lower or 'carpet' in prompt_lower:
        # Sierpinski carpet style
        img = np.ones((height, width))
        for i in range(5):  # iterations for complexity
            for x in range(0, width, 3**i):
                for y in range(0, height, 3**i):
                    if (x // 3**i) % 3 == 1 and (y // 3**i) % 3 == 1:
                        img[y:y+3**i, x:x+3**i] = 0
        cmap = 'plasma' if 'purple' in prompt_lower else 'viridis'
    else:
        # Default dynamic Mandelbrot/Julia hybrid with noise
        x = np.linspace(-2.5, 1.5, width)
        y = np.linspace(-1.5, 1.5, height)
        X, Y = np.meshgrid(x, y)
        C = X + 1j * Y
        Z = C
        img = np.zeros((height, width))
        for i in range(100):
            Z = Z**2 + C
            img += np.abs(Z) < 2
        cmap = 'plasma' if any(k in prompt_lower for k in ['purple', 'magenta', 'glowing']) else 'inferno'
    # Add quantum noise
    noise = np.random.normal(0, 0.1, (height, width))
    img = np.clip(img + noise, 0, 1)
    plt.figure(figsize=(8,8))
    plt.imshow(img, cmap=cmap, origin='lower')
    plt.axis('off')
    plt.savefig('generated.png', dpi=300, bbox_inches='tight')
    plt.close()
    return 'Generated dynamic fractal based on prompt!'

print(generate_fractal('test prompt'))
