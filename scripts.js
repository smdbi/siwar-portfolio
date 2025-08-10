(function () {
  const STORAGE_KEY = 'theme';
  const DOC = document.documentElement;

  // ---- helpers ----
  const prefersDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const getTheme = () => DOC.getAttribute('data-theme') || 'dark';

  const applyThemeVars = (mode) => {
    // Keep CSS vars in sync (optional if your CSS already handles html[data-theme])
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
      mq.addEventListener ? mq.addEventListener('change', onChange)
                          : mq.addListener && mq.addListener(onChange);
    }

    // ----- compute --nav-h so anchor jumps account for sticky header -----
    const navEl = document.querySelector('.nav');
    const setNavVar = () => {
      const h = (navEl?.offsetHeight || 64);
      document.documentElement.style.setProperty('--nav-h', `${h}px`);
    };
    setNavVar();
    window.addEventListener('resize', setNavVar);

    // ----- Scroll spy: highlight active section in the primary nav -----
    const sectionEls = document.querySelectorAll('main#home, section[id]');
    const headerNavLinks = Array.from(document.querySelectorAll('header.nav nav a'));

    // Map #id -> <a>
    const linkById = new Map(
      headerNavLinks
        .filter(a => (a.getAttribute('href') || '').startsWith('#'))
        .map(a => [a.getAttribute('href').slice(1), a])
    );

    const setActive = (id) => {
      headerNavLinks.forEach(a => {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      });
      const link = linkById.get(id);
      if (link) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page'); // accessibility: current page/section
      }
    };

    // Observe section visibility; activate when section top enters viewport
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.id) {
          setActive(entry.target.id);
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0.1 });

    sectionEls.forEach(el => io.observe(el));

    // If page loads with a hash, set active immediately
    if (location.hash && linkById.has(location.hash.slice(1))) {
      setActive(location.hash.slice(1));
    } else {
      setActive('home');
    }
  });

  // keep CSS vars in sync if someone changes data-theme elsewhere
  new MutationObserver(() => applyThemeVars(getTheme()))
    .observe(DOC, { attributes: true, attributeFilter: ['data-theme'] });
})();
