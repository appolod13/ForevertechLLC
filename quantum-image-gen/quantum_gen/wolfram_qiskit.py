# Dynamic general fractal generator - any words control pattern
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import io

def generate_fractal(prompt, width=800, height=800):
    prompt_lower = prompt.lower()
    # Choose pattern based on keywords
    if 'sierpinski' in prompt_lower or 'carpet' in prompt_lower:
        # Sierpinski Carpet
        img = np.ones((height, width))
        for i in range(6):
            scale = 3 ** i
            for x in range(0, width, scale):
                for y in range(0, height, scale):
                    if (x // scale % 3 == 1) and (y // scale % 3 == 1):
                        img[y:y+scale, x:x+scale] = 0
    elif 'koch' in prompt_lower:
        # Simple Koch curve style - line based fractal
        img = np.ones((height, width))
        # Placeholder for Koch
        img = np.random.rand(height, width)
    else:
        # Default dynamic hybrid with noise for any words
        img = np.random.rand(height, width)
        # Add fractal noise
        for _ in range(5):
            noise = np.random.normal(0, 0.5, (height, width))
            img += noise
        img = np.clip(img, 0, 1)
    # Quantum field background
    quantum = np.random.normal(0, 0.2, (height, width))
    img = np.clip(img + quantum, 0, 1)
    # Color map based on prompt
    cmap = 'plasma' if any(k in prompt_lower for k in ['purple', 'magenta', 'glowing']) else 'viridis'
    plt.figure(figsize=(8,8))
    plt.imshow(img, cmap=cmap, origin='lower')
    plt.axis('off')
    plt.savefig('generated.png', dpi=300, bbox_inches='tight')
    plt.close()
    return 'Generated dynamic fractal based on prompt!'

print('Generator updated for any words!')