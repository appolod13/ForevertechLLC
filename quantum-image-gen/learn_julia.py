import os
import glob
import numpy as np
from PIL import Image
import json
import math

def calculate_features(img_path):
    try:
        img = Image.open(img_path).convert('L')
        arr = np.array(img)
        # 1. Brightness
        brightness = np.mean(arr) / 255.0
        # 2. Contrast
        contrast = np.std(arr) / 255.0
        # 3. Complexity (edges)
        dx = np.diff(arr, axis=1)
        dy = np.diff(arr, axis=0)
        complexity = (np.mean(np.abs(dx)) + np.mean(np.abs(dy))) / 255.0
        # 4. Symmetry (Left vs Right)
        h, w = arr.shape
        left = arr[:, :w//2]
        right = np.fliplr(arr[:, w//2 + (w%2):])
        symmetry = 1.0 - (np.mean(np.abs(left - right)) / 255.0)
        
        return float(brightness), float(contrast), float(complexity), float(symmetry)
    except Exception as e:
        return None

def map_to_c(features):
    b, c, comp, sym = features
    
    # We want C values that produce interesting Julia sets.
    # Angle based on complexity and symmetry [0, 2pi]
    angle = (comp * 20 + sym * 10) % (2 * math.pi)
    
    # The cardioid boundary is roughly r(a) = (1 - cos(a))/2
    r_cardioid = (1 - math.cos(angle)) / 2.0
    
    # We want to be *just* outside or on the boundary
    r = r_cardioid + (c * 0.2)
    
    # Calculate C
    c_x = r * math.cos(angle) - 0.25
    c_y = r * math.sin(angle)
    
    # Also derive a zoom and max_iter based on complexity
    zoom = 1.0 + (comp * 4.0)
    max_iter = int(80 + (comp * 300))
    
    return float(c_x), float(c_y), float(zoom), int(max_iter)

def main():
    dataset_path = "/Users/Administrator/Datasets/utopian_clean_city/quantum images"
    files = glob.glob(os.path.join(dataset_path, "*.jpeg")) + glob.glob(os.path.join(dataset_path, "*.jpg")) + glob.glob(os.path.join(dataset_path, "*.png"))
    
    learned_params = []
    
    for f in files:
        feats = calculate_features(f)
        if feats:
            c_x, c_y, zoom, max_iter = map_to_c(feats)
            learned_params.append({
                "file": os.path.basename(f),
                "c_x": c_x,
                "c_y": c_y,
                "zoom": zoom,
                "max_iter": max_iter,
                "features": {"brightness": feats[0], "contrast": feats[1], "complexity": feats[2], "symmetry": feats[3]}
            })
            
    with open("learned_julia_params.json", "w") as out:
        json.dump(learned_params, out, indent=2)
        
    print(f"Learned from {len(learned_params)} images. Saved to learned_julia_params.json")

if __name__ == "__main__":
    main()
