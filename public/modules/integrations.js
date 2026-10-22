export function mount(root) {
  root.innerHTML = '<div class="section-heading"><h2>Connections</h2><span class="eyebrow">GROW WITH YOUR MIRROR</span></div><div class="connections"></div>';
  const list = root.querySelector('.connections');
  let stopped = false;
  async function refresh() {
    try {
      const response = await fetch('/api/integrations');
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (stopped) return;
      list.replaceChildren();
      for (const item of [{ name: 'Hailo-Ollama', state: data.ai.state, detail: data.ai.state === 'online' ? data.ai.model : 'Start your existing AI service on port 8000.' }, ...data.planned]) {
        const row = document.createElement('div'); row.className = 'connection';
        const name = document.createElement('strong'); name.textContent = item.name;
        const state = document.createElement('span'); state.className = `connection-state ${item.state}`; state.textContent = item.state;
        const detail = document.createElement('p'); detail.textContent = item.detail;
        row.append(name, state, detail); list.append(row);
      }
    } catch { if (!stopped) list.textContent = 'Connection status unavailable. Retrying shortly.'; }
  }
  refresh(); const timer = setInterval(refresh, 30000);
  return () => { stopped = true; clearInterval(timer); };
}
