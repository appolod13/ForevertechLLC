import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import io

def generate_fractal(prompt, width=800, height=800):
    # Hard force complex Sierpinski + quantum field for full sentence prompts
    if any(k in prompt.lower() for k in ['sierpinski', 'carpet', 'dark matter', 'quantum', 'chaos', 'self-similarity', 'fractal']):
        # Sierpinski Carpet style with quantum noise
        img = np.zeros((height, width), dtype=np.uint8)
        for i in range(6):  # Multiple iterations for complexity
            scale = 3**i
            for x in range(0, width, scale):
                for y in range(0, height, scale):
                    if (x // scale % 3 == 1) and (y // scale % 3 == 1):
                        img[y:y+scale//3, x:x+scale//3] = 0
                    else:
                        img[y:y+scale, x:x+scale] = np.random.randint(50, 255)
        # Add quantum field noise
        noise = np.random.normal(0, 50, (height, width)).astype(np.uint8)
        img = np.clip(img + noise, 0, 255)
        # Plasma colormap simulation
        colored = plt.cm.plasma(img / 255.0)
        colored = (colored[:, :, :3] * 255).astype(np.uint8)
        pil_img = Image.fromarray(colored)
        buf = io.BytesIO()
        pil_img.save(buf, format='PNG')
        return buf.getvalue()
    else:
        # Fallback complex Mandelbrot but overridden for variety
        return generate_complex_mandel(prompt, width, height)

def generate_complex_mandel(prompt, width, height):
    # Complex version with more variety
    x = np.linspace(-2.5, 1.0, width)
    y = np.linspace(-1.5, 1.5, height)
    X, Y = np.meshgrid(x, y)
    C = X + 1j * Y
    Z = np.zeros_like(C)
    divtime = np.zeros(C.shape, dtype=int)
    for i in range(100):
        Z = Z**2 + C
        diverge = np.abs(Z) > 2
        div_now = diverge & (divtime == 0)
        divtime[div_now] = i
        Z[diverge] = 2
    # Dynamic colormap based on prompt
    cmap = 'plasma' if 'purple' in prompt.lower() or 'magenta' in prompt.lower() else 'magma'
    colored = plt.cm.get_cmap(cmap)(divtime / 100)
    colored = (colored[:, :, :3] * 255).astype(np.uint8)
    pil_img = Image.fromarray(colored)
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    return buf.getvalue()

print('Fractal generator updated for complex patterns!')