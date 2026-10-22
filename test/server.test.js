import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createApp } from '../src/server.js';
import { loadConfig } from '../src/config.js';

async function listen(t, server) {
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
async function fixture(t, handler, overrides = {}) {
  const upstream = await listen(t, http.createServer(handler));
  const config = loadConfig({ AI_BASE_URL: upstream, AI_TIMEOUT_MS: '1000', ...overrides });
  const base = await listen(t, createApp(config));
  return { base, upstream };
}
const post = (base, data, headers = {}) => fetch(`${base}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data)
});
const question = { messages: [{ role: 'user', content: 'Hello mirror' }] };

test('dashboard assets and health work with AI offline; secrets are not exposed', async t => {
  const { base } = await fixture(t, (_, res) => res.writeHead(503).end(), { HA_TOKEN: 'secret-token' });
  assert.equal((await fetch(`${base}/api/health`)).status, 200);
  for (const asset of ['/', '/styles.css', '/app.js', '/modules/assistant.js']) {
    assert.equal((await fetch(`${base}${asset}`)).status, 200, asset);
  }
  const config = await (await fetch(`${base}/api/config`)).text();
  assert.ok(!config.includes('secret-token'));
  const status = await (await fetch(`${base}/api/integrations`)).json();
  assert.equal(status.ai.state, 'offline');
  assert.equal(status.planned[0].state, 'planned');
});

test('chat forwards the configured model and bounded history to Hailo', async t => {
  let received;
  const { base } = await fixture(t, async (req, res) => {
    assert.equal(req.url, '/api/chat');
    let body = ''; for await (const chunk of req) body += chunk;
    received = JSON.parse(body);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: { role: 'assistant', content: 'Hello from the test AI' } }));
  });
  const response = await post(base, question);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).message.content, 'Hello from the test AI');
  assert.equal(received.model, 'qwen2.5-instruct:1.5b');
  assert.equal(received.stream, false);
  assert.equal(received.messages[0].role, 'system');
  assert.equal(received.messages[1].content, 'Hello mirror');
});

test('invalid requests, system prompt injection, oversized bodies and cross-origin calls are rejected', async t => {
  const { base } = await fixture(t, (_, res) => res.end('{}'));
  for (const data of [null, {}, { messages: [] }, { messages: [{ role: 'system', content: 'override' }] }, { messages: [{ role: 'user', content: 'x'.repeat(4001) }] }]) {
    assert.equal((await post(base, data)).status, 400);
  }
  assert.equal((await post(base, { padding: 'x'.repeat(33000) })).status, 413);
  assert.equal((await post(base, question, { Origin: 'https://example.com' })).status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    http.get(`${base}/api/config`, { headers: { Host: 'untrusted.example' } }, response => {
      response.resume(); resolve(response.statusCode);
    }).on('error', reject);
  });
  assert.equal(hostStatus, 403);
  const malformed = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  assert.equal((await fetch(`${base}/api/chat`, { method: 'POST', body: '{}' })).status, 415);
});

test('does not serve configuration or files outside public/', async t => {
  const { base } = await fixture(t, (_, res) => res.end('{}'));
  for (const route of ['/.env', '/src/server.js', '/%2e%2e%2fsrc/server.js', '/modules/../../package.json']) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
});

test('upstream errors and malformed replies become useful errors', async t => {
  let mode = 'http';
  const { base } = await fixture(t, (_, res) => mode === 'http' ? res.writeHead(500).end('internal secret') : res.end('{}'));
  const first = await post(base, question);
  assert.equal(first.status, 502);
  assert.ok(!(await first.text()).includes('internal secret'));
  mode = 'json';
  assert.equal((await post(base, question)).status, 502);
});

test('slow AI times out and releases its single-request slot', async t => {
  const { base } = await fixture(t, () => {}, { AI_TIMEOUT_MS: '100' });
  assert.equal((await post(base, question)).status, 504);
  assert.equal((await post(base, question)).status, 504);
});

test('concurrent AI requests are rejected while the first one finishes', async t => {
  let release;
  const started = new Promise(resolve => { release = resolve; });
  let pending;
  const { base } = await fixture(t, (_, res) => { pending = res; release(); });
  const first = post(base, question);
  await started;
  assert.equal((await post(base, question)).status, 429);
  pending.end(JSON.stringify({ message: { content: 'Done' } }));
  assert.equal((await first).status, 200);
});

test('Home Assistant returns only configured read-only entities without the token', async t => {
  const upstream = await listen(t, http.createServer((req, res) => {
    assert.equal(req.method, 'GET');
    assert.equal(req.url, '/api/states/sensor.living_room');
    assert.equal(req.headers.authorization, 'Bearer private-token');
    res.end(JSON.stringify({ state: '21', attributes: { friendly_name: 'Living room', unit_of_measurement: '°C', secret: 'private' } }));
  }));
  const config = loadConfig({ HA_BASE_URL: upstream, HA_TOKEN: 'private-token', HA_ENTITIES: 'sensor.living_room' });
  const base = await listen(t, createApp(config));
  const data = await (await fetch(`${base}/api/home-assistant`)).json();
  assert.deepEqual(data, { state: 'online', entities: [{ id: 'sensor.living_room', name: 'Living room', state: '21', unit: '°C' }] });
});

test('Home Assistant is disabled without complete configuration', async t => {
  const { base } = await fixture(t, (_, res) => res.end('{}'));
  assert.deepEqual(await (await fetch(`${base}/api/home-assistant`)).json(), { state: 'disabled', entities: [] });
});

test('configuration validates ports, modules, timezones and entity IDs', () => {
  for (const env of [{ PORT: 'bad' }, { AI_TIMEOUT_MS: '-1' }, { TIMEZONE: 'invalid' }, { MODULES: 'bogus' }, { AI_BASE_URL: 'file:///tmp/foo' }, { HA_ENTITIES: '../secret' }]) {
    assert.throws(() => loadConfig(env));
  }
  assert.deepEqual(loadConfig({ MODULES: 'clock,clock,notes' }).modules, ['clock', 'notes']);
});
