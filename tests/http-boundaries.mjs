import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const limit = 65536;
const listener = createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const env = { ...process.env };
delete env.HOMELAB_API_TEST_RUN;
const server = spawn(
  'php',
  [
    '-S',
    '127.0.0.1:' + port,
    '-t',
    'backend/public',
    'backend/public/index.php',
  ],
  { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] },
);

async function ready() {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => finish(new Error('PHP did not start.')),
      5000,
    );
    const exited = () => finish(new Error('PHP exited before listening.'));
    const started = (chunk) => {
      if (chunk.toString().includes('Development Server')) finish();
    };
    const finish = (error) => {
      clearTimeout(timer);
      server.off('error', finish);
      server.off('exit', exited);
      server.stderr.off('data', started);
      if (error) reject(error);
      else resolve();
    };
    server.once('error', finish);
    server.once('exit', exited);
    server.stderr.on('data', started);
  });
}

function send(body, chunked) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (chunked) headers['Transfer-Encoding'] = 'chunked';
    else headers['Content-Length'] = Buffer.byteLength(body);
    // An unknown endpoint exercises parsing without opening the database.
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path: '/boundary-check',
        method: 'POST',
        headers,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            type: response.headers['content-type'],
            body: Buffer.concat(chunks).toString(),
          }),
        );
      },
    );
    req.setTimeout(5000, () => req.destroy(new Error('HTTP check timed out.')));
    req.on('error', reject);
    req.end(body);
  });
}

try {
  await ready();
  for (const chunked of [false, true]) {
    for (const bytes of [limit - 1, limit, limit + 1]) {
      const response = await send(' '.repeat(bytes - 2) + '{}', chunked);
      assert.equal(response.status, bytes > limit ? 413 : 404);
      assert.match(response.type, /^application\/json/);
      assert.equal(typeof JSON.parse(response.body).error, 'string');
    }
    const multibyte = '😀'.repeat(limit / 4) + 'x';
    assert.equal(Buffer.byteLength(multibyte), limit + 1);
    assert.equal((await send(multibyte, chunked)).status, 413);
  }
  console.log(
    'PASS: HTTP body byte limits with declared lengths and chunked input.',
  );
} finally {
  if (
    server.pid !== undefined &&
    server.exitCode === null &&
    server.signalCode === null
  ) {
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  }
}
