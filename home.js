// Copyright © 2026 Philip J.A Benton. All rights reserved.
// This code is proprietary and may not be reused or redistributed.

// ============================================================
// HOME PAGE
// Exposes init() and leave() for global.js to call via
// initPage() on first load and after each Barba transition.
//
// Manages the full-screen hero slideshow (Splide) that runs
// automatically on the homepage. Per-slide hold durations are
// read from a data-hold attribute on each slide element,
// allowing CMS-driven timing control per image.
// ============================================================

window.homePage = (() => {

  let splide    = null;
  let holdTimer = null;

  // Default hold duration (ms) used when a slide has no
  // data-hold attribute set, or the value is not a valid number
  const DEFAULT_HOLD = 2000;


  // ============================================================
  // SCHEDULE NEXT SLIDE
  // Reads the hold duration from the current slide's data-hold
  // attribute and sets a timer to advance to the next slide.
  // Falls back to DEFAULT_HOLD if the attribute is absent or
  // cannot be parsed as a number. Always clears any existing
  // timer first to prevent stacking if called in quick
  // succession.
  // ============================================================
  function scheduleNext(slideEl) {
    clearTimeout(holdTimer);
    const hold = parseInt(slideEl.dataset.hold, 10);
    holdTimer  = setTimeout(
      () => { if (splide) splide.go('>'); },
      Number.isFinite(hold) ? hold : DEFAULT_HOLD
    );
  }


  // ============================================================
  // INIT
  // Called by global.js initPage() on first load and after
  // each Barba transition to the home namespace.
  //
  // Accepts the incoming Barba container so element queries
  // are scoped to the new page — consistent with how all
  // page-specific init functions are called.
  //
  // Splide config:
  //   type: 'fade'  — opacity-based transition (no movement)
  //   speed: 0      — zero transition duration = hard cut
  //   rewind: true  — loops back to slide 1 after the last
  //   autoplay: false — timing is handled manually via
  //                     scheduleNext() so per-slide durations
  //                     can be respected
  //   pagination / arrows / drag — all disabled for a clean,
  //                     automatic presentation experience
  // ============================================================
  function init(container) {
    const scope    = container || document;
    const sliderEl = scope.querySelector('.hero_showreel');
    if (!sliderEl) return;

    splide = new Splide(sliderEl, {
      type:       'fade',
      speed:      0,
      rewind:     true,
      autoplay:   false,
      pagination: false,
      arrows:     false,
      drag:       false,
    });

    // Start the hold timer for the first slide once Splide
    // has mounted and the initial slide is in place
    splide.on('mounted', () => {
      const current = splide.Components.Slides.getAt(splide.index);
      if (current) scheduleNext(current.slide);
    });

    // After each slide change, schedule the next advance
    // based on the incoming slide's data-hold value
    splide.on('moved', (newIndex) => {
      const current = splide.Components.Slides.getAt(newIndex);
      if (current) scheduleNext(current.slide);
    });

    splide.mount();
  }


  // ============================================================
  // LEAVE
  // Called by global.js Barba leave hook before the page
  // transition begins. Clears the hold timer and destroys the
  // Splide instance to prevent orphaned timers or event
  // listeners carrying over to the incoming page.
  // ============================================================
  function leave() {
    clearTimeout(holdTimer);
    holdTimer = null;
    if (splide) {
      splide.destroy();
      splide = null;
    }
  }


  return { init, leave };

})();
