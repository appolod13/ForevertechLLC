
import pytest
from fastapi.testclient import TestClient
from main import app
import json
from io import BytesIO
from PIL import Image

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
