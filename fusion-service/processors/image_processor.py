import os
import torch
import numpy as np
import uuid
import time
from PIL import Image
from typing import List, Tuple
from fastapi import UploadFile, HTTPException
import clip

class ImageProcessor:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, self.preprocess = clip.load("ViT-B/32", device=self.device)
        os.makedirs(upload_dir, exist_ok=True)

    async def process_uploads(self, file_paths: List[str]) -> List[str]:
        processed_paths = []
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
            with torch.no_grad():
                image_input = self.preprocess(img).unsqueeze(0).to(self.device)
                image_features = self.model.encode_image(image_input)
                torch.save(image_features, os.path.join(self.upload_dir, f"clip_{os.path.basename(file_path)}.pt"))

            # Save 512x512 normalized tensor
            img_np = np.array(img_512).astype(np.float32) / 255.0
            torch.save(torch.from_numpy(img_np), tensor_path)
            
            processed_paths.append(tensor_path)
            
        return processed_paths

    def compute_clip_similarity(self, image: Image.Image, text: str) -> float:
        with torch.no_grad():
            image_input = self.preprocess(image).unsqueeze(0).to(self.device)
            text_input = clip.tokenize([text]).to(self.device)
            
            image_features = self.model.encode_image(image_input)
            text_features = self.model.encode_text(text_input)
            
            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
            similarity = (image_features @ text_features.T).item()
        return similarity
