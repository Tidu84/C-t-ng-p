import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const dirsToScan = ['src/utils', 'server'];

const testFiles = [];
for (const dir of dirsToScan) {
  const fullDir = path.join(rootDir, dir);
  if (fs.existsSync(fullDir)) {
    const files = fs.readdirSync(fullDir);
    for (const file of files) {
      if (file.endsWith('.test.ts')) {
        testFiles.push(path.join(dir, file));
      }
    }
  }
}

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';
const args = ['tsx', '--test', '--test-concurrency=1', ...testFiles];

const result = spawnSync(npxCmd, args, {
  stdio: 'inherit',
  shell: isWin,
});

process.exit(result.status ?? 0);
