/**
 * Fusion AI - Add Image Button Injector
 * Injects a button and upload UI beneath the AI Asset Generator.
 */

(function() {
    const targetSelector = 'h2:contains("AI Asset Generator")'; // Adjust based on actual UI structure
    const generatorContainer = document.querySelector('.bg-gradient-to-b:has(h2:contains("AI Asset Generator"))');

    if (!generatorContainer) {
        console.error("Fusion AI: Could not find target container.");
        return;
    }

    // Create Fusion UI
    const fusionUI = document.createElement('div');
    fusionUI.className = 'mt-6 p-4 border-t border-gray-700 space-y-4';
    fusionUI.innerHTML = `
        <div class="flex items-center gap-3">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            <h3 class="text-lg font-bold text-blue-400">Fusion Extension</h3>
        </div>
        <div id="drop-zone" class="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
            <p class="text-sm text-gray-400">Drag & drop images or click to upload</p>
            <input type="file" id="file-input" multiple accept="image/*" class="hidden">
            <div id="file-list" class="flex gap-2 mt-2 overflow-x-auto"></div>
        </div>
        <button id="fuse-btn" class="w-full py-3 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:bg-gray-700">
            Fuse with Prompt
        </button>
        <div id="fusion-progress" class="hidden space-y-2">
            <div class="flex justify-between text-xs text-gray-400">
                <span id="status-text">Uploading...</span>
                <span id="progress-pct">0%</span>
            </div>
            <div class="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div id="progress-bar" class="bg-blue-500 h-full transition-all duration-300" style="width: 0%"></div>
            </div>
        </div>
    `;

    generatorContainer.appendChild(fusionUI);

    const dropZone = fusionUI.querySelector('#drop-zone');
    const fileInput = fusionUI.querySelector('#file-input');
    const fuseBtn = fusionUI.querySelector('#fuse-btn');
    const fileList = fusionUI.querySelector('#file-list');
    const progressBar = fusionUI.querySelector('#progress-bar');
    const progressPct = fusionUI.querySelector('#progress-pct');
    const statusText = fusionUI.querySelector('#status-text');
    const progressContainer = fusionUI.querySelector('#fusion-progress');

    let uploadedFiles = [];

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFiles(e.target.files);

    function handleFiles(files) {
        uploadedFiles = [...files];
        fileList.innerHTML = '';
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-12 h-12 object-cover rounded border border-gray-600';
                fileList.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    fuseBtn.onclick = async () => {
        const prompt = document.querySelector('textarea[placeholder="Describe the image you want to generate..."]').value;
        if (!prompt) {
            alert("Please enter a prompt first.");
            return;
        }

        const formData = new FormData();
        uploadedFiles.forEach(file => formData.append('files', file));
        formData.append('request', JSON.stringify({ prompt, strength: 0.75, steps: 50 }));

        fuseBtn.disabled = true;
        progressContainer.classList.remove('hidden');

        try {
            const res = await fetch('http://localhost:8000/fuse', {
                method: 'POST',
                body: formData
            });
            const { jobId } = await res.json();
            connectWS(jobId);
        } catch (err) {
            console.error("Fusion failed:", err);
            fuseBtn.disabled = false;
        }
    };

    function connectWS(jobId) {
        const ws = new WebSocket(`ws://localhost:8000/progress/${jobId}`);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            statusText.innerText = data.status;
            const pct = Math.round(data.progress * 100);
            progressPct.innerText = pct + '%';
            progressBar.style.width = pct + '%';

            if (data.status === 'done') {
                const imgDisplay = document.querySelector('img[alt=""]');
                if (imgDisplay) imgDisplay.src = `http://localhost:8000${data.result}`;
                fuseBtn.disabled = false;
                ws.close();
            }
        };
    }
})();
