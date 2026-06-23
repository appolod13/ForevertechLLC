import math
import random
from io import BytesIO
from PIL import Image

def fractal_fusion_rgb(width: int, height: int, prompt: str, seed: int) -> bytes:
    rng = random.Random(seed)
    phash = abs(hash(prompt or str(seed)))

    # Parameters for richer variety
    base_hue = (phash % 360) / 360.0
    zoom = 1.5 + (phash % 120) / 200.0
    iterations = 120 + (phash % 120)
    blend = (phash % 100) / 100.0  # Controls mixing of different fractals

    buf = bytearray(width * height * 3)

    for y in range(height):
        for x in range(width):
            i = (y * width + x) * 3

            cx = (x - width * 0.5) / (width * 0.42) * zoom
            cy = (y - height * 0.5) / (height * 0.42) * zoom

            # Multi-fractal hybrid
            # Mandelbrot base + Julia perturbation + Sierpinski/Koch influence
            zx, zy = cx, cy
            jx, jy = cx * 0.7 + math.sin(phash), cy * 0.7 + math.cos(phash)

            iter_count = 0
            while iter_count < iterations and (zx*zx + zy*zy) < 4.0:
                # Mandelbrot iteration
                zx_new = zx*zx - zy*zy + cx
                zy = 2*zx*zy + cy
                zx = zx_new

                # Add Julia influence for complexity
                if iter_count % 3 == 0:
                    zx += jx * 0.08 * blend
                    zy += jy * 0.08 * blend

                iter_count += 1

            # Smooth coloring
            if iter_count < iterations:
                smooth = iter_count + 1 - math.log(math.log(math.sqrt(zx*zx + zy*zy))) / math.log(2)
            else:
                smooth = iterations

            # Dynamic color with more fractal-like patterns
            hue = (base_hue + smooth * 0.12 + math.sin(smooth * 0.4) * 0.3) % 1.0
            sat = 0.75 + 0.25 * math.sin(smooth * 0.6)
            val = 0.55 + 0.45 * (smooth / iterations) ** 0.6

            r, g, b = _hsv_to_rgb(hue, sat, val)

            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b

    # Convert to PNG for better quality
    img = Image.frombytes('RGB', (width, height), bytes(buf))
    output = BytesIO()
    img.save(output, format='PNG', optimize=True)
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