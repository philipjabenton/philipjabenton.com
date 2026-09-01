// Copyright © 2026 Philip J.A Benton. All rights reserved.
// This code is proprietary and may not be reused or redistributed.

// ============================================================
// GLOBAL.JS
// Owns routing and orchestration only: Barba's init and its
// leave/enter transition hooks, page initialisation dispatch
// (initPage), and the same-page click guard. It does not
// animate the nav or the page content itself — it calls out to
// Nav (nav.js) and Reveals (reveal.js) for that, the same way
// it dispatches to page-specific modules like home.js.
// ============================================================

addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // INITIALISATION
  // Wire up the nav first — everything below depends on it
  // existing. Nav.init() returns false if the nav isn't found
  // on this page, mirroring the old top-level guard that used
  // to stop this entire block (Barba included) when .nav_component
  // or .nav_bg were missing.
  // ============================================================
  if (!Nav.init()) return;

  // currentPageModule holds a reference to the active page's
  // module (e.g. window.homePage) so its leave() function can
  // be called cleanly before each Barba transition.
  let currentPageModule = null;


  // ============================================================
  // HEAD TAG SYNC
  // Barba swaps the container but does not update <head> tags
  // beyond the page title. This function syncs meta tags from
  // the incoming page's HTML — including description, Open
  // Graph, and canonical tags — so SEO and social sharing
  // metadata stays accurate after each transition.
  //
  // Called in Barba's enter hook with next.html, which contains
  // the full HTML of the incoming page as parsed by Barba.
  // ============================================================
  function updateHead(nextHtml) {
    const parser = new DOMParser();
    const nextDocument = parser.parseFromString(nextHtml, 'text/html');

    document.title = nextDocument.title;

    const nextMetas = nextDocument.querySelectorAll('meta');
    nextMetas.forEach(nextMeta => {
      const name     = nextMeta.getAttribute('name');
      const property = nextMeta.getAttribute('property');
      const selector = name
        ? `meta[name="${name}"]`
        : property
          ? `meta[property="${property}"]`
          : null;

      if (selector) {
        const currentMeta = document.querySelector(selector);
        if (currentMeta) {
          currentMeta.setAttribute('content', nextMeta.getAttribute('content'));
        }
      }
    });
  }


  // ============================================================
  // PAGE INITIALISATION
  // Runs on first load and after every Barba page transition.
  // Kills any page-scoped ScrollTriggers from the previous
  // page before reinitialising for the new page.
  //
  // Accepts an optional container argument — when called from
  // Barba's enter hook, next.container is passed so that
  // element queries are scoped to the incoming page only.
  // This prevents stale references to elements in the outgoing
  // container, which remains briefly in the DOM during the
  // transition while both containers are present.
  //
  // Page module dispatch:
  //   Each page-specific JS file (e.g. home.js) exposes a
  //   window global following the convention
  //   window[namespace + 'Page'] — so namespace 'home' maps
  //   to window.homePage, 'work' to window.workPage, and so on.
  //   Scripts are loaded dynamically on first visit and cached
  //   by the browser — subsequent visits reuse the existing
  //   module without reloading.
  //
  // Currently handles:
  //   - Content reveals (reveal.js)
  //   - Nav centre swap & marquee rotator (nav.js)
  //   - home namespace → home.js → window.homePage
  // ============================================================
  let pageScrollTriggers = [];

  function killPageScrollTriggers() {
    pageScrollTriggers.forEach(st => st.kill());
    pageScrollTriggers = [];
  }

  function initPage(namespace, container) {

    killPageScrollTriggers();

    // Scope element queries to the incoming container if
    // provided, otherwise fall back to the full document
    const scope = container || document;

    // ----------------------------------------------------------
    // CONTENT REVEALS (reveal.js)
    // Re-scan the incoming container for [data-reveal] elements on
    // every Barba transition (and on first load). reveal() guards
    // already-handled elements internally, so calling it again here
    // is always safe. Any ScrollTriggers it creates are folded into
    // this page's own cleanup list so killPageScrollTriggers() clears
    // them out before the next transition too.
    // ----------------------------------------------------------
    if (window.Reveals) {
      const revealTriggers = window.Reveals.init(scope);
      if (revealTriggers && revealTriggers.length) {
        pageScrollTriggers = pageScrollTriggers.concat(revealTriggers);
      }
    }

    // ----------------------------------------------------------
    // NAV CENTRE SWAP & MARQUEE ROTATOR (nav.js)
    // Same fold-into-cleanup-list contract as Reveals.init above.
    // ----------------------------------------------------------
    const navTriggers = Nav.onPageEnter(scope);
    if (navTriggers && navTriggers.length) {
      pageScrollTriggers = pageScrollTriggers.concat(navTriggers);
    }


    // ----------------------------------------------------------
    // PAGE MODULE DISPATCH
    // Dynamically loads the page-specific script if not already
    // present, then calls its init() function. Scripts load
    // once and are cached by the browser — subsequent visits
    // reuse the existing module without reloading.
    //
    // Each page module is a window global following the
    // convention window[namespace + 'Page'] — so namespace
    // 'home' maps to window.homePage, 'work' to window.workPage,
    // and so on. Each module exposes init(container) and leave().
    //
    // requestAnimationFrame defers init() until after the
    // browser has painted the new container, ensuring the DOM
    // is fully ready before the module queries it.
    //
    // To add a new page module, add an entry to pageModules:
    //   work:    'work.js',
    //   contact: 'contact.js'
    // ----------------------------------------------------------
    currentPageModule = null;

    const pageModules = {
      home: 'home.js'
    };

    const scriptSrc = pageModules[namespace];

    if (scriptSrc) {
      const alreadyLoaded = document.querySelector(`script[src*="${scriptSrc}"]`);
      const mod           = window[namespace + 'Page'];

      if (alreadyLoaded && mod) {
        // Script already in DOM — call init directly
        currentPageModule = mod;
        requestAnimationFrame(() => currentPageModule.init(container));
      } else if (!alreadyLoaded) {
        // Load the script, then call init once ready
        const script  = document.createElement('script');
        script.src    = `https://raw.githack.com/philipjabenton/philipjabenton.com/main/${scriptSrc}`;
        script.onload = () => {
          const loaded = window[namespace + 'Page'];
          if (loaded) {
            currentPageModule = loaded;
            requestAnimationFrame(() => currentPageModule.init(container));
          }
        };
        document.body.appendChild(script);
      }
    }

  }


  // ============================================================
  // PREVENT SAME-PAGE NAVIGATION
  // Intercepts clicks on links that match the current URL and
  // cancels them entirely — preventing a full page reload.
  // If the mobile menu is open, closes it so the user gets
  // feedback that the click was registered.
  // ============================================================
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.href === window.location.href) {
      e.preventDefault();
      Nav.closeMenuInstantly();
    }
  });


  // ============================================================
  // BARBA INIT
  // Intercepts internal link navigation and runs transitions
  // between pages. The nav and footer persist untouched —
  // only .main_wrapper is swapped on each transition.
  //
  // preventRunning: true prevents a new transition firing while
  //   one is already in progress — avoids a flash if the user
  //   clicks a link mid-transition.
  //
  // leave: calls the current page module's leave() first to
  //   cleanly tear down any page-specific JS (timers, Splide
  //   instances, etc.) before the transition begins.
  //   If the mobile menu is open, Nav.closeMenuInstantly() closes
  //   it and this resolves immediately so the new page loads
  //   underneath the closing menu animation. Otherwise the
  //   outgoing container fades out, then Nav.leave() appends the
  //   nav's slide-up tween onto the same timeline so it runs
  //   sequenced right after the fade — resolving when both are
  //   done.
  //
  // enter: syncs head tags from the incoming page, restores
  //   the incoming container opacity, calls Nav.enter() to slide
  //   the nav back into view, then reinitialises page-specific JS
  //   via initPage() — passing next.container so element queries
  //   are scoped to the incoming page only. ScrollTrigger.refresh()
  //   runs after initPage() so newly created ScrollTriggers have
  //   their positions calculated correctly against the new page
  //   content.
  //
  // Note: beforeLeave/afterEnter hooks are not used as they
  // are not reliably fired in this environment. The core
  // leave/enter hooks are used instead.
  // ============================================================
  barba.init({
    preventRunning: true,
    transitions: [{
      name: 'default',

      leave({ current }) {
        return new Promise(resolve => {

          // Tear down current page module before transition
          if (currentPageModule && currentPageModule.leave) {
            currentPageModule.leave();
            currentPageModule = null;
          }

          // If the mobile menu is open, close it and resolve
          // immediately — the new page loads underneath the
          // closing menu animation.
          if (Nav.isMenuOpen()) {
            Nav.closeMenuInstantly();
            resolve();
            return;
          }

          // Fade outgoing container, then slide nav up
          const tl = gsap.timeline({
            delay: 0.15,
            onComplete: resolve
          });

          tl.to(current.container, { opacity: 0, duration: 0.15, ease: "power2.in" });
          Nav.leave(tl);

        });
      },

      enter({ next }) {
        // Sync head tags from the incoming page
        updateHead(next.html);

        // Scroll to top before reinitialising page content
        window.scrollTo(0, 0);

        // Restore incoming container opacity
        gsap.set(next.container, { opacity: 1 });

        // Slide nav back into view
        Nav.enter();

        // Reinitialise page-specific JS, scoped to the
        // incoming container to avoid stale DOM references
        initPage(next.namespace, next.container);

        // Defer refresh until after the browser has painted the
        // new container so ScrollTrigger calculates positions correctly
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
        });
      }

    }]
  });


  // ============================================================
  // FIRST PAGE LOAD
  // Runs initPage() on the initial load so page-specific JS
  // fires correctly before any Barba transition has occurred.
  // The container element is passed to scope element queries
  // consistently with how Barba calls initPage on transition.
  // ============================================================
  const container = document.querySelector('[data-barba="container"]');
  initPage(container?.dataset.barbaNamespace, container);

});
