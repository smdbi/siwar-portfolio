// scripts.js (full updated version)
(function () {
  const STORAGE_KEY = 'theme';
  const DOC = document.documentElement;

  // ---- helpers ----
  const prefersDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const getTheme = () => DOC.getAttribute('data-theme') || 'dark';

  const applyThemeVars = (mode) => {
    // If you're using CSS :root + html[data-theme="light"] overrides, you can
    // delete this function. Otherwise keep it to set vars in JS.
    const set = (k, v) => DOC.style.setProperty(k, v);
    if (mode === 'light') {
      set('--bg', '#f8fafc'); set('--text', '#0b1220'); set('--muted', '#4b5563');
      set('--elev', '#ffffff'); set('--card', '#f1f5f9'); set('--border', '#e2e8f0');
    } else {
      set('--bg', '#0b0f14'); set('--text', '#eaf0f6'); set('--muted', '#aab6c4');
      set('--elev', '#121821'); set('--card', '#0f141b'); set('--border', '#223044');
    }
  };

  const updateToggleButton = (btn, mode) => {
    if (!btn) return;
    const isDark = mode === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    btn.title = `Switch to ${isDark ? 'light' : 'dark'} mode`;
    // Optional: swap icon look
    btn.classList.toggle('torch-on', isDark);
  };

  const setTheme = (mode, persist = true) => {
    DOC.setAttribute('data-theme', mode);
    applyThemeVars(mode);
    if (persist) localStorage.setItem(STORAGE_KEY, mode);
  };

  // ---- init ----
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');

    // initial mode: saved -> OS preference -> dark
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved || (prefersDark() ? 'dark' : 'light');
    setTheme(initial, Boolean(saved));
    updateToggleButton(btn, initial);

    // toggle click
    btn && btn.addEventListener('click', () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next, true);
      updateToggleButton(btn, next);
    });

    // follow OS changes only if user hasn't chosen manually
    if (!saved && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = (e) => {
        const mode = e.matches ? 'dark' : 'light';
        setTheme(mode, false);
        updateToggleButton(btn, mode);
      };
      // modern browsers
      mq.addEventListener ? mq.addEventListener('change', onChange)
                          : mq.addListener && mq.addListener(onChange);
    }
  });

  // keep CSS vars in sync if someone changes data-theme elsewhere
  new MutationObserver(() => applyThemeVars(getTheme()))
    .observe(DOC, { attributes: true, attributeFilter: ['data-theme'] });
})();
