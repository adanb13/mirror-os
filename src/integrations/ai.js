export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 8 || messages.some(m =>
    !m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' ||
    !m.content.trim() || m.content.length > 4000
  ) || messages.at(-1).role !== 'user') {
    throw new ApiError(400, 'Send 1–8 user/assistant messages, up to 4000 characters each, ending with a user message.');
  }
  return messages.map(({ role, content }) => ({ role, content }));
}

export function createAI(config) {
  let busy = false;
  return {
    async status() {
      try {
        const r = await fetch(`${config.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (!r.ok) throw new Error();
        const data = await r.json();
        const models = (Array.isArray(data.models) ? data.models : []).map(m =>
          typeof m === 'string' ? m : m.name || m.model).filter(Boolean);
        return { state: 'online', model: config.model, models, busy };
      } catch {
        return { state: 'offline', model: config.model, models: [], busy };
      }
    },
    async chat(messages, clientSignal) {
      const validated = validateMessages(messages);
      if (busy) throw new ApiError(429, 'The local AI is busy. Wait for the current reply.');
      busy = true;
      const start = performance.now();
      try {
        const r = await fetch(`${config.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.any([AbortSignal.timeout(config.timeoutMs), clientSignal || new AbortController().signal]),
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'system', content: 'You are a local smart mirror assistant. Give brief, useful answers, usually under three sentences. Do not claim access to devices, live data or tools.' }, ...validated],
            stream: false
          })
        });
        if (!r.ok) throw new ApiError(502, `Hailo-Ollama returned HTTP ${r.status}. Check its logs and configured model.`);
        const data = await r.json();
        if (data.error || typeof data.message?.content !== 'string') {
          throw new ApiError(502, 'Unexpected AI response. Check Hailo-Ollama and the configured model.');
        }
        return { message: { role: 'assistant', content: data.message.content }, elapsedMs: Math.round(performance.now() - start) };
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error.name === 'TimeoutError') throw new ApiError(504, 'Local AI timed out. The first response may need model warm-up.');
        throw new ApiError(502, 'Cannot reach local AI. Check the Hailo-Ollama service on the configured host and port.');
      } finally { busy = false; }
    }
  };
}
