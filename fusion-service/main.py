import math
import random
from io import BytesIO
from PIL import Image

def fractal_fusion_rgb(width: int, height: int, prompt: str, seed: int) -> bytes:
    rng = random.Random(seed)
    phash = abs(hash(prompt or str(seed)))

    # Enhanced parameters for more fractal variety
    base_hue = (phash % 360) / 360.0
    zoom = 1.4 + (phash % 180) / 250.0
    iterations = 140 + (phash % 140)
    blend = (phash % 100) / 100.0

    buf = bytearray(width * height * 3)

    for y in range(height):
        for x in range(width):
            i = (y * width + x) * 3

            cx = (x - width * 0.5) / (width * 0.42) * zoom
            cy = (y - height * 0.5) / (height * 0.42) * zoom

            # Multi-Fractal Hybrid System
            zx, zy = cx, cy
            # Julia seed influenced by prompt
            jx = cx * 0.6 + math.sin(phash * 0.7)
            jy = cy * 0.6 + math.cos(phash * 0.7)

            iter_count = 0
            while iter_count < iterations and (zx * zx + zy * zy) < 4.0:
                # Core Mandelbrot iteration
                zx_new = zx * zx - zy * zy + cx
                zy = 2 * zx * zy + cy
                zx = zx_new

                # Julia perturbation (adds swirling complexity)
                if iter_count % 4 == 0:
                    zx += jx * 0.12 * blend
                    zy += jy * 0.12 * blend

                # Sierpinski-like folding for more intricate patterns
                if iter_count % 7 == 0:
                    zx = abs(zx) * 0.85
                    zy = abs(zy) * 0.85

                # Koch curve style angular perturbation
                if iter_count % 11 == 0:
                    angle = math.sin(iter_count * 0.3) * 0.4
                    zx += math.cos(angle) * 0.06
                    zy += math.sin(angle) * 0.06

                iter_count += 1

            # Smooth escape time coloring
            if iter_count < iterations:
                smooth = iter_count + 1 - math.log(math.log(math.sqrt(zx*zx + zy*zy))) / math.log(2)
            else:
                smooth = iterations

            # Rich, dynamic coloring with more fractal detail
            hue = (base_hue + smooth * 0.15 + math.sin(smooth * 0.35) * 0.4) % 1.0
            sat = 0.8 + 0.2 * math.sin(smooth * 0.55)
            val = 0.5 + 0.5 * (smooth / iterations) ** 0.65

            r, g, b = _hsv_to_rgb(hue, sat, val)

            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b

    # Convert to high-quality PNG
    img = Image.frombytes('RGB', (width, height), bytes(buf))
    output = BytesIO()
    img.save(output, format='PNG', optimize=True, quality=95)
    return output.getvalue()


def _hsv_to_rgb(h: float, s: float, v: float):
    h = h % 1.0
    i = int(h * 6)
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))
    i %= 6
    if i == 0:   return int(v*255), int(t*255), int(p*255)
    elif i == 1: return int(q*255), int(v*255), int(p*255)
    elif i == 2: return int(p*255), int(v*255), int(t*255)
    elif i == 3: return int(p*255), int(q*255), int(v*255)
    elif i == 4: return int(t*255), int(p*255), int(v*255)
    else:        return int(v*255), int(p*255), int(q*255)