import pytest
import torch
import numpy as np
from PIL import Image, ImageDraw
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

def test_brain_generator_deterministic():
    trainer = FusionTrainer()
    img1, meta1 = trainer.brain_generate(prompt="test idea", seed=123, mode="procedural", randomize=False, size=256)
    img2, meta2 = trainer.brain_generate(prompt="test idea", seed=123, mode="procedural", randomize=False, size=256)
    assert meta1["seed"] == meta2["seed"] == 123
    assert meta1["emotion"] == meta2["emotion"]
    assert img1.size == img2.size == (256, 256)
    assert img1.tobytes() == img2.tobytes()

def test_brain_photo_realism_deterministic():
    trainer = FusionTrainer()
    img1, _ = trainer.brain_generate(prompt="utopian city", seed=456, mode="procedural", randomize=False, realism="photo", size=256)
    img2, _ = trainer.brain_generate(prompt="utopian city", seed=456, mode="procedural", randomize=False, realism="photo", size=256)
    assert img1.tobytes() == img2.tobytes()

def test_tshirt_mockup_shape():
    processor = ImageProcessor(upload_dir="tests/tmp_uploads")
    design = Image.fromarray(np.uint8(np.random.rand(256, 256, 3) * 255))
    mockup = processor.create_tshirt_mockup(design, canvas_size=512)
    assert mockup.size == (512, 512)

def test_style_memory_fit_and_bias():
    trainer = FusionTrainer()
    os.makedirs("tests/tmp_style", exist_ok=True)

    for i in range(3):
        img = Image.new("RGB", (256, 256), (235, 245, 255))
        arr = np.asarray(img).copy()
        arr[:140, :, 2] = 255
        arr[160:, :, 1] = 220
        arr[160:, :, 0] = 160
        arr[160:, :, 2] = 160
        arr[110:210, 40:210, :] = (245, 245, 245)
        Image.fromarray(arr).save(f"tests/tmp_style/{i}.png")

    result = trainer.fit_style_memory(
        dataset_path="tests/tmp_style",
        style_name="utopian_clean_city",
        limit=3,
        resize=64,
        save_path="tests/tmp_style/style_memory.json",
    )
    assert result["style_name"] == "utopian_clean_city"
    assert trainer.style_memory is not None
    assert trainer.style_memory.sample_count == 3

    img_out, meta = trainer.brain_generate(prompt=None, seed=321, mode="procedural", randomize=True, size=256)
    assert img_out.size == (256, 256)
    assert "style" in meta["idea"]

    os.makedirs("tests/tmp_shape", exist_ok=True)
    for i in range(4):
        img = Image.new("RGB", (256, 256), (235, 245, 255))
        d = ImageDraw.Draw(img)
        base_y = 180
        x = 12
        while x < 244:
            w = 18 + (i * 3) + (x % 7)
            h = 40 + ((x * 13) % 70)
            d.rectangle([x, base_y - h, x + w, base_y], fill=(245, 245, 245))
            cols = max(3, w // 5)
            rows = max(5, h // 9)
            for cx in range(cols):
                for cy in range(rows):
                    if (cx + cy + i) % 4 == 0:
                        continue
                    wx0 = x + 2 + int(cx * (w / cols))
                    wy0 = base_y - h + 2 + int(cy * (h / rows))
                    wx1 = min(x + w - 2, wx0 + 2)
                    wy1 = min(base_y - 2, wy0 + 3)
                    d.rectangle([wx0, wy0, wx1, wy1], fill=(200, 225, 255))
            x += w + 6
        img.save(f"tests/tmp_shape/{i}.png")

    shape_res = trainer.fit_shape_memory(
        dataset_path="tests/tmp_shape",
        style_name="utopian_clean_city",
        limit=4,
        resize=128,
        save_path="tests/tmp_shape/shape_memory.json",
    )
    assert shape_res["style_name"] == "utopian_clean_city"
    assert trainer.shape_memory is not None
    assert trainer.shape_memory.sample_count == 4

    _, meta2 = trainer.brain_generate(prompt="utopian city", seed=999, mode="procedural", randomize=True, size=256)
    assert meta2["shapeMemoryLoaded"] is True
