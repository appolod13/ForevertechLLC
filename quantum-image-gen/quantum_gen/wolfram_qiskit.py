
import math
import hashlib
import random
import json
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

try:
    import numpy as np
    import matplotlib.pyplot as plt
    from matplotlib import cm
    from qiskit import QuantumCircuit, transpile
    from qiskit_aer import AerSimulator
    from qiskit.circuit.library import efficient_su2
except ImportError:
    np = None
    plt = None
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
    grid = np.zeros((height, width), dtype=np.float32)
    
    # Use prompt seed for reproducible variety, otherwise fallback to random
    seed = _seed_from_text(prompt) if prompt else random.randint(0, 1000000)
    np.random.seed(seed)
    
    # Initialize the first row with multiple random active cells to break grid patterns
    num_initial_cells = max(1, width // 10)
    initial_indices = np.random.choice(width, num_initial_cells, replace=False)
    grid[0, initial_indices] = 1
    
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
    
    ansatz = efficient_su2(num_qubits, reps=3)
    
    # We need to map the 2D pattern to the parameters of the ansatz
    # Since the pattern is large, we'll sample or aggregate it to fit the number of parameters
    num_params = ansatz.num_parameters
    
    # Flatten and sample/resize the pattern to match parameters
    flat_pattern = normalized_pattern.flatten()
    
    params = []
    if len(flat_pattern) >= num_params:
        chunk_size = len(flat_pattern) // num_params
        for i in range(num_params):
            chunk = flat_pattern[i*chunk_size:(i+1)*chunk_size]
            # Add a baseline rotation so it's not all zeros, and scale the mean
            params.append(np.mean(chunk) + np.pi/4 + (i * 0.05))
    else:
        params = np.pad(flat_pattern, (0, num_params - len(flat_pattern))) + np.pi/4
        
    params = np.array(params[:num_params])
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

def generate_random_quantum_distribution(width, height, seed=None):
    """
    Creates a random 2D image based on a Qiskit quantum circuit sampling.
    This simulates loading a random distribution (like a QGAN prior).
    """
    if not QuantumCircuit or not np:
        # Pure mock fallback
        arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
        return Image.fromarray(arr)

    if seed is not None:
        np.random.seed(seed)
        random.seed(seed)

    # Use a parameterized ansatz (e.g. EfficientSU2) for random distribution
    num_qubits = 6 # 6 qubits = 64 states
    ansatz = efficient_su2(num_qubits, reps=2)
    num_params = ansatz.num_parameters
    
    # Bind random parameters to simulate a "learned" or "random" distribution
    params = np.random.uniform(0, 2 * np.pi, num_params)
    qc = ansatz.assign_parameters(params)
    qc.measure_all()
    
    simulator = AerSimulator()
    compiled_circuit = transpile(qc, simulator)
    job = simulator.run(compiled_circuit, shots=8192)
    counts = job.result().get_counts()
    
    total_shots = sum(counts.values())
    sorted_keys = sorted(counts.keys())
    probs = np.array([counts.get(k, 0) / total_shots for k in sorted_keys], dtype=np.float32)
    
    # Map the quantum probability distribution to a 2D image
    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Base color palette from prompt seed if available
    base_r = random.randint(50, 255)
    base_g = random.randint(50, 255)
    base_b = random.randint(50, 255)
    
    for i in range(height):
        for j in range(width):
            # Spatial mapping to the quantum states
            state_idx = (i * width + j) % len(sorted_keys)
            state_idx_2 = ((i * j) + width) % len(sorted_keys)
            
            prob = float(probs[state_idx])
            prob_2 = float(probs[state_idx_2])
            
            # Non-linear color mapping with radial and spiral quantum interference
            cx, cy = width / 2, height / 2
            dist = math.sqrt((i - cy)**2 + (j - cx)**2)
            angle = math.atan2(i - cy, j - cx)
            
            r = int(min(255.0, base_r * prob * len(sorted_keys) * 0.8 + (math.sin(dist/20.0 + prob*10) * 50)))
            g = int(min(255.0, base_g * prob_2 * len(sorted_keys) * 0.8 + (math.cos(angle*5.0 + prob_2*20) * 50)))
            b = int(min(255.0, base_b * (prob + prob_2)/2 * len(sorted_keys) * 1.2 + (math.sin(dist/40.0 - angle*3) * 50)))
            
            img_array[i, j] = [max(0, r), max(0, g), max(0, b)]
            
    # Apply some filtering to make it look like a smooth "distribution" field
    img = Image.fromarray(img_array)
    img = img.filter(ImageFilter.GaussianBlur(radius=3))
    return img

def _analyze_prompt_energy(prompt):
    """
    Parses the prompt for emotional and shape keywords to determine 
    colormap, Julia Set coordinates, and the interference distance metric.
    Returns: (colormap_name, julia_cx, julia_cy, shape_type)
    """
    p = (prompt or "").lower()
    
    # Base shapes
    shape_type = "circle"
    if any(w in p for w in ["square", "box", "cube", "block", "rectangle"]): shape_type = "square"
    elif any(w in p for w in ["diamond", "rhombus", "crystal", "gem"]): shape_type = "diamond"
    elif any(w in p for w in ["wave", "line", "stripe", "horizontal", "vertical"]): shape_type = "wave"
    elif any(w in p for w in ["spiral", "vortex", "whirlpool", "tornado"]): shape_type = "spiral"
    elif any(w in p for w in ["triangle", "pyramid", "cone"]): shape_type = "triangle"
    elif any(w in p for w in ["cross", "plus", "star"]): shape_type = "cross"

    # Emotional/Energy Analysis
    if any(w in p for w in ["love", "passion", "heart", "warm", "fire", "soul"]):
        return "magma", -0.4, 0.6, "diamond" if shape_type == "circle" else shape_type
    if any(w in p for w in ["calm", "peace", "water", "flow", "tranquil", "breeze", "ocean"]):
        return "viridis", 0.285, 0.01, "wave" if shape_type == "circle" else shape_type
    if any(w in p for w in ["energy", "chaos", "power", "electric", "lightning", "dynamic"]):
        return "turbo", -0.8, 0.156, "cross" if shape_type == "circle" else shape_type
    if any(w in p for w in ["transcendent", "mystic", "cosmos", "god", "divine", "spirit"]):
        return "plasma", -0.7269, 0.1889, "spiral" if shape_type == "circle" else shape_type
    if any(w in p for w in ["dark", "void", "abyss", "shadow", "deep"]):
        return "inferno", -0.835, -0.2321, "square" if shape_type == "circle" else shape_type
        
    # Try to use a learned pattern from the quantum images dataset
    learned_params = []
    learned_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "learned_julia_params.json")
    if os.path.exists(learned_file):
        try:
            with open(learned_file, "r") as f:
                learned_params = json.load(f)
        except:
            pass

    # Default: "roulette of possibilities"
    cmaps = ["turbo", "viridis", "plasma", "magma", "inferno", "ocean", "rainbow"]
    # Seed random with prompt to keep it deterministic for the same prompt
    rng = random.Random(_seed_from_text(p))
    
    # Known "stunning" Julia set parameters
    beautiful_c_values = [
        (-0.4, 0.6),
        (0.285, 0.01),
        (0.285, 0.013),
        (-0.70176, -0.3842),
        (-0.835, -0.2321),
        (-0.8, 0.156),
        (-0.7269, 0.1889),
        (0.0, -0.8),
        (-1.037, 0.17),
        (-0.12, 0.74),
        (-0.391, -0.587),
        (-0.54, 0.54)
    ]
    
    if learned_params:
        # Pick a learned parameter set based on the prompt hash
        learned = rng.choice(learned_params)
        
        # Use the complexity feature to deterministically pick a beautiful C value
        # rather than using raw mathematical mapping which can land in dead zones
        try:
            complexity = float(learned.get("features", {}).get("complexity", 0.5))
        except:
            complexity = 0.5
            
        idx = int(complexity * 100) % len(beautiful_c_values)
        c_x, c_y = beautiful_c_values[idx]
        
        # Modulate it slightly with symmetry to make it unique but still fractal
        try:
            symmetry = float(learned.get("features", {}).get("symmetry", 0.5))
            c_x += (symmetry - 0.5) * 0.02
            c_y += (symmetry - 0.5) * 0.02
        except:
            pass
    else:
        c_x, c_y = rng.choice(beautiful_c_values)
        
    return rng.choice(cmaps), c_x, c_y, shape_type

def generate_julia_set(width, height, c_x, c_y, zoom=1.0, max_iter=100, cmap_name="turbo"):
    """
    Generates a mathematically pure Julia set fractal and applies a Matplotlib colormap.
    """
    if not np or not plt:
        return np.zeros((height, width, 3), dtype=np.uint8)

    # Create a grid
    x = np.linspace(-1.5 / zoom, 1.5 / zoom, width)
    y = np.linspace(-1.5 / zoom, 1.5 / zoom, height)
    X, Y = np.meshgrid(x, y)
    Z = X + 1j * Y
    C = c_x + 1j * c_y

    div_time = np.zeros(Z.shape, dtype=int)
    m = np.full(Z.shape, True, dtype=bool)

    for i in range(max_iter):
        Z[m] = Z[m]**2 + C
        
        # Find which points have diverged
        diverged = np.abs(Z) > 2
        
        # We only care about points that diverged *in this specific iteration*
        # (they were active in m, but are now diverged)
        just_diverged = diverged & m
        
        # Record their divergence time
        div_time[just_diverged] = i
        
        # Remove them from the active mask so we stop calculating them
        m[just_diverged] = False

    # Smooth coloring
    smooth = np.zeros(Z.shape, dtype=float)
    mask = div_time > 0
    
    # Give the inner solid set (where it didn't diverge) a distinct base color
    # instead of just mapping it to 0
    smooth[~mask] = 0.0 
    
    # Avoid log of zero
    Z_abs = np.abs(Z[mask])
    Z_abs[Z_abs == 0] = 1e-10
    
    # The standard continuous potential formula
    smooth[mask] = div_time[mask] + 1 - np.log2(np.log(Z_abs))
    
    # Normalize for colormap, shift it so the inner solid set gets the lowest color
    # and the chaotic borders get the bright colors
    smooth_norm = smooth / np.max(smooth) if np.max(smooth) > 0 else smooth
    
    # Apply colormap
    try:
        colormap = cm.get_cmap(cmap_name)
    except ValueError:
        colormap = cm.get_cmap("turbo")
        
    img_rgba = colormap(smooth_norm)
    img_rgb = (img_rgba[:, :, :3] * 255).astype(np.uint8)
    return img_rgb

def generate_quantum_image(prompt, width=512, height=512, rule=30, force_quantum=False):
    if _contains_future_city(prompt) and not force_quantum:
        return _future_city_concept(prompt, int(width), int(height), int(rule))

    if not np or not QuantumCircuit:
        return _future_city_concept(prompt + " (mock quantum)", int(width), int(height), int(rule))

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
        # Fallback if simulation fails
        print("Simulation failed, falling back to random distribution")
        seed = _seed_from_text(prompt) if prompt else random.randint(0, 1000000)
        return generate_random_quantum_distribution(int(width), int(height), seed)

    sorted_keys = sorted(counts.keys())
    probs_np = np.array([counts[k] / total_shots for k in sorted_keys], dtype=np.float32)

    # 4. Extract Emotional Energy and Shape
    cmap_name, julia_cx, julia_cy, shape_type = _analyze_prompt_energy(prompt)
    
    # Modulate Julia coordinates with top quantum probabilities (true Quantum-Julia mix)
    # Kept extremely subtle so it doesn't break the fractal structure
    julia_cx += (float(probs_np[0]) - 0.5) * 0.01
    if len(probs_np) > 1:
        julia_cy += (float(probs_np[1]) - 0.5) * 0.01
        
    print(f"Rendering Quantum Julia (cmap={cmap_name}, shape={shape_type})...")
    julia_rgb = generate_julia_set(width, height, julia_cx, julia_cy, zoom=1.35, max_iter=150, cmap_name=cmap_name)

    # Non-linear rendering using quantum probabilities and spatial coordinates
    # This creates actual interference-like quantum patterns
    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    
    base_r = random.randint(50, 255)
    base_g = random.randint(50, 255)
    base_b = random.randint(50, 255)
    
    num_states = len(sorted_keys)
    
    # Vectorized computation for massive performance boost
    I, J = np.meshgrid(np.arange(height), np.arange(width), indexing='ij')
    
    # Map coordinates to quantum states
    state_idx = (I * width + J) % num_states
    state_idx_2 = ((I * J) + width) % num_states
    
    prob = probs_np[state_idx]
    prob_2 = probs_np[state_idx_2]
    
    # Radial and angular math
    cx, cy = width / 2.0, height / 2.0
    dx = J - cx
    dy = I - cy
    angle = np.arctan2(dy, dx)
    
    # Morph the distance metric based on the parsed shape keyword
    if shape_type == "square":
        dist = np.maximum(np.abs(dx), np.abs(dy)) + 1.0
    elif shape_type == "diamond":
        dist = (np.abs(dx) + np.abs(dy)) + 1.0
    elif shape_type == "wave":
        dist = np.abs(dy) + 1.0 + np.sin(dx / 10.0) * 20.0
    elif shape_type == "spiral":
        dist = np.sqrt(dx*dx + dy*dy) + angle * 40.0 + 1.0
    elif shape_type == "triangle":
        dist = np.maximum(np.abs(dx) * 1.732 + dy, -2.0 * dy) + 1.0
    elif shape_type == "cross":
        dist = np.minimum(np.abs(dx), np.abs(dy)) + 1.0
    else: # circle
        dist = np.sqrt(dx*dx + dy*dy) + 1.0
        
    # Create interference patterns
    interference = np.sin(dist * prob * num_states * 0.12) + np.cos(angle * prob_2 * num_states * 6.0)
    
    # Calculate colors for active cells (base_val > 0.0)
    active_r = np.clip(base_r * (0.6 + 0.4 * interference) + 50, 0, 255)
    active_g = np.clip(base_g * prob * num_states * 1.5, 0, 255)
    active_b = np.clip(base_b * prob_2 * num_states * 1.5 + 100, 0, 255)
    
    # Calculate colors for background cells
    bg_r = np.clip(60 * prob * num_states * (1 + np.sin(dist/15.0 - angle)), 0, 255)
    bg_g = np.clip(60 * prob_2 * num_states * (1 + np.cos(dist/20.0 + angle*2)), 0, 255)
    bg_b = np.clip(120 * (prob + prob_2) * num_states, 0, 255)
    
    # Create the final image array using the pattern as a mask
    mask = (pattern > 0.0)
    
    # Interference layer
    r = np.where(mask, active_r, bg_r)
    g = np.where(mask, active_g, bg_g)
    b = np.where(mask, active_b, bg_b)
    
    interference_img = np.stack([r, g, b], axis=-1).astype(np.uint8)
    
    # 5. Blend the Julia fractal with the Quantum Interference patterns
    # We want the Julia Set to be the undisputed dominant visual element.
    # We'll apply the interference pattern as a subtle translucent overlay.
    img_interf = Image.fromarray(interference_img).convert("RGBA")
    img_julia = Image.fromarray(julia_rgb).convert("RGBA")
    
    img_interf.putalpha(140 if force_quantum else 40) 
    
    # Alpha composite puts interference on top of Julia
    blended = Image.alpha_composite(img_julia, img_interf).convert("RGB")
    
    # Increase the contrast slightly to make the Julia Set colors pop for t-shirts
    from PIL import ImageEnhance
    enhancer = ImageEnhance.Contrast(blended)
    final_img = enhancer.enhance(1.55 if force_quantum else 1.4)
            
    return final_img

if __name__ == "__main__":
    img = generate_quantum_image("test", 512, 512)
    img.save("quantum_test.png")
    print("Saved quantum_test.png")
