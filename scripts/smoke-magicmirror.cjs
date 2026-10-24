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
  assert.deepEqual(config.modules.map(m => m.module), ['clock', 'newsfeed']);
  assert.equal(config.modules[0].config.showDate, true);
  for (const route of ['/js/main.js', '/js/positions.js', '/config/basepath.js', '/defaultmodules/clock/clock.js', '/defaultmodules/clock/clock_styles.css', '/defaultmodules/newsfeed/newsfeed.js', '/defaultmodules/newsfeed/newsfeed.css', '/defaultmodules/newsfeed/newsfeed.njk', '/css/main.css', '/css/roboto.css', '/config/custom.css']) {
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
  // Exercise the real news helper over its Socket.IO namespace, with a local RSS
  // fixture so CI never depends on an external publisher's availability.
  const { createServer } = require('node:http');
  const fixture = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
    res.end('<?xml version="1.0"?><rss version="2.0"><channel><title>Smoke test</title><link>https://example.org</link><description>Fixture</description><item><title>Mirror news smoke test</title><link>https://example.org/news</link><guid>mirror-news-smoke</guid><pubDate>Thu, 22 Oct 2026 12:00:00 GMT</pubDate><description>Fixture article</description></item></channel></rss>');
  });
  await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
  try {
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(base.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket');
      const finish = error => { clearTimeout(timer); socket.close(); error ? reject(error) : resolve(); };
      const timer = setTimeout(() => finish(new Error('News helper did not deliver an RSS headline')), 15000);
      socket.addEventListener('error', event => finish(new Error(event.message || 'News socket error')));
      socket.addEventListener('message', event => {
        const packet = String(event.data);
        if (packet.startsWith('0')) socket.send('40/newsfeed,');
        else if (packet === '2') socket.send('3');
        else if (packet.startsWith('40/newsfeed,')) {
          socket.send('42/newsfeed,' + JSON.stringify(['ADD_FEED', {
            feed: { url: `http://127.0.0.1:${fixture.address().port}/rss`, useCorsProxy: false },
            config: { reloadInterval: 300000, allowedBasicHtmlTags: [] }
          }]));
        } else if (packet.startsWith('42/newsfeed,')) {
          try {
            const [notification, payload] = JSON.parse(packet.slice('42/newsfeed,'.length));
            if (notification === 'NEWS_ITEMS') {
              assert.ok(Object.values(payload).flat().some(item => item.title === 'Mirror news smoke test'));
              finish();
            } else if (notification === 'NEWSFEED_ERROR') finish(new Error(JSON.stringify(payload)));
          } catch (error) { finish(error); }
        }
      });
    });
  } finally { await new Promise(resolve => fixture.close(resolve)); }
  console.log('Actual MagicMirror²: page, clock/news assets, CSS, Socket.IO and parsed RSS headline delivery passed; no AI UI modules.');
})().catch(error => { console.error(error); process.exitCode = 1; });
