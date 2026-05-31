#!/usr/bin/env node

const spawnAsync = require('@expo/spawn-async');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

async function buildAsync() {
  console.log(`⚙️  Building web assets`);
  const packageRoot = path.join(ROOT);
  const webuiRoot = path.join(packageRoot, 'webui');

  console.log(`📦 Installing webui dependencies`);
  await spawnAsync('npm', ['install', '--no-audit', '--no-fund'], { cwd: webuiRoot });

  await Promise.all([
    fs.promises.rm(path.join(packageRoot, 'dist'), { recursive: true, force: true }),
    fs.promises.rm(path.join(webuiRoot, 'dist'), { recursive: true, force: true }),
  ]);
  await spawnAsync('npx', ['expo', 'export', '-p', 'web', '--output-dir', 'dist'], {
    cwd: webuiRoot,
  });
  await fs.promises.rename(path.join(packageRoot, 'webui', 'dist'), path.join(packageRoot, 'dist'));
}

(async () => {
  try {
    await buildAsync();
  } catch (e) {
    console.error('Uncaught Error', e);
    process.exit(1);
  }
})();
