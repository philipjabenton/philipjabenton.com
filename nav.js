// Copyright © 2026 Philip J.A Benton. All rights reserved.
// This code is proprietary and may not be reused or redistributed.

// ============================================================
// NAV.JS
// Everything about the persistent nav bar lives here: its
// entrance animation, hide/show-on-scroll, the mobile menu
// timeline, the marquee rotator, and the hero-page logo/marquee
// swap. Nothing in this file knows about Barba or routing —
// it only exposes a small surface for global.js to call at the
// right moments (see the exported object at the bottom).
//
// Contract with global.js:
//   init()               — wire up the nav once on DOMContentLoaded.
//                           Returns false if the nav isn't found on
//                           this page (mirrors the old top-level
//                           `if (!nav || !navBg) return;` guard).
//   onPageEnter(scope)    — re-run the hero title / marquee-logo
//                           swap + rotator for the page that just
//                           became active. Scoped to `scope` the
//                           same way Reveals.init(scope) is, and
//                           returns any ScrollTriggers it created
//                           so global.js can fold them into its own
//                           per-page cleanup list.
//   isMenuOpen()          — read the mobile menu's open/closed state.
//   closeMenuInstantly()  — reverse the mobile menu timeline and
//                           release the scroll lock, with no
//                           animation wait. Safe to call whether or
//                           not the menu is actually open.
//   leave(timeline)       — append the nav's slide-up tween onto a
//                           timeline global.js is building for its
//                           Barba leave hook. Only call this when
//                           isMenuOpen() is false — the menu-open
//                           case is handled entirely by
//                           closeMenuInstantly() instead.
//   enter()               — slide the nav back into view. Called
//                           from Barba's enter hook.
// ============================================================

window.Nav = (function () {

  // ------------------------------------------------------------
  // ELEMENT REFERENCES & STATE
  // Populated by init(). Declared here so every function in this
  // module shares the same closure over them.
  // ------------------------------------------------------------
  let nav, navBg, menuButton, navMenu;
  let lineOne, lineTwo, lineThree, navLinks, socialMobile;
  let marquee, logoLink, items;

  let menuOpen    = false;
  let navTl       = null;
  let current     = 0;
  let rotateTimer = null;

  const fadeDuration = 0.5;
  const holdDuration = 6000;

  const isMobile = () => window.innerWidth <= 991;


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
  function initEntranceAndScrollHide() {
    gsap.fromTo(nav,
      { yPercent: -100, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.35,
        delay: 0.3,
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
  }


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
  // navTl is module-scoped so closeMenuInstantly() (called from
  // global.js's Barba leave hook, the same-page click guard, and
  // the resize guard below) can reverse it directly.
  //
  // The scroll lock is managed in the click handler — locking
  // on open and releasing on close — to prevent the page
  // scrolling behind the open menu.
  // ============================================================
  function initMobileMenu() {
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
  // MOBILE NAV — RESIZE HANDLER
  // If the window is resized to desktop while the mobile menu
  // is open, close it and release the scroll lock. In normal
  // use this only occurs in DevTools, but prevents the menu
  // persisting in an open state across breakpoints.
  // ============================================================
  function initMobileResizeGuard() {
    window.addEventListener('resize', () => {
      if (!isMobile() && menuOpen) {
        closeMenuInstantly();
      }
    });
  }


  // ============================================================
  // MARQUEE ROTATOR — PERSISTENT STATE
  // The marquee lives in the nav which persists across Barba
  // transitions, so the rotator state and its event listeners
  // are set up once here rather than inside onPageEnter. This
  // prevents listeners stacking up on each transition to a hero
  // page, which caused marquee items to appear twice before
  // rotating.
  //
  // onPageEnter calls startRotator() or resetRotator() as
  // needed. The listeners below guard against running when no
  // rotator is active (rotateTimer === null).
  //
  // Timing variables:
  //   fadeDuration — how long each transition takes (seconds)
  //   holdDuration — how long each item stays visible (ms)
  // ============================================================

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
  function initMarqueeHover() {
    if (!marquee) return;
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
  function initMarqueeVisibilityGuard() {
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
  }


  // ============================================================
  // MARQUEE / LOGO SWAP — RESIZE HANDLER
  // Corrects the marquee and logo position when the window is
  // resized, based on the current breakpoint and scroll
  // position. Set up once here rather than inside onPageEnter
  // to prevent a new listener being added on every transition
  // to a hero page.
  //
  // Queries .hero_title fresh on each resize so it always
  // reflects the current page. Returns early on non-hero pages
  // since no swap correction is needed.
  // ============================================================
  function initMarqueeResizeGuard() {
    window.addEventListener('resize', () => {
      if (!marquee || !logoLink) return;
      const heroTitle = document.querySelector('.hero_title');
      if (!heroTitle) return;

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
  }


  // ============================================================
  // NAV BACKGROUND FADE (CURRENTLY DISABLED)
  // Fades the nav background in as the hero section scrolls out
  // of view. Uncomment to enable.
  // ============================================================
  // function initNavBgFade() {
  //   gsap.to(navBg, {
  //     opacity: 1,
  //     scrollTrigger: {
  //       trigger: ".section_hero",
  //       start: "top top",
  //       end: "bottom top",
  //       scrub: true
  //     }
  //   });
  // }


  // ============================================================
  // PUBLIC: init()
  // Grabs every nav element, then wires up everything that only
  // needs to happen once per hard load (entrance, scroll
  // hide/show, mobile menu, nav height, marquee hover/visibility
  // listeners, the two resize guards).
  //
  // Returns false if the nav isn't on this page — mirrors the
  // old top-level `if (!nav || !navBg) return;` guard in
  // global.js, which stopped Barba/initPage entirely when the
  // nav was missing.
  // ============================================================
  function init() {
    nav        = document.querySelector('.nav_component');
    navBg      = document.querySelector('.nav_bg');
    menuButton = document.querySelector('.nav_icon');
    navMenu    = document.querySelector('.nav_mobile-links-wrapper');
    if (!nav || !navBg) return false;

    lineOne      = document.querySelector('.nav_icon-line.is-one');
    lineTwo      = document.querySelector('.nav_icon-line.is-two');
    lineThree    = document.querySelector('.nav_icon-line.is-three');
    navLinks     = document.querySelectorAll('.nav_mobile-links-wrapper .nav_link');
    socialMobile = document.querySelector('.social_icons-mobile');

    marquee  = document.querySelector('.nav_marquee');
    logoLink = document.querySelector('.nav_logo-link');
    items    = document.querySelectorAll('.nav_marquee-item');

    setNavHeight();
    window.addEventListener('resize', setNavHeight);

    initEntranceAndScrollHide();

    if (menuButton && navMenu && lineOne && lineTwo && lineThree) {
      initMobileMenu();
    }
    initMobileResizeGuard();

    initMarqueeHover();
    initMarqueeVisibilityGuard();
    initMarqueeResizeGuard();

    return true;
  }


  // ============================================================
  // PUBLIC: onPageEnter(scope)
  // Runs on first load and after every Barba transition — called
  // from global.js's initPage(). Handles the hero title / nav
  // centre swap and (re)starts the marquee rotator for pages
  // that have a .hero_title. On pages without one, the logo
  // sits in the nav centre permanently with no swap behaviour.
  //
  // Scoped to `scope` (the incoming Barba container, or
  // document on first load) the same way Reveals.init(scope) is,
  // so it never queries stale elements from an outgoing
  // container still briefly in the DOM during a transition.
  //
  // Returns any ScrollTriggers it creates so global.js can fold
  // them into its own pageScrollTriggers cleanup list.
  //
  // The swap itself is disabled on tablet and mobile (≤991px).
  // ============================================================
  function onPageEnter(scope) {
    const triggers = [];
    const heroTitle = (scope || document).querySelector('.hero_title');

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
        return triggers;
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

      triggers.push(swapTrigger);

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

    return triggers;
  }


  // ============================================================
  // PUBLIC: menu state + transition hooks
  // ============================================================
  function isMenuOpen() {
    return menuOpen;
  }

  // Closes the mobile menu with no animation wait — used by the
  // resize guard above, global.js's same-page click guard, and
  // global.js's Barba leave hook when the menu is open. Safe to
  // call whether or not the menu is actually open.
  function closeMenuInstantly() {
    if (!menuOpen) return;
    menuOpen = false;
    if (navTl) navTl.reverse();
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  // Appends the nav's slide-up tween onto a timeline global.js
  // is building for its Barba leave hook, so it runs sequenced
  // after whatever global.js already queued (the container
  // fade). Only call this when isMenuOpen() is false.
  function leave(timeline) {
    timeline.to(nav, { yPercent: -100, duration: 0.35, ease: "power2.inOut" });
    return timeline;
  }

  // Slides the nav back into view. Called from Barba's enter
  // hook once the incoming container is in place.
  function enter() {
    gsap.to(nav, { yPercent: 0, duration: 0.35, ease: "power2.out" });
  }


  return {
    init,
    onPageEnter,
    isMenuOpen,
    closeMenuInstantly,
    leave,
    enter
  };

})();
