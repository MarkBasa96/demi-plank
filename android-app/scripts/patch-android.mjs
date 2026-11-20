// Run after `npx cap add android`: Demi's launcher icon and splash, keep-screen-on, version number.
// Needs `sharp` (installed at the repo root).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..');
const ROOT = path.join(APP, '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const sharp = require('sharp');
const RES = path.join(APP, 'android', 'app', 'src', 'main', 'res');
const JAVA = path.join(APP, 'android', 'app', 'src', 'main', 'java', 'com', 'joe', 'demiplank');
const icon = path.join(ROOT, 'icons', 'icon-512.png');
const NAVY = '#1B2A47';

// 1. launcher icons: Demi's face on white, square and round, all sizes. Remove the adaptive-icon files so these are used.
const SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, px] of Object.entries(SIZES)) {
  const dir = path.join(RES, 'mipmap-' + d);
  fs.mkdirSync(dir, { recursive: true });
  await sharp(icon).resize(px, px).png().toFile(path.join(dir, 'ic_launcher.png'));
  const mask = Buffer.from(`<svg width="${px}" height="${px}"><circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}" fill="#fff"/></svg>`);
  await sharp(icon).resize(px, px).composite([{ input: mask, blend: 'dest-in' }]).png().toFile(path.join(dir, 'ic_launcher_round.png'));
  fs.rmSync(path.join(dir, 'ic_launcher_foreground.png'), { force: true });
}
fs.rmSync(path.join(RES, 'mipmap-anydpi-v26'), { recursive: true, force: true });

// 2. splash: navy with Demi in the middle, in every drawable folder that has a splash.png
const splash = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: NAVY } })
  .composite([{ input: await sharp(icon).resize(360, 360).png().toBuffer(), gravity: 'center' }]).png().toBuffer();
let nSplash = 0;
for (const e of fs.readdirSync(RES, { withFileTypes: true })) {
  const f = path.join(RES, e.name, 'splash.png');
  if (e.isDirectory() && fs.existsSync(f)) { fs.writeFileSync(f, splash); nSplash++; }
}

// 3. keep the screen on while the app is open (you are planking, not touching the phone)
fs.mkdirSync(JAVA, { recursive: true });
fs.writeFileSync(path.join(JAVA, 'MainActivity.java'), `package com.joe.demiplank;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
`);

// 4. version number from the build number, so each APK can update the one before it
const run = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
const gradle = path.join(APP, 'android', 'app', 'build.gradle');
let g = fs.readFileSync(gradle, 'utf8');
const before = g;
g = g.replace(/versionCode\s+\d+/, 'versionCode ' + run).replace(/versionName\s+"[^"]*"/, 'versionName "1.0.' + run + '"');
if (g === before) throw new Error('versionCode not found in build.gradle');
fs.writeFileSync(gradle, g);
console.log('patched: icons', Object.keys(SIZES).length, 'splash', nSplash, 'versionCode', run);
