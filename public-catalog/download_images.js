const fs = require('fs');
const https = require('https');
const path = require('path');

const outputDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const generateUrl = (num) => {
    const prompt = `number ${num} in a square frame, futuristic punk aesthetic, cyberpunk style, neon glowing, dark background, digital art, high resolution`;
    return `https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=square`;
};

const downloadImage = (num) => {
    const url = generateUrl(num);
    const filePath = path.join(outputDir, `ai-gen-${num}.png`);
    
    console.log(`Downloading ai-gen-${num}.png...`);
    
    https.get(url, (res) => {
        // Handle Redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
            console.log(`Redirecting ${num} to ${res.headers.location}`);
            https.get(res.headers.location, (newRes) => {
                if (newRes.statusCode !== 200) {
                     console.error(`Failed to download image ${num} after redirect: Status ${newRes.statusCode}`);
                     newRes.resume();
                     return;
                }
                const stream = fs.createWriteStream(filePath);
                newRes.pipe(stream);
                stream.on('finish', () => {
                    stream.close();
                    console.log(`Saved ai-gen-${num}.png`);
                });
            });
            return;
        }

        if (res.statusCode !== 200) {
            console.error(`Failed to download image ${num}: Status ${res.statusCode}`);
            res.resume();
            return;
        }
        
        const stream = fs.createWriteStream(filePath);
        res.pipe(stream);
        
        stream.on('finish', () => {
            stream.close();
            console.log(`Saved ai-gen-${num}.png`);
        });
    }).on('error', (err) => {
        console.error(`Error downloading image ${num}:`, err.message);
    });
};

// Download 1 to 5
for (let i = 1; i <= 5; i++) {
    downloadImage(i);
}
