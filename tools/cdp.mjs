/* Dorada Cover Studio — headless-Chrome driver.
 *
 * Drives the Chrome for Testing binary over the DevTools protocol with
 * Node's built-in WebSocket and fetch: no npm packages. Two jobs:
 *
 *   node tools/cdp.mjs gen
 *       Open tools/gen.html, wait for window.__genDone, save the ten
 *       generated sample photos as app/samples/<name>.jpg.
 *
 *   node tools/cdp.mjs shot <url> <width> <height> <out.jpg> [quality]
 *       Open a page at the given window size, wait for window.__shotReady,
 *       capture the viewport as a JPEG and save it.
 *
 *   node tools/cdp.mjs eval <url> <width> <height> <js-expression>
 *       Open a page, wait for window.__shotReady, evaluate the expression
 *       and print the JSON result (playtests).
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = resolve(process.env.HOME || '~', '.cache/ms-playwright/chrome-linux64/chrome');
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORT = 9223;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until the DevTools HTTP endpoint answers. */
async function waitForDevTools(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch {
      /* Not up yet. */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

/** A minimal DevTools client over one WebSocket. */
class DevTools {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.consoleLines = [];
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve: res, reject: rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleLines.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleLines.push(`EXCEPTION: ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description ?? ''}`);
      }
    };
  }

  ready() {
    return new Promise((resolvePromise, rejectPromise) => {
      this.ws.onopen = resolvePromise;
      this.ws.onerror = rejectPromise;
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) throw new Error(`evaluate failed: ${res.exceptionDetails.text}`);
    return res.result.value;
  }

  async waitFor(expression, timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (await this.evaluate(expression)) return true;
      } catch {
        /* The page may not be ready to evaluate yet. */
      }
      await sleep(400);
    }
    throw new Error(`timed out waiting for: ${expression}`);
  }

  async screenshot(path, quality = 85) {
    const shot = await this.send('Page.captureScreenshot', { format: 'jpeg', quality });
    writeFileSync(path, Buffer.from(shot.data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

/** Launch headless Chrome at a window size, return the child process. */
function launchChrome(width, height) {
  const child = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    '--force-device-scale-factor=1',
    'about:blank',
  ], { stdio: 'ignore' });
  return child;
}

/** Open a URL in a fresh tab and return a client attached to it. */
async function openTab(url) {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!res.ok) throw new Error(`could not open tab for ${url}: ${res.status}`);
  const target = await res.json();
  const client = new DevTools(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  return client;
}

async function runGen() {
  const outDir = join(ROOT, 'app', 'samples');
  mkdirSync(outDir, { recursive: true });
  const child = launchChrome(1300, 1000);
  try {
    await waitForDevTools();
    const page = `file://${join(ROOT, 'tools', 'gen.html')}`;
    const client = await openTab(page);
    await client.waitFor('window.__genDone && window.__genDone.length === 10');
    const scenes = await client.evaluate('window.__genDone');
    for (const scene of scenes) {
      const base64 = scene.data.split(',')[1];
      writeFileSync(join(outDir, `${scene.name}.jpg`), Buffer.from(base64, 'base64'));
      console.log(`saved app/samples/${scene.name}.jpg`);
    }
    if (client.consoleLines.length > 0) console.log('page errors:', client.consoleLines.join('\n'));
    client.close();
  } finally {
    child.kill('SIGTERM');
  }
}

async function runShot(url, width, height, out, quality) {
  const child = launchChrome(width, height);
  try {
    await waitForDevTools();
    const client = await openTab(url);
    /* Force the exact viewport: the window size alone leaves a shell offset. */
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await client.waitFor('window.__shotReady === true');
    await sleep(400);
    mkdirSync(dirname(resolve(out)), { recursive: true });
    await client.screenshot(out, quality);
    if (client.consoleLines.length > 0) console.log('page errors:', client.consoleLines.join('\n'));
    console.log(`saved ${out}`);
    client.close();
  } finally {
    child.kill('SIGTERM');
  }
}

async function runEval(url, width, height, expression) {
  const child = launchChrome(width, height);
  try {
    await waitForDevTools();
    const client = await openTab(url);
    await client.waitFor('window.__shotReady === true');
    const value = await client.evaluate(expression);
    console.log(JSON.stringify(value, null, 2));
    if (client.consoleLines.length > 0) console.log('page errors:', client.consoleLines.join('\n'));
    client.close();
  } finally {
    child.kill('SIGTERM');
  }
}

async function main() {
  const [job, ...args] = process.argv.slice(2);
  if (job === 'gen') {
    await runGen();
  } else if (job === 'shot') {
    const [url, w, h, out, quality] = args;
    if (!url || !w || !h || !out) throw new Error('shot needs <url> <width> <height> <out.jpg> [quality]');
    await runShot(url, Number(w), Number(h), out, quality ? Number(quality) : 85);
  } else if (job === 'eval') {
    const [url, w, h, ...expr] = args;
    if (!url || !w || !h || expr.length === 0) throw new Error('eval needs <url> <width> <height> <js-expression>');
    await runEval(url, Number(w), Number(h), expr.join(' '));
  } else {
    console.log('usage: node tools/cdp.mjs gen | shot <url> <w> <h> <out> [q] | eval <url> <w> <h> <expr>');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`cdp: ${err.message}`);
  process.exit(1);
});
