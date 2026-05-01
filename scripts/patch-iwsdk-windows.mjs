import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (process.platform !== 'win32') {
  process.exit(0);
}

const cliPath = join(process.cwd(), 'node_modules', '@iwsdk', 'cli', 'dist', 'cli.js');
const source = readFileSync(cliPath, 'utf8');

if (source.includes('const iwsdkWindowsSpawn = process.platform === "win32";')) {
  process.exit(0);
}

const target = `const spawnArgs = getRunScriptArgs(packageManager, scriptName);
    const child = spawn(packageManager, spawnArgs, {
        cwd: workspaceRoot,
        detached: !foreground,
        stdio: foreground ? 'inherit' : ['ignore', stdoutFd, stdoutFd],
        env: process.env,
    });`;

const replacement = `const spawnArgs = getRunScriptArgs(packageManager, scriptName);
    const iwsdkWindowsSpawn = process.platform === "win32";
    const spawnCommand = iwsdkWindowsSpawn ? "cmd.exe" : packageManager;
    const spawnCommandArgs = iwsdkWindowsSpawn
        ? ["/d", "/s", "/c", [packageManager, ...spawnArgs].join(" ")]
        : spawnArgs;
    const child = spawn(spawnCommand, spawnCommandArgs, {
        cwd: workspaceRoot,
        detached: !foreground,
        stdio: foreground ? 'inherit' : ['ignore', stdoutFd, stdoutFd],
        env: process.env,
    });`;

if (!source.includes(target)) {
  throw new Error('Unable to patch @iwsdk/cli Windows dev spawn block.');
}

writeFileSync(cliPath, source.replace(target, replacement));
