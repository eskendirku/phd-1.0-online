// Copies the site into dist/ (for GitHub Actions deployments that publish dist/). No dependencies.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const FILES = ['index.html', 'experiment.js', 'style.css', 'tailwind.css', '.nojekyll', 'vendor'];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
FILES.forEach(f => fs.cpSync(path.join(ROOT, f), path.join(DIST, f), { recursive: true }));
console.log('Готово: dist/');
