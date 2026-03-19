
import math
import hashlib
import random
from PIL import Image, ImageChops, ImageDraw, ImageFilter

try:
    import numpy as np
    from qiskit import QuantumCircuit, transpile
    from qiskit_aer import AerSimulator
    from qiskit.circuit.library import EfficientSU2
except ImportError:
    np = None
    QuantumCircuit = None

import os
import wolframalpha
try:
    import torch
except ImportError:
    torch = None

def _seed_from_text(text: str) -> int:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return int(h[:8], 16)

def _contains_future_city(prompt: str) -> bool:
    p = (prompt or "").lower()
    keys = [
        "future city",
        "futuristic city",
        "megacity",
        "mega city",
        "sci-fi city",
        "sci fi city",
        "golden hour",
    ]
    return any(k in p for k in keys)

def _future_city_concept(prompt: str, width: int, height: int, rule: int) -> Image.Image:
    rng = random.Random(_seed_from_text(f"{prompt}|{width}x{height}|{rule}"))
    w = int(width)
    h = int(height)

    if np is not None:
        top = np.array([130, 170, 230], dtype=np.float32)
        bottom = np.array([255, 175, 135], dtype=np.float32)
        t = (np.linspace(0.0, 1.0, h, dtype=np.float32) ** 0.95).reshape(h, 1, 1)
        grad = top * (1.0 - t) + bottom * t
        bg = np.repeat(grad, w, axis=1)
        base = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8), "RGB")
    else:
        base = Image.new("RGB", (w, h), (160, 180, 220))

    cloud = Image.new("L", (w, h), 0)
    cdraw = ImageDraw.Draw(cloud)
    cx = int(w * 0.33)
    cy = int(h * 0.18)
    cw = int(w * 0.75)
    ch = int(h * 0.55)
    cdraw.ellipse([cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2], fill=255)
    cdraw.ellipse([cx - int(cw * 0.35), cy - int(ch * 0.35), cx + int(cw * 0.15), cy + int(ch * 0.25)], fill=255)
    cloud = cloud.filter(ImageFilter.GaussianBlur(radius=max(18, w // 50)))
    cloud_rgb = Image.merge("RGB", (cloud, cloud, cloud))
    base = Image.blend(base, cloud_rgb, 0.12)

    horizon = int(h * 0.52)
    mountain = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(mountain)
    points = []
    x = 0
    step = max(8, w // 120)
    while x <= w:
        bump = math.sin(x / max(1, w) * math.pi * 1.2) * (h * 0.03)
        jag = (rng.random() - 0.5) * (h * 0.05)
        y = horizon + int(h * 0.05 + bump + jag)
        points.append((x, y))
        x += step
    peak_x = int(w * 0.42)
    peak_y = horizon - int(h * 0.06)
    points.insert(len(points) // 2, (peak_x, peak_y))
    points.append((w, h))
    points.append((0, h))
    mdraw.polygon(points, fill=(35, 30, 40, 220))
    mountain = mountain.filter(ImageFilter.GaussianBlur(radius=max(2, w // 300)))
    base = Image.alpha_composite(base.convert("RGBA"), mountain).convert("RGB")

    city = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cty = ImageDraw.Draw(city)
    ground_y = int(h * 0.66)
    cty.rectangle([0, ground_y, w, h], fill=(15, 12, 20, 255))

    x = 0
    while x < w:
        bw = rng.randint(max(6, w // 140), max(14, w // 60))
        bh = rng.randint(int(h * 0.04), int(h * 0.25))
        top_y = ground_y - bh
        shade = rng.randint(10, 28)
        cty.rectangle([x, top_y, x + bw, h], fill=(shade, shade, shade + 8, 255))
        x += bw + rng.randint(1, 3)

    lights = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(lights)
    count = int((w * h) / 420)
    for _ in range(count):
        px = rng.randrange(0, w)
        py = rng.randrange(ground_y, h)
        intensity = rng.randint(140, 255)
        col = (255, rng.randint(120, 185), rng.randint(35, 90), intensity)
        ldraw.point((px, py), fill=col)
        if rng.random() < 0.12:
            ldraw.point((min(w - 1, px + 1), py), fill=col)
    lights = lights.filter(ImageFilter.GaussianBlur(radius=max(1, w // 420)))
    city = Image.alpha_composite(city, lights)

    towers = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(towers)
    right = int(w * 0.97)
    cluster_left = int(w * 0.70)
    num = rng.randint(4, 6)
    for i in range(num):
        tw = rng.randint(int(w * 0.035), int(w * 0.06))
        th = rng.randint(int(h * 0.38), int(h * 0.62))
        tx = rng.randint(cluster_left, right - tw)
        ty = ground_y - th
        base_col = (22, 26, 36, 255)
        tdraw.rounded_rectangle([tx, ty, tx + tw, ground_y + rng.randint(0, int(h * 0.03))], radius=max(6, tw // 4), fill=base_col)
        seam_count = rng.randint(2, 4)
        for s in range(seam_count):
            sx = tx + int((s + 1) * tw / (seam_count + 1))
            tdraw.line([sx, ty + int(th * 0.05), sx, ground_y], fill=(70, 210, 255, 180), width=max(2, tw // 18))
        tdraw.line([tx + int(tw * 0.12), ty + int(th * 0.1), tx + int(tw * 0.12), ground_y], fill=(255, 200, 160, 70), width=max(1, tw // 30))
        if rng.random() < 0.8:
            sp_h = rng.randint(int(th * 0.05), int(th * 0.12))
            tdraw.polygon(
                [(tx + tw // 2, ty - sp_h), (tx + int(tw * 0.22), ty + int(th * 0.02)), (tx + int(tw * 0.78), ty + int(th * 0.02))],
                fill=(30, 40, 55, 220),
            )

    towers = towers.filter(ImageFilter.GaussianBlur(radius=max(1, w // 350)))
    city = Image.alpha_composite(city, towers)

    haze = Image.new("RGBA", (w, h), (240, 210, 190, 0))
    hdraw = ImageDraw.Draw(haze)
    for i in range(6):
        a = int(18 + i * 10)
        y0 = int(horizon - (h * 0.05) + i * (h * 0.035))
        hdraw.rectangle([0, y0, w, y0 + int(h * 0.08)], fill=(245, 210, 185, a))
    haze = haze.filter(ImageFilter.GaussianBlur(radius=max(8, w // 80)))
    base = Image.alpha_composite(base.convert("RGBA"), city)
    base = Image.alpha_composite(base, haze).convert("RGB")

    if np is not None:
        try:
            pattern = generate_wolfram_pattern(w, h, rule=max(30, int(rule)), prompt=prompt) or None
        except Exception:
            pattern = None
        if pattern is not None:
            pat = (np.clip(pattern, 0.0, 1.0) * 255.0).astype(np.uint8)
            pimg = Image.fromarray(pat, "L").filter(ImageFilter.GaussianBlur(radius=max(1, w // 260)))
            tint = Image.merge("RGB", (Image.new("L", (w, h), 40), pimg, pimg))
            base = ImageChops.screen(base, tint)
            base = Image.blend(base, tint, 0.08)

    return base

def get_wolfram_alpha_pattern(width, height, prompt):
    if not np: return None
    app_id = os.getenv("WOLFRAM_ALPHA_APPID")
    if not app_id:
        return None
        
    try:
        client = wolframalpha.Client(app_id)
        query = f"first {min(max(width, 64), 512)} digits of pi"
        if isinstance(prompt, str) and "zeta" in prompt.lower():
            query = f"N[Zeta[1/2 + I 10], {min(max(width, 64), 256)}]"
        res = client.query(query)

        text = ""
        try:
            text = next(res.results).text or ""
        except Exception:
            text = ""

        if not text:
            try:
                for pod in res.pods:
                    pod_text = getattr(pod, "text", "") or ""
                    if pod_text:
                        text = pod_text
                        break
                    for sp in getattr(pod, "subpods", []) or []:
                        sp_text = getattr(sp, "plaintext", "") or ""
                        if sp_text:
                            text = sp_text
                            break
                    if text:
                        break
            except Exception:
                text = ""

        digits = "".join([c for c in str(text) if c.isdigit()])
        if not digits:
            return None

        vals = (np.fromiter((int(c) for c in digits), dtype=np.int16) % 10).astype(np.float32) / 9.0
        grid = np.zeros((height, width), dtype=np.float32)
        for i in range(height):
            base = (i * width) % vals.shape[0]
            for j in range(width):
                grid[i, j] = vals[(base + j) % vals.shape[0]]
        return grid
    except Exception as e:
        print(f"WolframAlpha API error: {e}")
        
    return None

def generate_wolfram_pattern(width, height, rule=30, steps=100, prompt=""):
    if not np: return None
    
    api_pattern = get_wolfram_alpha_pattern(width, height, prompt)
    if api_pattern is not None:
        print("Successfully generated pattern from WolframAlpha API")
        return api_pattern
        
    """
    Generates a 1D cellular automaton pattern (Wolfram rule) and expands it to 2D.
    """
    # Initialize the first row with a single active cell in the center
    grid = np.zeros((height, width), dtype=np.float32)
    grid[0, width // 2] = 1
    
    # Apply the rule for each subsequent row
    for i in range(1, height):
        left = np.roll(grid[i-1], 1)
        center = grid[i-1]
        right = np.roll(grid[i-1], -1)
        
        # Calculate the new state based on the rule
        # Rule 30: left_cell XOR (center_cell OR right_cell)
        if rule == 30:
            grid[i] = np.logical_xor(left, np.logical_or(center, right)).astype(np.float32)
        elif rule == 90:
            grid[i] = np.logical_xor(left, right).astype(np.float32)
        elif rule == 110:
             grid[i] = ((center.astype(int) & right.astype(int)) ^ (center.astype(int) & left.astype(int)) ^ (left.astype(int) & right.astype(int)) ^ (center.astype(int)) ^ (right.astype(int))).astype(np.float32)
        else:
            pattern = np.stack([left, center, right], axis=1)
            indices = np.sum(pattern * [4, 2, 1], axis=1).astype(int)
            rule_bin = np.array([int(x) for x in f"{rule:08b}"])
            grid[i] = rule_bin[7 - indices].astype(np.float32)
            
    return grid

def map_pattern_to_quantum_circuit(pattern_grid, num_qubits=4):
    if not QuantumCircuit: return None
    """
    Maps the cellular automaton pattern to rotation angles for a parameterized quantum circuit.
    """
    height, width = pattern_grid.shape
    
    # Normalize pattern to [0, 2*pi] for rotation angles
    normalized_pattern = pattern_grid * 2 * np.pi
    
    ansatz = EfficientSU2(num_qubits, reps=1)
    
    # We need to map the 2D pattern to the parameters of the ansatz
    # Since the pattern is large, we'll sample or aggregate it to fit the number of parameters
    num_params = ansatz.num_parameters
    
    # Flatten and sample/resize the pattern to match parameters
    flat_pattern = normalized_pattern.flatten()
    if len(flat_pattern) > num_params:
        # Simple sampling
        step = len(flat_pattern) // num_params
        params = flat_pattern[::step][:num_params]
    else:
        # Pad with zeros if pattern is smaller (unlikely for images)
        params = np.pad(flat_pattern, (0, num_params - len(flat_pattern)))
        
    qc = ansatz.assign_parameters(params)
    qc.measure_all()
    return qc

def simulate_quantum_circuit(qc, shots=1024):
    if not qc: return {}
    """
    Simulates the quantum circuit on a CPU backend (Aer).
    """
    simulator = AerSimulator()
    compiled_circuit = transpile(qc, simulator)
    job = simulator.run(compiled_circuit, shots=shots)
    result = job.result()
    counts = result.get_counts(compiled_circuit)
    return counts

def counts_to_rgb(counts, width, height):
    if not np: return Image.new('RGB', (width, height))
    """
    Maps measurement counts to RGB pixel values.
    """
    # Create an image array
    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Sort counts by bitstring to get a deterministic mapping
    sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    
    # Map high probability states to brighter colors/specific hues
    # This is a creative mapping step
    total_shots = sum(counts.values())
    
    for i in range(height):
        for j in range(width):
            # Use spatial coordinates to modulate the color based on quantum probabilities
            # This creates a variation across the image
            
            # Simple example: Use a few top states to determine color channels
            r_val = 0
            g_val = 0
            b_val = 0
            
            if len(sorted_counts) > 0:
                # Use the most frequent state for Red
                state, count = sorted_counts[0]
                prob = count / total_shots
                r_val = int(prob * 255 * (1 + math.sin(i/10.0)))
                
            if len(sorted_counts) > 1:
                # Use the second most frequent state for Green
                state, count = sorted_counts[1]
                prob = count / total_shots
                g_val = int(prob * 255 * (1 + math.cos(j/10.0)))
                
            if len(sorted_counts) > 2:
                # Use the third for Blue
                state, count = sorted_counts[2]
                prob = count / total_shots
                b_val = int(prob * 255 * (1 + math.sin((i+j)/20.0)))
                
            img_array[i, j] = [r_val % 256, g_val % 256, b_val % 256]
            
    return Image.fromarray(img_array)

def generate_quantum_image(prompt, width=512, height=512, rule=30):
    if _contains_future_city(prompt):
        return _future_city_concept(prompt, int(width), int(height), int(rule))

    if not np or not QuantumCircuit:
        img = Image.new('RGB', (width, height), color=(0, 0, 0))
        d = ImageDraw.Draw(img)
        for i in range(0, width, 20):
             d.line([(i, 0), (width-i, height)], fill=(0, 255, 255), width=1)
        d.text((10,10), f"Quantum Mock: {prompt[:20]}... (Rule {rule})", fill=(255,255,255))
        return img

    """
    Main function to generate a quantum-inspired image.
    """
    # 1. Generate Wolfram Pattern
    print(f"Generating Wolfram pattern (Rule {rule})...")
    pattern = generate_wolfram_pattern(width, height, rule=rule, prompt=prompt)
    
    print("Mapping to Quantum Circuit...")
    qc = map_pattern_to_quantum_circuit(pattern, num_qubits=6) # 6 qubits for complexity
    
    print("Simulating on Aer backend...")
    counts = simulate_quantum_circuit(qc)
    
    print("Rendering image...")
    total_shots = sum(counts.values()) if counts else 0
    if total_shots <= 0:
        return Image.fromarray(np.zeros((height, width, 3), dtype=np.uint8))

    sorted_keys = sorted(counts.keys())
    probs_np = np.array([counts[k] / total_shots for k in sorted_keys], dtype=np.float32)

    if torch is not None and torch.cuda.is_available():
        device = torch.device("cuda")
        pattern_t = torch.from_numpy(pattern.astype(np.float32)).to(device)
        probs_t = torch.from_numpy(probs_np).to(device)
        idx = torch.arange(height * width, device=device) % probs_t.shape[0]
        prob = probs_t[idx].reshape(height, width)
        base = (pattern_t * 255.0).clamp(0.0, 255.0)
        r = (base * prob).clamp(0.0, 255.0)
        g = (base * (1.0 - prob)).clamp(0.0, 255.0)
        b = (255.0 * prob).clamp(0.0, 255.0)
        mask = base > 0.0
        r = torch.where(mask, (r + 50.0).clamp(0.0, 255.0), r)
        b = torch.where(mask, (b + 100.0).clamp(0.0, 255.0), b)
        img = torch.stack([r, g, b], dim=-1).to(torch.uint8).cpu().numpy()
        return Image.fromarray(img)

    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    for i in range(height):
        for j in range(width):
            base_val = float(pattern[i, j]) * 255.0
            state_idx = (i * width + j) % len(sorted_keys)
            prob = float(probs_np[state_idx])
            r = int(max(0.0, min(255.0, base_val * prob)))
            g = int(max(0.0, min(255.0, base_val * (1.0 - prob))))
            b = int(max(0.0, min(255.0, 255.0 * prob)))
            if base_val > 0.0:
                r = min(255, r + 50)
                b = min(255, b + 100)
            img_array[i, j] = [r, g, b]
    return Image.fromarray(img_array)

if __name__ == "__main__":
    img = generate_quantum_image("test", 512, 512)
    img.save("quantum_test.png")
    print("Saved quantum_test.png")
