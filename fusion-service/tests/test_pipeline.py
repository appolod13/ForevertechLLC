import pytest
import torch
import numpy as np
from PIL import Image
import os
from processors.image_processor import ImageProcessor
from trainer.fusion_trainer import FusionTrainer

def test_image_preprocessing():
    processor = ImageProcessor(upload_dir="tests/tmp_uploads")
    # Create a dummy image
    img = Image.fromarray(np.uint8(np.random.rand(100, 100, 3) * 255))
    img_path = "tests/tmp_uploads/test.png"
    os.makedirs("tests/tmp_uploads", exist_ok=True)
    img.save(img_path)
    
    # Test normalization and resizing
    img_loaded = Image.open(img_path).convert("RGB")
    img_512 = img_loaded.resize((512, 512))
    img_np = np.array(img_512).astype(np.float32) / 255.0
    
    assert img_np.shape == (512, 512, 3)
    assert img_np.max() <= 1.0
    assert img_np.min() >= 0.0

def test_quantum_sampling():
    trainer = FusionTrainer()
    latents = trainer.superposition_sampling("test prompt", num_samples=4)
    assert latents.shape[0] == 4
    assert latents.device.type in ["cuda", "cpu"]

def test_clip_similarity():
    processor = ImageProcessor()
    img = Image.fromarray(np.uint8(np.random.rand(512, 512, 3) * 255))
    score = processor.compute_clip_similarity(img, "a random image")
    assert isinstance(score, float)
    assert -1.0 <= score <= 1.0

@pytest.mark.asyncio
async def test_training_loop_step():
    trainer = FusionTrainer()
    lr = trainer.get_wolfram_lr(0, 300)
    assert lr > 0
    assert lr <= 1e-4
