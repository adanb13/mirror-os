export function mount(root) {
  root.innerHTML = '<p class="eyebrow">TODAY’S FOCUS</p><label class="sr-only" for="focus">Today’s focus</label><textarea id="focus" rows="2" maxlength="240" placeholder="Make room for what matters."></textarea><p class="hint">Your note stays in this browser.</p>';
  const input = root.querySelector('textarea');
  const hint = root.querySelector('.hint');
  try { input.value = localStorage.getItem('mirror-os:focus') || ''; }
  catch { hint.textContent = 'Browser storage is unavailable; this note lasts until refresh.'; }
  input.addEventListener('input', () => {
    try { localStorage.setItem('mirror-os:focus', input.value); }
    catch { hint.textContent = 'Could not save this note in browser storage.'; }
  });
}
