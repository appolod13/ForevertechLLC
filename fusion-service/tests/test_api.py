
import pytest
from fastapi.testclient import TestClient
from main import app, fractal_fusion_rgb
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

def test_fractal_render_parameters_change_output():
    baseline = fractal_fusion_rgb(128, 128, "quantum city skyline", 12345)
    tuned = fractal_fusion_rgb(
        128,
        128,
        "quantum city skyline",
        12345,
        quality=1.8,
        iterations=280,
        palette_index=5,
        rotation=42.0,
        zoom_level=2.4,
        center_x=-0.22,
        center_y=0.15,
        render_params={
            "quantum_frequency": 8.5,
            "quantum_phase_offset": 1.3,
        },
    )
    assert baseline != tuned

def test_generate_endpoint_accepts_render_parameters():
    response = client.post(
        "/generate",
        json={
            "prompt": "fractal city",
            "width": 256,
            "height": 256,
            "quality": 1.4,
            "iterations": 240,
            "palette_index": 4,
            "rotation": 18,
            "zoom_level": 2.0,
            "center_x": -0.1,
            "center_y": 0.2,
            "render_params": {
                "mandelbrot_max_iterations": 260,
                "mandelbrot_zoom": 4.0,
                "mandelbrot_pan_x": -0.2,
                "mandelbrot_pan_y": 0.1,
            },
        },
    )
    assert response.status_code == 200
    meta = response.json().get("meta", {})
    applied = meta.get("render_params_applied", {})
    assert applied.get("iterations") == 240
    assert applied.get("zoom_level") == 2.0
    assert "mandelbrot_zoom" in (applied.get("render_params_keys") or [])
