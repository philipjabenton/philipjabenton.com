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
//
// Note: Splide requires the root element to have the class
// 'splide' in addition to any custom classes — this is set
// in Webflow on the .hero_showreel element directly.
// ============================================================

window.homePage = (() => {

  let splide    = null;
  let holdTimer = null;

  // Default hold duration (ms) used when a slide has no
  // data-hold attribute set, or the value is not a valid number
  const DEFAULT_HOLD = 250;


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
    const hold = slideEl ? parseInt(slideEl.dataset.hold, 10) : NaN;
    holdTimer  = setTimeout(advance, Number.isFinite(hold) ? hold : DEFAULT_HOLD);
  }


  // ============================================================
  // ADVANCE
  // Moves to the next slide and schedules the following one.
  // Self-contained loop — does not rely on Splide's transition
  // events, which are unreliable at speed: 0.
  // ============================================================
  function advance() {
    if (!splide) return;
    splide.go('>');
    const current = splide.Components.Slides.getAt(splide.index);
    scheduleNext(current ? current.slide : null);
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
  // Entrance animation sequence:
  //   1. Title wrapper fades up into position
  //   2. Showreel fades in after a short delay
  //   Splide mounts before the fade so it is ready to cycle
  //   as soon as the showreel becomes visible.
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
    const scope        = container || document;
    const sliderEl     = scope.querySelector('.hero_showreel');
    const titleWrapper = scope.querySelector('.hero_title-wrapper');
    if (!sliderEl) return;

    // Set initial states — both hidden before animation begins
    gsap.set(sliderEl, { opacity: 0 });
    if (titleWrapper) gsap.set(titleWrapper, { opacity: 0, y: 16 });

    splide = new Splide('.hero_showreel', {
      type:       'fade',
      speed:      0,
      rewind:     true,
      autoplay:   false,
      pagination: false,
      arrows:     false,
      drag:       false,
    });

    // Mount Splide before the fade-in so the first slide is
    // in position and ready when the showreel becomes visible
    requestAnimationFrame(() => {
      splide.mount();

      // 1. Title fades up first
      if (titleWrapper) {
        gsap.to(titleWrapper, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: 0.2,
          ease: "power2.out"
        });
      }

      // 2. Showreel fades in after title has arrived,
      //    then starts the slide cycle
      gsap.to(sliderEl, {
        opacity: 1,
        duration: 0.8,
        delay: 0.6,
        ease: "power2.out",
        onComplete: () => {
          const current = splide.Components.Slides.getAt(splide.index);
          scheduleNext(current ? current.slide : null);
        }
      });
    });
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
