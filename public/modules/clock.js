export function mount(root, config) {
  root.innerHTML = '<p class="eyebrow">A MOMENT FOR YOU</p><h1 class="greeting"></h1><time class="clock"></time><p class="date"></p>';
  function tick() {
    const date = new Date();
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, hour: '2-digit', hourCycle: 'h23' }).format(date));
    root.querySelector('.greeting').textContent = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
    root.querySelector('time').textContent = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    root.querySelector('time').dateTime = date.toISOString();
    root.querySelector('.date').textContent = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  }
  tick(); const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
}
