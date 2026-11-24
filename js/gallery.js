/* Gallery page: envelope filters, developing prints, darkroom drying line and photo lightbox */

(function () {
  "use strict";

  if (!document.body.classList.contains("gallery-page")) return;

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var canAnimate = !!gsap && !prefersReducedMotion;

  /* Interactive parts only switch on when this script runs */
  root.classList.add("js-gallery");
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Run once when an element scrolls into view */
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

  function refreshTriggers() {
    if (ScrollTrigger) ScrollTrigger.refresh();
  }

  /* Smooth scroll to an element, just below the sticky header */
  function scrollToEl(el, extraOffset) {
    var header = document.getElementById("site-header");
    var offset = (header ? header.offsetHeight : 0) + (extraOffset || 0);
    if (window.noNeHoldCallBar) window.noNeHoldCallBar(1500);
    if (window.noNeLenis) {
      window.noNeLenis.scrollTo(el, { offset: -offset, duration: 1.2 });
      return;
    }
    var top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  /* Hero: the shop sign swings gently on its wires, and the scroll cue glides to the album */
  function initHero() {
    var sign = document.querySelector(".shop-sign");
    if (sign && canAnimate) {
      gsap.fromTo(sign, { rotation: -5 }, { rotation: 0, duration: 3, delay: 0.3, ease: "elastic.out(1, 0.2)", clearProps: "transform" });
    }

    var cue = document.querySelector("[data-gal-scroll]");
    if (!cue) return;
    cue.addEventListener("click", function (event) {
      var target = document.querySelector(cue.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      scrollToEl(target, 0);
    });
  }

  /* Album prints develop like a Polaroid as they scroll into view */
  function develop(item, delay) {
    if (item.classList.contains("is-developed")) return;
    var img = item.querySelector(".print-img");

    function run() {
      gsap.fromTo(img,
        { opacity: 0, filter: "sepia(0.75) saturate(0.55) brightness(1.18) contrast(0.85)" },
        { opacity: 1, duration: 1.2, delay: delay, ease: "power1.out" });
      gsap.to(img, {
        filter: "sepia(0) saturate(1) brightness(1) contrast(1)",
        duration: 2.2,
        delay: delay + 0.4,
        ease: "power2.out",
        clearProps: "filter,opacity"
      });
      item.classList.add("is-developed");
    }

    if (img.complete && img.naturalWidth) {
      run();
    } else {
      img.addEventListener("load", run, { once: true });
      /* Never leave a print blank if the image fails */
      img.addEventListener("error", function () {
        item.classList.add("is-developed");
      }, { once: true });
    }
  }

  function initDevelop() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".album-item"));
    if (!canAnimate || !ScrollTrigger || !root.classList.contains("gal-motion")) {
      root.classList.remove("gal-motion");
      return;
    }

    ScrollTrigger.batch(items, {
      start: "top 90%",
      onEnter: function (batch) {
        batch.forEach(function (item, i) {
          develop(item, i * 0.12);
        });
      }
    });
  }

  /* Envelope filters */
  var activeFilter = "all";

  function visibleItems() {
    return Array.prototype.slice.call(document.querySelectorAll(".album-item")).filter(function (item) {
      return !item.hidden;
    });
  }

  function initFilters() {
    var bar = document.querySelector("[data-filters]");
    var panel = document.querySelector("[data-album-panel]");
    var status = document.querySelector("[data-filter-status]");
    if (!bar || !panel) return;

    var envs = Array.prototype.slice.call(bar.querySelectorAll(".env"));
    var items = Array.prototype.slice.call(document.querySelectorAll(".album-item"));
    var album = document.getElementById("album");
    var busy = false;

    bar.hidden = false;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "env-all");

    var row = bar.querySelector(".env-row");

    /* On smaller screens the envelopes scroll sideways: keep the selected one in view */
    function revealEnv(env) {
      if (!row || row.scrollWidth <= row.clientWidth) return;
      var left = env.offsetLeft - row.offsetLeft;
      var right = left + env.offsetWidth;
      if (left < row.scrollLeft || right > row.scrollLeft + row.clientWidth - 56) {
        row.scrollTo({ left: Math.max(0, left - 16), behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
    }

    function matches(item, key) {
      return key === "all" || item.getAttribute("data-cat") === key;
    }

    function setFilter(key) {
      if (key === activeFilter || busy) return;
      activeFilter = key;

      envs.forEach(function (env) {
        var on = env.getAttribute("data-filter") === key;
        env.setAttribute("aria-selected", on ? "true" : "false");
        env.tabIndex = on ? 0 : -1;
        if (on) {
          panel.setAttribute("aria-labelledby", env.id);
          revealEnv(env);
        }
      });

      var going = items.filter(function (item) {
        return !item.hidden && !matches(item, key);
      });
      var label = envs.filter(function (env) {
        return env.getAttribute("data-filter") === key;
      })[0].querySelector(".env-en").textContent;

      function reflow() {
        going.forEach(function (item) {
          item.hidden = true;
        });
        items.forEach(function (item) {
          if (matches(item, key)) item.hidden = false;
        });
        var shown = visibleItems();
        if (status) status.textContent = "Showing " + shown.length + " photos: " + label + ".";

        /* Keep the top of the album in view */
        if (album && album.getBoundingClientRect().top < 0) scrollToEl(album, 0);

        if (canAnimate) {
          gsap.fromTo(shown, { autoAlpha: 0, y: 40 }, {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.025,
            clearProps: "transform,opacity,visibility",
            onComplete: function () {
              busy = false;
              refreshTriggers();
            }
          });
        } else {
          busy = false;
        }
        refreshTriggers();
      }

      /* Prints that do not match slide back down into the envelope */
      if (canAnimate && going.length) {
        busy = true;
        gsap.to(going, {
          autoAlpha: 0,
          y: 50,
          duration: 0.35,
          ease: "power2.in",
          stagger: 0.012,
          onComplete: function () {
            gsap.set(going, { clearProps: "transform,opacity,visibility" });
            reflow();
          }
        });
      } else {
        if (canAnimate) busy = true;
        reflow();
      }
    }

    envs.forEach(function (env) {
      env.addEventListener("click", function () {
        setFilter(env.getAttribute("data-filter"));
      });
    });

    /* Arrow keys, Home and End move between envelopes */
    bar.addEventListener("keydown", function (event) {
      var index = envs.indexOf(document.activeElement);
      if (index === -1) return;
      var next = null;
      if (event.key === "ArrowRight") next = (index + 1) % envs.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + envs.length) % envs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = envs.length - 1;
      if (next === null) return;
      event.preventDefault();
      envs[next].focus();
      setFilter(envs[next].getAttribute("data-filter"));
    });
  }

  /* Darkroom: the string draws, photos drop onto it, and the row can be dragged or scrolled */
  function initDryingLine() {
    var track = document.querySelector("[data-line]");
    var list = document.querySelector("[data-line-list]");
    var prev = document.querySelector("[data-line-prev]");
    var next = document.querySelector("[data-line-next]");
    if (!track || !list) return;

    var hangs = list.querySelectorAll(".hang");

    if (canAnimate) {
      gsap.set(list, { "--string": 0 });
      gsap.set(hangs, { autoAlpha: 0, y: -140 });
      onceInView(track, "top 78%", function () {
        var tl = gsap.timeline();
        tl.to(list, { "--string": 1, duration: 1.5, ease: "power2.inOut" })
          .to(hangs, {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            ease: "bounce.out",
            stagger: 0.16,
            clearProps: "transform,opacity,visibility"
          }, 0.7);
      });
    }

    /* Arrow buttons */
    function step() {
      var first = hangs[0];
      var gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
      return first ? (first.offsetWidth + gap) * 2 : track.clientWidth * 0.7;
    }

    function updateArrows() {
      var max = track.scrollWidth - track.clientWidth;
      var scrollable = max > 4;
      prev.hidden = !scrollable;
      next.hidden = !scrollable;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
    }

    prev.addEventListener("click", function () {
      track.scrollBy({ left: -step(), behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
    next.addEventListener("click", function () {
      track.scrollBy({ left: step(), behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    window.addEventListener("load", updateArrows);
    updateArrows();

    /* Drag with the mouse; a drag does not count as a click */
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startScroll = 0;

    track.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startScroll = track.scrollLeft;
    });

    track.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      var dx = event.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        track.classList.add("is-dragging");
        track.setPointerCapture(event.pointerId);
      }
      if (moved) track.scrollLeft = startScroll - dx;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        /* Snap again smoothly from where the drag ended */
        var left = track.scrollLeft;
        track.classList.remove("is-dragging");
        track.scrollLeft = left;
      }
    }

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("click", function (event) {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    }, true);
    track.addEventListener("dragstart", function (event) {
      event.preventDefault();
    });
  }

  /* Lightbox */
  function initLightbox() {
    var box = document.querySelector("[data-lightbox]");
    if (!box) return;

    var imgs = Array.prototype.slice.call(box.querySelectorAll("[data-lb-img]"));
    var caption = box.querySelector("[data-lb-caption]");
    var count = box.querySelector("[data-lb-count]");
    var live = box.querySelector("[data-lb-live]");
    var closeBtn = box.querySelector(".lightbox-close");
    var prevBtn = box.querySelector("[data-lb-prev]");
    var nextBtn = box.querySelector("[data-lb-next]");
    var stage = box.querySelector("[data-lb-stage]");

    var set = [];
    var index = 0;
    var opener = null;
    var isOpen = false;
    var token = 0;

    function current() {
      return imgs.filter(function (img) {
        return img.classList.contains("is-current");
      })[0];
    }

    function renderCaption(el) {
      var d = el.dataset;
      caption.textContent = "";
      function add(cls, text, lang) {
        var span = document.createElement("span");
        span.className = cls;
        if (lang) span.lang = lang;
        span.textContent = text;
        caption.appendChild(span);
      }
      if (d.code) add("lb-code", d.code);
      add("lb-en", d.en);
      if (d.vi) add("lb-vi", d.vi, /[^\x00-\x7F]/.test(d.vi) ? "vi" : null);
      if (d.archival) add("lb-note", "Archival photograph");
      count.textContent = (index + 1) + " / " + set.length;
      live.textContent = "Photo " + (index + 1) + " of " + set.length + ": " + (d.code ? d.code + " " : "") + d.en;
    }

    /* Load the next photo into the hidden layer, then crossfade */
    function show(i) {
      index = (i + set.length) % set.length;
      var el = set[index];
      var d = el.dataset;
      var showing = current();
      var incoming = imgs.filter(function (img) {
        return img !== showing;
      })[0];
      var myToken = ++token;

      renderCaption(el);

      function swap() {
        if (myToken !== token) return;
        incoming.classList.add("is-current");
        incoming.removeAttribute("aria-hidden");
        showing.classList.remove("is-current");
        showing.setAttribute("aria-hidden", "true");
      }

      incoming.alt = d.alt;
      incoming.width = Number(d.largeW);
      incoming.height = Number(d.largeH);
      incoming.src = d.large;
      if (incoming.decode) {
        incoming.decode().then(swap, swap);
      } else if (incoming.complete) {
        swap();
      } else {
        incoming.onload = swap;
      }

      /* Preload the neighbours */
      [index - 1, index + 1].forEach(function (n) {
        var neighbour = set[(n + set.length) % set.length];
        if (neighbour && neighbour !== el) {
          var pre = new Image();
          pre.src = neighbour.dataset.large;
        }
      });
    }

    function focusables() {
      return [closeBtn, prevBtn, nextBtn].filter(function (btn) {
        return !btn.hidden;
      });
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowLeft" && set.length > 1) {
        event.preventDefault();
        show(index - 1);
      } else if (event.key === "ArrowRight" && set.length > 1) {
        event.preventDefault();
        show(index + 1);
      } else if (event.key === "Tab") {
        var items = focusables();
        var first = items[0];
        var last = items[items.length - 1];
        if (!box.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    function open(list, el) {
      set = list;
      opener = el;
      isOpen = true;
      var single = set.length < 2;
      prevBtn.hidden = single;
      nextBtn.hidden = single;

      /* First photo shows without a crossfade */
      imgs.forEach(function (img) {
        img.classList.remove("is-current");
        img.removeAttribute("src");
      });
      imgs[1].classList.add("is-current");
      show(set.indexOf(el));

      box.classList.add("is-open");
      box.setAttribute("aria-hidden", "false");
      if (window.noNeLockPage) window.noNeLockPage();
      document.addEventListener("keydown", onKeydown);
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      box.classList.remove("is-open");
      box.setAttribute("aria-hidden", "true");
      if (window.noNeUnlockPage) window.noNeUnlockPage();
      document.removeEventListener("keydown", onKeydown);
      if (opener) opener.focus({ preventScroll: true });
      opener = null;
    }

    /* Album prints open within the selected filter; hanging photos within the drying line */
    document.addEventListener("click", function (event) {
      var print = event.target.closest(".print, .hang-print");
      if (!print || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button > 0) return;
      event.preventDefault();
      var list = print.classList.contains("print")
        ? visibleItems().map(function (item) {
          return item.querySelector(".print");
        })
        : Array.prototype.slice.call(document.querySelectorAll(".hang-print"));
      open(list, print);
    });

    /* Space opens a photo too, like a button */
    document.addEventListener("keydown", function (event) {
      if (event.key !== " ") return;
      var print = event.target.closest && event.target.closest(".print, .hang-print");
      if (!print) return;
      event.preventDefault();
      print.click();
    });

    box.querySelectorAll("[data-lb-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    prevBtn.addEventListener("click", function () {
      show(index - 1);
    });
    nextBtn.addEventListener("click", function () {
      show(index + 1);
    });

    /* Swipe left or right to change photos, down to close */
    var touchX = null;
    var touchY = null;
    stage.addEventListener("touchstart", function (event) {
      touchX = event.touches[0].clientX;
      touchY = event.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", function (event) {
      if (touchX === null) return;
      var dx = event.changedTouches[0].clientX - touchX;
      var dy = event.changedTouches[0].clientY - touchY;
      touchX = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (set.length > 1) show(index + (dx < 0 ? 1 : -1));
      } else if (dy > 80 && dy > Math.abs(dx)) {
        close();
      }
    });
  }

  initHero();
  initFilters();
  initDevelop();
  initDryingLine();
  initLightbox();
})();
