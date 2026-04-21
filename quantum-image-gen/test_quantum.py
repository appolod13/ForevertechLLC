import sys
import os
sys.path.append("/Users/Administrator/Documents/ForevertechLLC-1/quantum-image-gen")
from quantum_gen.wolfram_qiskit import generate_quantum_image
img = generate_quantum_image("a city of quantum dreams", 256, 256, force_quantum=True)
img.save("test_output.png")
print("Saved to test_output.png")
