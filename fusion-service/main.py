import binascii
import json
import math
import os
import random
import struct
import time
import uuid
import zlib
from io import BytesIO
from typing import Literal, Optional

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import RedirectResponse, Response

try:
    from PIL import Image, ImageDraw, ImageFilter
except Exception:  # pragma: no cover
    Image = None  # type: ignore
    ImageDraw = None  # type: ignore
    ImageFilter = None  # type: ignore

DEFAULT_FRACTAL_ITERATIONS = 130
DEFAULT_ZOOM_LEVEL = 1.45
MAX_QUALITY = 3
MIN_QUALITY = 1
MIN_ZOOM_LEVEL = 0.05
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

REQUESTS = Counter("fusion_requests_total", "Fusion requests", ["endpoint"])
LATENCY = Histogram("fusion_latency_seconds", "Fusion latency", ["device"])

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Fusion Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

jobs: dict[str, dict] = {}


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    chunk = tag + data
    return struct.pack("!I", len(data)) + chunk + struct.pack("!I", binascii.crc32(chunk) & 0xFFFFFFFF)


def write_png_rgb(file_path: str, width: int, height: int, rgb: bytes) -> None:
    if len(rgb) != width * height * 3:
        raise ValueError("invalid_rgb_buffer")
    rows: list[bytes] = []
    stride = width * 3
    for y in range(height):
        rows.append(b"\x00" + rgb[y * stride : (y + 1) * stride])
    raw = b"".join(rows)
    compressed = zlib.compress(raw, level=6)
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = PNG_SIGNATURE + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", compressed) + _png_chunk(b"IEND", b"")
    with open(file_path, "wb") as f:
        f.write(png)


def _hsv_to_rgb(h: float, s: float, v: float) -> tuple[int, int, int]:
    h = h - int(h)
    i = int(h * 6.0)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i %= 6
    if i == 0:
        r, g, b = v, t, p
    elif i == 1:
        r, g, b = q, v, p
    elif i == 2:
        r, g, b = p, v, t
    elif i == 3:
        r, g, b = p, q, v
    elif i == 4:
        r, g, b = t, p, v
    else:
        r, g, b = v, p, q
    return int(r * 255), int(g * 255), int(b * 255)


def _cap_render_dims(width: int, height: int, max_side: int = 448) -> tuple[int, int]:
    long_side = max(width, height)
    if long_side <= max_side:
        return width, height
    scale = max_side / long_side
    return max(64, int(round(width * scale))), max(64, int(round(height * scale)))


def _wormhole_warp(
    x: float,
    y: float,
    center_x: float,
    center_y: float,
    strength: float,
    swirl: float,
) -> tuple[float, float]:
    dx = x - center_x
    dy = y - center_y
    r = math.sqrt(dx * dx + dy * dy) + 1e-9
    theta = math.atan2(dy, dx)
    falloff = math.exp(-r * 1.35)
    theta2 = theta + swirl * falloff + (strength * 0.15) / (r + 0.18)
    r2 = r * (1.0 + strength * 0.22 * falloff)
    return center_x + r2 * math.cos(theta2), center_y + r2 * math.sin(theta2)


def _palette_params(profile: Optional[str], phash: int) -> dict[str, float]:
    p = (profile or "").strip().lower()
    if p in {"peaceful", "serene", "tranquil", "meditative", "calm"}:
        return {"base": 0.56, "span": 0.26, "sat": 0.68, "val_bias": 0.02, "gamma": 1.0 / 1.14}
    if p in {"angry", "rage", "ominous"}:
        return {"base": 0.98, "span": 0.22, "sat": 0.82, "val_bias": -0.02, "gamma": 1.0 / 1.18}
    if p in {"magma", "lava", "fire", "heat"}:
        return {"base": 0.06, "span": 0.36, "sat": 0.90, "val_bias": 0.08, "gamma": 1.0 / 1.08}
    if p in {"joyful", "joy", "radiant"}:
        return {"base": 0.10, "span": 0.34, "sat": 0.80, "val_bias": 0.08, "gamma": 1.0 / 1.10}
    if p in {"void", "dark", "shadow", "abyss"}:
        return {"base": 0.70, "span": 0.18, "sat": 0.62, "val_bias": -0.08, "gamma": 1.0 / 1.24}
    if p in {"cosmic", "nebula", "mysterious"}:
        return {"base": 0.80, "span": 0.30, "sat": 0.80, "val_bias": 0.02, "gamma": 1.0 / 1.14}
    if p in {"ethereal", "dreamlike"}:
        return {"base": 0.76, "span": 0.28, "sat": 0.76, "val_bias": 0.04, "gamma": 1.0 / 1.12}
    if p in {"quantum", "crystalline", "fractured"}:
        return {"base": 0.72, "span": 0.32, "sat": 0.84, "val_bias": 0.06, "gamma": 1.0 / 1.10}
    base = ((phash % 360) / 360.0 + 0.74) % 1.0
    return {"base": base, "span": 0.30, "sat": 0.82, "val_bias": 0.04, "gamma": 1.0 / 1.12}


def _texture_style_for_seed(seed: int) -> str:
    styles = ("diagonal_hatch", "diamond_wave", "spiral")
    return styles[abs(int(seed)) % len(styles)]


def _metallic_profile(profile: Optional[str]) -> dict[str, float]:
    p = (profile or "").strip().lower()
    base = {"background_dim": 0.60, "outline_boost": 0.48, "metal_desat": 0.18, "specular_strength": 0.34}
    if p in {"peaceful", "serene", "tranquil", "meditative", "calm"}:
        return {**base, "background_dim": 0.58, "outline_boost": 0.42, "metal_desat": 0.16, "specular_strength": 0.30}
    if p in {"angry", "rage", "ominous"}:
        return {**base, "background_dim": 0.55, "outline_boost": 0.56, "metal_desat": 0.14, "specular_strength": 0.38}
    if p in {"joyful", "joy", "radiant"}:
        return {**base, "background_dim": 0.68, "outline_boost": 0.40, "metal_desat": 0.12, "specular_strength": 0.26}
    if p in {"void", "dark", "shadow", "abyss"}:
        return {**base, "background_dim": 0.42, "outline_boost": 0.60, "metal_desat": 0.24, "specular_strength": 0.42}
    if p in {"cosmic", "nebula", "mysterious", "quantum", "crystalline", "fractured"}:
        return {**base, "background_dim": 0.52, "outline_boost": 0.58, "metal_desat": 0.20, "specular_strength": 0.40}
    return base


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _smoothstep(a: float, b: float, value: float) -> float:
    if a == b:
        return 0.0
    t = _clamp01((value - a) / (b - a))
    return t * t * (3.0 - 2.0 * t)


def _ring_field(nx: float, ny: float, phase: float, density: float) -> float:
    radius = math.sqrt(nx * nx + ny * ny)
    return 0.5 + 0.5 * math.cos(radius * density * math.pi - phase)


def _diamond_field(nx: float, ny: float, phase: float, density: float) -> float:
    diamond = abs(nx) + abs(ny)
    return 0.5 + 0.5 * math.cos(diamond * density * math.pi - phase)


def _story_geometry(nx: float, ny: float, story_mode: str, q_phase: float, ring_bias: float, diamond_bias: float) -> float:
    ring = _ring_field(nx, ny, q_phase, 12.0 + ring_bias * 10.0)
    diamond = _diamond_field(nx, ny, q_phase * 0.8, 11.0 + diamond_bias * 10.0)
    radius = math.sqrt(nx * nx + ny * ny) + 1e-9
    theta = math.atan2(ny, nx)
    diagonal = 0.5 + 0.5 * math.sin((nx + ny) * math.pi * 17.0 + q_phase * 0.7)
    spiral = 0.5 + 0.5 * math.sin(radius * 26.0 - theta * 4.0 + q_phase)
    if story_mode == "ring_memory":
        return _clamp01(0.74 * ring + 0.18 * diamond + 0.08 * diagonal)
    if story_mode == "diamond_resonance":
        return _clamp01(0.72 * diamond + 0.18 * ring + 0.10 * diagonal)
    if story_mode == "diagonal_current":
        return _clamp01(0.48 * diagonal + 0.30 * diamond + 0.22 * ring)
    return _clamp01(0.46 * spiral + 0.30 * ring + 0.24 * diagonal)


def _texture_pattern(nx: float, ny: float, style: str, phase: float) -> float:
    if style == "diagonal_hatch":
        diag_a = abs(math.sin((nx + ny) * math.pi * 26.0 + phase))
        diag_b = abs(math.sin((nx + ny) * math.pi * 58.0 + phase * 0.6))
        cross = abs(math.sin((nx - ny) * math.pi * 34.0 - phase * 0.4))
        grid = abs(math.sin(nx * math.pi * 18.0 - phase * 0.3) * math.sin(ny * math.pi * 18.0 + phase * 0.2))
        return _clamp01(0.42 * diag_a + 0.28 * diag_b + 0.18 * cross + 0.12 * grid)
    if style == "diamond_wave":
        diamond = abs(nx) + abs(ny)
        ridges = 0.5 + 0.5 * math.sin(diamond * math.pi * 18.0 - phase)
        bands = 0.5 + 0.5 * math.sin(diamond * math.pi * 34.0 + phase * 0.45)
        weave_a = abs(math.sin((nx + ny) * math.pi * 46.0 + phase * 0.55))
        weave_b = abs(math.sin((nx - ny) * math.pi * 44.0 - phase * 0.42))
        return _clamp01(0.42 * ridges + 0.18 * bands + 0.20 * weave_a + 0.20 * weave_b)
    r = math.sqrt(nx * nx + ny * ny) + 1e-9
    t = math.atan2(ny, nx)
    spiral = 0.5 + 0.5 * math.sin(20.0 * r - 5.0 * t + phase)
    hatch = abs(math.sin((nx + ny) * math.pi * 28.0 + phase * 0.35))
    return _clamp01(0.78 * spiral + 0.22 * hatch)


def _sierpinski_mask(nx: float, ny: float, scale: int = 1024) -> float:
    xi = int((nx + 0.5) * scale)
    yi = int((ny + 0.5) * scale)
    return 1.0 if (xi & yi) == 0 else 0.0


def _koch_like_mask(nx: float, ny: float, freq: float = 22.0) -> float:
    r = math.sqrt(nx * nx + ny * ny) + 1e-9
    t = math.atan2(ny, nx)
    tri = abs(((t / math.pi) * freq) % 2.0 - 1.0)
    rings = abs((r * (freq * 0.65)) % 1.0 - 0.5) * 2.0
    m = tri * 0.65 + rings * 0.35
    return 1.0 - min(1.0, m)


def _quantum_grid(nx: float, ny: float, freq: float, phase: float) -> float:
    a = math.sin((nx + ny) * freq * math.pi + phase)
    b = math.sin((nx - ny) * (freq * 0.85) * math.pi + phase * 1.23)
    return 0.5 + 0.5 * (a * b)


def fractal_fusion_rgb(
    width: int,
    height: int,
    prompt: str,
    seed: int,
    quality: int = MIN_QUALITY,
    iterations: int = DEFAULT_FRACTAL_ITERATIONS,
    palette_index: int = 0,
    rotation: float = 0.0,
    zoom_level: float = DEFAULT_ZOOM_LEVEL,
    center_x: float = -0.15,
    center_y: float = 0.0,
    palette_profile: Optional[str] = None,
    wormhole_strength: Optional[float] = None,
    wormhole_swirl: Optional[float] = None,
    wormhole_center_x: Optional[float] = None,
    wormhole_center_y: Optional[float] = None,
    sierpinski_weight: float = 0.10,
    koch_weight: float = 0.08,
    grid_weight: float = 0.12,
    story_mode: str = "diamond_resonance",
    story_phase_bias: Optional[list[float]] = None,
    mandelbrot_weight: float = 0.08,
    julia_weight: float = 0.74,
    ring_bias: float = 0.72,
    diamond_bias: float = 0.72,
    string_flow_strength: float = 0.68,
    diagonal_filament_strength: float = 0.58,
    texture_style: Optional[str] = None,
    texture_mix: float = 0.62,
    detail_density: float = 0.7,
    brightness_floor: float = 0.36,
    metallic_outline_strength: float = 0.58,
    palette_motion: float = 0.58,
) -> bytes:
    rng = random.Random(seed)
    angle = (seed % 100000) / 100000.0 * 2.0 * math.pi
    radius = 0.7885 + (rng.random() - 0.5) * 0.08
    cr = radius * math.cos(angle)
    ci = radius * math.sin(angle)

    phash = abs(hash(prompt)) if prompt else seed
    q_freq = 2.0 + (phash % 7)
    q_phase = ((phash >> 3) % 360) * math.pi / 180.0

    palette_shift = (int(palette_index) % 24) / 24.0
    pal = _palette_params(palette_profile, phash)
    metal = _metallic_profile(palette_profile)
    texture_style = texture_style or _texture_style_for_seed(seed)
    texture_phase = ((phash >> 7) % 360) * math.pi / 180.0
    base_hue = (pal["base"] + palette_shift) % 1.0
    hue_span = pal["span"]
    sat_base = pal["sat"]
    gamma = pal["gamma"]
    val_bias = pal["val_bias"]

    quality = max(MIN_QUALITY, min(MAX_QUALITY, int(quality)))
    zoom = max(MIN_ZOOM_LEVEL, float(zoom_level))
    aspect = width / max(1, height)
    span_x = zoom * (aspect if aspect >= 1 else 1.0)
    span_y = zoom * (1.0 if aspect >= 1 else 1.0 / aspect)
    cx_center, cy_center = float(center_x), float(center_y)
    rot_rad = float(rotation) * math.pi / 180.0
    rot_cos = math.cos(rot_rad)
    rot_sin = math.sin(rot_rad)

    w_strength = wormhole_strength if wormhole_strength is not None else (0.32 + rng.random() * 0.22)
    w_swirl = wormhole_swirl if wormhole_swirl is not None else (0.85 + rng.random() * 0.55)
    w_cx = wormhole_center_x if wormhole_center_x is not None else (cx_center + (rng.random() - 0.5) * 0.25)
    w_cy = wormhole_center_y if wormhole_center_y is not None else (cy_center + (rng.random() - 0.5) * 0.25)
    story_phase_bias = story_phase_bias or [0.24, 0.28, 0.28, 0.20]
    brightness_floor = _clamp(brightness_floor, 0.18, 0.58)
    mandelbrot_weight = _clamp(mandelbrot_weight, 0.0, 0.10)
    julia_weight = _clamp(julia_weight, 0.45, 0.9)
    ring_bias = _clamp(ring_bias, 0.15, 0.95)
    diamond_bias = _clamp(diamond_bias, 0.15, 0.95)
    string_flow_strength = _clamp(string_flow_strength, 0.15, 0.95)
    diagonal_filament_strength = _clamp(diagonal_filament_strength, 0.15, 0.95)
    texture_mix = _clamp(texture_mix, 0.15, 0.95)
    detail_density = _clamp(detail_density, 0.15, 0.95)
    metallic_outline_strength = _clamp(metallic_outline_strength, 0.1, 0.95)
    palette_motion = _clamp(palette_motion, 0.05, 0.95)

    log2 = math.log(2.0)
    bailout = 16.0

    max_field_dim = 320
    long_side = max(width, height)
    scale = 1.0 if long_side <= max_field_dim else max_field_dim / long_side
    fw = max(2, min(width, int(round(width * scale))))
    fh = max(2, min(height, int(round(height * scale))))
    max_iter = DEFAULT_FRACTAL_ITERATIONS if fw * fh <= 200 * 200 else 90
    user_iterations = max(1, int(iterations))
    if user_iterations != DEFAULT_FRACTAL_ITERATIONS:
        max_iter = user_iterations
    max_iter *= quality

    field = [0.0] * (fw * fh)
    inv_fw = 1.0 / max(1, fw - 1)
    inv_fh = 1.0 / max(1, fh - 1)

    accent_cx = (rng.random() - 0.5) * 0.52
    accent_cy = (rng.random() - 0.5) * 0.52
    accent_outer = 0.06 + rng.random() * 0.10
    accent_inner = accent_outer * (0.25 + rng.random() * 0.12)

    for y in range(fh):
        base_y = (y * inv_fh - 0.5) * span_y
        my = y * inv_fh - 0.5
        row = y * fw
        for x in range(fw):
            base_x = (x * inv_fw - 0.5) * span_x
            mx = x * inv_fw - 0.5
            rot_x = base_x * rot_cos - base_y * rot_sin
            rot_y = base_x * rot_sin + base_y * rot_cos
            wx, wy = _wormhole_warp(rot_x, rot_y, w_cx, w_cy, w_strength, w_swirl)
            ix = cx_center + wx
            iy = cy_center + wy

            zr, zi = ix, iy
            j_iter = 0
            while j_iter < max_iter:
                zr2 = zr * zr
                zi2 = zi * zi
                if zr2 + zi2 > bailout:
                    break
                zi = 2.0 * zr * zi + ci
                zr = zr2 - zi2 + cr
                j_iter += 1
            if j_iter < max_iter:
                mag = math.sqrt(zr * zr + zi * zi) + 1e-9
                j_val = j_iter + 1.0 - math.log(math.log(mag) / log2 + 1e-9) / log2
            else:
                j_val = max_iter
            j_norm = j_val / max_iter

            mr, mi = 0.0, 0.0
            m_iter = 0
            while m_iter < max_iter:
                mr2 = mr * mr
                mi2 = mi * mi
                if mr2 + mi2 > bailout:
                    break
                mi = 2.0 * mr * mi + iy
                mr = mr2 - mi2 + ix
                m_iter += 1
            if m_iter < max_iter:
                mag = math.sqrt(mr * mr + mi * mi) + 1e-9
                m_val = m_iter + 1.0 - math.log(math.log(mag) / log2 + 1e-9) / log2
            else:
                m_val = max_iter
            m_norm = m_val / max_iter

            interference = 0.5 + 0.5 * math.sin(q_freq * (ix + iy) * math.pi + q_phase)
            flow_band = 0.5 + 0.5 * math.sin(
                (ix * (5.0 + string_flow_strength * 5.0) + iy * (2.5 + diagonal_filament_strength * 6.0)) * math.pi
                + q_phase
            )
            accent_dist = math.sqrt((mx - accent_cx) * (mx - accent_cx) + (my - accent_cy) * (my - accent_cy))
            mand_mask = 1.0 - _smoothstep(accent_inner, accent_outer, accent_dist)
            mand_mask = _clamp01(mand_mask)
            mand_mask = mand_mask * mand_mask * mand_mask
            local_mandelbrot_weight = mandelbrot_weight * mand_mask * 0.55
            base_weight = max(0.0, 1.0 - julia_weight - local_mandelbrot_weight)
            fused = (
                j_norm * julia_weight
                + m_norm * local_mandelbrot_weight
                + flow_band * base_weight
            ) * (0.78 + 0.22 * interference)
            field[row + x] = fused

    def sample(fx: float, fy: float) -> float:
        if fx < 0.0:
            fx = 0.0
        elif fx > fw - 1:
            fx = fw - 1
        if fy < 0.0:
            fy = 0.0
        elif fy > fh - 1:
            fy = fh - 1
        x0 = int(fx)
        y0 = int(fy)
        x1 = x0 + 1 if x0 < fw - 1 else x0
        y1 = y0 + 1 if y0 < fh - 1 else y0
        tx = fx - x0
        ty = fy - y0
        a = field[y0 * fw + x0]
        b = field[y0 * fw + x1]
        c = field[y1 * fw + x0]
        d = field[y1 * fw + x1]
        top = a + (b - a) * tx
        bot = c + (d - c) * tx
        return top + (bot - top) * ty

    sx = (fw - 1) / max(1, width - 1)
    sy = (fh - 1) / max(1, height - 1)

    pixels = width * height
    buf = bytearray(pixels * 3)

    inv_w = 1.0 / max(1, width - 1)
    inv_h = 1.0 / max(1, height - 1)
    relief = 9.2

    for y in range(height):
        fy = y * sy
        ny = (y * inv_h - 0.5)
        i3 = y * width * 3
        for x in range(width):
            fx = x * sx
            v = sample(fx, fy)

            dx = (sample(fx - 1.0, fy) - sample(fx + 1.0, fy)) * relief
            dy = (sample(fx, fy - 1.0) - sample(fx, fy + 1.0)) * relief
            edge = min(1.0, math.sqrt(dx * dx + dy * dy) * 0.52)

            nx = (x * inv_w - 0.5)
            s_mask = _sierpinski_mask(nx, ny)
            k_mask = _koch_like_mask(nx, ny)
            grid = _quantum_grid(nx, ny, freq=7.0 + (phash % 7), phase=q_phase)
            geo = (s_mask * sierpinski_weight + k_mask * koch_weight + grid * grid_weight) * edge
            story_geo = _story_geometry(nx, ny, story_mode, q_phase, ring_bias, diamond_bias)
            texture = _texture_pattern(nx, ny, texture_style, texture_phase)
            diagonal_shimmer = 0.5 + 0.5 * math.sin((nx + ny) * math.pi * (22.0 + 10.0 * diagonal_filament_strength) + q_phase * 0.9)
            texture_layer = texture_mix * (0.48 + 0.34 * texture + 0.18 * diagonal_shimmer)
            metallic_edge = _clamp01(edge * (metal["outline_boost"] + metallic_outline_strength * (0.28 + 0.32 * texture + 0.12 * story_geo)))
            phase_drive = (
                story_phase_bias[0] * _smoothstep(0.0, 0.33, story_geo)
                + story_phase_bias[1] * _smoothstep(0.15, 0.55, story_geo)
                + story_phase_bias[2] * _smoothstep(0.35, 0.82, story_geo)
                + story_phase_bias[3] * _smoothstep(0.65, 1.0, story_geo)
            )
            electric_anchor = (0.56 + 0.28 * (0.5 + 0.5 * math.sin((story_geo * 3.4 + diagonal_shimmer * 1.7 + texture * 1.2) * math.pi))) % 1.0
            band_freq = 6.0 + 16.0 * detail_density
            t = v * band_freq + 0.22 * texture + 0.30 * story_geo + 0.18 * diagonal_shimmer
            frac = t - math.floor(t)
            dist = frac if frac < 0.5 else 1.0 - frac
            ridge = 1.0 - _smoothstep(0.02, 0.11, dist)

            hue = (
                base_hue * (1.0 - 0.34)
                + electric_anchor * 0.34
                + v * hue_span * (0.95 + palette_motion + 0.18 * texture)
                + story_geo * 0.08
                + texture * 0.04
                + diagonal_filament_strength * 0.02
                + ridge * 0.03
            ) % 1.0
            sat = min(1.0, max(0.0, sat_base + 0.14 * (1.0 - v) + geo * 0.05 + story_geo * 0.10 + 0.05 * diagonal_shimmer + ridge * 0.08 - metal["metal_desat"] * metallic_edge))
            val = _clamp01(
                brightness_floor
                + (0.20 + 0.48 * v + val_bias) * metal["background_dim"] * (0.88 + 0.10 * geo + 0.16 * texture_layer + 0.22 * story_geo)
                + ridge * (0.06 + 0.18 * metallic_edge)
            )

            r, g, b = _hsv_to_rgb(hue, sat, val)
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
            cool_metal = (0.46 + 0.30 * texture, 0.50 + 0.24 * texture, 0.58 + 0.18 * texture)
            rf *= 0.86 + 0.10 * texture_layer
            gf *= 0.88 + 0.10 * texture_layer
            bf *= 0.94 + 0.08 * texture_layer

            light = _clamp01(0.5 + 0.5 * ((dx * 0.72 - dy * 0.54) / (abs(dx) + abs(dy) + 1e-9)))
            specular = (metallic_edge ** 1.45) * (0.20 + metal["specular_strength"] * light + 0.14 * phase_drive)
            metal_blend = metallic_edge * (0.30 + 0.20 * texture + 0.24 * story_geo)

            rf = rf * (1.0 - metal_blend) + cool_metal[0] * metal_blend + specular * 0.90
            gf = gf * (1.0 - metal_blend) + cool_metal[1] * metal_blend + specular * 0.96
            bf = bf * (1.0 - metal_blend) + cool_metal[2] * metal_blend + specular * 1.08

            glow = (0.05 + 0.16 * geo + 0.12 * texture + 0.22 * story_geo + 0.08 * diagonal_shimmer) * (0.32 + 0.44 * v)
            rf += glow * 0.18
            gf += glow * 0.20
            bf += glow * 0.28

            rf = min(1.0, rf) ** gamma
            gf = min(1.0, gf) ** gamma
            bf = min(1.0, bf) ** gamma

            buf[i3] = 255 if rf >= 1.0 else int(rf * 255)
            buf[i3 + 1] = 255 if gf >= 1.0 else int(gf * 255)
            buf[i3 + 2] = 255 if bf >= 1.0 else int(bf * 255)
            i3 += 3

    return bytes(buf)


class FusionRequest(BaseModel):
    prompt: str
    strength: float = 0.75
    steps: int = 50
    seed: int = -1


class BrainRequest(BaseModel):
    prompt: Optional[str] = None
    steps: int = 8
    seed: int = -1
    mode: Literal["procedural", "diffusion", "auto"] = "procedural"
    randomize: bool = True
    realism: Literal["none", "photo"] = "none"
    size: int = 256


class BrainRouletteRequest(BaseModel):
    dataset_path: str
    steps: int = 2
    seed: int = -1
    size: int = 256
    outline: bool = True
    outline_style: Literal["color", "mono"] = "color"
    outline_thickness: int = 2


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = ""
    width: int = 512
    height: int = 512
    steps: int = 30
    seed: int = -1
    guidance_scale: float = 7.5
    quality: int = Field(default=MIN_QUALITY, ge=MIN_QUALITY, le=MAX_QUALITY)
    iterations: int = Field(default=DEFAULT_FRACTAL_ITERATIONS, ge=1)
    palette_index: int = 0
    rotation: float = 0.0
    zoom_level: float = Field(default=DEFAULT_ZOOM_LEVEL, ge=MIN_ZOOM_LEVEL)
    center_x: float = -0.15
    center_y: float = 0.0
    palette_profile: Optional[str] = None
    wormhole_strength: Optional[float] = None
    wormhole_swirl: Optional[float] = None
    wormhole_center_x: Optional[float] = None
    wormhole_center_y: Optional[float] = None
    sierpinski_weight: float = 0.10
    koch_weight: float = 0.08
    grid_weight: float = 0.12
    story_mode: str = "diamond_resonance"
    story_phase_bias: list[float] = Field(default_factory=lambda: [0.24, 0.28, 0.28, 0.20])
    mandelbrot_mode: str = "rare"
    mandelbrot_weight: float = 0.08
    julia_weight: float = 0.74
    ring_bias: float = 0.72
    diamond_bias: float = 0.72
    string_flow_strength: float = 0.68
    diagonal_filament_strength: float = 0.58
    texture_style: Optional[str] = None
    texture_mix: float = 0.62
    detail_density: float = 0.70
    brightness_floor: float = 0.36
    metallic_outline_strength: float = 0.58
    palette_motion: float = 0.58


@app.post("/generate")
async def generate_image(payload: GenerateRequest):
    REQUESTS.labels(endpoint="/generate").inc()
    start_time = time.time()
    job_id = str(uuid.uuid4())

    width = max(64, min(1536, int(payload.width) if payload.width else 512))
    height = max(64, min(1536, int(payload.height) if payload.height else 512))
    width, height = _cap_render_dims(width, height)

    seed = payload.seed if isinstance(payload.seed, int) and payload.seed != -1 else (abs(hash(payload.prompt)) % (2**31))

    rgb = fractal_fusion_rgb(
        width,
        height,
        payload.prompt,
        seed,
        quality=payload.quality,
        iterations=payload.iterations,
        palette_index=payload.palette_index,
        rotation=payload.rotation,
        zoom_level=payload.zoom_level,
        center_x=payload.center_x,
        center_y=payload.center_y,
        palette_profile=payload.palette_profile,
        wormhole_strength=payload.wormhole_strength,
        wormhole_swirl=payload.wormhole_swirl,
        wormhole_center_x=payload.wormhole_center_x,
        wormhole_center_y=payload.wormhole_center_y,
        sierpinski_weight=payload.sierpinski_weight,
        koch_weight=payload.koch_weight,
        grid_weight=payload.grid_weight,
        story_mode=payload.story_mode,
        story_phase_bias=payload.story_phase_bias,
        mandelbrot_weight=payload.mandelbrot_weight,
        julia_weight=payload.julia_weight,
        ring_bias=payload.ring_bias,
        diamond_bias=payload.diamond_bias,
        string_flow_strength=payload.string_flow_strength,
        diagonal_filament_strength=payload.diagonal_filament_strength,
        texture_style=payload.texture_style,
        texture_mix=payload.texture_mix,
        detail_density=payload.detail_density,
        brightness_floor=payload.brightness_floor,
        metallic_outline_strength=payload.metallic_outline_strength,
        palette_motion=payload.palette_motion,
    )

    filename = f"gen_{job_id}_{width}x{height}.png"
    out_path = os.path.join("uploads", filename)
    write_png_rgb(out_path, width, height, rgb)
    image_url = f"/uploads/{filename}"

    latency = time.time() - start_time
    LATENCY.labels(device="mock_cpu").observe(latency)
    return {
        "success": True,
        "imageUrl": image_url,
        "meta": {
            "provider": "fusion-multi-fractal-wormhole",
            "latency": latency,
            "seed": seed,
            "width": width,
            "height": height,
            "palette_profile": payload.palette_profile,
            "texture_style": _texture_style_for_seed(seed),
            "wormhole": {
                "strength": payload.wormhole_strength,
                "swirl": payload.wormhole_swirl,
                "center_x": payload.wormhole_center_x,
                "center_y": payload.wormhole_center_y,
            },
            "layers": {
                "sierpinski_weight": payload.sierpinski_weight,
                "koch_weight": payload.koch_weight,
                "grid_weight": payload.grid_weight,
            },
            "narrative_settings": {
                "story_mode": payload.story_mode,
                "story_phase_bias": payload.story_phase_bias,
                "mandelbrot_mode": payload.mandelbrot_mode,
                "mandelbrot_weight": payload.mandelbrot_weight,
                "julia_weight": payload.julia_weight,
                "ring_bias": payload.ring_bias,
                "diamond_bias": payload.diamond_bias,
                "string_flow_strength": payload.string_flow_strength,
                "diagonal_filament_strength": payload.diagonal_filament_strength,
                "texture_style": payload.texture_style,
                "texture_mix": payload.texture_mix,
                "detail_density": payload.detail_density,
                "brightness_floor": payload.brightness_floor,
                "metallic_outline_strength": payload.metallic_outline_strength,
                "palette_motion": payload.palette_motion,
            },
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok", "device": "mock_cpu", "timestamp": time.time()}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/")
async def root():
    return RedirectResponse(url="/uploads")


@app.post("/fuse")
async def fuse(
    background_tasks: BackgroundTasks,
    payload: str = Form(...),
    files: list[UploadFile] = File(...),
):
    REQUESTS.labels(endpoint="/fuse").inc()
    job_id = str(uuid.uuid4())
    try:
        request_data = json.loads(payload)
        _ = FusionRequest(**request_data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid request format: {e}")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    jobs[job_id] = {"status": "upload_start", "progress": 0, "result": None, "error": None}
    for file in files:
        content = await file.read()
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File {file.filename} too large")
    jobs[job_id]["status"] = "queued"
    jobs[job_id]["progress"] = 0.2
    return {"jobId": job_id}


def _open_image_or_400(data: bytes):
    if Image is None:
        raise HTTPException(status_code=500, detail="pillow_missing")
    try:
        img = Image.open(BytesIO(data))
        img = img.convert("RGB")
        return img
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_image")


@app.post("/brain/img2img")
async def brain_img2img(
    prompt: str = Form(...),
    seed: str = Form("-1"),
    steps: str = Form("6"),
    strength: str = Form("0.55"),
    size: str = Form("256"),
    realism: str = Form("none"),
    file: UploadFile = File(...),
):
    REQUESTS.labels(endpoint="/brain/img2img").inc()
    seed_int = int(seed) if seed.strip().lstrip("-").isdigit() else -1
    seed_final = seed_int if seed_int != -1 else (abs(hash(prompt)) % (2**31))
    rng = random.Random(seed_final)

    content = await file.read()
    img = _open_image_or_400(content)
    out_size = max(64, min(1024, int(size) if size.isdigit() else 256))
    img = img.resize((out_size, out_size))

    if ImageFilter is not None:
        if realism == "photo":
            img = img.filter(ImageFilter.DETAIL)
        else:
            img = img.filter(ImageFilter.EDGE_ENHANCE_MORE)

    if ImageDraw is not None:
        d = ImageDraw.Draw(img)
        for _ in range(5):
            x0 = rng.randint(0, out_size - 1)
            y0 = rng.randint(0, out_size - 1)
            x1 = min(out_size - 1, x0 + rng.randint(out_size // 10, out_size // 3))
            y1 = min(out_size - 1, y0 + rng.randint(out_size // 10, out_size // 3))
            d.rectangle([x0, y0, x1, y1], outline=(255, 255, 255), width=1)

    buf = BytesIO()
    img.save(buf, format="PNG")
    body = buf.getvalue()
    return Response(content=body, media_type="image/png")


@app.post("/brain/roulette")
async def brain_roulette(payload: BrainRouletteRequest):
    REQUESTS.labels(endpoint="/brain/roulette").inc()
    if Image is None:
        raise HTTPException(status_code=500, detail="pillow_missing")

    rng_seed = payload.seed if payload.seed != -1 else (abs(hash(payload.dataset_path)) % (2**31))
    rng = random.Random(rng_seed)
    size = max(64, min(1024, int(payload.size)))
    img = Image.new("RGB", (size, size), (210, 230, 255))
    d = ImageDraw.Draw(img)
    for _ in range(8):
        x0 = rng.randint(0, size - 1)
        y0 = rng.randint(0, size - 1)
        x1 = min(size - 1, x0 + rng.randint(size // 12, size // 2))
        y1 = min(size - 1, y0 + rng.randint(size // 12, size // 2))
        col = (245, 245, 245) if payload.outline_style == "mono" else (240, 250, 255)
        d.rectangle([x0, y0, x1, y1], outline=col, width=max(1, payload.outline_thickness))

    buf = BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")
