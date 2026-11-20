// Copies the web app into android-app/www (the folder Capacitor packs into the APK).
// Same files as the website, minus the service worker (the APK already has everything inside it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WWW = path.join(ROOT, 'android-app', 'www');
fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });
for (const item of ['index.html', 'manifest.webmanifest', 'css', 'js', 'fonts', 'icons', 'pics']) {
  fs.cpSync(path.join(ROOT, item), path.join(WWW, item), { recursive: true });
}
// no service worker inside the APK: drop the registration line so there is no failed request
const app = path.join(WWW, 'js', 'app.js');
const src = fs.readFileSync(app, 'utf8');
const out = src.replace(/^if \('serviceWorker' in navigator\).*$/m, '// (no service worker in the Android app: the APK already holds every file)');
if (out === src) throw new Error('service worker line not found in js/app.js');
fs.writeFileSync(app, out);
const n = (function count(d) { return fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0); })(WWW);
console.log('www ready:', n, 'files');
