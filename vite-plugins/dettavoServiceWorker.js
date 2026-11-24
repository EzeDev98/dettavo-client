import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// index.html is never precached: page loads always go to the network.
const NEVER_PRECACHE = new Set(['sw.js', 'version.json', 'index.html']);
const SKIPPED_FILE = /\.(map|txt)$|(^|\/)\.gitkeep$/;

function listFiles(dir, base = '') {
  return readdirSync(join(dir, base), { withFileTypes: true }).flatMap((entry) => {
    const path = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(dir, path) : [path];
  });
}

// 202611111215-a1b2c3d: minute of the build, then the commit.
export function makeBuildId(root) {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
  let commit = 'nogit';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    // Not a git checkout: the timestamp alone still makes the id unique.
  }
  return `${stamp}-${commit}`;
}

// Fails the build loudly if a marker is missing, instead of shipping an unstamped worker.
function replaceOnce(text, marker, value, file) {
  if (!text.includes(marker)) throw new Error(`${file}: marker ${marker} not found.`);
  return text.replace(marker, () => value);
}

export function dettavoServiceWorker(buildId) {
  let outDir;

  return {
    name: 'dettavo-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    writeBundle() {
      const precache = listFiles(outDir)
        .filter((file) => !NEVER_PRECACHE.has(file) && !SKIPPED_FILE.test(file))
        .map((file) => `/${file}`)
        .sort();

      const styles = readFileSync(join(outDir, 'index.html'), 'utf8').match(/<link\b[^>]*\brel="stylesheet"[^>]*>/g) ?? [];
      if (styles.length === 0) throw new Error('index.html has no stylesheet link to copy into offline.html.');
      const offlinePath = join(outDir, 'offline.html');
      writeFileSync(
        offlinePath,
        replaceOnce(readFileSync(offlinePath, 'utf8'), '<!--dettavo:styles-->', styles.join('\n    '), 'offline.html'),
      );

      const swPath = join(outDir, 'sw.js');
      let sw = readFileSync(swPath, 'utf8');
      sw = replaceOnce(sw, "'__BUILD_ID__'", JSON.stringify(buildId), 'sw.js');
      sw = replaceOnce(sw, "['__PRECACHE_URLS__']", JSON.stringify(precache, null, 2), 'sw.js');
      writeFileSync(swPath, sw);

      writeFileSync(join(outDir, 'version.json'), `${JSON.stringify({ buildId, builtAt: new Date().toISOString() }, null, 2)}\n`);

      console.log(`service worker: build ${buildId}, ${precache.length} files precached`);
    },
  };
}
