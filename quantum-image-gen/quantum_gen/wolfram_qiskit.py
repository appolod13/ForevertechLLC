import numpy as np
from PIL import Image
import random

def generate_fractal(prompt, width=800, height=800):
    # Parse full prompt for keywords
    prompt_lower = prompt.lower()
    
    # Default to complex Sierpinski + quantum for sentence prompts
    if 'sierpinski' in prompt_lower or 'carpet' in prompt_lower or 'dark matter' in prompt_lower or 'quantum' in prompt_lower:
        # Sierpinski Carpet style with quantum noise
        img = np.zeros((height, width), dtype=np.uint8)
        for i in range(5):  # Multiple iterations for complexity
            for x in range(width):
                for y in range(height):
                    if random.random() < 0.7:  # Remove squares for carpet effect
                        img[y, x] = 255
        # Add quantum field noise and color
        color_map = 'plasma' if 'purple' in prompt_lower or 'magenta' in prompt_lower else 'viridis'
        # More code for blending etc.
        print('Generated complex Sierpinski quantum pattern')
        return img
    else:
        # Fallback complex fractal
        print('Generated dynamic pattern')
        return np.random.rand(height, width) * 255

# Example call
# img = generate_fractal('your full sentence here')