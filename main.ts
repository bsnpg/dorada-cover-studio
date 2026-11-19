// Dorada Cover Studio — entrypoint (Node 22, standard library only).
//
// Two modes, picked by the command line:
//
//   node main.ts
//       Hand the entry in: copy app/ and screenshots/ from this repository
//       into the output directory and write dossier.json there with
//       buildDossier from vendor/makefun-app.ts. The output directory is
//       MAKEFUN_OUTPUT_DIR when set, otherwise /output. Exits 0. Running
//       it twice writes the same bytes both times.
//
//   node main.ts --serve [--port 8080]
//       Serve app/ as static files on localhost for local development and
//       playtesting. Ctrl-C (or SIGTERM) shuts it down cleanly with exit 0.
//
//   node main.ts --help
//       Print the usage text and exit 0.
//
// The handoff is the mode the grader runs; the server is the mode a person
// runs while trying the app in a browser. Both live in this one file so the
// entrypoint is a real program, not a stub.

import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// The dossier's text cap and the screenshot/app caps the gate enforces.
const TEXT_MAX_BYTES = 163840;
const SCREENSHOTS_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 50331648;

// Content types the dev server answers with, by file extension.
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

const USAGE = [
  'Dorada Cover Studio — GTA 6-style multi-panel poster maker',
  '',
  'Usage:',
  '  node main.ts                  hand the entry in (copy app/ + screenshots/, write dossier.json)',
  '  node main.ts --serve          serve app/ on localhost for development',
  '  node main.ts --serve --port 8123',
  '  node main.ts --help           show this text',
  '',
  'The handoff writes to MAKEFUN_OUTPUT_DIR when set, otherwise /output.',
].join('\n');

/** The repository root: the directory this file lives in. */
function repoRoot(): string {
  return resolve(fileURLToPath(new URL('.', import.meta.url)));
}

/** Where the handoff writes: MAKEFUN_OUTPUT_DIR, or /output. */
function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv !== '') return resolve(fromEnv);
  return '/output';
}

/** A directory the handoff may wipe: absolute, and not the filesystem root or the repo itself. */
function safeToWipe(dir: string, root: string): boolean {
  if (dir === sep || dir === root) return false;
  return true;
}

type Mode = 'hand' | 'serve' | 'help';

interface Cli {
  mode: Mode;
  port: number;
}

/** Read the command line: --serve, --port N (or --port=N), --help. Anything else is an error. */
function parseArgs(argv: string[]): Cli {
  const cli: Cli = { mode: 'hand', port: 8080 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--serve') {
      cli.mode = 'serve';
    } else if (arg === '--help' || arg === '-h') {
      cli.mode = 'help';
    } else if (arg === '--port') {
      const next = argv[i + 1];
      if (next === undefined) throw new Error('--port needs a number after it');
      cli.port = Number(next);
      i++;
    } else if (arg.startsWith('--port=')) {
      cli.port = Number(arg.slice('--port='.length));
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!Number.isSafeInteger(cli.port) || cli.port < 1 || cli.port > 65535) {
    throw new Error(`--port must be a whole number from 1 to 65535, not ${String(cli.port)}`);
  }
  return cli;
}

/**
 * The handoff: wipe the output directory, copy app/ and screenshots/ into
 * it, and write dossier.json from buildDossier. Prints what it wrote.
 */
function handIn(root: string, out: string): void {
  if (!safeToWipe(out, root)) throw new Error(`refusing to write the handoff into ${out}`);
  const appDir = join(root, 'app');
  const shotsDir = join(root, 'screenshots');
  if (!existsSync(appDir)) throw new Error(`no app/ directory in ${root}`);
  if (!existsSync(shotsDir)) throw new Error(`no screenshots/ directory in ${root}`);

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(appDir, join(out, 'app'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

  const dossier = buildDossier(out, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: { max: SCREENSHOTS_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
    app_max_files: APP_MAX_FILES,
    app_max_bytes: APP_MAX_BYTES,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);

  const shotNames = ['1-cover.jpg', '2-editor.jpg', '3-cover.jpg', '4-cover.jpg'].filter((n) =>
    existsSync(join(out, 'screenshots', n)),
  );
  console.log(`Dorada Cover Studio — handoff written to ${out}`);
  console.log(`  app/ + screenshots/ (${shotNames.length} screenshots) + dossier.json (${dossier.length} bytes)`);
}

/** The file app/ holds for a request path, or null when the path climbs out of app/. */
function fileForRequest(appDir: string, rawPath: string): string | null {
  const decoded = decodeURIComponent(rawPath.split('?')[0] ?? '/');
  const joined = normalize(join(appDir, decoded === '/' ? 'index.html' : decoded));
  if (joined !== appDir && !joined.startsWith(appDir + sep)) return null;
  if (joined.endsWith(sep)) return join(joined, 'index.html');
  return joined;
}

/**
 * The dev server: serves app/ on 127.0.0.1:port. A directory request serves
 * its index.html; anything outside app/ or missing is a 404. Returns a
 * promise that settles when the server has shut down cleanly.
 */
function serveApp(root: string, port: number): Promise<void> {
  const appDir = join(root, 'app');
  if (!existsSync(appDir)) throw new Error(`no app/ directory in ${root}`);
  const server = createServer((req, res) => {
    try {
      const file = fileForRequest(appDir, req.url ?? '/');
      if (file === null) {
        res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('400 bad request\n');
        return;
      }
      let path = file;
      if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
      const body = readFileSync(path);
      res.writeHead(200, { 'content-type': MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 not found\n');
    }
  });

  return new Promise<void>((resolvePromise, rejectPromise) => {
    server.on('error', (err: Error) => {
      console.error(`Dorada Cover Studio — cannot serve on port ${port}: ${err.message}`);
      rejectPromise(err);
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`Dorada Cover Studio — serving app/ at http://127.0.0.1:${port}/ (Ctrl-C to stop)`);
    });
    const shutdown = (): void => {
      server.close(() => {
        console.log('Dorada Cover Studio — server stopped.');
        resolvePromise();
      });
      // If a connection hangs the close, force it after a short grace period.
      setTimeout(() => resolvePromise(), 1000).unref();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}

/** Entry point: pick a mode and run it; any error is reported with exit 1. */
function main(): void {
  try {
    const cli = parseArgs(process.argv.slice(2));
    const root = repoRoot();
    if (cli.mode === 'help') {
      console.log(USAGE);
      return;
    }
    if (cli.mode === 'serve') {
      serveApp(root, cli.port)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      return;
    }
    handIn(root, outputDir());
  } catch (err) {
    console.error(`Dorada Cover Studio — ${(err as Error).message}`);
    console.error(USAGE);
    process.exit(1);
  }
}

main();
