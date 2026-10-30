import { cp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] ? path.resolve(process.argv[2]) : root;
await mkdir(output, { recursive: true });
let html = await readFile(path.join(root, 'site/index.html'), 'utf8');
html = html.replace('href="/privacy.html"', 'href="privacy.html"');

for (const name of ['app.js', 'calendar.js', 'features.js', 'styles.css', 'notices.js', 'notices-snapshot.json']) {
  await cp(path.join(root, 'public', name), path.join(output, name));
}
await cp(path.join(root, 'public/assets'), path.join(output, 'assets'), { recursive: true });
const privacy = (await readFile(path.join(root, 'public/privacy.html'), 'utf8')).replace('href="/"', 'href="./"');
await writeFile(path.join(output, 'privacy.html'), privacy);
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, '.nojekyll'), '');
console.log('GitHub Pages files exported to ' + output);
