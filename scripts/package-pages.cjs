const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  const publicDirectory = entry.isDirectory() && ['css', 'js', 'images', 'fonts', 'assets', 'content'].includes(entry.name);
  const publicFile = entry.isFile() && (/\.html$/.test(entry.name) || ['CNAME', 'robots.txt', 'sitemap.xml', 'rss.xml', 'favicon.ico', 'manifest.webmanifest'].includes(entry.name));
  if (publicDirectory || publicFile) fs.cpSync(path.join(root, entry.name), path.join(out, entry.name), { recursive: true });
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
if (!fs.existsSync(path.join(out, 'index.html')) || !fs.existsSync(path.join(out, 'CNAME'))) throw Error('Incomplete Pages package.');
console.log('Packaged public site into dist; source tooling, reports, dependencies and credentials are excluded.');
