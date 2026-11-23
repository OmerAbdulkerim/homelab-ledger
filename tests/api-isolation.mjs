import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const suite = fileURLToPath(new URL('./api.mjs', import.meta.url));
const nonce = randomBytes(16).toString('hex');
const header = 'X-Homelab-Test-Run';

async function stub(respond) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.method);
    respond(response);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    origin: 'http://127.0.0.1:' + server.address().port,
    requests,
    close: () => promisify(server.close.bind(server))(),
  };
}

const target = await stub((response) => response.end('[]'));
try {
  for (const test of [
    { missingRun: true, error: /Set HOMELAB_API_TEST_RUN/ },
    { error: /did not verify this isolated test run/ },
    {
      proof: randomBytes(16).toString('hex'),
      error: /did not verify this isolated test run/,
    },
    { proof: nonce, error: /does not have the original sample users/ },
    {
      redirect: true,
      error: /redirect mode is set to error|unexpected redirect/,
    },
  ]) {
    const endpoint = await stub((response) => {
      if (test.redirect) {
        response.writeHead(302, { Location: target.origin });
      } else {
        response.setHeader('Content-Type', 'application/json');
        if (test.proof) response.setHeader(header, test.proof);
      }
      response.end('[]');
    });
    try {
      const env = { ...process.env, HOMELAB_API_TEST_RUN: nonce };
      if (test.missingRun) delete env.HOMELAB_API_TEST_RUN;
      await assert.rejects(
        run(process.execPath, [suite, endpoint.origin], {
          env,
          timeout: 10000,
        }),
        (error) => error.code === 1 && test.error.test(error.stderr),
      );
      assert.deepEqual(endpoint.requests, test.missingRun ? [] : ['GET']);
    } finally {
      await endpoint.close();
    }
  }
  assert.deepEqual(target.requests, []);
} finally {
  await target.close();
}

console.log('PASS: the API suite refuses unsafe targets before writing.');
