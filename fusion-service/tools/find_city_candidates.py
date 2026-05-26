import glob
import os

import numpy as np
from PIL import Image


def score_image(img: Image.Image) -> tuple[float, dict]:
    img = img.convert("RGB").resize((192, 192), Image.Resampling.BICUBIC)
    arr = np.asarray(img).astype(np.float32) / 255.0
    gray = (0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]).astype(np.float32)

    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    gx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    gy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    mag = np.sqrt(gx * gx + gy * gy)

    top = arr[:48, :, :]
    top_gray = gray[:48, :]
    top_mag = mag[:48, :]
    sky_mask = (
        (top_gray > 0.50)
        & (top[:, :, 2] > top[:, :, 1] + 0.02)
        & (top[:, :, 2] > top[:, :, 0] + 0.02)
        & (top_mag < 0.12)
    )
    sky = float(sky_mask.mean())

    mid = arr[55:155, :, :]
    mid_gray = gray[55:155, :]
    mid_mag = mag[55:155, :]
    mid_sat = (mid.max(axis=2) - mid.min(axis=2)) / (mid.max(axis=2) + 1e-8)
    build_mask = (mid_gray > 0.25) & (mid_sat < 0.55) & (mid_mag > 0.12)
    bld = float(build_mask.mean())

    vert = float((np.abs(gx[55:155, :]) > 0.12).mean())
    br = float(gray.mean())

    green = arr[:, :, 1]
    green_dom = float(((green > arr[:, :, 0] + 0.05) & (green > arr[:, :, 2] + 0.05)).mean())
    nongreen = 1.0 - green_dom

    edge_total = float((mag > 0.10).mean())
    edge_var = float(mag.var())

    score = sky * 1.0 + bld * 1.3 + vert * 1.2 + edge_total * 0.8 + edge_var * 0.8 + br * 0.15 + nongreen * 0.25
    return score, {
        "sky": sky,
        "bld": bld,
        "vert": vert,
        "edge": edge_total,
        "var": edge_var,
        "br": br,
        "nongreen": nongreen,
    }


def main():
    dataset = os.environ.get("DATASET_PATH", "/Users/Administrator/Datasets/utopian_clean_city/images")
    exts = ("*.png", "*.jpg", "*.jpeg", "*.webp", "*.PNG", "*.JPG", "*.JPEG", "*.WEBP")
    paths = []
    for e in exts:
        paths.extend(glob.glob(os.path.join(dataset, "**", e), recursive=True))

    cands = []
    for p in paths:
        try:
            img = Image.open(p)
        except Exception:
            continue
        sc, parts = score_image(img)
        cands.append((sc, p, parts))

    cands.sort(reverse=True, key=lambda x: x[0])
    top_n = int(os.environ.get("TOP_N", "15"))
    for sc, p, parts in cands[:top_n]:
        print(
            f"{sc:.4f}\t{os.path.basename(p)}\tsky={parts['sky']:.3f}\tbld={parts['bld']:.3f}\tvert={parts['vert']:.3f}\tedge={parts['edge']:.3f}\tbr={parts['br']:.3f}\tng={parts['nongreen']:.3f}\t{p}"
        )


if __name__ == "__main__":
    main()
