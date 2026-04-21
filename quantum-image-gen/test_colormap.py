import sys
sys.path.append("/Users/Administrator/Documents/ForevertechLLC-1/quantum-image-gen")
from quantum_gen.wolfram_qiskit import generate_julia_set
from PIL import Image

img_arr = generate_julia_set(512, 512, -0.4, 0.6, cmap_name="turbo")
Image.fromarray(img_arr).save("test_pure_julia.png")
