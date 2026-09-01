// reveals.js — GSAP scroll reveal engine for philipjabenton.com
//
// Adapted from the Image Reveal Lab demo (page: image-reveal-lab). Effects
// are opt-in per element via a data-reveal="<effect>" attribute, so putting
// an existing effect on a new image anywhere on the site never needs a code
// change here — just tag the element in Webflow.
//
// "curtain" (image), "word-rise"/"letter-rise"/"fade-rise" (text), and
// "sequence" (groups several of the above into one timed beat — see its
// comment below) are wired up below. The rest of the image library (rise,
// wipe-up, sweep, letterbox, zoom, focus, colour, split, drift, stagger,
// iris, skew, rule, parallax) exists in the same shape on the Image Reveal
// Lab page, and the rest of the text library (mask-rise, character-wave,
// soft-focus, proof-wipe, ink-gradient, and the other Text Reveal Lab
// specimens) exists the same way on the Text Reveal Lab page — copy an
// effect's function in here, following the curtain/word-rise/letter-rise
// examples, whenever you're ready to adopt one. No other file needs to
// change to add one; text effects use the exact same [data-reveal]
// attribute and FX dispatch as image effects, just built with SplitText
// instead of pic().
//
// Depends on: GSAP + ScrollTrigger (already loaded site-wide). "word-rise"
// and "letter-rise" additionally need the SplitText plugin loaded before
// this file — add
// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/SplitText.min.js">
// alongside the existing GSAP script tag if it isn't there yet. If SplitText
// isn't present, those two effects no-op and the element is just made
// visible (see the guard inside each effect below) — it won't break the
// page. "fade-rise" and "sequence" have no SplitText dependency.
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
    },

    // Splits the element's text into words and rises each one in from
    // below on a short, even fade — the mechanic read directly off
    // instrument.com's live DOM (Text Reveal Lab, Specimen A: their hero
    // words sit inline-block at opacity:0/translateY(20px) before firing).
    // Reuses the same generic knobs every other effect uses: amount is the
    // rise distance in px (default 14 — set data-reveal-amount="20" on an
    // element to match Instrument's own value exactly), ease/stagger/
    // duration all come from the usual data-reveal-* attributes.
    // No-ops (leaves the text visible, unanimated) if SplitText hasn't
    // loaded — see the dependency note at the top of this file.
    'word-rise': function (el, o) {
      if (!window.SplitText) { return null; }
      var split = SplitText.create(el, { type: 'words' });
      gsap.set(split.words, { opacity: 0, y: o.amount });
      return tl(o)
        .to(split.words, {
          opacity: 1,
          y: 0,
          duration: dur(o, 0.7),
          ease: o.ease,
          stagger: o.stagger
        }, 0);
    },

    // Same mechanic as word-rise, one level finer: splits into characters
    // instead of words, so each letter rises in on its own stagger step.
    // Reads best on short, large-type lines (headings, not paragraphs) —
    // a long paragraph split to chars produces hundreds of staggered
    // tweens. The default stagger (0.11s, tuned for word-rise) is far too
    // slow at character granularity, so this uses its own tighter default
    // (0.02s) unless data-reveal-stagger is set explicitly — same pattern
    // dur() already uses for duration. Everything else (amount, ease,
    // duration) comes from the same data-reveal-* attributes as every
    // other effect. No-ops if SplitText hasn't loaded.
    'letter-rise': function (el, o) {
      if (!window.SplitText) { return null; }
      var split = SplitText.create(el, { type: 'chars' });
      var staggerSet = el.hasAttribute('data-reveal-stagger');
      gsap.set(split.chars, { opacity: 0, y: o.amount });
      return tl(o)
        .to(split.chars, {
          opacity: 1,
          y: 0,
          duration: dur(o, 0.5),
          ease: o.ease,
          stagger: staggerSet ? o.stagger : 0.02
        }, 0);
    },

    // A plain single-element fade + rise — no SplitText, so it works on
    // any block of text (or any element at all) without splitting it into
    // words or characters. The natural choice for a lead paragraph,
    // button, or caption sitting alongside a split heading inside a
    // data-reveal="sequence" group — splitting every word of a lead
    // sentence is usually more motion than it needs. Same generic amount/
    // ease/duration attributes as every other effect.
    'fade-rise': function (el, o) {
      gsap.set(el, { opacity: 0, y: o.amount });
      return tl(o)
        .to(el, {
          opacity: 1,
          y: 0,
          duration: dur(o, 0.6),
          ease: o.ease
        }, 0);
    },

    // Orchestrates several *different* effects as one timed group, rather
    // than each firing independently the moment it crosses its own
    // ScrollTrigger line. Put data-reveal="sequence" on the wrapping
    // container; give each child its own data-reveal="<effect>" (any of
    // the above — word-rise, fade-rise, curtain, whatever fits) plus its
    // own per-effect attributes exactly as normal. sequence doesn't
    // replace those — it builds each child's timeline the usual way, then
    // decides WHEN each one starts. One shared ScrollTrigger on the
    // container fires the whole group together, so a hero's headline,
    // lead text and image reveal as one coordinated beat instead of
    // drifting relative to each other (which independent per-element
    // ScrollTriggers + data-reveal-delay can't reliably guarantee once
    // elements sit at different scroll positions).
    //
    // Ordering follows document order (top-to-bottom in the HTML) - no
    // separate index attribute needed. The gap between each child's start
    // is data-reveal-stagger set on the GROUP element itself (same
    // attribute/meaning as everywhere else — default 0.11s; try something
    // like 0.25-0.4 on a hero for a slower, more deliberate beat). A
    // child's own data-reveal-start/data-reveal-repeat are ignored, since
    // it no longer has its own trigger — those only matter on the group
    // element. Reusable anywhere this multi-step pattern shows up, not
    // hero-specific.
    sequence: function (el, o) {
      var children = [].slice.call(el.querySelectorAll('[data-reveal]'));
      if (!children.length) { return null; }

      var master = tl(o);

      children.forEach(function (child, i) {
        // Claim each child now, before the outer scan (which will reach
        // these same elements later, since querySelectorAll returns them
        // in document order after this container) gets to them — sequence
        // owns their timing, so they must not also get an independent
        // ScrollTrigger of their own.
        child.__revealDone = true;

        var fn = FX[child.getAttribute('data-reveal')];
        if (!fn) { child.style.visibility = 'visible'; return; }

        var co = opts(child);
        var childTl = fn(child, co);
        child.style.visibility = 'visible';
        if (childTl) {
          // Every effect function builds its timeline paused (see tl()) so
          // it can be armed and fired later by its own ScrollTrigger. Here
          // there is no per-child trigger — master's playhead is what
          // drives it — so the child must be unpaused, or its own paused
          // flag blocks it from advancing even while nested and even
          // though master itself is playing.
          childTl.paused(false);
          master.add(childTl, i * o.stagger);
        }
      });

      return master;
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

      // Build the effect (and set its hidden starting state) BEFORE the
      // container is allowed to paint. Previously this order was reversed,
      // which left a brief window — usually invisible, but real — where
      // the container was visible before its content had been split and
      // hidden, showing a flash of the untouched text/image. Effects that
      // don't depend on ordering (curtain, which sets its own hidden state
      // on existing children) are unaffected; this matters most for
      // word-rise, whose split() call is what actually creates the
      // elements it needs to hide.
      var t = fn(el, o);
      el.style.visibility = 'visible';
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
    if (window.SplitText) { gsap.registerPlugin(SplitText); }

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
