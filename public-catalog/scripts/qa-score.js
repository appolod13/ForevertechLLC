import fs from 'fs';
import path from 'path';

const summaryPath = path.resolve(process.cwd(), 'coverage', 'coverage-summary.json');
if (!fs.existsSync(summaryPath)) {
  console.error('coverage-summary.json not found at', summaryPath);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
const total = data.total || {};
const metrics = ['lines', 'branches', 'functions', 'statements'];
const percents = metrics.map(m => (total[m]?.pct ?? 0));
const score = percents.reduce((a, b) => a + b, 0) / metrics.length;
console.log('Quality coverage metrics (%):', Object.fromEntries(metrics.map((m, i) => [m, percents[i]])));
console.log('Quality score:', score.toFixed(2));
if (score < 90) {
  console.error('Quality score below threshold (90).');
  process.exit(1);
}
console.log('Quality score meets threshold.');
