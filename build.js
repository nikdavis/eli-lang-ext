import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const isWatch = process.argv.includes('--watch');

// Ensure dist exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Copy static files
function copyStatic() {
  cpSync('src/manifest.json', 'dist/manifest.json');
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
  target: 'firefox115',
  sourcemap: true,
  minify: !isWatch,
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

  // Also copy static on change (simple polling for now)
  setInterval(copyStatic, 1000);
} else {
  await build();
}
