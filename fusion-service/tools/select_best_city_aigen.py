import glob
import os

import numpy as np
from PIL import Image


def main():
    dataset = os.environ.get("DATASET_PATH", "/Users/Administrator/Datasets/utopian_clean_city/images")
    paths = glob.glob(os.path.join(dataset, "ai-gen-*.png"))
    paths.sort()

    cands = []
    for p in paths:
        try:
            img = Image.open(p).convert("RGB").resize((192, 192), Image.Resampling.BICUBIC)
        except Exception:
            continue

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
            (top_gray > 0.55)
            & (top[:, :, 2] > top[:, :, 1] + 0.02)
            & (top[:, :, 2] > top[:, :, 0] + 0.02)
            & (top_mag < 0.12)
        )
        sky = float(sky_mask.mean())

        mid = arr[50:150, :, :]
        mid_gray = gray[50:150, :]
        mid_mag = mag[50:150, :]
        mid_sat = (mid.max(axis=2) - mid.min(axis=2)) / (mid.max(axis=2) + 1e-8)
        build_mask = (mid_gray > 0.35) & (mid_sat < 0.45) & (mid_mag > 0.10)
        bld = float(build_mask.mean())

        vert = float((np.abs(gx[50:150, :]) > 0.12).mean())
        br = float(gray.mean())

        green = arr[:, :, 1]
        nongreen = float(((green < (arr[:, :, 0] + 0.04)) & (green < (arr[:, :, 2] + 0.04))).mean())

        score = sky * 1.0 + bld * 1.6 + vert * 1.0 + br * 0.25 + nongreen * 0.5
        cands.append((score, p, sky, bld, vert, br, nongreen))

    if not cands:
        raise SystemExit("no_ai_gen_images_found")

    cands.sort(reverse=True)
    best = cands[0]
    score, path, sky, bld, vert, br, nongreen = best
    print(path)
    print(f"score={score:.4f} sky={sky:.4f} bld={bld:.4f} vert={vert:.4f} br={br:.4f} nongreen={nongreen:.4f}")

    top_n = int(os.environ.get("TOP_N", "5"))
    for (s, p, sky, bld, vert, br, ng) in cands[:top_n]:
        print(f"{s:.4f}\t{os.path.basename(p)}\tsky={sky:.3f}\tbld={bld:.3f}\tvert={vert:.3f}\tbr={br:.3f}\tng={ng:.3f}")


if __name__ == "__main__":
    main()
