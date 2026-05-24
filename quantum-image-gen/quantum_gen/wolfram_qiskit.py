
import math
import hashlib
import random
import json
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from qiskit.circuit.library import efficient_su2

import os
import wolframalpha
try:
    import torch
except ImportError:
    torch = None

def _seed_from_text(text: str) -> int:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return int(h[:8], 16)

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

def _mandelbrot_escape_iterations(c_x: float, c_y: float, max_iter: int = 64) -> int:
    zx = 0.0
    zy = 0.0
    cx = float(c_x)
    cy = float(c_y)
    for i in range(int(max_iter)):
        zx2 = zx * zx
        zy2 = zy * zy
        if zx2 + zy2 > 4.0:
            return i
        zy = 2.0 * zx * zy + cy
        zx = zx2 - zy2 + cx
    return int(max_iter)

def _pick_boundary_c(seed: int) -> tuple[float, float]:
    rng = random.Random(int(seed) ^ 0x5EF13A91)
    best = (-0.70176, -0.3842)
    best_score = -1.0
    target = 28.0
    for _ in range(28):
        x = rng.uniform(-1.25, 0.85)
        y = rng.uniform(-1.15, 1.15)
        it = _mandelbrot_escape_iterations(x, y, 64)
        if it >= 64:
            score = 0.12 + rng.random() * 0.05
        else:
            score = 1.0 / (abs(float(it) - target) + 1.0)
            if 8 <= it <= 56:
                score += 0.25
        if score > best_score:
            best_score = score
            best = (x, y)
    return best

def _jitter_c(seed: int, amount: float) -> tuple[float, float]:
    rng = random.Random(int(seed) ^ 0xA31C7F11)
    r = float(amount) * (0.25 + rng.random() * 0.85)
    theta = rng.random() * math.pi * 2.0
    return (r * math.cos(theta), r * math.sin(theta))

def _clamp_c(c_x: float, c_y: float) -> tuple[float, float]:
    x = float(c_x)
    y = float(c_y)
    x = max(-1.6, min(1.6, x))
    y = max(-1.6, min(1.6, y))
    return (x, y)

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
    prompt_seed = _seed_from_text(p)
    if any(w in p for w in ["love", "passion", "heart", "warm", "fire", "soul"]):
        base = (-0.4, 0.6)
        boundary = _pick_boundary_c(prompt_seed)
        mix = 0.22
        jx, jy = _jitter_c(prompt_seed, 0.028)
        c_x = base[0] * (1.0 - mix) + boundary[0] * mix + jx
        c_y = base[1] * (1.0 - mix) + boundary[1] * mix + jy
        c_x, c_y = _clamp_c(c_x, c_y)
        return "magma", c_x, c_y, "diamond" if shape_type == "circle" else shape_type
    if any(w in p for w in ["calm", "peace", "water", "flow", "tranquil", "breeze", "ocean"]):
        base = (0.285, 0.01)
        boundary = _pick_boundary_c(prompt_seed)
        mix = 0.18
        jx, jy = _jitter_c(prompt_seed, 0.022)
        c_x = base[0] * (1.0 - mix) + boundary[0] * mix + jx
        c_y = base[1] * (1.0 - mix) + boundary[1] * mix + jy
        c_x, c_y = _clamp_c(c_x, c_y)
        return "viridis", c_x, c_y, "wave" if shape_type == "circle" else shape_type
    if any(w in p for w in ["energy", "chaos", "power", "electric", "lightning", "dynamic"]):
        base = (-0.8, 0.156)
        boundary = _pick_boundary_c(prompt_seed)
        mix = 0.26
        jx, jy = _jitter_c(prompt_seed, 0.030)
        c_x = base[0] * (1.0 - mix) + boundary[0] * mix + jx
        c_y = base[1] * (1.0 - mix) + boundary[1] * mix + jy
        c_x, c_y = _clamp_c(c_x, c_y)
        return "turbo", c_x, c_y, "cross" if shape_type == "circle" else shape_type
    if any(w in p for w in ["transcendent", "mystic", "cosmos", "god", "divine", "spirit"]):
        base = (-0.7269, 0.1889)
        boundary = _pick_boundary_c(prompt_seed)
        mix = 0.24
        jx, jy = _jitter_c(prompt_seed, 0.030)
        c_x = base[0] * (1.0 - mix) + boundary[0] * mix + jx
        c_y = base[1] * (1.0 - mix) + boundary[1] * mix + jy
        c_x, c_y = _clamp_c(c_x, c_y)
        return "plasma", c_x, c_y, "spiral" if shape_type == "circle" else shape_type
    if any(w in p for w in ["dark", "void", "abyss", "shadow", "deep"]):
        base = (-0.835, -0.2321)
        boundary = _pick_boundary_c(prompt_seed)
        mix = 0.24
        jx, jy = _jitter_c(prompt_seed, 0.028)
        c_x = base[0] * (1.0 - mix) + boundary[0] * mix + jx
        c_y = base[1] * (1.0 - mix) + boundary[1] * mix + jy
        c_x, c_y = _clamp_c(c_x, c_y)
        return "inferno", c_x, c_y, "square" if shape_type == "circle" else shape_type
        
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
    rng = random.Random(prompt_seed)
    
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

    boundary_x, boundary_y = _pick_boundary_c(prompt_seed)
    mix = 0.62
    jx, jy = _jitter_c(prompt_seed, 0.045)
    out_x = float(c_x) * (1.0 - mix) + float(boundary_x) * mix + jx
    out_y = float(c_y) * (1.0 - mix) + float(boundary_y) * mix + jy
    out_x, out_y = _clamp_c(out_x, out_y)
    return rng.choice(cmaps), out_x, out_y, shape_type

def generate_julia_set(width, height, c_x, c_y, zoom=1.0, max_iter=100, cmap_name="turbo"):
    """
    Generates a mathematically pure Julia set fractal.
    """
    if not np:
        return None

    def apply_simple_colormap(vals_01: "np.ndarray", name: str) -> "np.ndarray":
        name = (name or "turbo").lower()
        stops = {
            "turbo": [(48, 18, 59), (59, 82, 139), (33, 145, 140), (96, 202, 96), (231, 228, 25), (180, 39, 46)],
            "viridis": [(68, 1, 84), (59, 82, 139), (33, 145, 140), (94, 201, 97), (253, 231, 37)],
            "plasma": [(12, 7, 134), (86, 1, 164), (156, 23, 158), (212, 73, 128), (246, 141, 76), (252, 216, 86)],
            "magma": [(0, 0, 4), (28, 16, 68), (79, 18, 123), (129, 37, 129), (181, 54, 122), (229, 80, 100), (251, 135, 97), (252, 203, 134)],
            "inferno": [(0, 0, 4), (31, 12, 72), (85, 15, 109), (136, 34, 106), (186, 54, 85), (227, 89, 51), (249, 140, 10), (252, 255, 164)],
            "ocean": [(0, 12, 38), (0, 66, 98), (0, 133, 139), (0, 190, 170), (180, 255, 245)],
            "rainbow": [(150, 0, 255), (0, 80, 255), (0, 220, 255), (0, 255, 120), (240, 255, 0), (255, 120, 0), (255, 0, 0)],
        }.get(name)

        if not stops:
            stops = [(48, 18, 59), (59, 82, 139), (33, 145, 140), (96, 202, 96), (231, 228, 25), (180, 39, 46)]

        stops_np = np.array(stops, dtype=np.float32) / 255.0
        x = np.clip(vals_01, 0.0, 1.0) * (stops_np.shape[0] - 1)
        i0 = np.floor(x).astype(np.int32)
        i1 = np.clip(i0 + 1, 0, stops_np.shape[0] - 1)
        t = (x - i0).astype(np.float32)[..., None]
        rgb = (1.0 - t) * stops_np[i0] + t * stops_np[i1]
        return (np.clip(rgb, 0.0, 1.0) * 255.0).astype(np.uint8)

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

    if cm is not None:
        try:
            colormap = cm.get_cmap(cmap_name)
        except Exception:
            colormap = cm.get_cmap("turbo")
        img_rgba = colormap(smooth_norm)
        return (img_rgba[:, :, :3] * 255).astype(np.uint8)

    return apply_simple_colormap(smooth_norm.astype(np.float32), cmap_name)


def generate_mandelbrot_set(
    width,
    height,
    center_x=-0.5,
    center_y=0.0,
    zoom=1.0,
    max_iter=100,
    cmap_name="turbo",
):
    if not np:
        return None

    def apply_simple_colormap(vals_01: "np.ndarray", name: str) -> "np.ndarray":
        name = (name or "turbo").lower()
        stops = {
            "turbo": [(48, 18, 59), (59, 82, 139), (33, 145, 140), (96, 202, 96), (231, 228, 25), (180, 39, 46)],
            "viridis": [(68, 1, 84), (59, 82, 139), (33, 145, 140), (94, 201, 97), (253, 231, 37)],
            "plasma": [(12, 7, 134), (86, 1, 164), (156, 23, 158), (212, 73, 128), (246, 141, 76), (252, 216, 86)],
            "magma": [(0, 0, 4), (28, 16, 68), (79, 18, 123), (129, 37, 129), (181, 54, 122), (229, 80, 100), (251, 135, 97), (252, 203, 134)],
            "inferno": [(0, 0, 4), (31, 12, 72), (85, 15, 109), (136, 34, 106), (186, 54, 85), (227, 89, 51), (249, 140, 10), (252, 255, 164)],
            "ocean": [(0, 12, 38), (0, 66, 98), (0, 133, 139), (0, 190, 170), (180, 255, 245)],
            "rainbow": [(150, 0, 255), (0, 80, 255), (0, 220, 255), (0, 255, 120), (240, 255, 0), (255, 120, 0), (255, 0, 0)],
        }.get(name)

        if not stops:
            stops = [(48, 18, 59), (59, 82, 139), (33, 145, 140), (96, 202, 96), (231, 228, 25), (180, 39, 46)]

        stops_np = np.array(stops, dtype=np.float32) / 255.0
        x = np.clip(vals_01, 0.0, 1.0) * (stops_np.shape[0] - 1)
        i0 = np.floor(x).astype(np.int32)
        i1 = np.clip(i0 + 1, 0, stops_np.shape[0] - 1)
        t = (x - i0).astype(np.float32)[..., None]
        rgb = (1.0 - t) * stops_np[i0] + t * stops_np[i1]
        return (np.clip(rgb, 0.0, 1.0) * 255.0).astype(np.uint8)

    w = int(width)
    h = int(height)

    x = np.linspace(center_x - (1.5 / zoom), center_x + (1.5 / zoom), w)
    y = np.linspace(center_y - (1.5 / zoom), center_y + (1.5 / zoom), h)
    X, Y = np.meshgrid(x, y)
    C = X + 1j * Y
    Z = np.zeros_like(C)

    div_time = np.zeros(C.shape, dtype=int)
    m = np.full(C.shape, True, dtype=bool)

    for i in range(int(max_iter)):
        Z[m] = Z[m] ** 2 + C[m]
        diverged = np.abs(Z) > 2
        just_diverged = diverged & m
        div_time[just_diverged] = i
        m[just_diverged] = False
        if not m.any():
            break

    smooth = np.zeros(C.shape, dtype=float)
    mask = div_time > 0
    smooth[~mask] = 0.0

    Z_abs = np.abs(Z[mask])
    Z_abs[Z_abs == 0] = 1e-10
    smooth[mask] = div_time[mask] + 1 - np.log2(np.log(Z_abs))

    smooth_norm = smooth / np.max(smooth) if np.max(smooth) > 0 else smooth

    if cm is not None:
        try:
            colormap = cm.get_cmap(cmap_name)
        except Exception:
            colormap = cm.get_cmap("turbo")
        img_rgba = colormap(smooth_norm)
        return (img_rgba[:, :, :3] * 255).astype(np.uint8)

    return apply_simple_colormap(smooth_norm.astype(np.float32), cmap_name)


def _compute_julia_smooth_norm(width, height, c_x, c_y, zoom=1.0, max_iter=100):
    if not np:
        return None

    x = np.linspace(-1.5 / zoom, 1.5 / zoom, int(width))
    y = np.linspace(-1.5 / zoom, 1.5 / zoom, int(height))
    X, Y = np.meshgrid(x, y)
    Z = X + 1j * Y
    C = float(c_x) + 1j * float(c_y)

    div_time = np.zeros(Z.shape, dtype=int)
    m = np.full(Z.shape, True, dtype=bool)

    for i in range(int(max_iter)):
        Z[m] = Z[m] ** 2 + C
        diverged = np.abs(Z) > 2
        just_diverged = diverged & m
        div_time[just_diverged] = i
        m[just_diverged] = False

    smooth = np.zeros(Z.shape, dtype=float)
    mask = div_time > 0
    smooth[~mask] = 0.0

    Z_abs = np.abs(Z[mask])
    Z_abs[Z_abs == 0] = 1e-10
    smooth[mask] = div_time[mask] + 1 - np.log2(np.log(Z_abs))

    maxv = float(np.max(smooth))
    smooth_norm = (smooth / maxv) if maxv > 0 else smooth
    return smooth_norm.astype(np.float32)


def _compute_mandelbrot_smooth_norm(width, height, center_x=-0.5, center_y=0.0, zoom=1.0, max_iter=100):
    if not np:
        return None

    w = int(width)
    h = int(height)
    x = np.linspace(float(center_x) - (1.5 / zoom), float(center_x) + (1.5 / zoom), w)
    y = np.linspace(float(center_y) - (1.5 / zoom), float(center_y) + (1.5 / zoom), h)
    X, Y = np.meshgrid(x, y)
    C = X + 1j * Y
    Z = np.zeros_like(C)

    div_time = np.zeros(C.shape, dtype=int)
    m = np.full(C.shape, True, dtype=bool)

    for i in range(int(max_iter)):
        Z[m] = Z[m] ** 2 + C[m]
        diverged = np.abs(Z) > 2
        just_diverged = diverged & m
        div_time[just_diverged] = i
        m[just_diverged] = False
        if not m.any():
            break

    smooth = np.zeros(C.shape, dtype=float)
    mask = div_time > 0
    smooth[~mask] = 0.0

    Z_abs = np.abs(Z[mask])
    Z_abs[Z_abs == 0] = 1e-10
    smooth[mask] = div_time[mask] + 1 - np.log2(np.log(Z_abs))

    maxv = float(np.max(smooth))
    smooth_norm = (smooth / maxv) if maxv > 0 else smooth
    return smooth_norm.astype(np.float32)


def _apply_colormap_01(vals_01: "np.ndarray", cmap_name: str) -> "np.ndarray":
    vals_01 = np.clip(vals_01.astype(np.float32), 0.0, 1.0)

    name = (cmap_name or "turbo").lower()
    stops = {
        "turbo": [(48, 18, 59), (59, 82, 139), (33, 145, 140), (96, 202, 96), (231, 228, 25), (180, 39, 46)],
        "viridis": [(68, 1, 84), (59, 82, 139), (33, 145, 140), (94, 201, 97), (253, 231, 37)],
        "plasma": [(12, 7, 134), (86, 1, 164), (156, 23, 158), (212, 73, 128), (246, 141, 76), (252, 216, 86)],
        "magma": [(0, 0, 4), (28, 16, 68), (79, 18, 123), (129, 37, 129), (181, 54, 122), (229, 80, 100), (251, 135, 97), (252, 203, 134)],
        "inferno": [(0, 0, 4), (31, 12, 72), (85, 15, 109), (136, 34, 106), (186, 54, 85), (227, 89, 51), (249, 140, 10), (252, 255, 164)],
        "ocean": [(0, 12, 38), (0, 66, 98), (0, 133, 139), (0, 190, 170), (180, 255, 245)],
        "rainbow": [(150, 0, 255), (0, 80, 255), (0, 220, 255), (0, 255, 120), (240, 255, 0), (255, 120, 0), (255, 0, 0)],
    }.get(name)

    if not stops:
        stops = [(48, 18, 59), (59, 82, 139), (33, 145, 140), (96, 202, 96), (231, 228, 25), (180, 39, 46)]

    stops_np = np.array(stops, dtype=np.float32) / 255.0
    x = vals_01 * (stops_np.shape[0] - 1)
    i0 = np.floor(x).astype(np.int32)
    i1 = np.clip(i0 + 1, 0, stops_np.shape[0] - 1)
    t = (x - i0).astype(np.float32)[..., None]
    rgb = (1.0 - t) * stops_np[i0] + t * stops_np[i1]
    return (np.clip(rgb, 0.0, 1.0) * 255.0).astype(np.uint8)


def _pseudo_quantum_probs(seed_context: str, num_states: int) -> "np.ndarray":
    n = int(num_states)
    n = max(8, min(256, n))
    seed = _seed_from_text(seed_context or "quantum-julia")
    rng = np.random.default_rng(seed)
    raw = rng.random(n, dtype=np.float32) + 1e-6
    return raw / np.sum(raw)

def generate_quantum_image(prompt, width=512, height=512, rule=30, force_quantum=False, seed_salt: str | None = None):
    # Always use Wolfram + Qiskit + Julia + Mandelbrot fusion, no future city fallbacks
    """
    Main function to generate a quantum-inspired image.
    """
    salt = (seed_salt or "").strip()
    seed_context = f"{(prompt or '').strip()}|salt:{salt}" if salt else (prompt or "")

    # Initialize variables FIRST (never None)
    quantum_engine = "pseudo"
    sorted_keys = [str(i) for i in range(64)]
    probs_np = _pseudo_quantum_probs(seed_context, len(sorted_keys))

    # 1. Generate Wolfram Pattern
    print(f"Generating Wolfram pattern (Rule {rule})...")
    pattern = generate_wolfram_pattern(width, height, rule=rule, prompt=seed_context)

    # 2. Quantum circuit + simulation
    print("Mapping to Quantum Circuit...")
    qc = map_pattern_to_quantum_circuit(pattern, num_qubits=6)
    print("Simulating on Aer backend...")
    counts = simulate_quantum_circuit(qc)
    print("Rendering image...")
    total_shots = sum(counts.values()) if counts else 0

    # Try to use real quantum results if available
    if total_shots > 0:
        quantum_engine = "qiskit-aer"
        sorted_keys = sorted(counts.keys())
        probs_np = np.array([counts[k] / total_shots for k in sorted_keys], dtype=np.float32)

    # 4. Extract Emotional Energy and Shape
    cmap_name, julia_cx, julia_cy, shape_type = _analyze_prompt_energy(prompt)
    
    # Modulate Julia coordinates with top quantum probabilities (true Quantum-Julia mix)
    # Kept extremely subtle so it doesn't break the fractal structure
    if probs_np is not None:
        julia_cx += (float(probs_np[0]) - 0.5) * 0.025
        if len(probs_np) > 1:
            julia_cy += (float(probs_np[1]) - 0.5) * 0.025
        if len(probs_np) > 4:
            julia_cx += (float(probs_np[2]) - float(probs_np[3])) * 0.012
            julia_cy += (float(probs_np[4]) - 0.5) * 0.012

    render_seed = _seed_from_text(f"{seed_context}|{rule}|julia-render")
    render_rng = random.Random(render_seed)
    julia_zoom = 1.05 + render_rng.random() * 0.95
    julia_iters = 140 + int(render_rng.random() * 80)
    if int(width) * int(height) > 1024 * 1024:
        julia_iters = min(julia_iters, 175)
        
    print(f"Rendering Quantum Julia (cmap={cmap_name}, shape={shape_type})...")
    julia_field = _compute_julia_smooth_norm(width, height, julia_cx, julia_cy, zoom=julia_zoom, max_iter=julia_iters)

    # Non-linear rendering using quantum probabilities and spatial coordinates
    # This creates actual interference-like quantum patterns
    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    
    base_r = random.randint(50, 255)
    base_g = random.randint(50, 255)
    base_b = random.randint(50, 255)
    
    num_states = len(sorted_keys) if sorted_keys is not None else int(probs_np.shape[0])
    
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
    if pattern is None:
        seed = _seed_from_text(prompt) if prompt else random.randint(0, 1000000)
        rng = np.random.default_rng(seed)
        mask = rng.random((height, width), dtype=np.float32) > 0.7
    else:
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
    base_rgb = _apply_colormap_01(julia_field, cmap_name)
    img_julia = Image.fromarray(base_rgb).convert("RGBA")

    p = (prompt or "").lower()
    disable_mandelbrot = ("no mandelbrot" in p) or ("no-mandelbrot" in p)
    if not disable_mandelbrot:
        seed = _seed_from_text(f"{seed_context}|{width}x{height}|{rule}|mandelbrot")
        rng = random.Random(seed)
        mandel_center_x = -0.5 + (rng.random() - 0.5) * 0.8
        mandel_center_y = (rng.random() - 0.5) * 0.8
        mandel_zoom = 0.9 + rng.random() * 1.6
        mandel_iter = 180 + int(rng.random() * 120)
        mandel_field = _compute_mandelbrot_smooth_norm(width, height, center_x=mandel_center_x, center_y=mandel_center_y, zoom=mandel_zoom, max_iter=mandel_iter)
        if mandel_field is not None:
            hybrid_seed = _seed_from_text(f"{seed_context}|{width}x{height}|{rule}|hybrid")
            hrng = np.random.default_rng(hybrid_seed)
            freq1 = float(hrng.uniform(6.0, 16.0))
            freq2 = float(hrng.uniform(6.0, 16.0))
            phase = float(hrng.uniform(0.0, 2.0 * np.pi))
            mix = float(hrng.uniform(0.35, 0.65))

            combined = (mix * julia_field) + ((1.0 - mix) * mandel_field)
            signal = np.sin((2.0 * np.pi) * (freq1 * julia_field + freq2 * mandel_field) + phase)
            ridges = (1.0 - np.abs(signal)).astype(np.float32)
            ridges = np.clip(ridges ** float(hrng.uniform(1.2, 2.0)), 0.0, 1.0)

            fused = np.clip(0.35 * combined + 0.65 * ridges, 0.0, 1.0).astype(np.float32)
            fused_rgb = _apply_colormap_01(fused, cmap_name)
            img_julia = Image.fromarray(fused_rgb).convert("RGBA")

    if force_quantum:
        img_interf = img_interf.filter(ImageFilter.GaussianBlur(radius=2))
    img_interf.putalpha(90 if force_quantum else 40)
    
    # Alpha composite puts interference on top of Julia
    blended = Image.alpha_composite(img_julia, img_interf).convert("RGB")
    
    # Increase the contrast slightly to make the Julia Set colors pop for t-shirts
    from PIL import ImageEnhance
    enhancer = ImageEnhance.Contrast(blended)
    final_img = enhancer.enhance(1.55 if force_quantum else 1.4)

    img_hash = hashlib.sha256(final_img.tobytes()).hexdigest()[:12]
    base_prompt = (prompt or "").strip()
    derived_prompt = f"{base_prompt} ::qf:{img_hash}" if base_prompt else f"qf::{img_hash}"
    final_img.info["qf_image_hash"] = img_hash
    final_img.info["qf_derived_prompt"] = derived_prompt
    final_img.info["qf_quantum_engine"] = quantum_engine
    if salt:
        final_img.info["qf_quantum_seed_hash"] = hashlib.sha256(salt.encode("utf-8")).hexdigest()[:12]

    return final_img

if __name__ == "__main__":
    img = generate_quantum_image("test", 512, 512)
    img.save("quantum_test.png")
    print("Saved quantum_test.png")
