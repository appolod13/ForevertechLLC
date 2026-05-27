import sys
sys.path.append("/Users/Administrator/Documents/ForevertechLLC-1/quantum-image-gen")
from quantum_gen.wolfram_qiskit import generate_quantum_image

img = generate_quantum_image("test fractal", 512, 512, force_quantum=True)
img.save("debug_output.png")
print("Saved debug_output.png")
