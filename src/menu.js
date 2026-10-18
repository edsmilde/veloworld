export function bindMenu(root = document, storage) {
  if (!storage) { try { storage = globalThis.localStorage; } catch { /* Private/blocked storage. */ } }
  const menu = root.getElementById('ride-menu');
  const show = root.getElementById('menu-show');
  const hide = root.getElementById('menu-hide');
  const key = 'veloworld-menu-collapsed';
  function setCollapsed(collapsed, focus = false) {
    menu.hidden = collapsed;
    show.hidden = !collapsed;
    show.setAttribute('aria-expanded', String(!collapsed));
    hide.setAttribute('aria-expanded', String(!collapsed));
    try { storage.setItem(key, String(collapsed)); } catch { /* Storage may be unavailable. */ }
    if (focus) (collapsed ? show : hide).focus();
  }
  let collapsed = false;
  try { collapsed = storage.getItem(key) === 'true'; } catch { /* Use expanded default. */ }
  setCollapsed(collapsed);
  hide.addEventListener('click', () => setCollapsed(true, true));
  show.addEventListener('click', () => setCollapsed(false, true));
}
