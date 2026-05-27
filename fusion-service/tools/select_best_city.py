import glob
import os

import numpy as np
from PIL import Image


def main():
    dataset = os.environ.get("DATASET_PATH", "/Users/Administrator/Datasets/utopian_clean_city/images")
    exts = ("*.png", "*.jpg", "*.jpeg", "*.webp", "*.PNG", "*.JPG", "*.JPEG", "*.WEBP")

    paths = []
    for e in exts:
        paths.extend(glob.glob(os.path.join(dataset, "**", e), recursive=True))

    best = None
    for p in paths:
        try:
            img = Image.open(p).convert("RGB").resize((160, 160), Image.Resampling.BICUBIC)
        except Exception:
            continue

        arr = np.asarray(img).astype(np.float32) / 255.0
        gray = (0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]).astype(np.float32)
        gx = np.zeros_like(gray)
        gy = np.zeros_like(gray)
        gx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
        gy[1:-1, :] = gray[2:, :] - gray[:-2, :]
        mag = np.sqrt(gx * gx + gy * gy)

        top = arr[:40, :, :]
        top_gray = gray[:40, :]
        top_mag = mag[:40, :]
        sky_mask = (
            (top_gray > 0.55)
            & (top[:, :, 2] > top[:, :, 1] + 0.03)
            & (top[:, :, 2] > top[:, :, 0] + 0.03)
            & (top_mag < 0.10)
        )
        sky = float(sky_mask.mean())

        mid = arr[45:125, :, :]
        mid_gray = gray[45:125, :]
        mid_mag = mag[45:125, :]
        mid_sat = (mid.max(axis=2) - mid.min(axis=2)) / (mid.max(axis=2) + 1e-8)
        build_mask = (mid_gray > 0.45) & (mid_sat < 0.35) & (mid_mag > 0.08)
        bld = float(build_mask.mean())

        vert = float((np.abs(gx[45:125, :]) > 0.10).mean())
        br = float(gray.mean())
        score = sky * 1.2 + bld * 1.6 + vert * 0.8 + br * 0.2

        if best is None or score > best[0]:
            best = (score, p, sky, bld, vert, br)

    if best is None:
        raise SystemExit("no_images_found")

    score, path, sky, bld, vert, br = best
    print(path)
    print(f"score={score:.4f} sky={sky:.4f} bld={bld:.4f} vert={vert:.4f} br={br:.4f}")


if __name__ == "__main__":
    main()
