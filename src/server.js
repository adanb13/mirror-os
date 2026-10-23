import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadConfig } from './config.js';
import { createAI, ApiError } from './integrations/ai.js';
import { createHomeAssistant } from './integrations/home-assistant.js';
import { plannedIntegrations } from './integrations/registry.js';

async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'Use application/json.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw new ApiError(413, 'Request too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'Invalid JSON.'); }
}

export function createApp(config = loadConfig()) {
  const ai = createAI(config.ai);
  const ha = createHomeAssistant(config.ha);
  return http.createServer(async (req, res) => {
    const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (!config.allowedHosts.includes(url.hostname.toLowerCase())) throw new ApiError(403, 'Host is not allowed. Configure ALLOWED_HOSTS for a custom LAN address.');
      if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== url.origin)) {
        throw new ApiError(403, 'Cross-origin requests are disabled.');
      }
      if (req.method === 'GET') {
        if (url.pathname === '/api/health') return json(200, { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
        if (url.pathname === '/api/config') return json(200, { service: 'mirror-os-background-api', model: config.ai.model });
        if (url.pathname === '/api/integrations') return json(200, { ai: await ai.status(), planned: plannedIntegrations });
        if (url.pathname === '/api/home-assistant') return json(200, await ha.states());
        throw new ApiError(404, 'Not found. This is a background API; the mirror display is a separate service.');
      }
      if (req.method === 'POST' && url.pathname === '/api/chat') {
        const data = await readJson(req);
        const controller = new AbortController();
        const cancel = () => { if (!res.writableEnded) controller.abort(); };
        res.on('close', cancel);
        try { return json(200, await ai.chat(data?.messages, controller.signal)); }
        finally { res.off('close', cancel); }
      }
      throw new ApiError(405, 'Method not allowed.');
    } catch (error) {
      if (!res.destroyed) json(error.status || 500, { error: error.status ? error.message : 'Internal server error.' });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  const server = createApp(config);
  server.requestTimeout = 300000;
  server.listen(config.port, config.host, () => console.log(`Mirror OS background API listening on ${config.host}:${config.port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
    server.close();
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
