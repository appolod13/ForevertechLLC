import os
import math
import torch
import numpy as np
import uuid
import time
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps
from typing import List, Tuple
from fastapi import UploadFile, HTTPException
from hashlib import blake2b

try:
    import clip
except Exception:
    clip = None

class ImageProcessor:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.preprocess = None
        os.makedirs(upload_dir, exist_ok=True)

    def _ensure_clip(self):
        if self.model is not None and self.preprocess is not None:
            return
        if clip is None:
            self.model = None
            self.preprocess = None
            return

        try:
            self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)
        except Exception:
            self.model = None
            self.preprocess = None

    async def process_uploads(self, file_paths: List[str]) -> List[torch.Tensor]:
        processed_tensors: List[torch.Tensor] = []
        for file_path in file_paths:
            # 1. Validation (≤20 MB, JPG/PNG/WebP)
            with open(file_path, "rb") as f:
                content = f.read()
            if len(content) > 20 * 1024 * 1024:
                raise HTTPException(status_code=400, detail=f"File {os.path.basename(file_path)} too large")
            
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
                raise HTTPException(status_code=400, detail=f"File {os.path.basename(file_path)} unsupported format")

            # 2. Save original (already saved by main.py)
            orig_path = file_path

            # 3. Resize and Normalize (512x512)
            img = Image.open(orig_path).convert("RGB")
            img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
            tensor_path = os.path.join(self.upload_dir, f"tensor_{os.path.basename(file_path)}.pt")
            
            # 4. Compute CLIP embeddings
            self._ensure_clip()
            if self.model is not None and self.preprocess is not None:
                with torch.no_grad():
                    image_input = self.preprocess(img_512).unsqueeze(0).to(self.device)
                    image_features = self.model.encode_image(image_input)
                    torch.save(image_features, os.path.join(self.upload_dir, f"clip_{os.path.basename(file_path)}.pt"))

            # Save 512x512 normalized tensor
            img_np = np.array(img_512).astype(np.float32) / 255.0
            tensor = torch.from_numpy(img_np).permute(2, 0, 1).contiguous()
            torch.save(tensor, tensor_path)
            
            processed_tensors.append(tensor)
            
        return processed_tensors

    def compute_clip_similarity(self, image: Image.Image, text: str) -> float:
        self._ensure_clip()
        if self.model is not None and self.preprocess is not None and clip is not None:
            with torch.no_grad():
                image_input = self.preprocess(image).unsqueeze(0).to(self.device)
                text_input = clip.tokenize([text]).to(self.device)

                image_features = self.model.encode_image(image_input)
                text_features = self.model.encode_text(text_input)

                image_features /= image_features.norm(dim=-1, keepdim=True)
                text_features /= text_features.norm(dim=-1, keepdim=True)

                similarity = (image_features @ text_features.T).item()
            return float(similarity)

        img = image.convert("RGB").resize((64, 64), Image.Resampling.BILINEAR)
        img_np = (np.asarray(img).astype(np.float32) / 255.0).reshape(-1, 3)
        img_feat = img_np.mean(axis=0)

        h = blake2b(text.encode("utf-8"), digest_size=24).digest()
        txt_feat = np.frombuffer(h, dtype=np.uint8).astype(np.float32)
        txt_feat = txt_feat.reshape(3, 8).mean(axis=1)
        txt_feat = txt_feat / (np.linalg.norm(txt_feat) + 1e-8)
        img_feat = img_feat / (np.linalg.norm(img_feat) + 1e-8)

        similarity = float(np.clip(np.dot(img_feat, txt_feat), -1.0, 1.0))
        return similarity

    def create_tshirt_mockup(
        self,
        design: Image.Image,
        canvas_size: int = 1024,
        shirt_color: Tuple[int, int, int] = (245, 245, 245),
        background_color: Tuple[int, int, int] = (245, 246, 248),
    ) -> Image.Image:
        w = canvas_size
        h = canvas_size
        cx = w // 2

        base = Image.new("RGBA", (w, h), (*background_color, 255))
        vignette = Image.new("L", (w, h), 0)
        vdraw = ImageDraw.Draw(vignette)
        for i in range(18):
            a = int(8 + i * 3)
            inset = int(i * w * 0.02)
            vdraw.ellipse([inset, inset, w - inset, h - inset], outline=a, width=2)
        vignette = vignette.filter(ImageFilter.GaussianBlur(radius=int(w * 0.05)))
        vignette_rgba = Image.new("RGBA", (w, h), (0, 0, 0, 40))
        vignette_rgba.putalpha(vignette)
        base = Image.alpha_composite(base, vignette_rgba)

        mask = Image.new("L", (canvas_size, canvas_size), 0)
        mask_draw = ImageDraw.Draw(mask)
        body_top = int(h * 0.19)
        body_bottom = int(h * 0.90)
        body_w = int(w * 0.52)
        body_h = body_bottom - body_top
        body_l = cx - body_w // 2
        body_r = cx + body_w // 2
        radius = int(w * 0.06)
        mask_draw.rounded_rectangle([body_l, body_top, body_r, body_bottom], radius=radius, fill=255)

        sleeve_top = int(h * 0.24)
        sleeve_mid = int(h * 0.36)
        sleeve_w = int(w * 0.19)
        sleeve_out = int(w * 0.08)

        left_sleeve = [
            (body_l, sleeve_top),
            (body_l - sleeve_w, sleeve_mid),
            (body_l - sleeve_w + sleeve_out, sleeve_mid + int(h * 0.09)),
            (body_l + int(w * 0.03), sleeve_mid + int(h * 0.05)),
        ]
        right_sleeve = [
            (body_r, sleeve_top),
            (body_r + sleeve_w, sleeve_mid),
            (body_r + sleeve_w - sleeve_out, sleeve_mid + int(h * 0.09)),
            (body_r - int(w * 0.03), sleeve_mid + int(h * 0.05)),
        ]
        mask_draw.polygon(left_sleeve, fill=255)
        mask_draw.polygon(right_sleeve, fill=255)

        neck_w = int(w * 0.20)
        neck_h = int(h * 0.10)
        neck_y = int(h * 0.14)
        mask_draw.ellipse([cx - neck_w // 2, neck_y, cx + neck_w // 2, neck_y + neck_h], fill=0)

        mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))
        mask = mask.point(lambda p: 255 if p > 96 else 0)

        shirt_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

        shirt_fill = Image.new("RGBA", (canvas_size, canvas_size), (*shirt_color, 255))
        shirt_fill.putalpha(mask)
        shirt_layer = Image.alpha_composite(shirt_layer, shirt_fill)

        shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shade)
        for i in range(24):
            a = int(40 - i)
            inset = int(i * w * 0.01)
            sdraw.rounded_rectangle(
                [body_l + inset, body_top + inset, body_r - inset, body_bottom - inset],
                radius=max(2, radius - inset),
                outline=(0, 0, 0, max(0, a)),
                width=2,
            )
        shade = shade.filter(ImageFilter.GaussianBlur(radius=int(w * 0.02)))
        shade.putalpha(ImageChops.multiply(shade.split()[-1], mask))
        shirt_layer = Image.alpha_composite(shirt_layer, shade)

        highlight = Image.new("RGBA", (w, h), (255, 255, 255, 0))
        hdraw = ImageDraw.Draw(highlight)
        for i in range(18):
            a = int(55 - i * 2)
            inset = int(i * w * 0.012)
            hdraw.ellipse(
                [body_l + inset - int(w * 0.08), body_top + inset - int(h * 0.05), cx + int(w * 0.08), body_bottom - int(h * 0.22) - inset],
                fill=(255, 255, 255, max(0, a)),
            )
        highlight = highlight.filter(ImageFilter.GaussianBlur(radius=int(w * 0.03)))
        hl_alpha = ImageChops.multiply(highlight.split()[-1], mask)
        highlight.putalpha(hl_alpha)
        shirt_layer = Image.alpha_composite(shirt_layer, highlight)

        collar = Image.new("L", (w, h), 0)
        cdraw = ImageDraw.Draw(collar)
        outer = [cx - int(neck_w * 0.62), neck_y + int(neck_h * 0.16), cx + int(neck_w * 0.62), neck_y + int(neck_h * 1.08)]
        inner = [cx - int(neck_w * 0.50), neck_y + int(neck_h * 0.25), cx + int(neck_w * 0.50), neck_y + int(neck_h * 0.98)]
        cdraw.ellipse(outer, fill=255)
        cdraw.ellipse(inner, fill=0)
        collar = collar.filter(ImageFilter.GaussianBlur(radius=1.5))
        collar_rgba = Image.new("RGBA", (w, h), (220, 220, 225, 100))
        collar_rgba.putalpha(ImageChops.multiply(collar, mask))
        shirt_layer = Image.alpha_composite(shirt_layer, collar_rgba)

        noise = (np.random.rand(128, 128) * 255).astype(np.uint8)
        noise_img = Image.fromarray(noise, mode="L").resize((w, h), Image.Resampling.BICUBIC)
        noise_img = noise_img.filter(ImageFilter.GaussianBlur(radius=0.6))
        texture = Image.new("RGBA", (w, h), (255, 255, 255, 0))
        texture.putalpha(ImageChops.multiply(noise_img.point(lambda p: int(p * 0.08)), mask))
        shirt_layer = Image.alpha_composite(shirt_layer, texture)

        yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
        xx = np.linspace(-1.0, 1.0, w, dtype=np.float32)[None, :]
        center_w = np.exp(-(xx**2) * 2.4).astype(np.float32)

        fold1 = np.sin((yy * 1.6 + 0.12) * np.pi * 2.0) * np.exp(-((yy - 0.50) / 0.17) ** 2)
        fold2 = np.sin((yy * 2.6 + 0.33) * np.pi * 2.0) * np.exp(-((yy - 0.70) / 0.22) ** 2)
        fold3 = np.sin((yy * 3.4 + 0.77) * np.pi * 2.0) * np.exp(-((yy - 0.33) / 0.12) ** 2)
        foldx = np.sin(((xx * 2.6) + (yy * 0.8) + 0.15) * np.pi * 2.0) * np.exp(-((yy - 0.62) / 0.34) ** 2) * np.exp(-(xx**2) * 1.2)
        fold = (0.90 * fold1 + 0.75 * fold2 + 0.55 * fold3 + 0.22 * foldx) * center_w
        fold = np.clip(fold, -1.0, 1.0)

        fold_dark = np.clip(-fold, 0.0, 1.0)
        fold_light = np.clip(fold, 0.0, 1.0)

        mask_np = np.asarray(mask).astype(np.float32) / 255.0
        dark_a = (fold_dark * 58.0 * mask_np).astype(np.uint8)
        light_a = (fold_light * 48.0 * mask_np).astype(np.uint8)

        dark_img = Image.fromarray(dark_a, mode="L").filter(ImageFilter.GaussianBlur(radius=int(w * 0.02)))
        light_img = Image.fromarray(light_a, mode="L").filter(ImageFilter.GaussianBlur(radius=int(w * 0.02)))

        dark_rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        dark_rgba.putalpha(dark_img)
        light_rgba = Image.new("RGBA", (w, h), (255, 255, 255, 0))
        light_rgba.putalpha(light_img)

        shirt_layer = Image.alpha_composite(shirt_layer, dark_rgba)
        shirt_layer = Image.alpha_composite(shirt_layer, light_rgba)

        design_rgba = design.convert("RGBA")
        target = int(w * 0.34)
        design_rgba = ImageOps.fit(design_rgba, (target, target), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        print_mask = Image.new("L", (target, target), 0)
        pm = ImageDraw.Draw(print_mask)
        pm.rounded_rectangle([0, 0, target - 1, target - 1], radius=int(target * 0.07), fill=255)
        alpha = design_rgba.getchannel("A")
        alpha = ImageChops.multiply(alpha, print_mask)
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=0.8))
        design_rgba.putalpha(alpha)

        chest_x = cx - (target // 2)
        chest_y = int(h * 0.44) - (target // 2)

        design_shadow = design_rgba.split()[-1].filter(ImageFilter.GaussianBlur(radius=6))
        shadow_blob = Image.new("RGBA", design_rgba.size, (0, 0, 0, 40))
        shadow_blob.putalpha(design_shadow)
        shirt_layer.paste(shadow_blob, (chest_x + 3, chest_y + 6), shadow_blob)
        shirt_layer.paste(design_rgba, (chest_x, chest_y), design_rgba)

        drop = mask.filter(ImageFilter.GaussianBlur(radius=int(w * 0.032)))
        drop_rgba = Image.new("RGBA", (w, h), (0, 0, 0, 92))
        drop_rgba.putalpha(drop)
        drop_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        drop_layer.paste(drop_rgba, (0, int(h * 0.022)), drop_rgba)
        base = Image.alpha_composite(base, drop_layer)

        base = Image.alpha_composite(base, shirt_layer)
        return base.convert("RGB")
