// Theme toggle, active-link (scroll-spy), reveal-on-scroll, smooth anchors, sticky offset calc
(function () {
  const STORAGE_KEY = 'theme';
  const DOC = document.documentElement;
  const btn = document.getElementById('themeToggle');

  // Prefer OS if the user hasn't chosen yet
  const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function getSaved() { return localStorage.getItem(STORAGE_KEY); }
  function setSaved(v) { localStorage.setItem(STORAGE_KEY, v); }

  function applyTheme(mode) {
    DOC.setAttribute('data-theme', mode);
    if (btn) {
      btn.setAttribute('aria-pressed', String(mode === 'dark'));
      btn.title = `Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`;
    }
  }

  function currentTheme() {
    return DOC.getAttribute('data-theme') || 'dark';
  }

  function initTheme() {
    const saved = getSaved();
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return;
    }
    const osDark = mql ? mql.matches : true;
    applyTheme(osDark ? 'dark' : 'light');
  }

  function initSmoothAnchorsAndFocus() {
    // Smooth scroll + move focus to target for a11y
    document.querySelectorAll('a[data-link]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        // Make sure the target can be focused programmatically
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Move focus after the scroll to help keyboard/screen reader users
        setTimeout(() => target.focus({ preventScroll: true }), 300);
        history.replaceState(null, '', href); // keep URL hash in sync
      });
    });
  }

  function initStickyOffsetVar() {
    const navEl = document.querySelector('.nav');
    const setNavVar = () => {
      const h = (navEl?.offsetHeight || 64);
      DOC.style.setProperty('--nav-h', `${h}px`);
    };
    setNavVar();
    window.addEventListener('resize', setNavVar);
  }

  function initScrollSpy() {
    const links = Array.from(document.querySelectorAll('.nav-left a[data-link]'));
    const linkByHash = new Map(links.map(a => [a.getAttribute('href'), a]));
    const ids = ['#home', '#about', '#experience', '#work', '#contact'];

    const setActive = (hash) => {
      links.forEach(l => l.classList.remove('is-active'));
      const el = linkByHash.get(hash);
      if (el) el.classList.add('is-active');
    };

    // IntersectionObserver for sections
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive('#' + entry.target.id);
        });
      }, { root: null, rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });

      ids.forEach(h => {
        const el = document.querySelector(h);
        if (el) spy.observe(el);
      });
    }

    // Set initial active state on load (before IO fires)
    const initial = (location.hash && ids.includes(location.hash)) ? location.hash : '#home';
    setActive(initial);

    // Also respond to manual hash changes (e.g., user edits URL)
    window.addEventListener('hashchange', () => {
      const h = (location.hash && ids.includes(location.hash)) ? location.hash : '#home';
      setActive(h);
    });
  }

  function initRevealOnScroll() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = document.querySelectorAll('[data-reveal]');

    // Reduced motion or no IO support → reveal immediately
    if (reduce || !('IntersectionObserver' in window)) {
      nodes.forEach(el => el.classList.add('is-in'));
      return;
    }

    const ro = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });

    nodes.forEach(el => ro.observe(el));

    // Optional: re-run once after layout settles (images, fonts)
    setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => ro.observe(el));
    }, 300);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Theme
    initTheme();
    if (btn) {
      btn.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        setSaved(next);
      });
    }
    if (mql) {
      const onChange = (e) => { if (!getSaved()) applyTheme(e.matches ? 'dark' : 'light'); };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }

    // Layout + interactions
    initStickyOffsetVar();
    initSmoothAnchorsAndFocus();
    initScrollSpy();
    initRevealOnScroll();
    initExperienceTabs();

    // Footer year
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
  
  
  
 function initExperienceTabs() {
  const tabs   = Array.from(document.querySelectorAll('.xp-tab'));
  const panels = Array.from(document.querySelectorAll('.xp-panel'));
  const list   = document.querySelector('.xp-tabs');
  const ink    = list ? list.querySelector('.xp-indicator') : null;
  const section = document.querySelector('.xp');
  if (!tabs.length || !panels.length || !list || !ink) return;

  const idFromTab  = (btn) => btn.id.replace(/^tab-/, '');
  const isVertical = () => window.matchMedia('(min-width: 981px)').matches;

  /* ---- ink bar placement ---- */
  function moveInkTo(btn){
    const rBtn  = btn.getBoundingClientRect();
    const rList = list.getBoundingClientRect();

    if (isVertical()) {
      // vertical list: bar slides along Y and matches button height
      ink.style.height    = rBtn.height + 'px';
      ink.style.width     = '2px';
      ink.style.transform = `translateY(${btn.offsetTop}px)`;
    } else {
      // horizontal on mobile: bar slides along X and matches button width
      const left = rBtn.left - rList.left + list.scrollLeft;
      ink.style.width     = rBtn.width + 'px';
      ink.style.height    = '2px';
      ink.style.transform = `translateX(${left}px)`;
    }
  }
  // apply the brand color from the active tab
  function applyBrandFrom(btn){
    const brand = (btn && btn.dataset.brand || '').trim();
    const fallback = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#DFD0B8';
    section.style.setProperty('--xp-accent', brand || fallback);
  }
  /* ---- staggered reveal for bullets in active panel ---- */
  function revealBullets(panel){
    // reset any previous state
    panels.forEach(p =>
      p.querySelectorAll('.bullets li').forEach(li => {
        li.classList.remove('in');
        li.style.transitionDelay = '';
      })
    );
    const items = Array.from(panel.querySelectorAll('.bullets li'));
    items.forEach((li, i) => {
      li.style.transitionDelay = (i * 80) + 'ms'; // 80ms step; tune as desired
      requestAnimationFrame(() => li.classList.add('in'));
    });
  }

  /* ---- activate tab + panel ---- */
  function activate(id){
    tabs.forEach(t => {
      const active = idFromTab(t) === id;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.tabIndex = active ? 0 : -1;
      if (active) moveInkTo(t);
    });

    let activePanel = null;
    panels.forEach(p => {
      const on = p.id === 'xp-' + id;
      p.classList.toggle('is-active', on);
      if (on) activePanel = p;
    });
    
    if (activePanel) revealBullets(activePanel);
    if (activeBtn) applyBrandFrom(activeBtn);
  }

  /* ---- ripple feedback on press ---- */
  function attachRipple(btn){
    btn.addEventListener('pointerdown', (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', (e.clientX - rect.left) + 'px');
      btn.style.setProperty('--ry', (e.clientY - rect.top)  + 'px');
      btn.classList.add('is-pressed');
      setTimeout(() => btn.classList.remove('is-pressed'), 420);
    }, { passive: true });
  }

  /* ---- wire up tabs ---- */
  tabs.forEach(btn => {
    attachRipple(btn);

    btn.addEventListener('click', () => activate(idFromTab(btn)));

    // keyboard navigation
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const i = (tabs.indexOf(btn) + 1) % tabs.length;
        tabs[i].focus(); tabs[i].click();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const i = (tabs.indexOf(btn) - 1 + tabs.length) % tabs.length;
        tabs[i].focus(); tabs[i].click();
      }
    });
  });

  /* ---- initial state (supports #experience=company) ---- */
  const m = location.hash && location.hash.match(/experience=([\w-]+)/);
  const first = tabs.find(t => t.classList.contains('is-active')) || tabs[0];
  activate(m ? m[1] : idFromTab(first));

  /* ---- keep ink aligned on resize/scroll ---- */
  const align = () => {
    const active = tabs.find(t => t.classList.contains('is-active'));
    if (active) moveInkTo(active);
  };
  window.addEventListener('resize', () => requestAnimationFrame(align));
  list.addEventListener('scroll', () => requestAnimationFrame(align));
}


  
})();


