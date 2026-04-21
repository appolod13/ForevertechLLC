const http = require('http');

async function run() {
  console.log('Testing /api/generate/image...');
  try {
    const start = Date.now();
    const res = await fetch('http://localhost:3001/api/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test e2e' })
    });
    const data = await res.json();
    console.log(`Time taken: ${(Date.now() - start)}ms`);
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();