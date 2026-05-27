import sys
sys.path.append("/Users/Administrator/Documents/ForevertechLLC-1/quantum-image-gen")
from quantum_gen.wolfram_qiskit import generate_quantum_image

prompts = [
    "a transcendent love and passion fractal",
    "calm ocean breeze",
    "electric chaos and dynamic power",
    "divine cosmos spirit",
]

for p in prompts:
    print(f"Testing: {p}")
    img = generate_quantum_image(p, 256, 256, force_quantum=True)
    img.save(f"test_{p.split()[0]}.png")

print("Done testing Julia integration!")
