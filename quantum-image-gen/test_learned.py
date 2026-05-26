import sys
import os
sys.path.append("/Users/Administrator/Documents/ForevertechLLC-1/quantum-image-gen")
from quantum_gen.wolfram_qiskit import generate_quantum_image

prompts = [
    "quantum roulette of possibilities",
    "a random learned pattern",
]

for p in prompts:
    print(f"Testing: {p}")
    img = generate_quantum_image(p, 256, 256, force_quantum=True)
    img.save(f"test_{p.split()[0]}_learned.png")

print("Done testing learned integration!")
