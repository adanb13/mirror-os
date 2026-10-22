export function mount(root) {
  root.innerHTML = '<div class="section-heading"><h2>At home</h2><span class="tag">HOME ASSISTANT</span></div><div class="entities"><p class="hint">Checking connection…</p></div>';
  const list = root.querySelector('.entities');
  let stopped = false;
  async function refresh() {
    try {
      const response = await fetch('/api/home-assistant');
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (stopped) return;
      list.replaceChildren();
      if (data.state !== 'online') { list.textContent = data.state === 'disabled' ? 'Ready to connect. Add your Home Assistant URL, token and entity IDs in .env.' : 'Home Assistant is unavailable. Check the address, token and entity IDs.'; return; }
      for (const entity of data.entities) {
        const row = document.createElement('div'); row.className = 'entity';
        const name = document.createElement('span'); name.textContent = entity.name;
        const value = document.createElement('strong'); value.textContent = `${entity.state} ${entity.unit}`;
        row.append(name, value); list.append(row);
      }
    } catch { if (!stopped) list.textContent = 'Home status unavailable. Retrying shortly.'; }
  }
  refresh(); const timer = setInterval(refresh, 30000);
  return () => { stopped = true; clearInterval(timer); };
}
