// case.js
document.querySelectorAll('.goal__bar, .goal__bar--pos').forEach(el=>{
  const p = el.style.getPropertyValue('--p') || '0%';
  el.style.setProperty('--p', '0%');
  const io = new IntersectionObserver(([e],o)=>{
    if(e.isIntersecting){ el.style.setProperty('--p', p); o.disconnect(); }
  }, {threshold:.4});
  io.observe(el);
});
document.addEventListener('DOMContentLoaded', () => {
  // ---- TOC highlight on scroll (IntersectionObserver) ----
  const headings = [...document.querySelectorAll('.case-body .section[id]')];
  const tocLinks = new Map(
    [...document.querySelectorAll('.toc a')].map(a => [a.getAttribute('href').slice(1), a])
  );

  const setActive = (id) => {
    tocLinks.forEach(link => link.classList.remove('active'));
    const el = tocLinks.get(id);
    if (el) { el.classList.add('active'); el.setAttribute('aria-current', 'true'); }
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.target.id) setActive(e.target.id);
    });
  }, { rootMargin: '-35% 0px -60% 0px', threshold: 0.1 });

  headings.forEach(h => io.observe(h));

  // ---- Lightbox using <dialog> ----
  const dlg = document.getElementById('imgLightbox');
  const dlgImg = document.getElementById('dialogImg');
  const closeBtn = dlg?.querySelector('.dialog__close');

  const open = (src, alt='') => {
    if (!dlg || !dlgImg) return;
    dlgImg.src = src; dlgImg.alt = alt;
    if (typeof dlg.showModal === 'function') dlg.showModal(); // native modal
    else dlg.setAttribute('open', 'open');
  };
  const close = () => dlg?.close && dlg.close();

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t instanceof HTMLImageElement && t.hasAttribute('data-zoom')) {
      open(t.src, t.alt || '');
    }
    if (t?.classList?.contains('dialog__close')) close();
  });
  dlg?.addEventListener('click', (e) => {
    // click backdrop area to close
    const rect = dlg.getBoundingClientRect();
    const inDialog = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inDialog) close();
  });
});

