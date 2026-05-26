import os
import sys

from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from processors.image_processor import ImageProcessor
from trainer.fusion_trainer import FusionTrainer


def main():
    init_path = os.environ.get("INIT_IMAGE_PATH")
    if not init_path:
        raise SystemExit("INIT_IMAGE_PATH not set")

    out_path = os.environ.get("OUT_PATH", "uploads/img2img_out.png")
    prompt = os.environ.get(
        "PROMPT",
        "utopian clean futuristic city skyline, bright daylight, reflective glass skyscrapers, architectural visualization, realistic lighting, high detail",
    )
    negative_prompt = os.environ.get(
        "NEGATIVE_PROMPT",
        "cartoon, anime, illustration, painting, lowres, blurry, noise, text, watermark, night, neon, cyberpunk, dystopian, dirty, grunge",
    )
    seed = int(os.environ.get("SEED", "77"))
    steps = int(os.environ.get("STEPS", "12"))
    strength = float(os.environ.get("STRENGTH", "0.60"))
    guidance_scale = float(os.environ.get("GUIDANCE_SCALE", "7.5"))
    size = int(os.environ.get("SIZE", "512"))
    realism = os.environ.get("REALISM", "photo")

    init = Image.open(init_path).convert("RGB")
    trainer = FusionTrainer()
    image, meta = trainer.brain_img2img(
        init_image=init,
        prompt=prompt,
        negative_prompt=negative_prompt,
        seed=seed,
        steps=steps,
        strength=strength,
        guidance_scale=guidance_scale,
        size=size,
        realism=realism,
    )

    mock = ImageProcessor().create_tshirt_mockup(image, canvas_size=1024)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    mock.save(out_path)
    print(out_path)
    print(meta)


if __name__ == "__main__":
    main()
