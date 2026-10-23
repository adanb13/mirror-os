function integer(value, fallback, min, max) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error('Invalid numeric configuration');
  return parsed;
}

function serviceUrl(value, fallback) {
  const url = new URL(value || fallback);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Service URLs must be HTTP(S) URLs without credentials, query or fragment');
  }
  return url.href.replace(/\/$/, '');
}

export function loadConfig(env = process.env) {
  const timezone = env.TIMEZONE || 'America/Toronto';
  new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
  const entities = (env.HA_ENTITIES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (entities.length > 20 || entities.some(id => !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(id))) {
    throw new Error('HA_ENTITIES must contain up to 20 entity IDs');
  }
  return {
    host: env.HOST || '127.0.0.1',
    allowedHosts: [...new Set(['localhost', '127.0.0.1', '[::1]', 'mirror', 'mirror.local',
      env.HOST, ...(env.ALLOWED_HOSTS || '').split(',')].filter(Boolean).map(s => s.trim().toLowerCase()))],
    port: integer(env.PORT, 3001, 1, 65535),
    timezone,
    ai: {
      baseUrl: serviceUrl(env.AI_BASE_URL, 'http://127.0.0.1:8000'),
      model: env.AI_MODEL || 'qwen2.5-instruct:1.5b',
      timeoutMs: integer(env.AI_TIMEOUT_MS, 120000, 100, 300000)
    },
    ha: {
      baseUrl: env.HA_BASE_URL ? serviceUrl(env.HA_BASE_URL) : '',
      token: env.HA_TOKEN || '',
      entities
    }
  };
}
