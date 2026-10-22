export function mount(root, config) {
  root.innerHTML = '<div class="section-heading"><h2>Ask your mirror</h2><span class="tag">LOCAL AI</span></div><p class="hint">A little clarity, whenever you need it.</p><div class="transcript" aria-live="polite"></div><form><label class="sr-only" for="question">Your message</label><div class="prompt"><input id="question" maxlength="4000" autocomplete="off" placeholder="What’s on your mind?" required><button type="submit">Ask ↗</button></div></form><div class="assistant-bottom"><p class="status" role="status">Ready</p><button class="text-button" type="button">Clear chat</button></div>';
  const form = root.querySelector('form');
  const input = root.querySelector('input');
  const send = root.querySelector('[type=submit]');
  const clear = root.querySelector('.text-button');
  const transcript = root.querySelector('.transcript');
  const status = root.querySelector('.status');
  let messages = [];
  let active;
  const addMessage = (role, text) => {
    const paragraph = document.createElement('p'); paragraph.className = `message ${role}`;
    const label = document.createElement('span'); label.textContent = role === 'user' ? 'YOU' : 'MIRROR';
    const content = document.createElement('span'); content.textContent = text;
    paragraph.append(label, content); transcript.append(paragraph); transcript.scrollTop = transcript.scrollHeight;
    return paragraph;
  };
  clear.addEventListener('click', () => { messages = []; transcript.replaceChildren(); status.textContent = 'Ready'; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (active || !input.value.trim()) return;
    const question = input.value.trim(); input.value = '';
    const line = addMessage('user', question);
    // Bound every message so the next request cannot exceed the server context limit.
    const requestMessages = [...messages.slice(-6), { role: 'user', content: question }];
    send.disabled = true; clear.disabled = true;
    active = new AbortController();
    const started = performance.now();
    const update = () => { status.textContent = `Thinking locally · ${Math.floor((performance.now() - started) / 1000)}s`; };
    update(); const timer = setInterval(update, 1000);
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: requestMessages }), signal: active.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The local AI could not reply.');
      addMessage('assistant', data.message.content);
      messages = [...requestMessages, { role: 'assistant', content: data.message.content.slice(0, 4000) }];
      status.textContent = `Replied in ${(data.elapsedMs / 1000).toFixed(1)}s · ${config.model}`;
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'Request cancelled.' : error.message;
      line.classList.add('failed'); input.value = question;
    } finally { clearInterval(timer); active = null; send.disabled = false; clear.disabled = false; }
  });
  return () => active?.abort();
}
