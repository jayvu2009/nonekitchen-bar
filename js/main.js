/* Main site script: header, menu toggle, smooth scroll, scroll animations, reservation popup */

(function () {
  "use strict";

  var lenis = null;
  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var lockCount = 0;
  var focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* Lock page scrolling while the menu or the reservation popup is open */
  function lockPage() {
    lockCount++;
    if (lockCount > 1) return;
    var scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) document.body.style.paddingRight = scrollbar + "px";
    document.body.classList.add("is-locked");
    root.classList.add("page-locked");
    if (lenis) lenis.stop();
  }

  function unlockPage() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;
    document.body.classList.remove("is-locked");
    root.classList.remove("page-locked");
    document.body.style.paddingRight = "";
    if (lenis) lenis.start();
  }

  /* Visible focusable elements inside a container */
  function getFocusable(container) {
    return Array.prototype.filter.call(container.querySelectorAll(focusableSelector), function (el) {
      return el.offsetParent !== null || el.getClientRects().length > 0;
    });
  }

  /* Header: solid background after scrolling */
  function initHeader() {
    var header = document.getElementById("site-header");
    if (!header) return;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* Full-screen mobile menu */
  function initMobileMenu() {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;

    var label = toggle.querySelector(".visually-hidden");
    var isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      if (label) label.textContent = "Close menu";
      document.body.classList.add("menu-open");
      lockPage();
      document.addEventListener("keydown", onKeydown);

      /* Move focus to the first link once the menu is visible */
      setTimeout(function () {
        var first = getFocusable(menu)[0];
        if (first) first.focus({ preventScroll: true });
      }, 60);
    }

    function close(returnFocus) {
      if (!isOpen) return;
      isOpen = false;
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      if (label) label.textContent = "Open menu";
      document.body.classList.remove("menu-open");
      unlockPage();
      document.removeEventListener("keydown", onKeydown);
      if (returnFocus !== false) toggle.focus({ preventScroll: true });
    }

    /* Escape closes; Tab stays inside the menu and the close button */
    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      var items = [toggle].concat(getFocusable(menu));
      var first = items[0];
      var last = items[items.length - 1];
      var current = document.activeElement;

      if (items.indexOf(current) === -1) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (isOpen) close();
      else open();
    });

    /* Tapping a link or the reserve button closes the menu */
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a, [data-open-reservation]")) close(false);
    });

    /* Close if the screen becomes wide enough for the desktop nav */
    window.matchMedia("(min-width: 1025px)").addEventListener("change", function (event) {
      if (event.matches) close(false);
    });
  }

  /* Reservation popup */
  function initReservation() {
    var modal = document.getElementById("reservation-modal");
    if (!modal) return;

    var dialog = modal.querySelector(".modal-dialog");
    var lastTrigger = null;

    function open(trigger) {
      if (modal.classList.contains("is-open")) return;
      /* Opened from the mobile menu: return focus to the menu button, since the menu closes */
      if (trigger && trigger.closest(".mobile-menu")) trigger = document.querySelector(".nav-toggle");
      lastTrigger = trigger || document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      lockPage();
      document.addEventListener("keydown", onKeydown);

      var focusable = getFocusable(dialog);
      var first = focusable[0] || dialog;
      first.focus({ preventScroll: true });
    }

    function close() {
      if (!modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      unlockPage();
      document.removeEventListener("keydown", onKeydown);

      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus({ preventScroll: true });
      }
      lastTrigger = null;
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") return;

      var focusable = getFocusable(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }

    /* Any element with data-open-reservation opens the popup */
    document.addEventListener("click", function (event) {
      var opener = event.target.closest("[data-open-reservation]");
      if (opener) {
        event.preventDefault();
        open(opener);
        return;
      }

      if (event.target.closest("[data-close-reservation]")) {
        close();
      }
    });

    initCopyPhone(modal);
  }

  /* Copy phone number button */
  function initCopyPhone(scope) {
    var button = scope.querySelector("[data-copy-phone]");
    if (!button) return;

    var label = button.querySelector("[data-copy-label]");
    var status = scope.querySelector("[data-copy-status]");
    var original = label.textContent;
    var timer = null;

    function fallbackCopy(text) {
      var field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(field);
      button.focus();
      return ok ? Promise.resolve() : Promise.reject();
    }

    function copy(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).catch(function () {
          return fallbackCopy(text);
        });
      }
      return fallbackCopy(text);
    }

    function showMessage(message) {
      label.textContent = message;
      if (status) status.textContent = message === "Copied!" ? "Phone number copied" : message;
      clearTimeout(timer);
      timer = setTimeout(function () {
        label.textContent = original;
        if (status) status.textContent = "";
      }, 2000);
    }

    button.addEventListener("click", function () {
      copy(button.getAttribute("data-copy-phone")).then(
        function () {
          showMessage("Copied!");
        },
        function () {
          showMessage("Copy failed");
        }
      );
    });
  }

  /* Smooth scrolling with Lenis, synced to GSAP; touch devices keep native scrolling */
  function initSmoothScroll() {
    if (prefersReducedMotion || !window.Lenis || !hasFinePointer) return;

    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    /* Shared with page scripts such as js/menu.js */
    window.noNeLenis = lenis;

    if (window.gsap && window.ScrollTrigger) {
      lenis.on("scroll", window.ScrollTrigger.update);
      window.gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }

  /* Scroll progress bar; plain JavaScript so it works without the libraries */
  function initScrollProgress() {
    var bar = document.querySelector(".scroll-progress-bar");
    if (!bar) return;
    var ticking = false;

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = "scaleX(" + progress + ")";
      ticking = false;
    }

    function request() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
  }

  /* Hero scroll indicator: hide after scrolling, smooth scroll to the next section */
  function initScrollIndicator() {
    var indicator = document.querySelector("[data-scroll-indicator]");
    if (!indicator) return;

    function update() {
      indicator.classList.toggle("is-hidden", window.scrollY > 60);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });

    indicator.addEventListener("click", function (event) {
      var target = document.querySelector(indicator.getAttribute("href"));
      if (!target || !lenis) return;
      event.preventDefault();
      var header = document.getElementById("site-header");
      lenis.scrollTo(target, { offset: header ? -header.offsetHeight : 0, duration: 1.6 });
    });
  }

  /* Page animations. Content is visible by default; these only enhance it. */
  function initMotion() {
    var gsap = window.gsap;

    if (prefersReducedMotion || !gsap) {
      root.classList.remove("motion-ready");
      return;
    }

    root.classList.add("js-anim");
    initLogoPop(gsap);
    initHeroMotion(gsap);
    initTicker(gsap);
    initFooterMarquee(gsap);

    if (!window.ScrollTrigger) {
      initMagneticButtons(gsap);
      return;
    }
    gsap.registerPlugin(window.ScrollTrigger);

    /* Parallax and magnetic buttons run only on desktop with a fine pointer */
    gsap.matchMedia().add("(min-width: 1025px) and (pointer: fine)", function () {
      initHeroParallax(gsap);
      initStoryParallax(gsap);
      return initMagneticButtons(gsap);
    });

    initStreetSigns(gsap);
    initHeadingReveal(gsap);
    initDrawRules(gsap);
    initDishCards(gsap);
    initScrollMotion(gsap);
    initStoryHighlight(gsap);
    initExperience(gsap);
    initCateringList(gsap);
    initGalleryWipe(gsap);
    initVisitMedia(gsap);
    initFooterReveal(gsap);
    initFooterMascot(gsap);

    /* Recalculate trigger positions once every image has loaded, and after rotating the device */
    if (document.readyState === "complete") {
      window.ScrollTrigger.refresh();
    } else {
      window.addEventListener("load", function () {
        window.ScrollTrigger.refresh();
      });
    }
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        window.ScrollTrigger.refresh();
      }, 300);
    });
  }

  /* Hero painting moves slower than the page */
  function initHeroParallax(gsap) {
    var hero = document.querySelector(".hero");
    var layer = hero && hero.querySelector(".hero-parallax");
    if (!layer) return;

    gsap.to(layer, {
      y: function () {
        return hero.offsetHeight * 0.25;
      },
      ease: "none",
      scrollTrigger: { trigger: hero, start: 0, end: "bottom top", scrub: true, invalidateOnRefresh: true }
    });
  }

  /* Street-sign eyebrows and the house number plate drop in and swing from their top edge */
  function initStreetSigns(gsap) {
    document.querySelectorAll(".section-eyebrow:not(.hero-eyebrow), .house-plate").forEach(function (sign) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: sign, start: "top 88%", toggleActions: "play none none none" } });
      tl.fromTo(sign, { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0)
        .fromTo(sign, { rotation: -9 }, { rotation: 0, duration: 2.6, ease: "elastic.out(1, 0.22)" }, 0);
    });
  }

  /* Split a heading into masked word spans; the full text stays in aria-label */
  function splitHeadingWords(heading) {
    var label = heading.textContent.normalize("NFC").replace(/\s+/g, " ").trim();
    var pieces = [];
    Array.prototype.forEach.call(heading.childNodes, function (node) {
      if (node.nodeType === 3) pieces.push({ text: node.nodeValue, lang: null });
      else if (node.nodeType === 1) pieces.push({ text: node.textContent, lang: node.getAttribute("lang") });
    });

    /* Group text into words, keeping each piece's lang */
    var words = [];
    var current = [];
    pieces.forEach(function (piece) {
      piece.text.normalize("NFC").split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          if (current.length) words.push(current);
          current = [];
        } else {
          current.push({ text: part, lang: piece.lang });
        }
      });
    });
    if (current.length) words.push(current);

    heading.setAttribute("aria-label", label);
    heading.textContent = "";

    return words.map(function (word, i) {
      var mask = document.createElement("span");
      mask.className = "word-mask";
      mask.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.className = "word";
      word.forEach(function (part) {
        if (part.lang) {
          var span = document.createElement("span");
          span.lang = part.lang;
          span.textContent = part.text;
          inner.appendChild(span);
        } else {
          inner.appendChild(document.createTextNode(part.text));
        }
      });
      mask.appendChild(inner);
      heading.appendChild(mask);
      if (i < words.length - 1) heading.appendChild(document.createTextNode(" "));
      return inner;
    });
  }

  /* Section headings reveal word by word from behind a mask */
  function initHeadingReveal(gsap) {
    document.querySelectorAll(".section-title").forEach(function (heading) {
      var words = splitHeadingWords(heading);
      gsap.fromTo(words, { yPercent: 110 }, {
        yPercent: 0,
        duration: 1.1,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: heading, start: "top 85%", toggleActions: "play none none none" }
      });
    });
  }

  /* Thin mustard rules draw themselves from left to right */
  function initDrawRules(gsap) {
    var selector = ".section-head--split, .experience-grid, .catering-list, .visit-block, .footer-heading";
    document.querySelectorAll(selector).forEach(function (el) {
      gsap.fromTo(el, { "--rule-scale": 0 }, {
        "--rule-scale": 1,
        duration: 1.4,
        ease: "power2.inOut",
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
      });
    });
  }

  /* Dish cards are placed on the table one by one, then the stamp slams down */
  function initDishCards(gsap) {
    var grid = document.querySelector(".dish-grid");
    if (!grid) return;

    var tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: "top 75%", toggleActions: "play none none none" } });

    grid.querySelectorAll(".dish-card").forEach(function (card, i) {
      var print = card.querySelector(".print");
      var stamp = card.querySelector(".stamp");
      var at = i * 0.22;

      tl.fromTo(card, { autoAlpha: 0, y: -50 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out" }, at);

      if (print) {
        tl.fromTo(print,
          { rotation: gsap.utils.random(-4, 4), "--land-shadow": 0 },
          { rotation: 0, "--land-shadow": 1, duration: 1.1, ease: "back.out(1.4)", clearProps: "transform" },
          at);
      }

      if (stamp) {
        tl.fromTo(stamp,
          { autoAlpha: 0, scale: 2, rotation: -6 },
          { autoAlpha: 1, scale: 1, rotation: -6, duration: 0.3, ease: "power4.in" },
          at + 0.95)
          .to(stamp, { x: 2, duration: 0.05, repeat: 3, yoyo: true, ease: "none" }, at + 1.25)
          .set(stamp, { x: 0 }, at + 1.45);
      }
    });
  }

  /* Buttons lean slightly towards a nearby cursor, then spring back */
  function initMagneticButtons(gsap) {
    if (!hasFinePointer) return;

    var buttons = Array.prototype.slice.call(document.querySelectorAll(".btn-primary, .btn-secondary"));
    var reach = 40;
    var maxShift = 6;
    var lastEvent = null;
    var ticking = false;

    function update() {
      ticking = false;
      buttons.forEach(function (btn) {
        var rect = btn.getBoundingClientRect();
        if (!rect.width) return;
        var dx = lastEvent.clientX - (rect.left + rect.width / 2);
        var dy = lastEvent.clientY - (rect.top + rect.height / 2);
        var rangeX = rect.width / 2 + reach;
        var rangeY = rect.height / 2 + reach;

        if (Math.abs(dx) < rangeX && Math.abs(dy) < rangeY) {
          btn.magnetActive = true;
          gsap.to(btn, { x: (dx / rangeX) * maxShift, y: (dy / rangeY) * maxShift, duration: 0.4, ease: "power3.out", overwrite: "auto" });
        } else if (btn.magnetActive) {
          btn.magnetActive = false;
          gsap.to(btn, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
        }
      });
    }

    function onMove(event) {
      lastEvent = event;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    document.addEventListener("pointermove", onMove, { passive: true });

    /* Cleanup when the screen leaves the desktop size */
    return function () {
      document.removeEventListener("pointermove", onMove);
      gsap.set(buttons, { x: 0, y: 0 });
    };
  }

  /* Ticker strip scrolls endlessly and slows down on hover */
  function initTicker(gsap) {
    var track = document.querySelector("[data-ticker]");
    if (!track) return;

    var isSmall = window.matchMedia("(max-width: 768px)").matches;
    var tween = gsap.to(track, { xPercent: -50, ease: "none", duration: isSmall ? 75 : 60, repeat: -1 });
    var strip = track.parentElement;
    strip.addEventListener("mouseenter", function () {
      gsap.to(tween, { timeScale: 0.25, duration: 0.6 });
    });
    strip.addEventListener("mouseleave", function () {
      gsap.to(tween, { timeScale: 1, duration: 0.6 });
    });
  }

  /* Split text into whole characters so Vietnamese letters with accents stay together */
  function splitGraphemes(text) {
    text = text.normalize("NFC");
    if (window.Intl && Intl.Segmenter) {
      var segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });
      return Array.from(segmenter.segment(text), function (part) {
        return part.segment;
      });
    }
    return Array.from(text);
  }

  /* Hero line 2: typed out once after line 1 appears */
  function initHeroTypewriter() {
    var line = document.querySelector("[data-typewriter]");
    var source = line && line.querySelector(".hero-type-text");
    if (!source) return;

    /* Skip if motion is reduced or the no-JS fallback has already shown the text */
    if (prefersReducedMotion || !root.classList.contains("type-ready")) {
      root.classList.remove("type-ready");
      return;
    }
    window.noNeTypewriterStarted = true;

    /* Characters to type, marking the ones inside "No Nê" */
    var chars = [];
    Array.prototype.forEach.call(source.childNodes, function (node) {
      var text = (node.textContent || "").replace(/\s+/g, " ");
      var accent = node.nodeType === 1 && node.classList.contains("hero-nene");
      splitGraphemes(text).forEach(function (g) {
        chars.push({ text: g, accent: accent });
      });
    });

    /* Full text for screen readers while the real line is hidden */
    var srText = document.createElement("span");
    srText.className = "visually-hidden";
    srText.textContent = source.textContent.normalize("NFC").replace(/\s+/g, " ").trim();
    line.appendChild(srText);

    /* Typed copy and cursor, hidden from screen readers */
    var layer = document.createElement("span");
    layer.className = "hero-type-layer";
    layer.setAttribute("aria-hidden", "true");
    var cursor = document.createElement("span");
    cursor.className = "hero-cursor";
    cursor.textContent = "|";
    layer.appendChild(cursor);
    line.appendChild(layer);

    var index = 0;
    var accentEl = null;
    var paused = false;

    function typeNext() {
      if (index >= chars.length) {
        finish();
        return;
      }

      var c = chars[index++];
      if (c.accent) {
        if (!accentEl) {
          accentEl = document.createElement("span");
          accentEl.className = "hero-nene";
          layer.insertBefore(accentEl, cursor);
        }
        accentEl.appendChild(document.createTextNode(c.text));
      } else {
        accentEl = null;
        layer.insertBefore(document.createTextNode(c.text), cursor);
      }

      var delay = 70 + Math.random() * 20;

      /* Short pause after the first word */
      var next = chars[index];
      if (!paused && next && next.text === " ") {
        delay += 350;
        paused = true;
      }

      setTimeout(typeNext, delay);
    }

    /* Keep the cursor blinking for 3 seconds, fade it, then show the real line again */
    function finish() {
      setTimeout(function () {
        cursor.classList.add("is-hidden");
        setTimeout(function () {
          root.classList.remove("type-ready");
          layer.remove();
          srText.remove();
        }, 500);
      }, 3000);
    }

    /* Start once line 1 has faded up */
    setTimeout(typeNext, window.gsap ? 1100 : 300);
  }

  /* Hero: staggered intro */
  function initHeroMotion(gsap) {
    var hero = document.querySelector(".hero");
    if (!hero) return;

    var items = hero.querySelectorAll("[data-hero-item]");
    gsap.fromTo(
      items,
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.16, delay: 0.2 }
    );
  }

  /* Fade elements up once when they scroll into view */
  function revealOnScroll(gsap, targets, trigger, fromVars, toVars) {
    if (!targets || targets.length === 0) return;
    gsap.fromTo(
      targets,
      fromVars,
      Object.assign(
        {
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: trigger, start: "top 80%", toggleActions: "play none none none" }
        },
        toVars
      )
    );
  }

  function initScrollMotion(gsap) {
    var $ = function (sel, ctx) {
      return (ctx || document).querySelectorAll(sel);
    };

    /* Our story: text fades up (sign and heading have their own effects), images turn from black and white to colour */
    var storyText = document.querySelector(".story-text");
    if (storyText) {
      revealOnScroll(gsap, $("[data-reveal-item]:not(.section-eyebrow):not(.section-title)", storyText), storyText,
        { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.1 });
    }

    $("[data-colorize]").forEach(function (photo) {
      gsap.fromTo(photo,
        { filter: "grayscale(1)" },
        {
          filter: "grayscale(0)",
          ease: "none",
          scrollTrigger: { trigger: photo, start: "top 90%", end: "center 45%", scrub: true }
        });
    });

    /* Catering: text from the left, image from the right */
    var catering = document.querySelector(".catering");
    if (catering) {
      revealOnScroll(gsap, $(".catering-inner", catering), catering,
        { autoAlpha: 0, x: -60 }, { autoAlpha: 1, x: 0, duration: 1.2 });
      revealOnScroll(gsap, $(".catering-media", catering), catering,
        { autoAlpha: 0, x: 60 }, { autoAlpha: 1, x: 0, duration: 1.2 });
    }
  }

  /* Our Story: the two photos drift at different speeds */
  function initStoryParallax(gsap) {
    var media = document.querySelector(".story-media");
    if (!media) return;

    var speeds = [
      { el: media.querySelector(".story-photo--main"), distance: 30 },
      { el: media.querySelector(".story-photo--inset"), distance: 80 }
    ];

    speeds.forEach(function (item) {
      if (!item.el) return;
      gsap.fromTo(item.el, { y: item.distance }, {
        y: -item.distance,
        ease: "none",
        scrollTrigger: { trigger: media, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  /* Our Story: a mustard highlighter is drawn behind the quote */
  function initStoryHighlight(gsap) {
    var quote = document.querySelector(".story-quote");
    var body = quote && quote.querySelector(".story-quote-body");
    var text = quote && quote.querySelector(".story-quote-text");
    if (!body || !text) return;

    /* A hidden copy behind the text carries the highlight, so it can be revealed with clip-path */
    var mark = document.createElement("span");
    mark.className = "story-quote-mark";
    mark.setAttribute("aria-hidden", "true");
    var hl = document.createElement("span");
    hl.className = "story-quote-hl";
    hl.textContent = text.textContent;
    mark.appendChild(hl);
    body.appendChild(mark);
    quote.classList.add("has-mark");

    gsap.fromTo(mark, { clipPath: "inset(0% 100% 0% 0%)" }, {
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 1.6,
      delay: 0.5,
      ease: "power2.inOut",
      scrollTrigger: { trigger: quote, start: "top 80%", toggleActions: "play none none none" }
    });
  }

  /* Experience: vertical rules draw down, then each column's number and text rise in, left to right */
  function initExperience(gsap) {
    var grid = document.querySelector(".experience-grid");
    if (!grid) return;

    var tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: "top 78%", toggleActions: "play none none none" } });

    grid.querySelectorAll(".experience-item").forEach(function (item, i) {
      var at = i * 0.22;
      var num = item.querySelector(".experience-num");
      var text = item.querySelectorAll(".experience-title, .experience-sub, .experience-text");

      if (i > 0) {
        tl.fromTo(item, { "--rule-scale-y": 0 }, { "--rule-scale-y": 1, duration: 1.2, ease: "power2.inOut" }, 0);
      }
      if (num) {
        tl.fromTo(num, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out" }, at + 0.2);
      }
      tl.fromTo(text, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.1 }, at + 0.5);
    });
  }

  /* Catering list: each bullet pops in just before its text */
  function initCateringList(gsap) {
    var list = document.querySelector(".catering-list");
    if (!list) return;

    var tl = gsap.timeline({ scrollTrigger: { trigger: list, start: "top 85%", toggleActions: "play none none none" } });

    list.querySelectorAll("li").forEach(function (li, i) {
      var at = 0.3 + i * 0.16;
      tl.fromTo(li, { "--bullet-scale": 0 }, { "--bullet-scale": 1, duration: 0.45, ease: "back.out(3)" }, at)
        .fromTo(li.querySelector(".catering-item-text"), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: "power2.out" }, at + 0.12);
    });
  }

  /* Gallery: images wipe in, alternating left-to-right and bottom-to-top */
  function initGalleryWipe(gsap) {
    var grid = document.querySelector(".gallery-grid");
    if (!grid) return;

    var tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: "top 78%", toggleActions: "play none none none" } });

    grid.querySelectorAll(".gallery-item").forEach(function (item, i) {
      var hidden = i % 2 === 0 ? "inset(0% 100% 0% 0%)" : "inset(100% 0% 0% 0%)";
      tl.fromTo(item, { clipPath: hidden }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power3.inOut" }, i * 0.18);
    });
  }

  /* Visit Us: storefront photo and map fade up softly */
  function initVisitMedia(gsap) {
    var media = document.querySelector(".visit-media");
    if (!media) return;

    gsap.fromTo(media.children, { autoAlpha: 0, y: 30 }, {
      autoAlpha: 1,
      y: 0,
      duration: 1.2,
      ease: "power2.out",
      stagger: 0.18,
      scrollTrigger: { trigger: media, start: "top 85%", toggleActions: "play none none none" }
    });
  }

  /* Footer: big tagline drifts slowly from left to right */
  function initFooterMarquee(gsap) {
    var track = document.querySelector("[data-footer-marquee]");
    if (!track) return;
    gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, ease: "none", duration: 90, repeat: -1 });
  }

  /* Header logo pops in gently on load */
  function initLogoPop(gsap) {
    var img = document.querySelector(".logo--header .logo-img");
    if (!img) return;
    gsap.fromTo(img, { autoAlpha: 0, scale: 0.9 }, {
      autoAlpha: 1,
      scale: 1,
      duration: 1,
      delay: 0.1,
      ease: "back.out(2)",
      clearProps: "transform"
    });
  }

  /* Footer mascot pops up from behind the footer edge, bobs, and says hello on hover */
  function initFooterMascot(gsap) {
    var mascot = document.querySelector(".footer-mascot");
    var img = mascot && mascot.querySelector(".footer-mascot-img");
    var hitArea = mascot && mascot.querySelector(".footer-mascot-clip");
    if (!img) return;

    /* yPercent is added on top of the CSS resting position */
    var intro = gsap.timeline({ scrollTrigger: { trigger: ".site-footer", start: "top 90%", toggleActions: "play none none none" } });
    intro.fromTo(img, { yPercent: 62 }, { yPercent: -8, duration: 0.6, ease: "back.out(2.2)" })
      .to(img, { yPercent: -2, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: 3 })
      .to(img, { yPercent: 0, duration: 0.5, ease: "power2.out" });

    if (!hasFinePointer) return;

    hitArea.addEventListener("mouseenter", function () {
      intro.progress(1);
      mascot.classList.add("is-greeting");
      gsap.to(img, { yPercent: -26, rotation: 6, duration: 0.45, ease: "back.out(2.5)", overwrite: "auto" });
    });

    hitArea.addEventListener("mouseleave", function () {
      mascot.classList.remove("is-greeting");
      gsap.to(img, { yPercent: 0, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
    });
  }

  /* Touch screens: tapping the mascot toggles its pop-up and speech bubble */
  function initMascotTap() {
    if (hasFinePointer) return;
    var mascot = document.querySelector(".footer-mascot");
    var hitArea = mascot && mascot.querySelector(".footer-mascot-clip");
    var img = mascot && mascot.querySelector(".footer-mascot-img");
    if (!hitArea) return;

    var gsap = window.gsap;
    var canMove = gsap && !prefersReducedMotion;
    var isUp = false;

    hitArea.addEventListener("click", function () {
      isUp = !isUp;
      mascot.classList.toggle("is-greeting", isUp);
      if (!canMove) return;
      gsap.to(img, isUp
        ? { yPercent: -26, rotation: 6, duration: 0.45, ease: "back.out(2.5)", overwrite: true }
        : { yPercent: 0, rotation: 0, duration: 0.45, ease: "power2.out", overwrite: true });
    });
  }

  /* Signature dishes carousel (mobile): dots follow the scroll and jump to a card */
  function initDishCarousel() {
    var grid = document.querySelector(".dish-grid");
    var dotsWrap = document.querySelector("[data-dish-dots]");
    if (!grid || !dotsWrap) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll(".dish-card"));
    var dots = cards.map(function (card, i) {
      var name = card.querySelector(".dish-name-en");
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dish-dot";
      dot.setAttribute("aria-label", "Show dish " + (i + 1) + " of " + cards.length + (name ? ": " + name.textContent.trim() : ""));
      dot.addEventListener("click", function () {
        var padding = parseFloat(window.getComputedStyle(grid).paddingLeft) || 0;
        grid.scrollTo({ left: card.offsetLeft - padding, behavior: prefersReducedMotion ? "auto" : "smooth" });
      });
      dotsWrap.appendChild(dot);
      return dot;
    });

    function update() {
      var padding = parseFloat(window.getComputedStyle(grid).paddingLeft) || 0;
      var position = grid.scrollLeft + padding;
      var active = 0;
      var best = Infinity;
      cards.forEach(function (card, i) {
        var distance = Math.abs(card.offsetLeft - position);
        if (distance < best) {
          best = distance;
          active = i;
        }
      });
      dots.forEach(function (dot, i) {
        if (i === active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    var ticking = false;
    grid.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          update();
        });
      }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* Sticky call bar, shared by every page (mobile only).
     Shown after the hero, hidden at the footer, hidden while scrolling down and back on scrolling up. */
  var callBarIgnoreUntil = 0;

  /* Page scripts call this before jumping the page (tab switch, filtering) so the bar does not flicker */
  window.noNeHoldCallBar = function (ms) {
    callBarIgnoreUntil = Date.now() + (ms || 800);
  };

  function initCallBar() {
    var bar = document.querySelector("[data-call-bar]");
    if (!bar || !("IntersectionObserver" in window)) return;

    var mobile = window.matchMedia("(max-width: 768px)");
    var hero = document.querySelector(".hero, .menu-hero, .story-hero");
    var footer = document.querySelector(".site-footer");
    var heroVisible = !!hero;
    var footerVisible = false;
    var scrollingDown = false;
    var lastY = window.scrollY;
    var ticking = false;
    var observer = null;

    function update() {
      bar.classList.toggle("is-visible", !heroVisible && !footerVisible && !scrollingDown);
    }

    /* Ignore movements under 10px, locked pages and programmatic jumps */
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY;
        if (document.body.classList.contains("is-locked") || Date.now() < callBarIgnoreUntil) {
          lastY = y;
          return;
        }
        var dy = y - lastY;
        if (Math.abs(dy) < 10) return;
        scrollingDown = dy > 0;
        lastY = y;
        update();
      });
    }

    function start() {
      heroVisible = !!hero;
      footerVisible = false;
      scrollingDown = false;
      lastY = window.scrollY;
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.target === hero) heroVisible = entry.isIntersecting;
          if (entry.target === footer) footerVisible = entry.isIntersecting;
        });
        update();
      });
      if (hero) observer.observe(hero);
      if (footer) observer.observe(footer);
      window.addEventListener("scroll", onScroll, { passive: true });
      update();
    }

    function stop() {
      if (observer) observer.disconnect();
      observer = null;
      window.removeEventListener("scroll", onScroll);
      bar.classList.remove("is-visible");
    }

    /* Only runs on mobile; turns off when the screen grows past 768px */
    if (mobile.matches) start();
    mobile.addEventListener("change", function (event) {
      if (event.matches) start();
      else stop();
    });
  }

  /* Footer columns fade up one after another */
  function initFooterReveal(gsap) {
    var grid = document.querySelector(".footer-grid");
    if (!grid) return;

    gsap.fromTo(grid.children, { autoAlpha: 0, y: 30 }, {
      autoAlpha: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.15,
      scrollTrigger: { trigger: grid, start: "top 90%", toggleActions: "play none none none" }
    });
  }

  initHeader();
  /* Shared with page scripts such as js/menu.js (bottom sheets) */
  window.noNeLockPage = lockPage;
  window.noNeUnlockPage = unlockPage;

  initMobileMenu();
  initSmoothScroll();
  initScrollProgress();
  initScrollIndicator();
  initHeroTypewriter();
  initMotion();
  initMascotTap();
  initDishCarousel();
  initCallBar();
  initReservation();
})();
