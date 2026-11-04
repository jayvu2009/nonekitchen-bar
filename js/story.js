/* Our Story page: pronunciation, ration book, photo wall, Then & Now slider, hotspots, journey tickets and closing scene */

(function () {
  "use strict";

  var root = document.documentElement;
  if (!document.body.classList.contains("story-page")) return;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var canAnimate = !!gsap && !prefersReducedMotion;
  /* Small-screen layout (mobile only; desktop and tablet keep their behaviour) */
  var mobileQuery = window.matchMedia("(max-width: 768px)");

  /* Interactive parts only switch on when this script runs */
  root.classList.add("js-story");

  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  function onceInView(el, start, fn) {
    if (ScrollTrigger) {
      /* A flag instead of once: true, which breaks ScrollTrigger refreshes on long pages */
      var done = false;
      ScrollTrigger.create({
        trigger: el,
        start: start || "top 80%",
        onEnter: function () {
          if (done) return;
          done = true;
          fn();
        }
      });
    } else {
      fn();
    }
  }

  /* "Hear it": only shown when a Vietnamese voice is available */
  function initPronounce() {
    var button = document.querySelector("[data-speak]");
    if (!button || !("speechSynthesis" in window)) return;
    var synth = window.speechSynthesis;
    var voice = null;

    function findVoice() {
      voice = synth.getVoices().filter(function (v) {
        return /^vi(-|_|$)/i.test(v.lang);
      })[0] || null;
      button.hidden = !voice;
    }

    findVoice();
    if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", findVoice);

    button.addEventListener("click", function () {
      if (!voice) return;
      synth.cancel();
      var utterance = new SpeechSynthesisUtterance(button.getAttribute("data-speak"));
      utterance.lang = "vi-VN";
      utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.onstart = function () {
        button.classList.add("is-speaking");
      };
      utterance.onend = utterance.onerror = function () {
        button.classList.remove("is-speaking");
      };
      synth.speak(utterance);
    });
  }

  /* Ration book: tear a coupon to read a memory */
  function initRationBook() {
    var book = document.querySelector("[data-ration-book]");
    if (!book) return;

    var coupons = Array.prototype.slice.call(book.querySelectorAll("[data-coupon]"));
    var counterWrap = book.querySelector("[data-ration-counter]");
    var count = book.querySelector("[data-ration-count]");
    var done = book.querySelector("[data-ration-done]");
    var live = book.querySelector("[data-ration-live]");
    var reset = book.querySelector("[data-ration-reset]");
    var torn = 0;

    counterWrap.hidden = false;

    function update() {
      count.textContent = torn;
      done.hidden = torn < coupons.length;
    }

    function tear(coupon) {
      if (coupon.classList.contains("is-torn")) return;
      var memory = document.getElementById(coupon.getAttribute("aria-controls"));
      coupon.setAttribute("aria-expanded", "true");
      torn++;
      update();
      live.textContent = "Memory " + coupon.getAttribute("data-coupon") + ": " + memory.textContent +
        (torn === coupons.length ? " Back then, every gram of food mattered." : "");

      function finish() {
        coupon.classList.add("is-torn");
        coupon.tabIndex = -1;
        gsap && gsap.set(coupon, { clearProps: "all" });
        /* Keep keyboard focus on the revealed memory */
        if (document.activeElement === coupon || document.activeElement === document.body) memory.focus({ preventScroll: true });
      }

      if (!canAnimate) {
        finish();
        return;
      }

      /* Rip along the perforation, then fall away */
      var dir = Math.random() > 0.5 ? 1 : -1;
      gsap.timeline({ onComplete: finish })
        .to(coupon, { x: 3 * dir, duration: 0.05, repeat: 3, yoyo: true, ease: "none" })
        .to(coupon, { rotation: 7 * dir, transformOrigin: dir > 0 ? "0% 0%" : "100% 0%", duration: 0.18, ease: "power2.out" })
        .to(coupon, { y: 140, rotation: 22 * dir, autoAlpha: 0, duration: 0.6, ease: "power2.in" });
    }

    coupons.forEach(function (coupon) {
      coupon.addEventListener("click", function () {
        tear(coupon);
      });
    });

    reset.addEventListener("click", function () {
      torn = 0;
      coupons.forEach(function (coupon) {
        coupon.classList.remove("is-torn");
        coupon.setAttribute("aria-expanded", "false");
        coupon.removeAttribute("tabindex");
        if (canAnimate) {
          gsap.fromTo(coupon, { y: -30, autoAlpha: 0, rotation: -4 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 0.5, ease: "back.out(1.6)", clearProps: "all" });
        }
      });
      update();
      live.textContent = "The coupons are back in the book.";
      coupons[0].focus();
    });

    update();
  }

  /* Photo wall: prints develop from white, like a Polaroid */
  function initPhotoWall() {
    var wall = document.querySelector("[data-photo-wall]");
    if (!wall || !canAnimate) return;
    var prints = wall.querySelectorAll(".wall-print");

    gsap.set(prints, { autoAlpha: 0, y: 24 });

    function develop(print, delay) {
      var img = print.querySelector("img");
      gsap.to(print, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out", delay: delay, clearProps: "opacity,visibility,transform" });
      gsap.fromTo(img,
        { filter: "brightness(2.6) saturate(0) contrast(0.4) blur(1px)" },
        { filter: "brightness(0.98) saturate(0.78) contrast(0.96) blur(0px)", duration: 2.2, delay: delay + 0.2, ease: "power1.out", clearProps: "filter" });
    }

    /* Mobile swipe row: each print develops when it scrolls into view, sideways or down */
    if (mobileQuery.matches && "IntersectionObserver" in window) {
      var seen = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          seen.unobserve(entry.target);
          develop(entry.target, 0);
        });
      }, { threshold: 0.02 });
      prints.forEach(function (print) {
        seen.observe(print);
      });
      return;
    }

    onceInView(wall, "top 78%", function () {
      prints.forEach(function (print, i) {
        var img = print.querySelector("img");
        gsap.to(print, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out", delay: i * 0.28, clearProps: "opacity,visibility,transform" });
        gsap.fromTo(img,
          { filter: "brightness(2.6) saturate(0) contrast(0.4) blur(1px)" },
          {
            filter: "brightness(0.98) saturate(0.78) contrast(0.96) blur(0px)",
            duration: 2.2,
            delay: i * 0.28 + 0.2,
            ease: "power1.out",
            clearProps: "filter"
          });
      });
    });
  }

  /* Then & Now: drag, click or use the arrow keys */
  function initCompare() {
    var frame = document.querySelector("[data-compare]");
    var handle = frame && frame.querySelector("[data-compare-handle]");
    if (!handle) return;

    var pos = 50;
    var dragging = false;

    function setPos(value) {
      pos = Math.max(0, Math.min(100, value));
      frame.style.setProperty("--pos", pos + "%");
      var rounded = Math.round(pos);
      handle.setAttribute("aria-valuenow", rounded);
      handle.setAttribute("aria-valuetext", rounded + "% old Hanoi");
    }

    function fromEvent(event) {
      var rect = frame.getBoundingClientRect();
      setPos(((event.clientX - rect.left) / rect.width) * 100);
    }

    /* Touch: wait to see whether the finger moves sideways before dragging, so page scrolling still works */
    var touchStart = null;

    frame.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.pointerType === "touch") {
        touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
        return;
      }
      dragging = true;
      frame.classList.add("is-dragging");
      if (gsap) gsap.killTweensOf(state);
      frame.setPointerCapture(event.pointerId);
      fromEvent(event);
    });

    frame.addEventListener("pointermove", function (event) {
      if (touchStart && !dragging) {
        var dx = Math.abs(event.clientX - touchStart.x);
        var dy = Math.abs(event.clientY - touchStart.y);
        if (dx > 6 && dx > dy) {
          dragging = true;
          frame.classList.add("is-dragging");
          if (gsap) gsap.killTweensOf(state);
          try {
            frame.setPointerCapture(touchStart.id);
          } catch (err) {
            /* Capture is optional */
          }
        } else if (dy > 10) {
          touchStart = null;
        }
      }
      if (dragging) fromEvent(event);
    });

    function stop() {
      dragging = false;
      touchStart = null;
      frame.classList.remove("is-dragging");
    }

    /* A tap without movement jumps to that point */
    frame.addEventListener("pointerup", function (event) {
      if (touchStart && !dragging) {
        if (gsap) gsap.killTweensOf(state);
        fromEvent(event);
      }
      stop();
    });
    frame.addEventListener("pointercancel", stop);

    handle.addEventListener("keydown", function (event) {
      var step = event.shiftKey ? 10 : 5;
      var next = null;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = pos - step;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") next = pos + step;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = 100;
      if (next === null) return;
      event.preventDefault();
      if (gsap) gsap.killTweensOf(state);
      setPos(next);
    });

    /* Gentle sweep from 50% to 70% and back, to hint that it can be dragged */
    var state = { value: 50 };
    if (canAnimate) {
      onceInView(frame, "top 65%", function () {
        if (dragging) return;
        state.value = pos;
        gsap.timeline()
          .to(state, { value: 70, duration: 0.9, ease: "power2.inOut", onUpdate: function () { setPos(state.value); } })
          .to(state, { value: 50, duration: 0.9, ease: "power2.inOut", onUpdate: function () { setPos(state.value); } });
      });
    }

    setPos(50);
  }

  /* Find the Details: hotspot notes */
  function initHotspots() {
    var figure = document.querySelector("[data-hotspots]");
    if (!figure) return;

    var dots = Array.prototype.slice.call(figure.querySelectorAll(".hotspot"));
    var note = figure.querySelector("#hotspot-note");
    var noteText = note.querySelector(".hotspot-note-text");
    var toggle = document.querySelector("[data-details-toggle]");
    var list = document.getElementById("details-list");
    var openDot = null;

    /* Positions come from data-x and data-y (percent of the photo) */
    dots.forEach(function (dot) {
      dot.style.left = dot.getAttribute("data-x") + "%";
      dot.style.top = dot.getAttribute("data-y") + "%";
    });

    function close(returnFocus) {
      if (!openDot) return;
      openDot.setAttribute("aria-expanded", "false");
      note.hidden = true;
      if (returnFocus) openDot.focus();
      openDot = null;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onOutside, true);
    }

    function open(dot) {
      if (openDot === dot) {
        close(false);
        return;
      }
      close(false);
      openDot = dot;
      dot.setAttribute("aria-expanded", "true");
      var source = document.getElementById(dot.getAttribute("data-note"));
      var clone = source.cloneNode(true);
      var label = clone.querySelector(".details-list-label");
      if (label) label.remove();
      noteText.innerHTML = clone.innerHTML.trim();

      /* Place the note beside the dot, flipping sides near the edges (mobile: CSS pins it to the bottom of the image) */
      var x = parseFloat(dot.getAttribute("data-x"));
      var y = parseFloat(dot.getAttribute("data-y"));
      note.style.left = "";
      note.style.right = "";
      note.style.top = "";
      if (!mobileQuery.matches) {
        if (x < 55) note.style.left = "calc(" + x + "% + 26px)";
        else note.style.right = "calc(" + (100 - x) + "% + 26px)";
        note.style.top = "calc(" + Math.min(y, 78) + "% - 30px)";
      }
      note.hidden = false;

      if (canAnimate) gsap.fromTo(note, { autoAlpha: 0, y: 8, rotation: -4 }, { autoAlpha: 1, y: 0, rotation: -1.5, duration: 0.35, ease: "back.out(1.8)" });

      document.addEventListener("keydown", onKey);
      setTimeout(function () {
        document.addEventListener("click", onOutside, true);
      }, 0);
    }

    function onKey(event) {
      if (event.key === "Escape") close(true);
    }

    function onOutside(event) {
      if (!note.contains(event.target) && !event.target.closest(".hotspot")) close(false);
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        open(dot);
      });
    });

    note.querySelector("[data-note-close]").addEventListener("click", function () {
      close(true);
    });

    if (toggle && list) {
      toggle.hidden = false;
      toggle.addEventListener("click", function () {
        var isOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isOpen));
        toggle.textContent = isOpen ? "Show all notes" : "Hide all notes";
        list.classList.toggle("is-open", !isOpen);
        if (ScrollTrigger) ScrollTrigger.refresh();
      });
    }
  }

  /* Our Journey: the train travels the rail and punches each ticket */
  function initJourney() {
    var journey = document.querySelector("[data-journey]");
    if (!journey) return;
    var rail = journey.querySelector(".journey-rail");
    var train = journey.querySelector(".journey-train");
    var tickets = Array.prototype.slice.call(journey.querySelectorAll(".ticket"));

    function punchAll() {
      tickets.forEach(function (t) {
        t.classList.add("is-punched");
      });
      if (mobileQuery.matches) train.style.top = "100%";
      else train.style.left = "100%";
    }

    if (!canAnimate || !ScrollTrigger) {
      punchAll();
      return;
    }

    /* Where each ticket sits along the rail, from 0 to 1 (down the rail on mobile, across on larger screens) */
    function stops() {
      var r = rail.getBoundingClientRect();
      /* Rail hidden (tablet grid): punch every ticket as soon as the section scrolls in */
      if (!r.width && !r.height) {
        return tickets.map(function () {
          return 0;
        });
      }
      var vertical = mobileQuery.matches;
      return tickets.map(function (t) {
        var b = t.getBoundingClientRect();
        return vertical ? (b.top + 28 - r.top) / r.height : (b.left + b.width / 2 - r.left) / r.width;
      });
    }

    var points = stops();
    ScrollTrigger.create({
      trigger: journey,
      start: "top 75%",
      end: "bottom 55%",
      scrub: 0.6,
      onRefresh: function () {
        points = stops();
      },
      onUpdate: function (self) {
        var p = self.progress;
        if (mobileQuery.matches) {
          train.style.left = "";
          train.style.top = (p * 100) + "%";
        } else {
          train.style.top = "";
          train.style.left = (p * 100) + "%";
        }
        tickets.forEach(function (t, i) {
          if (p >= points[i] - 0.02 && !t.classList.contains("is-punched")) {
            t.classList.add("is-punched");
            gsap.fromTo(t, { x: -3 }, { x: 0, duration: 0.3, ease: "elastic.out(1, 0.3)", clearProps: "x" });
          }
        });
      }
    });
  }

  /* Closing: stools pop up one after another, the stamp thumps on */
  function initClosing() {
    var scene = document.querySelector(".closing-scene");
    if (!scene || !canAnimate) return;
    var stools = scene.querySelectorAll(".stool");
    var mascot = scene.querySelector(".closing-mascot");
    var stamp = document.querySelector(".closing-stamp");

    gsap.set(stools, { yPercent: 60, autoAlpha: 0 });
    gsap.set(stamp, { autoAlpha: 0, scale: 2.2 });
    if (mascot) gsap.set(mascot, { yPercent: 30, autoAlpha: 0 });

    onceInView(scene, "top 80%", function () {
      gsap.to(stools, { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(2.4)", stagger: 0.14 });
      if (mascot) gsap.to(mascot, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "back.out(1.8)", delay: 0.5 });
      gsap.timeline({ delay: 0.9 })
        .to(stamp, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power4.in" })
        .to(stamp, { x: 2, duration: 0.05, repeat: 3, yoyo: true, ease: "none" })
        .set(stamp, { x: 0 });
    });
  }

  /* Entrance for the dictionary card, postage stamps, ration book and tickets */
  function initReveals() {
    if (!canAnimate || !ScrollTrigger) return;

    function reveal(targets, from, trigger) {
      var list = typeof targets === "string" ? document.querySelectorAll(targets) : targets;
      if (!list.length) return;
      gsap.fromTo(list, from, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.14,
        scrollTrigger: { trigger: trigger || list[0], start: "top 82%", toggleActions: "play none none none" }
      });
    }

    reveal(".dict-card", { autoAlpha: 0, y: 30 });
    reveal(".name-text > p", { autoAlpha: 0, y: 24 });
    reveal(".post-stamp", { autoAlpha: 0, y: -30 }, ".stamp-row");
    reveal(".ration-book", { autoAlpha: 0, y: 30 });
    reveal(".clip-photo", { autoAlpha: 0, x: 40 });
    reveal(".ticket", { autoAlpha: 0, y: 30 }, ".journey-tickets");
  }

  initPronounce();
  initRationBook();
  initCompare();
  initHotspots();
  initPhotoWall();
  initJourney();
  initClosing();
  initReveals();
  window.addEventListener("load", function () {
    if (ScrollTrigger) ScrollTrigger.refresh();
  });

  /* Recalculate after rotating the device or crossing the mobile breakpoint */
  function refreshSoon() {
    setTimeout(function () {
      if (ScrollTrigger) ScrollTrigger.refresh();
    }, 300);
  }
  window.addEventListener("orientationchange", refreshSoon);
  mobileQuery.addEventListener("change", refreshSoon);
})();
