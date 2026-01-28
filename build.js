import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev') || isWatch;
const targetBrowser = process.argv.includes('--chrome') ? 'chrome' : 'firefox';

// Only load .env API key for dev builds
let devApiKey = '';
if (isDev && existsSync('.env')) {
  devApiKey = readFileSync('.env', 'utf-8').trim();
}

// Ensure dist exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Copy static files and generate browser-specific manifest
function copyStatic() {
  const manifest = JSON.parse(readFileSync('src/manifest.json', 'utf-8'));

  if (targetBrowser === 'chrome') {
    // Chrome MV3 uses service_worker
    manifest.background = {
      service_worker: 'background.js',
      type: 'module'
    };
    // Remove Firefox-specific settings
    delete manifest.browser_specific_settings;
  }
  // Firefox uses scripts array (already in manifest)

  writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
  cpSync('src/popup/popup.html', 'dist/popup/popup.html', { recursive: true });
  cpSync('src/options/options.html', 'dist/options/options.html', { recursive: true });
  if (existsSync('src/assets')) {
    cpSync('src/assets', 'dist/assets', { recursive: true });
  }
}

// Ensure directories exist
['dist/popup', 'dist/options', 'dist/assets'].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

const buildOptions = {
  bundle: true,
  target: targetBrowser === 'chrome' ? 'chrome120' : 'firefox115',
  sourcemap: true,
  minify: !isWatch,
  define: {
    '__DEV_API_KEY__': JSON.stringify(devApiKey),
  },
};

async function build() {
  // Background script (ESM for service worker)
  await esbuild.build({
    ...buildOptions,
    format: 'esm',
    entryPoints: ['src/background/index.ts'],
    outfile: 'dist/background.js',
  });

  // Content script (IIFE)
  await esbuild.build({
    ...buildOptions,
    format: 'iife',
    entryPoints: ['src/content/index.ts'],
    outfile: 'dist/content.js',
  });

  // Popup (IIFE for direct script loading)
  await esbuild.build({
    ...buildOptions,
    format: 'iife',
    entryPoints: ['src/popup/popup.ts'],
    outfile: 'dist/popup/popup.js',
  });

  // Options page (IIFE for direct script loading)
  await esbuild.build({
    ...buildOptions,
    format: 'iife',
    entryPoints: ['src/options/options.ts'],
    outfile: 'dist/options/options.js',
  });

  copyStatic();
  console.log('Build complete');
}

if (isWatch) {
  // Copy static files once at start
  copyStatic();

  const ctx = await esbuild.context({
    ...buildOptions,
    entryPoints: [
      'src/background/index.ts',
      'src/content/index.ts',
      'src/popup/popup.ts',
      'src/options/options.ts',
    ],
    outdir: 'dist',
  });

  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await build();
}
