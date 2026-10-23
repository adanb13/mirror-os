// Run inside the built display container: node < scripts/smoke-magicmirror.cjs
const assert = require('node:assert/strict');

(async () => {
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const get = async route => {
    const response = await fetch(base + route, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, route);
    return response;
  };
  const html = await (await get('/')).text();
  assert.match(html, /<title>MagicMirror²<\/title>/);
  const config = await (await get('/config')).json();
  assert.deepEqual(config.modules.map(m => m.module), ['clock']);
  assert.equal(config.modules[0].config.showDate, true);
  for (const route of ['/js/main.js', '/js/positions.js', '/config/basepath.js', '/defaultmodules/clock/clock.js', '/defaultmodules/clock/clock_styles.css', '/css/main.css', '/css/roboto.css', '/config/custom.css']) {
    await get(route);
  }
  const open = await (await get('/socket.io/?EIO=4&transport=polling')).text();
  assert.equal(open[0], '0');
  assert.ok(JSON.parse(open.slice(1)).sid);
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(base.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket');
    const timer = setTimeout(() => { socket.close(); reject(new Error('WebSocket handshake timed out')); }, 5000);
    socket.addEventListener('error', event => { clearTimeout(timer); reject(new Error(event.message || 'WebSocket error')); });
    socket.addEventListener('message', event => {
      clearTimeout(timer);
      try { assert.equal(String(event.data)[0], '0'); socket.close(); resolve(); }
      catch (error) { socket.close(); reject(error); }
    }, { once: true });
  });
  console.log('Actual MagicMirror²: page, clock configuration/assets, CSS, Socket.IO polling and WebSocket handshake passed; no AI UI modules.');
})().catch(error => { console.error(error); process.exitCode = 1; });
