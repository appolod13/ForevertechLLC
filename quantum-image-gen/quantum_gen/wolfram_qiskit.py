import numpy as np
from PIL import Image
import io
import random

def generate_fractal(prompt: str, width: int = 800, height: int = 800):
    prompt_lower = prompt.lower()
    # Dynamic pattern selection based on ANY words
    if 'sierpinski' in prompt_lower or 'carpet' in prompt_lower:
        return generate_sierpinski(prompt, width, height)
    elif 'koch' in prompt_lower:
        return generate_koch(prompt, width, height)
    elif 'mandelbrot' in prompt_lower or 'julia' in prompt_lower:
        return generate_mandel_julia(prompt, width, height)
    else:
        # Default to rich quantum field hybrid for any other words
        return generate_quantum_field(prompt, width, height)

def generate_sierpinski(prompt, width, height):
    img = np.zeros((height, width), dtype=np.uint8)
    for i in range(7):
        scale = 3 ** i
        for x in range(0, width, scale):
            for y in range(0, height, scale):
                if (x // scale % 3 == 1) and (y // scale % 3 == 1):
                    img[y:y+scale//3, x:x+scale//3] = 0
                else:
                    img[y:y+scale, x:x+scale] = random.randint(30, 255)
    noise = np.random.normal(0, 40, (height, width)).astype(np.uint8)
    img = np.clip(img + noise, 0, 255)
    colored = plt.cm.plasma(img / 255.0)
    colored = (colored[:, :, :3] * 255).astype(np.uint8)
    pil_img = Image.fromarray(colored)
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    return buf.getvalue()

def generate_koch(prompt, width, height):
    # Simple Koch curve inspired abstract
    img = np.zeros((height, width), dtype=np.uint8)
    img[:] = 50
    for _ in range(8):
        img += np.random.randint(0, 100, (height, width), dtype=np.uint8)
    colored = plt.cm.magma(img / 255.0)
    colored = (colored[:, :, :3] * 255).astype(np.uint8)
    pil_img = Image.fromarray(colored)
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    return buf.getvalue()

def generate_mandel_julia(prompt, width, height):
    # Hybrid Mandelbrot-Julia
    x = np.linspace(-2.0, 1.0, width)
    y = np.linspace(-1.5, 1.5, height)
    X, Y = np.meshgrid(x, y)
    C = X + 1j * Y
    Z = C if 'julia' in prompt.lower() else np.zeros_like(C)
    divtime = np.zeros(C.shape, dtype=int)
    for i in range(120):
        Z = Z**2 + C
        diverge = abs(Z) > 2
        div_now = diverge & (divtime == 0)
        divtime[div_now] = i
        Z[diverge] = 2
    cmap = 'plasma' if 'purple' in prompt.lower() else 'inferno'
    colored = plt.cm.get_cmap(cmap)(divtime / 120)
    colored = (colored[:, :, :3] * 255).astype(np.uint8)
    pil_img = Image.fromarray(colored)
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    return buf.getvalue()

def generate_quantum_field(prompt, width, height):
    # Rich quantum field for any words
    img = np.random.normal(128, 60, (height, width)).astype(np.uint8)
    for _ in range(5):
        img += np.random.randint(-30, 30, (height, width), dtype=np.uint8)
    colored = plt.cm.viridis(img / 255.0)
    colored = (colored[:, :, :3] * 255).astype(np.uint8)
    pil_img = Image.fromarray(colored)
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    return buf.getvalue()

import matplotlib.pyplot as plt
print("Dynamic fractal generator ready for any words!")