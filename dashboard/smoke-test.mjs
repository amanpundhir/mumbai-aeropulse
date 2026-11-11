#!/usr/bin/env node
/**
 * dashboard/smoke-test.mjs
 *
 * Mumbai AeroPulse — Air Quality Mapping & Forecasting Intelligence
 * Milestone 6: Automated Production Build & Preview Smoke Test Suite
 *
 * Verifies:
 * 1. Production bundle integrity: `dist/index.html` exists and is non-empty.
 * 2. Static data assets integrity: all 4 JSON files in `src/data/` exist, parse cleanly,
 *    and contain zero `null`, zero `NaN`, and zero `undefined` values.
 * 3. Vite preview server lifecycle:
 *    - Spawns `npx vite preview --port 4173 --host 127.0.0.1` as a child process.
 *    - Polls `http://127.0.0.1:4173/` until HTTP 200 is received (with 10-second timeout).
 * 4. DOM and asset delivery assertions:
 *    - Status code is 200.
 *    - Content-Type is HTML.
 *    - HTML body contains `<div id="root">`, `<title>`, and bundled script references (`<script type="module"`).
 * 5. Clean teardown: gracefully terminates the preview server process (including Windows process tree).
 * 6. Returns exit code 0 on complete pass, 1 on any failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4173;
const HOST = '127.0.0.1';
const PREVIEW_URL = `http://${HOST}:${PORT}/`;
const POLL_INTERVAL_MS = 250;
const TIMEOUT_MS = 10000;

let previewProcess = null;
let testsRun = 0;
let testsPassed = 0;
const failures = [];

function assert(condition, testName, detail = '') {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failures.push({ testName, detail });
    console.error(`  [FAIL] ${testName}: ${detail}`);
  }
}

/**
 * Recursively asserts that no property in obj is null, NaN, or undefined.
 */
function assertNoNullOrNaN(obj, breadcrumb = 'root') {
  if (obj === null) {
    throw new Error(`Null value found at: ${breadcrumb}`);
  }
  if (obj === undefined) {
    throw new Error(`Undefined value found at: ${breadcrumb}`);
  }
  if (typeof obj === 'number') {
    if (Number.isNaN(obj) || !Number.isFinite(obj)) {
      throw new Error(`Invalid numeric value (NaN or Inf) found at: ${breadcrumb} (${obj})`);
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      assertNoNullOrNaN(obj[i], `${breadcrumb}[${i}]`);
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      assertNoNullOrNaN(obj[key], `${breadcrumb}.${key}`);
    }
  }
}

/**
 * Gracefully shuts down the preview server process across platforms.
 */
async function stopServer() {
  if (!previewProcess || previewProcess.killed) {
    return;
  }
  const pid = previewProcess.pid;
  console.log(`\nShutting down preview server (PID: ${pid})...`);

  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Process may already have terminated
    }
  } else {
    try {
      previewProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          try {
            previewProcess.kill('SIGKILL');
          } catch {
            // Already dead
          }
          resolve();
        }, 2000);
        previewProcess.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    } catch {
      // Fallback
    }
  }
  previewProcess = null;
  console.log('Preview server terminated cleanly.');
}

// Emergency cleanup handlers
process.on('SIGINT', async () => {
  await stopServer();
  process.exit(130);
});
process.on('SIGTERM', async () => {
  await stopServer();
  process.exit(143);
});

async function main() {
  console.log('='.repeat(70));
  console.log('Mumbai AeroPulse — Automated E2E Build & Smoke Check');
  console.log('='.repeat(70));
  console.log(`Working Directory: ${__dirname}\n`);

  try {
    // -------------------------------------------------------------
    // 1. Verify Production Distribution Bundle
    // -------------------------------------------------------------
    console.log('--- 1. Production Bundle Integrity Check ---');
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtmlPath = path.resolve(distDir, 'index.html');

    assert(fs.existsSync(distDir), 'dist/ directory exists', `Expected directory at ${distDir}`);
    assert(fs.existsSync(indexHtmlPath), 'dist/index.html exists', `Expected file at ${indexHtmlPath}`);

    let distHtmlContent = '';
    if (fs.existsSync(indexHtmlPath)) {
      distHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
      assert(distHtmlContent.length > 200, `dist/index.html is non-empty (${distHtmlContent.length} bytes)`, 'File size is too small');
      assert(distHtmlContent.includes('<div id="root">'), 'dist/index.html contains root mount element <div id="root">');
      assert(distHtmlContent.includes('<title>'), 'dist/index.html contains <title> tag');
      assert(distHtmlContent.includes('Mumbai AeroPulse'), 'dist/index.html title mentions Mumbai AeroPulse');
      assert(distHtmlContent.includes('<script type="module"'), 'dist/index.html contains module script loader');
    }

    // -------------------------------------------------------------
    // 2. Verify Static Data Assets Integrity (src/data/)
    // -------------------------------------------------------------
    console.log('\n--- 2. Static Data Assets Integrity Check (src/data/) ---');
    const dataDir = path.resolve(__dirname, 'src', 'data');
    const expectedDataFiles = [
      'stations.json',
      'forecasts.json',
      'timeseries_historical.json',
      'weather_summary.json'
    ];

    for (const filename of expectedDataFiles) {
      const filePath = path.resolve(dataDir, filename);
      const exists = fs.existsSync(filePath);
      assert(exists, `Data file exists: src/data/${filename}`, `Missing file at ${filePath}`);

      if (exists) {
        const rawContent = fs.readFileSync(filePath, 'utf8');
        assert(rawContent.length > 500, `${filename} is substantial (${rawContent.length} bytes)`);

        let parsedData = null;
        let parsesCleanly = false;
        try {
          parsedData = JSON.parse(rawContent);
          parsesCleanly = true;
        } catch (err) {
          failures.push({ testName: `JSON parse: ${filename}`, detail: err.message });
        }
        assert(parsesCleanly, `JSON syntax is valid: ${filename}`);

        let noNullOrNan = false;
        let nullError = null;
        try {
          assertNoNullOrNaN(parsedData, filename);
          noNullOrNan = true;
        } catch (err) {
          nullError = err.message;
        }
        assert(noNullOrNan, `Zero null/NaN/undefined values in ${filename}`, nullError || '');
      }
    }

    // Specific domain assertions on parsed stations
    const stationsPath = path.resolve(dataDir, 'stations.json');
    if (fs.existsSync(stationsPath)) {
      const stations = JSON.parse(fs.readFileSync(stationsPath, 'utf8'));
      assert(Array.isArray(stations) && stations.length === 4, 'stations.json contains exactly 4 monitoring stations');
      const stationNames = stations.map(s => s.name);
      assert(stationNames.includes('Borivali East'), 'Contains station Borivali East');
      assert(stationNames.includes('Byculla'), 'Contains station Byculla');
      assert(stationNames.includes('Malad West'), 'Contains station Malad West');
      assert(stationNames.includes('Shivaji Nagar'), 'Contains station Shivaji Nagar');
    }

    // -------------------------------------------------------------
    // 3. Spawn Vite Preview Server
    // -------------------------------------------------------------
    console.log('\n--- 3. Preview Server Lifecycle & Child Process Management ---');
    console.log(`Spawning 'npx vite preview --port ${PORT} --host ${HOST}'...`);

    const isWindows = process.platform === 'win32';
    const previewCommand = `npx vite preview --port ${PORT} --host ${HOST}`;

    previewProcess = spawn(previewCommand, {
      cwd: __dirname,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    assert(previewProcess && typeof previewProcess.pid === 'number', `Spawned preview server process (PID: ${previewProcess?.pid})`);

    let serverStderr = '';
    previewProcess.stderr.on('data', (chunk) => {
      serverStderr += chunk.toString();
    });

    previewProcess.on('error', (err) => {
      console.error('Failed to spawn preview server:', err);
    });

    // -------------------------------------------------------------
    // 4. Poll Preview Server Until HTTP 200 (10s Timeout)
    // -------------------------------------------------------------
    console.log(`Polling ${PREVIEW_URL} until HTTP 200 (timeout: ${TIMEOUT_MS / 1000}s)...`);
    const startTime = Date.now();
    let isServerReady = false;
    let responseBody = '';
    let responseStatus = 0;
    let responseHeaders = {};

    while (Date.now() - startTime < TIMEOUT_MS) {
      try {
        const res = await new Promise((resolve, reject) => {
          const req = http.get(PREVIEW_URL, { timeout: 1500 }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });

        if (res.statusCode === 200) {
          isServerReady = true;
          responseStatus = res.statusCode;
          responseHeaders = res.headers;
          responseBody = res.body;
          break;
        }
      } catch {
        // Server not ready yet; wait and retry
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
    }

    const elapsedMs = Date.now() - startTime;
    assert(isServerReady, `Preview server responded with HTTP 200 within ${elapsedMs}ms`, `Timed out after ${TIMEOUT_MS}ms. Stderr: ${serverStderr}`);

    // -------------------------------------------------------------
    // 5. Response Body & DOM Assertions
    // -------------------------------------------------------------
    console.log('\n--- 4. HTTP Response & Rendered DOM Assertions ---');
    assert(responseStatus === 200, `HTTP status code is 200 (received: ${responseStatus})`);
    assert(
      typeof responseHeaders['content-type'] === 'string' &&
      responseHeaders['content-type'].includes('text/html'),
      `Content-Type header is text/html (received: ${responseHeaders['content-type']})`
    );
    assert(responseBody.includes('<div id="root">'), 'HTTP response contains root mount point <div id="root">');
    assert(responseBody.includes('<title>'), 'HTTP response contains <title> tag');
    assert(responseBody.includes('Mumbai AeroPulse'), 'HTTP response title contains "Mumbai AeroPulse"');
    assert(
      responseBody.includes('<script type="module"') && responseBody.includes('.js'),
      'HTTP response contains bundled JavaScript module script tag'
    );
    assert(
      responseBody.includes('rel="stylesheet"') || responseBody.includes('.css'),
      'HTTP response references production CSS bundle stylesheet'
    );

    // -------------------------------------------------------------
    // 6. Graceful Server Shutdown
    // -------------------------------------------------------------
    await stopServer();
    assert(previewProcess === null, 'Preview server process successfully terminated and cleaned up');

    // -------------------------------------------------------------
    // 7. Final Summary & Exit
    // -------------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log(`SMOKE TEST SUMMARY: ${testsPassed}/${testsRun} checks passed`);
    if (failures.length > 0) {
      console.error('\nFAILURES DETECTED:');
      for (const f of failures) {
        console.error(`  - ${f.testName}: ${f.detail}`);
      }
      console.log('='.repeat(70));
      process.exit(1);
    }

    console.log('ALL AUTOMATED SMOKE TESTS PASSED CLEANLY (100% SUCCESS)');
    console.log('='.repeat(70));
    process.exit(0);

  } catch (err) {
    console.error('\nUNHANDLED EXCEPTION IN SMOKE TEST RUNNER:', err);
    await stopServer();
    process.exit(1);
  }
}

main();
