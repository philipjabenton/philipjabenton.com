// reveals.js — GSAP scroll reveal engine for philipjabenton.com
//
// Adapted from the Image Reveal Lab demo (page: image-reveal-lab). Effects
// are opt-in per element via a data-reveal="<effect>" attribute, so putting
// an existing effect on a new image anywhere on the site never needs a code
// change here — just tag the element in Webflow.
//
// Only "curtain" is wired up below. The rest of the library (rise, wipe-up,
// sweep, letterbox, zoom, focus, colour, split, drift, stagger, iris, skew,
// rule, parallax) exists in the same shape on the Image Reveal Lab page —
// copy an effect's function in here, following the curtain example, whenever
// you're ready to adopt it. No other file needs to change to add one.
//
// Depends on: GSAP + ScrollTrigger (already loaded site-wide).
// Exposes: window.Reveals = { init(root), effects }
//   init(root) scans root (default: document) for [data-reveal] elements,
//   builds and arms each one, and returns the array of ScrollTrigger
//   instances it just created. global.js folds these into its own
//   pageScrollTriggers cleanup list so nothing leaks across Barba
//   transitions — see the initPage() patch alongside this file.

(function (window, document) {
  'use strict';

  var DEFAULT_EASE  = 'expo.out';
  var DEFAULT_START = 'top 82%';

  function opts(el) {
    var n = function (name, fallback) {
      var v = parseFloat(el.getAttribute('data-reveal-' + name));
      return isNaN(v) ? fallback : v;
    };
    return {
      duration: n('duration', null),
      delay:    n('delay', 0),
      stagger:  n('stagger', 0.11),
      amount:   n('amount', 14),
      ease:     el.getAttribute('data-reveal-ease')   || DEFAULT_EASE,
      start:    el.getAttribute('data-reveal-start')  || DEFAULT_START,
      from:     el.getAttribute('data-reveal-from')   || 'left',
      colour:   el.getAttribute('data-reveal-colour') || null,
      repeat:   el.getAttribute('data-reveal-repeat') === 'true'
    };
  }

  function tl(o) {
    return window.gsap.timeline({ paused: true, delay: o.delay || 0 });
  }

  function pic(el) {
    return el.querySelector('img, video, picture') || el;
  }

  function dur(o, fallback) {
    return o.duration != null ? o.duration : fallback;
  }

  var FX = {

    // A solid panel (colour set by --reveal-curtain, or per-instance via
    // data-reveal-colour) covers the image, then lifts away on scroll while
    // the image itself settles from a slight zoom down to 1x.
    curtain: function (el, o) {
      var img   = pic(el);
      var panel = el.querySelector('.reveal-curtain');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'reveal-curtain';
        el.appendChild(panel);
      }
      if (o.colour) { panel.style.background = o.colour; }
      gsap.set(panel, { yPercent: 0 });
      gsap.set(img,   { scale: 1.14 });
      return tl(o)
        .to(panel, { yPercent: -101, duration: dur(o, 1.0), ease: o.ease }, 0)
        .to(img,   { scale: 1, duration: 1.3, ease: o.ease }, 0);
    }

  };

  function reveal(root) {
    root = root || document;
    var els = [].slice.call(root.querySelectorAll('[data-reveal]'));
    var created = [];

    els.forEach(function (el) {
      if (el.__revealDone) { return; }
      el.__revealDone = true;

      var fn = FX[el.getAttribute('data-reveal')];
      if (!fn) { el.style.visibility = 'visible'; return; }

      var o = opts(el);
      el.style.visibility = 'visible';

      var t = fn(el, o);
      el.__revealTl = t;
      if (!t) { return; }

      var st = ScrollTrigger.create({
        trigger: el,
        start: o.start,
        once: !o.repeat,
        onEnter:     function () { t.restart(true); },
        onEnterBack: function () { if (o.repeat) { t.restart(true); } }
      });
      created.push(st);
    });

    ScrollTrigger.refresh();
    return created;
  }

  // Optional: give any element data-reveal-replay (pointing at a selector,
  // or blank to replay its own .rl-card/self) to re-trigger reveals inside
  // it on click. Not required for curtain to work — harmless if unused.
  function bindReplay() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-reveal-replay]');
      if (!btn) { return; }
      var sel   = btn.getAttribute('data-reveal-replay');
      var scope = sel ? document.querySelector(sel) : btn.closest('.rl-card') || document;
      var targets = [].slice.call(scope.querySelectorAll('[data-reveal]'));
      targets.forEach(function (el) {
        if (el.__revealTl) { el.__revealTl.restart(true); }
      });
    });
  }

  function showEverything() {
    document.documentElement.classList.add('reveal-off');
  }

  function boot() {
    if (!window.gsap || !window.ScrollTrigger) { showEverything(); return; }
    gsap.registerPlugin(ScrollTrigger);

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showEverything();
      return;
    }

    reveal(document);
    bindReplay();

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  setTimeout(function () {
    if (!window.gsap) { showEverything(); }
  }, 3000);

  window.Reveals = { init: reveal, effects: FX };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window, document);
