import sys
sys.path.append("/Users/Administrator/Documents/ForevertechLLC-1/quantum-image-gen")
from quantum_gen.wolfram_qiskit import generate_quantum_image

shapes = ["square", "diamond", "wave", "spiral", "triangle", "cross", "circle"]
for s in shapes:
    print(f"Generating {s}...")
    img = generate_quantum_image(f"a {s} of quantum dreams", 128, 128, force_quantum=True)
    img.save(f"test_{s}.png")
    
print("Done!")
