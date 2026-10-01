/* Tema perla (claro) / noche (oscuro). Se carga en <head> para evitar parpadeo.
   La elección se guarda solo en este navegador. */
(function () {
  'use strict';
  var KEY = 'kallari-inmoconecta-theme';
  var root = document.documentElement;
  var SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg class="moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z"/></svg>';
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function apply(t) {
    root.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#121315' : '#f4f2ee');
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-checked', t === 'dark' ? 'true' : 'false');
      btns[i].setAttribute('title', t === 'dark' ? 'Cambiar a modo perla' : 'Cambiar a modo noche');
    }
  }
  function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  function toggle() {
    var t = current() === 'dark' ? 'light' : 'dark';
    root.classList.add('theme-switching');
    apply(t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* sin almacenamiento */ }
    setTimeout(function () { root.classList.remove('theme-switching'); }, 400);
  }
  apply(saved() || 'light');
  function bind() {
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.dataset.bound) continue;
      b.dataset.bound = '1';
      b.setAttribute('role', 'switch');
      b.setAttribute('aria-label', 'Modo oscuro');
      b.innerHTML = SUN + MOON + '<span class="knob" aria-hidden="true"></span>';
      b.addEventListener('click', toggle);
    }
    apply(current());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  window.KTheme = { toggle: toggle, apply: apply };
})();
