// Copyright © 2026 Philip J.A Benton. All rights reserved.
// This code is proprietary and may not be reused or redistributed.

addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // INITIALISATION
  // Wait for the DOM to fully load before running any scripts.
  // Grab the nav component and its background element.
  // If either is missing, stop here — nothing else will work.
  // ============================================================
  const nav        = document.querySelector('.nav_component');
  const navBg      = document.querySelector('.nav_bg');
  const menuButton = document.querySelector('.nav_icon');
  const navMenu    = document.querySelector('.nav_mobile-links-wrapper');
  if (!nav || !navBg) return;

  // Track mobile menu open/closed state at the outer scope so
  // Barba's leave hook can read it without class checks.
  // navTl is declared here so Barba's leave hook can call
  // reverse() on it when navigating from the mobile menu.
  let menuOpen = false;
  let navTl    = null;


  // ============================================================
  // NAV HEIGHT CSS VARIABLE
  // Measures the nav's rendered height and stores it as a CSS
  // custom property (--nav-height) on the root element.
  // This allows any element on the page to use var(--nav-height)
  // to offset itself by exactly the nav height.
  // Recalculates on window resize to stay accurate at all
  // breakpoints. Value is set in rem using the root font size.
  // ============================================================
  function setNavHeight() {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const navHeightRem = (nav.offsetHeight / rootFontSize) + 0.2;
    document.documentElement.style.setProperty('--nav-height', navHeightRem + 'rem');
  }
  setNavHeight();
  window.addEventListener('resize', setNavHeight);


  // ============================================================
  // NAV ENTRANCE & HIDE/SHOW ON SCROLL
  // The entrance animation and scroll hide/show both control
  // yPercent on the same element, so they must be sequenced —
  // the scroll behaviour is initialised inside the entrance
  // animation's onComplete to ensure it only takes over once
  // the nav has fully arrived in view.
  //
  // clearProps: "transform" cleans up only the transform from
  // the entrance animation so the scroll hide/show starts with
  // a clean slate, while retaining opacity: 1 as an inline
  // style to override the CSS opacity: 0 rule.
  //
  // The delay accounts for other page load animations running
  // in parallel — revisit timing once all entrance animations
  // are ported to GSAP.
  //
  // Scroll behaviour:
  //   direction === -1 = scrolling up   → play (show nav)
  //   direction === 1  = scrolling down → reverse (hide nav)
  // ============================================================
  gsap.fromTo(nav,
    { yPercent: -100, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      duration: 0.35,
      delay: 1.35,
      ease: "power1.inOut",
      clearProps: "transform",
      onComplete: () => {
        const showAnim = gsap.from(nav, {
          yPercent: -100,
          paused: true,
          duration: 0.35,
          ease: "power1.inOut",
          force3D: true
        }).progress(1);

        ScrollTrigger.create({
          start: "top top",
          end: "max",
          onUpdate: (self) => {
            if (self.getVelocity() === 0) return;
            self.direction === -1 ? showAnim.play() : showAnim.reverse();
          }
        });
      }
    }
  );


  // ============================================================
  // MOBILE NAV ANIMATION
  // Replicates the Webflow 'Nav icon toggle' interaction.
  // A single timeline plays forward on open and reverses on
  // close — matching Webflow's 'Toggle play/reverse' behaviour.
  //
  // Lines 1 & 3 slide toward each other, line 2 scales out,
  // then lines 1 & 3 rotate to form an X. The menu wrapper
  // fades in, nav links stagger in from the left end-first,
  // and social icons rise into view.
  //
  // navTl is assigned at the outer scope so Barba's leave hook
  // can call reverse() on it when the user navigates while the
  // mobile menu is open — allowing the new page to load
  // underneath the closing menu animation.
  //
  // State is tracked via the menuOpen boolean declared at the
  // outer scope — readable by Barba's leave hook to skip the
  // exit animation when the mobile menu is open.
  //
  // The scroll lock is managed in the click handler — locking
  // on open and releasing on close — to prevent the page
  // scrolling behind the open menu.
  // ============================================================
  const lineOne      = document.querySelector('.nav_icon-line.is-one');
  const lineTwo      = document.querySelector('.nav_icon-line.is-two');
  const lineThree    = document.querySelector('.nav_icon-line.is-three');
  const navLinks     = document.querySelectorAll('.nav_mobile-links-wrapper .nav_link');
  const socialMobile = document.querySelector('.social_icons-mobile');

  if (menuButton && navMenu && lineOne && lineTwo && lineThree) {

    // ----------------------------------------------------------
    // TIMELINE
    // Assigned to the outer-scope navTl so Barba can access it.
    // Plays forward on open, reverses on close. Position
    // parameters control the sequencing — overlapping tweens
    // where needed for a natural feel.
    // ----------------------------------------------------------
    navTl = gsap.timeline({ paused: true });

    navTl
      // Lines 1 & 3 slide toward each other
      .to(lineOne,   { y: 7,  duration: 0.2, ease: "power1.inOut" }, 0)
      .to(lineThree, { y: -7, duration: 0.2, ease: "power1.inOut" }, 0)

      // Menu wrapper fades in
      .from(navMenu, { opacity: 0, duration: 0.4, ease: "power1.inOut" }, 0.1)

      // Line 2 scales out
      .to(lineTwo, { scaleX: 0, duration: 0.1, ease: "power1.inOut" }, 0.2)

      // Lines 1 & 3 rotate to form X
      .to(lineOne,   { rotate: -45, duration: 0.2, ease: "power1.inOut" }, 0.3)
      .to(lineThree, { rotate:  45, duration: 0.2, ease: "power1.inOut" }, 0.3)

      // Nav links stagger in from left, end-first
      .from(navLinks, {
        opacity: 0,
        x: -15,
        duration: 0.35,
        ease: "power1.inOut",
        stagger: { each: 0.05, from: "end" }
      }, 0.5)

      // Social icons rise into view
      .from(socialMobile, { opacity: 0, y: 5, duration: 0.1 }, 0.9);


    // ----------------------------------------------------------
    // CLICK HANDLER
    // Uses the outer-scope menuOpen boolean to track state
    // reliably rather than reading from the DOM. Plays the
    // timeline on open, reverses on close. Scroll lock is
    // applied on open and released on close to prevent the
    // page scrolling behind the open menu.
    // ----------------------------------------------------------
    menuButton.addEventListener('click', () => {
      if (menuOpen) {
        menuOpen = false;
        navTl.reverse();
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      } else {
        menuOpen = true;
        navTl.play();
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
      }
    });

  }


  // ============================================================
  // MARQUEE ROTATOR — PERSISTENT STATE
  // The marquee lives in the nav which persists across Barba
  // transitions, so the rotator state and its event listeners
  // are declared here at the outer scope rather than inside
  // initPage. This prevents listeners stacking up on each
  // transition to a hero page, which caused marquee items to
  // appear twice before rotating.
  //
  // initPage calls startRotator() or resetRotator() as needed.
  // The listeners guard against running when no rotator is
  // active (rotateTimer === null).
  //
  // Timing variables:
  //   fadeDuration — how long each transition takes (seconds)
  //   holdDuration — how long each item stays visible (ms)
  // ============================================================
  const marquee  = document.querySelector('.nav_marquee');
  const logoLink = document.querySelector('.nav_logo-link');
  const items    = document.querySelectorAll('.nav_marquee-item');

  let current     = 0;
  let rotateTimer = null;
  const fadeDuration = 0.5;
  const holdDuration = 6000;

  // Kills any running tweens, cancels the timer, and snaps
  // back to the first item at full opacity.
  // clearProps and opacity are combined in a single gsap.set
  // call to avoid a flash between clearing and setting.
  // Also manages pointer-events — only the visible item
  // receives pointer events, preventing invisible items from
  // intercepting mouse events on the active item.
  function resetRotator() {
    clearTimeout(rotateTimer);
    rotateTimer = null;
    gsap.killTweensOf(items);
    current = 0;
    items.forEach((item, i) => {
      gsap.set(item, { clearProps: "all", opacity: i === 0 ? 1 : 0 });
      item.style.pointerEvents = i === 0 ? 'auto' : 'none';
    });
  }

  // Transitions to the next item:
  // — Current item fades out slowly (fadeDuration * 1.5)
  //   creating a linger effect before fully disappearing.
  // — Next item slides up from below (yPercent: 30 → 0)
  //   and fades in quickly (fadeDuration * 0.5).
  // — pointer-events are updated so only the incoming
  //   item is interactive during and after the transition.
  function rotateMarquee() {
    const next = (current + 1) % items.length;

    items[current].style.pointerEvents = 'none';
    items[next].style.pointerEvents = 'auto';

    gsap.to(items[current], { opacity: 0, duration: fadeDuration * 1.5, ease: "power2.out" });

    gsap.fromTo(items[next],
      { yPercent: 30, opacity: 0 },
      { yPercent: 0, duration: fadeDuration, ease: "power2.out" }
    );
    gsap.to(items[next], { opacity: 1, duration: fadeDuration * 0.5, ease: "power2.out" });

    current = next;
    rotateTimer = setTimeout(rotateMarquee, holdDuration);
  }

  // Resumes the rotator from the current item without resetting
  function resumeRotator() {
    clearTimeout(rotateTimer);
    rotateTimer = setTimeout(rotateMarquee, holdDuration);
  }

  // Resets to item 0 and starts the rotation cycle
  function startRotator() {
    resetRotator();
    rotateTimer = setTimeout(rotateMarquee, holdDuration);
  }

  // Pause rotation while the user hovers over the marquee,
  // resume when they move away. Guards against running when
  // no rotator is active.
  if (marquee) {
    marquee.addEventListener('mouseenter', () => {
      if (rotateTimer === null) return;
      clearTimeout(rotateTimer);
      gsap.killTweensOf(items);
    });
    marquee.addEventListener('mouseleave', () => {
      if (rotateTimer === null) return;
      resumeRotator();
    });
  }

  // Pause when the browser tab is hidden, resume from the
  // current item when they return. Prevents queued transitions
  // stacking up while hidden. Guards against running when no
  // rotator is active.
  document.addEventListener('visibilitychange', () => {
    if (rotateTimer === null) return;
    if (document.hidden) {
      clearTimeout(rotateTimer);
      gsap.killTweensOf(items);
    } else {
      items.forEach((item, i) => {
        gsap.set(item, { opacity: i === current ? 1 : 0 });
      });
      resumeRotator();
    }
  });


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
  // Currently handles:
  //   - Nav centre swap & marquee rotator
  //
  // As page-specific JS files are introduced (e.g. home.js),
  // they will expose an init() function called from here
  // based on the Barba namespace.
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
    // NAV CENTRE SWAP & MARQUEE ROTATOR
    // This section only runs on pages that have a .hero_title
    // element. On pages without one, the logo sits in the nav
    // centre permanently with no swap behaviour.
    //
    // On qualifying pages, the nav centre shows the marquee
    // rotator while the hero title is visible. When the hero
    // title scrolls out of view, the marquee is replaced by
    // the logo. When scrolling back to the top, the marquee
    // drops back down into view.
    //
    // The swap is disabled on tablet and mobile (≤991px).
    // ----------------------------------------------------------
    const heroTitle = scope.querySelector('.hero_title');
    const isMobile  = () => window.innerWidth <= 991;

    if (heroTitle && marquee && logoLink) {

      // Clear any display:none set by a previous non-hero page
      // so the marquee is always reset to its natural display
      // value before the hero page logic runs
      gsap.set(marquee, { clearProps: "display" });

      // If there are no marquee items, hide the marquee and
      // clear any GSAP transform from the logo so it sits in
      // its natural position. Skip all swap behaviour.
      if (items.length === 0) {
        gsap.set(marquee, { display: 'none' });
        gsap.set(logoLink, { clearProps: "transform" });
        return;
      }


      // --------------------------------------------------------
      // INITIAL STATE
      // On desktop: hide the logo above the nav (yPercent: -100)
      // so it can slide down into view on scroll. Marquee sits
      // at its natural position ready to be seen.
      // On mobile: clear any GSAP transform on the logo so it
      // sits in its natural CSS position.
      // --------------------------------------------------------
      if (!isMobile()) {
        gsap.set(logoLink, { yPercent: -100 });
        gsap.set(marquee, { yPercent: 0 });
      } else {
        gsap.set(logoLink, { clearProps: "transform" });
        gsap.set(marquee, { yPercent: 0 });
      }


      // --------------------------------------------------------
      // SCROLL TRIGGER — MARQUEE / LOGO SWAP
      // Watches the hero title element. Fires when the bottom
      // edge of the title crosses the top of the viewport.
      //
      // onEnter (scrolling down, title leaves viewport):
      //   Instantly snaps marquee out and logo into position.
      //   No animation needed — the nav is hidden at this point.
      //
      // onLeaveBack (scrolling up, title re-enters viewport):
      //   Instantly hides the logo, then animates the marquee
      //   dropping down from above into position.
      //
      // Stored in pageScrollTriggers so it can be killed
      // cleanly on the next Barba transition.
      // --------------------------------------------------------
      const swapTrigger = ScrollTrigger.create({
        trigger: heroTitle,
        start: "bottom top",
        onEnter: () => {
          if (isMobile()) return;
          gsap.set(marquee, { yPercent: 100 });
          gsap.set(logoLink, { yPercent: 0 });
        },
        onLeaveBack: () => {
          if (isMobile()) return;
          gsap.set(logoLink, { yPercent: -100 });
          gsap.fromTo(marquee,
            { yPercent: -100 },
            { yPercent: 0, duration: 0.25, ease: "power2.out" }
          );
        }
      });

      pageScrollTriggers.push(swapTrigger);


      // --------------------------------------------------------
      // RESIZE HANDLER — SWAP STATE
      // When the window is resized, corrects the position of
      // the marquee and logo based on the current breakpoint
      // and scroll position, preventing both elements appearing
      // simultaneously after crossing the mobile breakpoint.
      // --------------------------------------------------------
      window.addEventListener('resize', () => {
        if (isMobile()) {
          gsap.set(logoLink, { clearProps: "transform" });
          gsap.set(marquee, { yPercent: 0 });
        } else {
          const heroRect = heroTitle.getBoundingClientRect();
          const scrolledPast = heroRect.bottom < 0;
          if (scrolledPast) {
            gsap.set(logoLink, { yPercent: 0 });
            gsap.set(marquee, { yPercent: 100 });
          } else {
            gsap.set(logoLink, { yPercent: -100 });
            gsap.set(marquee, { yPercent: 0 });
          }
        }
      });

      // Start the rotator if there is more than one item —
      // startRotator() handles the initial reset internally.
      // For a single item, call resetRotator() directly to set
      // the correct initial opacity and pointer-events state
      // without starting the rotation cycle.
      if (items.length > 1) {
        startRotator();
      } else {
        resetRotator();
      }

    } else {
      // No hero title — stop the rotator, hide the marquee and
      // reset yPercent so state is clean for any subsequent
      // return to a hero page.
      resetRotator();
      if (marquee) gsap.set(marquee, { display: 'none', yPercent: 0 });
      if (logoLink) gsap.set(logoLink, { clearProps: "transform" });
    }

  }


  // ============================================================
  // NAV BACKGROUND FADE (CURRENTLY DISABLED)
  // Fades the nav background in as the hero section scrolls out
  // of view. Uncomment to enable.
  // ============================================================
//  gsap.to(navBg, {
//    opacity: 1,
//    scrollTrigger: {
//      trigger: ".section_hero",
//      start: "top top",
//      end: "bottom top",
//      scrub: true
//    }
//  });


  // ============================================================
  // PREVENT SAME-PAGE NAVIGATION
  // Intercepts clicks on links that match the current URL and
  // cancels them entirely — preventing a full page reload.
  // Barba's prevent option alone is not sufficient as it only
  // stops Barba handling the link, not the browser following it.
  // ============================================================
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.href === window.location.href) {
      e.preventDefault();
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
  // leave: if the mobile menu is open, reverses the nav
  //   animation and releases the scroll lock, then resolves
  //   immediately so the new page loads underneath the closing
  //   menu animation. Otherwise fades the outgoing container
  //   and slides the nav up, resolving when complete.
  //
  // enter: restores the incoming container opacity, slides the
  //   nav back into view, then reinitialises page-specific JS
  //   via initPage() — passing next.container so element
  //   queries are scoped to the incoming page only.
  //   ScrollTrigger.refresh() runs after initPage() so newly
  //   created ScrollTriggers have their positions calculated
  //   correctly against the new page content.
  //
  // Note: beforeLeave/afterEnter hooks are not used as they
  // are not reliably fired in this environment. The core
  // leave/enter hooks are used instead.
  // ============================================================
  barba.use(barbHead);
  
  barba.init({
    preventRunning: true,
    transitions: [{
      name: 'default',

      leave({ current }) {
        return new Promise(resolve => {

          // If mobile menu is open, close it and resolve
          // immediately — the new page loads underneath the
          // closing menu animation. Guard against navTl being
          // null if the mobile nav elements were not found.
          if (menuOpen) {
            menuOpen = false;
            if (navTl) navTl.reverse();
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            resolve();
            return;
          }

          // Fade outgoing container and slide nav up
          const tl = gsap.timeline({
            delay: 0.15,
            onComplete: resolve
          });

          tl.to(current.container, { opacity: 0, duration: 0.15, ease: "power2.in" })
            .to(nav, { yPercent: -100, duration: 0.35, ease: "power2.inOut" });

        });
      },

      enter({ next }) {
        // Scroll to top before reinitialising page content
        window.scrollTo(0, 0);

        // Restore incoming container opacity
        gsap.set(next.container, { opacity: 1 });

        // Slide nav back into view
        gsap.to(nav, { yPercent: 0, duration: 0.35, ease: "power2.out" });

        // Reinitialise page-specific JS, scoped to the
        // incoming container to avoid stale DOM references
        initPage(next.namespace, next.container);

        // Refresh after initPage so newly created ScrollTriggers
        // have their positions calculated correctly
        ScrollTrigger.refresh();
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
