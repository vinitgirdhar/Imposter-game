/* Animation helpers on top of GSAP. Every helper respects reduced motion. */
(function () {
  const gsap = window.gsap;
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** MediaQueryList.addEventListener is Safari 14+; older iOS only has addListener. */
  function onMediaChange(list, fn) {
    if (list.addEventListener) list.addEventListener('change', fn);
    else if (list.addListener) list.addListener(fn);
  }
  const reduced = () => mq.matches;

  const $$ = (root, sel) => Array.from(root.querySelectorAll(sel));

  function haptic(ms = 8) {
    const active = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && active && !reduced()) navigator.vibrate(ms);
  }

  /** Wrap each character in spans so text can be staggered; keeps words unbroken. */
  function splitText(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(' ').map((w) =>
      `<span class="split-word" aria-hidden="true">${[...w].map((c) =>
        `<span class="split-char">${escapeHtml(c)}</span>`).join('')}</span>`
    ).join(' ');
    return $$(el, '.split-char');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /** Screen in: stagger every [data-anim] child; [data-split] text gets a char reveal. */
  function enter(screen) {
    const items = $$(screen, '[data-anim]');
    if (reduced()) return gsap.fromTo(items, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
    const tl = gsap.timeline();
    tl.fromTo(items, { autoAlpha: 0, y: 28, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out', stagger: 0.06 });
    $$(screen, '[data-split]').forEach((el) => {
      tl.fromTo(splitText(el), { yPercent: 110, autoAlpha: 0, rotateX: -70 },
        { yPercent: 0, autoAlpha: 1, rotateX: 0, duration: 0.7, ease: 'expo.out', stagger: 0.025 }, 0.05);
    });
    return tl;
  }

  function leave(screen) {
    if (reduced()) return gsap.to(screen, { autoAlpha: 0, duration: 0.15 });
    return gsap.to(screen, { autoAlpha: 0, y: -18, scale: 0.985, duration: 0.28, ease: 'power2.in' });
  }

  /** Touch feedback for any .btn / .round-btn / tile. */
  function bindPress(root) {
    const sel = '.btn, .round-btn, .icon-btn, .chip, .vote-tile';
    root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest(sel);
      if (!el || el.disabled) return;
      gsap.to(el, { scale: 0.95, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
    });
    const release = (e) => {
      const el = e.target.closest && e.target.closest(sel);
      if (!el) return;
      gsap.to(el, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
    };
    root.addEventListener('pointerup', release);
    root.addEventListener('pointercancel', release);
    root.addEventListener('pointerout', release);
  }

  /** Rolling number: old value slides out, new slides in from the direction of change. */
  function rollCounter(el, value, dir) {
    // Rapid taps: drop any span still mid-exit so digits never stack.
    const spans = Array.from(el.querySelectorAll('span'));
    const old = spans.pop();
    spans.forEach((s) => { gsap.killTweensOf(s); s.remove(); });
    if (old) gsap.killTweensOf(old);
    const next = document.createElement('span');
    next.textContent = value;
    el.appendChild(next);
    if (reduced() || !old) { if (old) old.remove(); return; }
    gsap.fromTo(next, { yPercent: 100 * dir, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' });
    gsap.to(old, { yPercent: -100 * dir, autoAlpha: 0, duration: 0.45, ease: 'expo.out', onComplete: () => old.remove() });
  }

  function shake(el) {
    haptic([10, 40, 10]);
    if (reduced()) return;
    gsap.fromTo(el, { x: 0 }, { x: 0, duration: 0.45, ease: 'none', keyframes: { x: [0, -10, 9, -7, 5, -2, 0] } });
  }

  function pop(el) {
    if (reduced()) return;
    gsap.fromTo(el, { scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'back.out(2.2)' });
  }

  /** Slowly drifting gradient blobs. */
  function ambient() {
    if (reduced()) return;
    [['.blob-a', 12, 8], ['.blob-b', -10, -9], ['.blob-c', -14, 10]].forEach(([sel, x, y], i) => {
      gsap.to(sel, { xPercent: x, yPercent: y, scale: 1.12, duration: 14 + i * 4, ease: 'sine.inOut', repeat: -1, yoyo: true });
    });
  }

  function confetti() {
    if (reduced()) return;
    const layer = document.getElementById('fx-layer');
    const colors = ['#7d7aff', '#ff6482', '#30d158', '#ffd60a', '#64d2ff', '#da8fff'];
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      p.style.background = colors[i % colors.length];
      p.style.left = `${Math.random() * w}px`;
      layer.appendChild(p);
      gsap.fromTo(p, { y: -30 - Math.random() * 200, rotation: Math.random() * 360, scale: 0.6 + Math.random() * 0.6 },
        {
          y: h + 40, x: (Math.random() - 0.5) * 160, rotation: '+=' + (360 + Math.random() * 540),
          duration: 2.2 + Math.random() * 1.6, ease: 'power1.in', delay: Math.random() * 0.4,
          onComplete: () => p.remove(),
        });
    }
  }

  let toastTween;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    if (toastTween) toastTween.kill();
    gsap.set(el, { xPercent: -50, y: -20 });
    toastTween = gsap.timeline()
      .to(el, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'expo.out' })
      .to(el, { autoAlpha: 0, y: -20, duration: 0.3, ease: 'power2.in' }, '+=1.8');
  }

  window.FX = { onMediaChange, reduced, haptic, splitText, escapeHtml, enter, leave, bindPress, rollCounter, shake, pop, ambient, confetti, toast };
})();
