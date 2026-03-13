// Copyright © 2026 Philip J.A Benton. All rights reserved.
// This code is proprietary and may not be reused or redistributed.

addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // INITIALISATION
  // Wait for the DOM to fully load before running any scripts.
  // Grab the nav component and its background element.
  // If either is missing, stop here — nothing else will work.
  // ============================================================
  const nav      = document.querySelector('.nav_component');
  const navBg    = document.querySelector('.nav_bg');
  const menuButton = document.querySelector('.nav_icon');
  const navMenu  = document.querySelector('.nav_mobile-links-wrapper');
  if (!nav || !navBg) return;

  // Track mobile menu open/closed state at the outer scope so
  // Barba's beforeLeave hook can read it without class checks
  let menuOpen = false;


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
  // State is tracked via the menuOpen boolean declared at the
  // outer scope — readable by Barba's beforeLeave hook to
  // skip the exit animation when the menu is open.
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
    // Plays forward on open, reverses on close. Position
    // parameters control the sequencing — overlapping tweens
    // where needed for a natural feel.
    // ----------------------------------------------------------
    const navTl = gsap.timeline({ paused: true });

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
  // PAGE INITIALISATION
  // Runs on first load and after every Barba page transition.
  // Kills any page-scoped ScrollTriggers from the previous
  // page before reinitialising for the new page.
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

  function initPage(namespace) {

    killPageScrollTriggers();

    // ----------------------------------------------------------
    // NAV CENTRE SWAP & MARQUEE ROTATOR
    // This section only runs on pages that have a .hero_title
    // element. On pages without one, the logo sits in the nav
    // centre permanently with no swap behaviour.
    //
    // On qualifying pages, the nav centre shows a text rotator
    // (marquee) while the hero title is visible. When the hero
    // title scrolls out of view, the marquee is replaced by the
    // logo. When scrolling back to the top, the marquee drops
    // back down into view.
    //
    // The swap is disabled on tablet and mobile (≤991px).
    // ----------------------------------------------------------
    const heroTitle = document.querySelector('.hero_title');
    const marquee   = document.querySelector('.nav_marquee');
    const logoLink  = document.querySelector('.nav_logo-link');
    const isMobile  = () => window.innerWidth <= 991;

    if (heroTitle && marquee && logoLink) {

      // --------------------------------------------------------
      // MARQUEE ITEMS
      // Grab all marquee items. If there are none, hide the
      // marquee and clear any GSAP transform from the logo so
      // it sits in its natural position. The swap behaviour is
      // skipped entirely — the logo remains visible as normal.
      //
      // If there is only one item, the marquee is shown but the
      // rotator does not start — the single item sits
      // permanently. The marquee/logo swap on scroll still
      // works in this case.
      // --------------------------------------------------------

      // Clear any display:none set by a previous non-hero page
  gsap.set(marquee, { clearProps: "display" });
      
      const items = document.querySelectorAll('.nav_marquee-item');

      if (items.length === 0) {
        gsap.set(marquee, { display: 'none' });
        gsap.set(logoLink, { clearProps: "transform" });
        return;
      }


      // --------------------------------------------------------
      // TEXT ROTATOR
      // Cycles through .nav_marquee-item elements one at a
      // time. Each item fades out while the next slides up from
      // below and fades in. The rotator pauses when the tab is
      // hidden or when the user hovers over the marquee.
      //
      // Timing variables:
      //   fadeDuration — how long each transition takes (secs)
      //   holdDuration — how long each item stays visible (ms)
      // --------------------------------------------------------
      let current = 0;
      let rotateTimer = null;
      const fadeDuration = 0.5;
      const holdDuration = 6000;

      // Kills any running tweens, cancels the timer, and snaps
      // back to the first item at full opacity.
      // Also manages pointer-events on each item — only the
      // visible item receives pointer events.
      function resetRotator() {
        clearTimeout(rotateTimer);
        gsap.killTweensOf(items);
        current = 0;
        items.forEach((item, i) => {
          gsap.set(item, { opacity: i === 0 ? 1 : 0 });
          item.style.pointerEvents = i === 0 ? 'auto' : 'none';
        });
      }

      // Transitions to the next item:
      // — Current item fades out slowly (fadeDuration * 1.5)
      //   creating a linger effect before fully disappearing.
      // — Next item slides up from below (yPercent: 30 → 0)
      //   and fades in quickly (fadeDuration * 0.5).
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
      // resume when they move away
      marquee.addEventListener('mouseenter', () => {
        clearTimeout(rotateTimer);
        gsap.killTweensOf(items);
      });
      marquee.addEventListener('mouseleave', () => {
        resumeRotator();
      });

      // Pause when the browser tab is hidden, resume from the
      // current item when they return. Prevents queued
      // transitions stacking up while hidden.
      document.addEventListener('visibilitychange', () => {
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

      // Start the rotator if there is more than one item.
      // For a single item, call resetRotator() directly to set
      // the correct initial opacity and pointer-events state
      // without starting the rotation cycle.
      if (items.length > 1) {
        startRotator();
      } else {
        resetRotator();
      }

    } else {
      // No hero title — hide the marquee and ensure logo is
      // in its natural position
      if (marquee) gsap.set(marquee, { display: 'none' });
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
  // BARBA INIT
  // Intercepts internal link navigation and runs transitions
  // between pages. The nav and footer persist untouched —
  // only .main_wrapper is swapped on each transition.
  //
  // beforeLeave: skips the exit animation if the mobile menu
  //   is open (user navigated from the mobile nav). Otherwise
  //   fades the outgoing container and slides the nav up.
  //
  // afterEnter: scrolls to the top, refreshes ScrollTrigger
  //   so it recalculates positions for the new page content,
  //   slides the nav back into view, restores container opacity,
  //   then reinitialises page-specific JS via initPage().
  // ============================================================
  barba.init({
  transitions: [{
    name: 'default',

    leave({ current }) {
      return new Promise(resolve => {
        if (menuOpen) {
          resolve();
          return;
        }

        const tl = gsap.timeline({
          delay: 0.15,
          onComplete: resolve
        });

        tl.to(current.container, { opacity: 0, duration: 0.15, ease: "power2.in" })
          .to(nav, { yPercent: -100, duration: 0.35, ease: "power2.inOut" });
      });
    },

    enter({ next }) {
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
      gsap.to(nav, { yPercent: 0, duration: 0.35, ease: "power2.out" });
      gsap.set(next.container, { opacity: 1 });
      initPage(next.namespace);
    }

  }]
});


  // ============================================================
  // FIRST PAGE LOAD
  // Runs initPage() on the initial load so page-specific JS
  // fires correctly before any Barba transition has occurred.
  // ============================================================
  const container = document.querySelector('[data-barba="container"]');
  initPage(container?.dataset.barbaNamespace);

});
