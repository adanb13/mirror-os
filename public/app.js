import { mount as clock } from './modules/clock.js';
import { mount as notes } from './modules/notes.js';
import { mount as assistant } from './modules/assistant.js';
import { mount as integrations } from './modules/integrations.js';
import { mount as homeAssistant } from './modules/home-assistant.js';

const registry = { clock, notes, assistant, integrations, 'home-assistant': homeAssistant };
const cleanups = [];
try {
  const response = await fetch('/api/config');
  if (!response.ok) throw new Error();
  const config = await response.json();
  document.querySelector('#title').textContent = config.title;
  document.title = `${config.title} · Mirror OS`;
  for (const id of config.modules) {
    if (!registry[id]) continue;
    const section = document.createElement('section');
    section.className = `module module-${id}`;
    section.dataset.module = id;
    document.querySelector('#dashboard').append(section);
    cleanups.push(registry[id](section, config));
  }
} catch {
  const error = document.querySelector('#startup-error');
  error.hidden = false;
  error.textContent = 'The dashboard could not load. Refresh the page and check the dashboard service.';
}
window.addEventListener('pagehide', () => cleanups.forEach(fn => fn?.()));
