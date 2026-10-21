import { cp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hostedSite = 'https://find-my-block-bhs.zengxuanwen.chatgpt.site';
let html = await readFile(path.join(root, 'site/index.html'), 'utf8');
html = html.replace('href="/privacy.html"', 'href="privacy.html"');
html = html.replace(
  '<div id="googleButton"></div>',
  '<div id="googleButton"></div><a id="hostedAccountLink" class="tool-action" href="' + hostedSite + '" target="_blank" rel="noopener">Open main site</a>'
);
for (const name of ['app.js', 'calendar.js', 'features.js', 'styles.css']) {
  await cp(path.join(root, 'public', name), path.join(root, name));
}
await cp(path.join(root, 'public/assets'), path.join(root, 'assets'), { recursive: true });
await cp(path.join(root, 'scripts/pages-account.js'), path.join(root, 'account.js'));
const privacy = (await readFile(path.join(root, 'public/privacy.html'), 'utf8'))
  .replace('href="/"', 'href="./"')
  .replace('<h1>Your timetable and account</h1>', '<h1>Your timetable and account</h1><p>This GitHub Pages version stores imported timetables only in this browser. It has no sign-in or cloud storage API. Account features described below are available on the <a href="' + hostedSite + '">main site</a>.</p>');
await writeFile(path.join(root, 'privacy.html'), privacy);
await writeFile(path.join(root, 'index.html'), html);
await writeFile(path.join(root, '.nojekyll'), '');
console.log('GitHub Pages files exported to the repository root.');
