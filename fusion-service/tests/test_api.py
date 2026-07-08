
import pytest
from fastapi.testclient import TestClient
from main import app
import main as fusion_main
import json
from io import BytesIO
from PIL import Image
from PIL import ImageDraw
import os

client = TestClient(app)

@pytest.fixture
def mock_image():
    """Creates a mock image file for testing uploads."""
    return ("test.jpg", BytesIO(b"fake image data"), "image/jpeg")

def test_fuse_endpoint_valid_request(mock_image):
    """Tests the /fuse endpoint with a valid request."""
    request_data = {"prompt": "a futuristic robot", "strength": 0.8, "steps": 40}
    response = client.post(
        "/fuse",
        data={"payload": json.dumps(request_data)},
        files={"files": mock_image}
    )
    assert response.status_code == 200
    assert "jobId" in response.json()

def test_fuse_endpoint_malformed_json(mock_image):
    """Tests the /fuse endpoint with malformed JSON."""
    response = client.post(
        "/fuse",
        data={"payload": '{"prompt":"test"'}, # Missing closing brace
        files={"files": mock_image}
    )
    assert response.status_code == 400
    assert "Invalid request format" in response.json()["detail"]

def test_fuse_endpoint_missing_prompt(mock_image):
    """Tests validation when the 'prompt' field is missing."""
    request_data = {"strength": 0.75, "steps": 50}
    response = client.post(
        "/fuse",
        data={"payload": json.dumps(request_data)},
        files={"files": mock_image}
    )
    assert response.status_code == 400
    assert "Field required" in response.json()["detail"]

def test_fuse_endpoint_incorrect_data_type(mock_image):
    """Tests validation when a field has an incorrect data type."""
    request_data = {"prompt": "a test", "strength": "high", "steps": 50} # strength should be a float
    response = client.post(
        "/fuse",
        data={"payload": json.dumps(request_data)},
        files={"files": mock_image}
    )
    assert response.status_code == 400
    assert "Input should be a valid number" in response.json()["detail"]

def test_health_endpoint():
    """Tests the /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_generate_endpoint_forwards_render_params_to_fractal_fusion(monkeypatch):
    captured = {}

    def fake_fractal_fusion_rgb(width, height, prompt, seed, **kwargs):
        captured["width"] = width
        captured["height"] = height
        captured["prompt"] = prompt
        captured["seed"] = seed
        captured["kwargs"] = kwargs
        return b"\x00" * (width * height * 3)

    monkeypatch.setattr(fusion_main, "fractal_fusion_rgb", fake_fractal_fusion_rgb)

    payload = {
        "prompt": "parameter test",
        "width": 128,
        "height": 128,
        "seed": 321,
        "quality": 3,
        "iterations": 222,
        "palette_index": 5,
        "rotation": 27.5,
        "zoom_level": 0.9,
        "center_x": -0.42,
        "center_y": 0.18,
    }
    response = client.post("/generate", json=payload)
    assert response.status_code == 200

    assert captured["kwargs"]["quality"] == 3
    assert captured["kwargs"]["iterations"] == 222
    assert captured["kwargs"]["palette_index"] == 5
    assert captured["kwargs"]["rotation"] == 27.5
    assert captured["kwargs"]["zoom_level"] == 0.9
    assert captured["kwargs"]["center_x"] == -0.42
    assert captured["kwargs"]["center_y"] == 0.18

def test_fractal_fusion_rgb_render_params_change_output():
    base = fusion_main.fractal_fusion_rgb(48, 48, "same prompt", 123)
    quality_variant = fusion_main.fractal_fusion_rgb(48, 48, "same prompt", 123, quality=2)
    rotation_variant = fusion_main.fractal_fusion_rgb(48, 48, "same prompt", 123, rotation=22.0)
    modified = fusion_main.fractal_fusion_rgb(
        48,
        48,
        "same prompt",
        123,
        quality=2,
        iterations=210,
        palette_index=4,
        rotation=22.0,
        zoom_level=1.1,
        center_x=-0.35,
        center_y=0.12,
    )
    assert base != quality_variant
    assert base != rotation_variant
    assert base != modified


def test_fractal_fusion_rgb_allows_zero_mandelbrot_weight_to_change_output():
    zero = fusion_main.fractal_fusion_rgb(48, 48, "same prompt", 123, mandelbrot_weight=0.0)
    nonzero = fusion_main.fractal_fusion_rgb(48, 48, "same prompt", 123, mandelbrot_weight=0.02)
    assert zero != nonzero

def test_texture_style_for_seed_is_deterministic_and_supported():
    style = fusion_main._texture_style_for_seed(123)
    assert style == fusion_main._texture_style_for_seed(123)
    assert style in {"diagonal_hatch", "diamond_wave", "spiral"}

def test_metallic_profile_dims_background_and_boosts_edges():
    profile = fusion_main._metallic_profile("peaceful")
    assert 0.35 <= profile["background_dim"] <= 0.8
    assert profile["outline_boost"] > 0.2
    assert profile["metal_desat"] > 0.05

def test_palette_params_magma_is_warm_and_saturated():
    pal = fusion_main._palette_params("magma", 123)
    assert 0.0 <= pal["base"] <= 0.14
    assert pal["span"] >= 0.24
    assert pal["sat"] >= 0.85

def test_fractal_fusion_rgb_magma_blend_contains_warm_and_cool_accents():
    img = fusion_main.fractal_fusion_rgb(
        96,
        96,
        "blend all at once magma rainbow starburst ribbons",
        123,
        palette_profile="magma",
        detail_density=0.88,
        ring_bias=0.9,
        diamond_bias=0.86,
    )
    rs = img[0::3]
    bs = img[2::3]
    assert max(rs) >= 240
    assert max(bs) >= 210
    assert (sum(rs) / len(rs)) >= (sum(bs) / len(bs)) * 0.75

def test_brain_img2img_invalid_image_rejected():
    response = client.post(
        "/brain/img2img",
        data={"prompt": "utopian city", "seed": "-1"},
        files={"file": ("bad.png", BytesIO(b"not an image"), "image/png")},
    )
    assert response.status_code == 400

def test_brain_img2img_returns_png():
    img = Image.new("RGB", (64, 64), (220, 235, 255))
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/brain/img2img",
        data={"prompt": "utopian clean futuristic city", "seed": "123", "steps": "6", "strength": "0.55", "size": "256", "realism": "photo"},
        files={"file": ("init.png", buf, "image/png")},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/png")

def test_brain_roulette_returns_png():
    os.makedirs("tests/tmp_roulette", exist_ok=True)
    img = Image.new("RGB", (256, 256), (210, 230, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 80, 90, 220], fill=(245, 245, 245))
    d.rectangle([110, 40, 150, 220], fill=(245, 245, 245))
    d.rectangle([165, 100, 235, 220], fill=(245, 245, 245))
    img.save("tests/tmp_roulette/city.png")

    response = client.post("/brain/roulette", json={"dataset_path": "tests/tmp_roulette", "steps": 2, "size": 256, "outline": True, "outline_style": "color", "outline_thickness": 2})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/png")
