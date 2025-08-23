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
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => target.focus({ preventScroll: true }), 300);
        history.replaceState(null, '', href);
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

    const initial = (location.hash && ids.includes(location.hash)) ? location.hash : '#home';
    setActive(initial);

    window.addEventListener('hashchange', () => {
      const h = (location.hash && ids.includes(location.hash)) ? location.hash : '#home';
      setActive(h);
    });
  }

  function initRevealOnScroll() {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nodes = document.querySelectorAll('[data-reveal]');

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

    setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => ro.observe(el));
    }, 300);
  }

  // -----------------------
  // EXPERIENCE: tabs/ink/brand color + bullet reveal
  // -----------------------
  function initExperienceTabs() {
    const tabs   = Array.from(document.querySelectorAll('.xp-tab'));
    const panels = Array.from(document.querySelectorAll('.xp-panel'));
    const list   = document.querySelector('.xp-tabs');
    const ink    = list ? list.querySelector('.xp-indicator') : null;
    const section = document.querySelector('.xp');
    if (!tabs.length || !panels.length || !list || !ink || !section) return;

    const idFromTab  = (btn) => btn.id.replace(/^tab-/, '');
    const isVertical = () => window.matchMedia('(min-width: 981px)').matches;

    function moveInkTo(btn){
      const rBtn  = btn.getBoundingClientRect();
      const rList = list.getBoundingClientRect();
      if (isVertical()) {
        ink.style.height    = rBtn.height + 'px';
        ink.style.width     = '2px';
        ink.style.transform = `translateY(${btn.offsetTop}px)`;
      } else {
        const left = rBtn.left - rList.left + list.scrollLeft;
        ink.style.width     = rBtn.width + 'px';
        ink.style.height    = '2px';
        ink.style.transform = `translateX(${left}px)`;
      }
    }

    function applyBrandFrom(btn){
      const brand = (btn && btn.dataset.brand || '').trim();
      const fallback = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#DFD0B8';
      section.style.setProperty('--xp-accent', brand || fallback);
    }

    function revealBullets(panel){
      panels.forEach(p =>
        p.querySelectorAll('.bullets li').forEach(li => {
          li.classList.remove('in');
          li.style.transitionDelay = '';
        })
      );
      const items = Array.from(panel.querySelectorAll('.bullets li'));
      items.forEach((li, i) => {
        li.style.transitionDelay = (i * 80) + 'ms';
        requestAnimationFrame(() => li.classList.add('in'));
      });
    }

    function activate(id){
      const activeBtn = tabs.find(t => idFromTab(t) === id);  // define it!

      tabs.forEach(t => {
        const on = idFromTab(t) === id;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (on) moveInkTo(t);
      });

      let activePanel = null;
      panels.forEach(p => {
        const on = p.id === 'xp-' + id;
        p.classList.toggle('is-active', on);
        if (on) activePanel = p;
      });

      if (activePanel) revealBullets(activePanel);
      applyBrandFrom(activeBtn);
    }

    function attachRipple(btn){
      btn.addEventListener('pointerdown', (e) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--rx', (e.clientX - rect.left) + 'px');
        btn.style.setProperty('--ry', (e.clientY - rect.top)  + 'px');
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 420);
      }, { passive: true });
    }

    tabs.forEach(btn => {
      attachRipple(btn);
      btn.addEventListener('click', () => activate(idFromTab(btn)));
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

    const m = location.hash && location.hash.match(/experience=([\w-]+)/);
    const first = tabs.find(t => t.classList.contains('is-active')) || tabs[0];
    activate(m ? m[1] : idFromTab(first));

    const align = () => {
      const active = tabs.find(t => t.classList.contains('is-active'));
      if (active) moveInkTo(active);
    };
    window.addEventListener('resize', () => requestAnimationFrame(align));
    list.addEventListener('scroll', () => requestAnimationFrame(align));
  }

  // -----------------------
  // PROJECTS: featured carousel
  // -----------------------
  function initProjectsCarousel(){
    const hero = document.querySelector('.proj-hero');
    if (!hero) return;

    const slides   = Array.from(hero.querySelectorAll('.proj-slide'));
    const dotsWrap = hero.querySelector('.proj-dots');
    let dots       = Array.from(hero.querySelectorAll('.proj-dots .dot'));
    const prev     = hero.querySelector('.proj-nav.prev');
    const next     = hero.querySelector('.proj-nav.next');

    if (!slides.length) return;

    // Ensure hero can receive keyboard events
    if (!hero.hasAttribute('tabindex')) hero.setAttribute('tabindex','0');

    // Create dots if missing
    if (dotsWrap && dots.length === 0) {
      slides.forEach((s, k) => {
        const b = document.createElement('button');
        b.className = 'dot' + (k === 0 ? ' is-active' : '');
        b.setAttribute('role', 'tab');
        if (!s.id) s.id = `slide-${k+1}`;
        b.setAttribute('aria-controls', s.id);
        dotsWrap.appendChild(b);
      });
      dots = Array.from(hero.querySelectorAll('.proj-dots .dot'));
    }

    let i = Math.max(0, slides.findIndex(s => s.classList.contains('is-active')));

    function show(n){
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => {
        const on = k === i;
        d.classList.toggle('is-active', on);
        d.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    prev && prev.addEventListener('click', () => show(i - 1));
    next && next.addEventListener('click', () => show(i + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => show(k)));

    // Keyboard + swipe
    hero.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
    let x0 = null;
    hero.addEventListener('pointerdown', e => x0 = e.clientX, { passive:true });
    hero.addEventListener('pointerup',   e => {
      if (x0 == null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    }, { passive:true });

    // Autoplay 6s, pause on hover/focus
    let t = null;
    const start = () => (t = setInterval(() => show(i + 1), 6000));
    const stop  = () => (t && clearInterval(t), t = null);
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', start);

    show(i || 0);
    start();
  }

  // -----------------------
  // HERO WIDGET (optional, safe if file missing)
  // -----------------------
  function initSeaweedWidget() {
    const host = document.getElementById('hero-3d') || document.getElementById('seaweed');
    if (!host) return;

    const spec = new URL('./r3f-widget/dist/seaweed-widget.js', document.baseURI).href;

    import(spec)
      .then(({ mountSeaweed }) => {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#222831';
        mountSeaweed(host, { height: host.clientHeight || 380, background: bg });
        console.log('[seaweed] mounted into #' + host.id);
      })
      .catch((err) => {
        console.error('[seaweed] import failed:', err);
      });
  }

  // -----------------------
  // BOOT
  // -----------------------
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
    initProjectsCarousel();
    initSeaweedWidget(); // safe if not present

    // Footer year
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
