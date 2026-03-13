
import os
import time
import json
import asyncio
import httpx
from PIL import Image, ImageStat
import numpy as np
from datetime import datetime
import torch

class WorkflowTestSuite:
    def __init__(self, base_url="http://localhost:8000", upload_dir="uploads", report_dir="notes"):
        self.base_url = base_url
        self.upload_dir = upload_dir
        self.report_dir = report_dir
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "phases": [],
            "status": "initialization",
            "image_source": None,
            "metrics": {},
            "logs": []
        }
        os.makedirs(report_dir, exist_ok=True)
        os.makedirs(upload_dir, exist_ok=True)

    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        self.results["logs"].append(log_entry)

    async def identify_or_generate_base_image(self):
        self.log("Phase: Base Image Acquisition")
        existing_files = [f for f in os.listdir(self.upload_dir) if f.endswith(('.jpg', '.png', '.webp'))]
        
        if existing_files:
            base_image_name = existing_files[0]
            base_image_path = os.path.join(self.upload_dir, base_image_name)
            self.results["image_source"] = f"existing: {base_image_name}"
            self.log(f"Detected existing base image: {base_image_name}")
        else:
            self.log("No existing image detected. Generating new default image...")
            # Generate a default 512x512 blue image
            base_image_name = f"generated_base_{int(time.time())}.png"
            base_image_path = os.path.join(self.upload_dir, base_image_name)
            img = Image.new('RGB', (512, 512), color = (73, 109, 137))
            img.save(base_image_path)
            self.results["image_source"] = f"newly generated: {base_image_name}"
            self.log(f"Generated new base image: {base_image_name}")

        return base_image_path

    def calculate_quality_metrics(self, image_path):
        self.log(f"Calculating quality metrics for {os.path.basename(image_path)}")
        img = Image.open(image_path)
        img_np = np.array(img)
        
        # 1. Resolution
        width, height = img.size
        
        # 2. Sharpness (Laplacian Variance)
        if len(img_np.shape) == 3:
            gray = np.dot(img_np[...,:3], [0.2989, 0.5870, 0.1140])
        else:
            gray = img_np
        
        laplacian = np.array([
            [0, 1, 0],
            [1, -4, 1],
            [0, 1, 0]
        ])
        
        # Simple convolution for sharpness score
        # Using a simplified variance of the laplacian to estimate sharpness
        # This is a common no-reference sharpness metric
        padded = np.pad(gray, (1, 1), mode='constant')
        conv = np.zeros_like(gray)
        for i in range(3):
            for j in range(3):
                conv += padded[i:i+gray.shape[0], j:j+gray.shape[1]] * laplacian[i, j]
        
        sharpness_score = np.var(conv)
        
        # 3. Color Accuracy (Mean Intensity)
        stat = ImageStat.Stat(img)
        avg_color = stat.mean
        
        metrics = {
            "resolution": f"{width}x{height}",
            "sharpness_score": round(float(sharpness_score), 4),
            "average_color_rgb": [round(c, 2) for c in avg_color],
            "file_size_kb": round(os.path.getsize(image_path) / 1024, 2)
        }
        return metrics

    async def execute_fusion_pipeline(self, base_image_path):
        self.log("Phase: Fusion Extension Execution")
        start_time = time.time()
        
        prompt_data = {
            "prompt": "futuristic city, hyper-realistic, 8k",
            "strength": 0.75,
            "steps": 1
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # Prepare multipart upload
                with open(base_image_path, "rb") as f:
                    files = {"files": (os.path.basename(base_image_path), f, "image/jpeg")}
                    data = {"payload": json.dumps(prompt_data)}
                    
                    self.log(f"Sending request to {self.base_url}/fuse")
                    response = await client.post(f"{self.base_url}/fuse", data=data, files=files)
                    
                    if response.status_code != 200:
                        raise Exception(f"Fusion request failed: {response.text}")
                    
                    job_id = response.json()["jobId"]
                    self.log(f"Fusion job started. JobID: {job_id}")

                # Monitor progress via WebSocket (simulated here for script stability)
                # In a real environment we'd connect to WS, but for the test suite we'll poll status or wait
                # Since the background task runs on the server, we'll wait for the 'done' state
                
                result_url = None
                max_retries = 150
                for i in range(max_retries):
                    # We don't have a status endpoint, but we can check if the file exists in uploads
                    # or wait a reasonable time for the mock/local execution.
                    # Since our main.py uses jobs dict, let's assume we wait for the done signal.
                    # Actually, let's poll a health endpoint or just wait for the output file.
                    # In our case, the output file is result_{job_id}.png
                    
                    output_file = os.path.join(self.upload_dir, f"result_{job_id}.png")
                    if os.path.exists(output_file):
                        result_url = output_file
                        self.log(f"Fusion process completed in {round(time.time() - start_time, 2)}s")
                        break
                    
                    self.log(f"Waiting for fusion results... (Attempt {i+1}/{max_retries})")
                    await asyncio.sleep(2)
                
                if not result_url:
                    raise Exception("Fusion process timed out or failed to produce output")
                
                return result_url, time.time() - start_time

            except Exception as e:
                self.log(f"Error during fusion pipeline: {str(e)}")
                raise

    async def run_full_validation(self):
        self.log("=== Initializing Automated Workflow Test Suite ===")
        try:
            # Step 1: Base Image Acquisition
            base_image_path = await self.identify_or_generate_base_image()
            self.results["phases"].append({
                "name": "Base Image Acquisition",
                "status": "success",
                "path": base_image_path
            })

            # Step 2: Input Quality Assessment
            input_metrics = self.calculate_quality_metrics(base_image_path)
            self.results["metrics"]["input"] = input_metrics
            self.log(f"Input Metrics: {input_metrics}")

            # Step 3: Fusion Execution
            result_path, duration = await self.execute_fusion_pipeline(base_image_path)
            self.results["phases"].append({
                "name": "Fusion Execution",
                "status": "success",
                "duration_seconds": round(duration, 2),
                "output_path": result_path
            })

            # Step 4: Output Quality Assessment
            output_metrics = self.calculate_quality_metrics(result_path)
            self.results["metrics"]["output"] = output_metrics
            self.log(f"Output Metrics: {output_metrics}")

            # Final Validation
            self.results["status"] = "success"
            self.log("=== Workflow Validation Successful ===")

        except Exception as e:
            self.results["status"] = "failed"
            self.results["error"] = str(e)
            self.log(f"=== Workflow Validation Failed: {str(e)} ===")

        self.generate_report()

    def generate_report(self):
        report_path_json = os.path.join(self.report_dir, "workflow_test_results.json")
        report_path_md = os.path.join(self.report_dir, "workflow_test_report.md")

        with open(report_path_json, "w") as f:
            json.dump(self.results, f, indent=4)

        with open(report_path_md, "w") as f:
            f.write(f"# Workflow Test Report - {self.results['timestamp']}\n\n")
            f.write(f"**Status:** {self.results['status'].upper()}\n")
            f.write(f"**Image Source:** {self.results['image_source']}\n\n")
            
            f.write("## Performance Metrics\n")
            for phase in self.results["phases"]:
                if "duration_seconds" in phase:
                    f.write(f"- **{phase['name']}:** {phase['duration_seconds']}s\n")
            
            f.write("\n## Quality Assessment\n")
            f.write("| Metric | Input | Output |\n")
            f.write("| :--- | :--- | :--- |\n")
            input_m = self.results["metrics"].get("input", {})
            output_m = self.results["metrics"].get("output", {})
            f.write(f"| Resolution | {input_m.get('resolution')} | {output_m.get('resolution')} |\n")
            f.write(f"| Sharpness | {input_m.get('sharpness_score')} | {output_m.get('sharpness_score')} |\n")
            f.write(f"| Avg RGB | {input_m.get('average_color_rgb')} | {output_m.get('average_color_rgb')} |\n")
            f.write(f"| File Size | {input_m.get('file_size_kb')} KB | {output_m.get('file_size_kb')} KB |\n\n")

            f.write("## Detailed Logs\n")
            f.write("```\n")
            for log in self.results["logs"]:
                f.write(f"{log}\n")
            f.write("```\n")
            
            if "error" in self.results:
                f.write(f"\n## Error Log\n`{self.results['error']}`\n")

        print(f"\nReport generated at {report_path_md}")

if __name__ == "__main__":
    suite = WorkflowTestSuite()
    asyncio.run(suite.run_full_validation())
