/* Menu page: Food / Drinks tickets, section signs, filters, "What should I eat?" picker, night mode and animations */

(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var nav = document.querySelector("[data-menu-nav]");
  if (!nav) return;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var canAnimate = !!gsap && !prefersReducedMotion;

  var tabs = Array.prototype.slice.call(nav.querySelectorAll("[data-tab]"));
  var groups = Array.prototype.slice.call(document.querySelectorAll(".menu-group"));
  var items = Array.prototype.slice.call(document.querySelectorAll(".menu-item"));
  var activeGroup = "food";
  var activeFilters = {};
  var spyObserver = null;

  /* Controls only show once this script runs; without it both groups simply follow each other */
  root.classList.add("js-menu");

  /* Bottom sheets (filters and picker) on small screens */
  var sheetQuery = window.matchMedia("(max-width: 768px)");
  var backdrop = nav.querySelector("[data-sheet-backdrop]");
  var openSheetEl = null;
  var sheetOpener = null;
  var sheetFocusable =
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function isSheetMode() {
    return sheetQuery.matches;
  }

  function sheetKeydown(event) {
    if (!openSheetEl) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSheet();
      return;
    }
    if (event.key !== "Tab") return;
    var els = Array.prototype.filter.call(openSheetEl.querySelectorAll(sheetFocusable), function (el) {
      return el.getClientRects().length > 0;
    });
    if (!els.length) return;
    var first = els[0];
    var last = els[els.length - 1];
    if (els.indexOf(document.activeElement) === -1) {
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

  function openSheet(el, opener, focusEl) {
    if (openSheetEl && openSheetEl !== el) closeSheet(false);
    openSheetEl = el;
    sheetOpener = opener || document.activeElement;
    el.hidden = false;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    backdrop.hidden = false;
    body.classList.add("menu-sheet-open");
    if (window.noNeLockPage) window.noNeLockPage();
    document.addEventListener("keydown", sheetKeydown);
    /* Next frame so the slide-up transition runs */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add("is-sheet-open");
        backdrop.classList.add("is-visible");
      });
    });
    setTimeout(function () {
      var target = focusEl || el.querySelector(sheetFocusable);
      if (target) target.focus({ preventScroll: true });
    }, 80);
  }

  function closeSheet(returnFocus) {
    if (!openSheetEl) return;
    var el = openSheetEl;
    openSheetEl = null;
    el.classList.remove("is-sheet-open");
    el.style.transform = "";
    backdrop.classList.remove("is-visible");
    body.classList.remove("menu-sheet-open");
    if (window.noNeUnlockPage) window.noNeUnlockPage();
    document.removeEventListener("keydown", sheetKeydown);
    if (el.id === "menu-filters") {
      nav.querySelector("[data-filters-toggle]").setAttribute("aria-expanded", "false");
      el.removeAttribute("role");
      el.removeAttribute("aria-modal");
    } else {
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "false");
      clearTimeout(spinTimer);
    }
    setTimeout(function () {
      if (openSheetEl !== el) el.hidden = true;
      if (!openSheetEl) backdrop.hidden = true;
    }, prefersReducedMotion ? 0 : 360);
    if (returnFocus !== false && sheetOpener) sheetOpener.focus({ preventScroll: true });
  }

  /* Swipe a sheet down to close it */
  function enableSwipe(el) {
    var startY = null;
    var dy = 0;
    el.addEventListener("touchstart", function (event) {
      if (openSheetEl !== el || el.scrollTop > 0) return;
      startY = event.touches[0].clientY;
      dy = 0;
    }, { passive: true });
    el.addEventListener("touchmove", function (event) {
      if (startY === null) return;
      dy = Math.max(0, event.touches[0].clientY - startY);
      el.style.transition = "none";
      el.style.transform = "translateY(" + dy + "px)";
    }, { passive: true });
    el.addEventListener("touchend", function () {
      if (startY === null) return;
      startY = null;
      el.style.transition = "";
      if (dy > 90) {
        closeSheet();
      } else {
        el.style.transform = "";
      }
    });
  }

  function initSheets() {
    if (!backdrop) return;
    backdrop.addEventListener("click", function () {
      closeSheet();
    });
    enableSwipe(document.getElementById("menu-filters"));
    if (picker) enableSwipe(picker);

    var closeFilters = nav.querySelector("[data-close-filters]");
    if (closeFilters) closeFilters.addEventListener("click", function () {
      closeSheet();
    });
    var done = nav.querySelector("[data-filter-done]");
    if (done) done.addEventListener("click", function () {
      closeSheet();
    });

    /* Leaving the small-screen layout closes any open sheet */
    sheetQuery.addEventListener("change", function () {
      if (openSheetEl) closeSheet(false);
      var panel = document.getElementById("menu-filters");
      panel.hidden = true;
      nav.querySelector("[data-filters-toggle]").setAttribute("aria-expanded", "false");
      if (picker) picker.hidden = true;
      updateNavHeight();
    });
  }

  /* Helpers */
  function refreshTriggers() {
    if (ScrollTrigger) ScrollTrigger.refresh();
  }

  function offsetTop() {
    var header = document.getElementById("site-header");
    return (header ? header.offsetHeight : 0) + nav.offsetHeight + 16;
  }

  function updateNavHeight() {
    body.style.setProperty("--menu-nav-h", nav.offsetHeight + "px");
  }

  function holdCallBar() {
    if (window.noNeHoldCallBar) window.noNeHoldCallBar(1600);
  }

  function scrollToEl(el) {
    holdCallBar();
    var lenis = window.noNeLenis;
    if (lenis) {
      lenis.scrollTo(el, { offset: -offsetTop(), duration: 1.2 });
    } else {
      var top = el.getBoundingClientRect().top + window.scrollY - offsetTop();
      window.scrollTo({ top: top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
  }

  function groupEl(id) {
    return document.getElementById("group-" + id);
  }

  /* Food / Drinks tickets */
  function setGroup(id, opts) {
    opts = opts || {};
    if (id === activeGroup && !opts.force) return;
    holdCallBar();
    var previous = groupEl(activeGroup);
    var next = groupEl(id);
    activeGroup = id;

    tabs.forEach(function (tab) {
      var selected = tab.getAttribute("data-tab") === id;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    document.querySelectorAll("[data-signs]").forEach(function (list) {
      list.hidden = list.getAttribute("data-signs") !== id;
    });

    function swap() {
      groups.forEach(function (g) {
        g.classList.toggle("is-active", g === next);
      });
      applyFilters();
      watchSections();
      refreshTriggers();
      setupNightMode();
    }

    /* Crossfade the content */
    if (canAnimate && previous && previous !== next && !opts.instant) {
      gsap.to(previous, {
        autoAlpha: 0,
        duration: 0.2,
        onComplete: function () {
          gsap.set(previous, { clearProps: "opacity,visibility" });
          swap();
          gsap.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, clearProps: "opacity,visibility" });
        }
      });
    } else {
      swap();
    }

    /* If the menu has scrolled past, jump back to the top of the menu */
    if (!opts.instant) {
      var top = document.querySelector(".menu-groups").getBoundingClientRect().top;
      if (top < offsetTop()) {
        setTimeout(function () {
          scrollToEl(document.querySelector(".menu-groups"));
        }, canAnimate ? 260 : 0);
      }
    }
  }

  function initTabs() {
    groups.forEach(function (g) {
      g.setAttribute("role", "tabpanel");
      g.setAttribute("aria-labelledby", "tab-" + g.getAttribute("data-group"));
      g.removeAttribute("aria-label");
    });

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        setGroup(tab.getAttribute("data-tab"));
      });

      /* Arrow keys move between the two tickets */
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        var next = tabs[(i + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        next.focus();
        setGroup(next.getAttribute("data-tab"));
      });
    });

    setGroup("food", { force: true, instant: true });
  }

  /* Section signs: click to scroll, highlight the section in view */
  function initSigns() {
    nav.addEventListener("click", function (event) {
      var sign = event.target.closest(".menu-sign");
      if (!sign) return;
      event.preventDefault();
      var target = document.getElementById(sign.getAttribute("data-target"));
      if (target) scrollToEl(target);
    });
  }

  function setActiveSign(sectionId) {
    var list = nav.querySelector('[data-signs="' + activeGroup + '"]');
    if (!list) return;
    list.querySelectorAll(".menu-sign").forEach(function (sign) {
      var isActive = sign.getAttribute("data-target") === sectionId;
      if (isActive && !sign.classList.contains("is-active")) {
        sign.classList.remove("is-swinging");
        void sign.offsetWidth;
        sign.classList.add("is-swinging");
        sign.setAttribute("aria-current", "true");
        /* Keep the active sign visible in the row without moving the page */
        var left = sign.offsetLeft - list.offsetLeft - 16;
        list.scrollTo({ left: left, behavior: prefersReducedMotion ? "auto" : "smooth" });
      } else if (!isActive) {
        sign.removeAttribute("aria-current");
      }
      sign.classList.toggle("is-active", isActive);
    });
  }

  function watchSections() {
    if (spyObserver) spyObserver.disconnect();
    if (!("IntersectionObserver" in window)) return;
    var group = groupEl(activeGroup);
    var top = offsetTop();
    spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActiveSign(entry.target.id);
      });
    }, { rootMargin: "-" + top + "px 0px -55% 0px" });
    group.querySelectorAll(".menu-section").forEach(function (section) {
      spyObserver.observe(section);
    });
  }

  /* Filters */
  var FILTERS = {
    gf: function (item) {
      var tags = item.getAttribute("data-tags").split(" ");
      return tags.indexOf("GF") > -1 || tags.indexOf("GFO") > -1;
    },
    veg: function (item) {
      return item.getAttribute("data-section") === "vegetarian";
    },
    nopeanut: function (item) {
      return item.getAttribute("data-tags").split(" ").indexOf("P") === -1;
    },
    now: function (item) {
      var status = item.getAttribute("data-status");
      return status !== "paused" && status !== "coming-soon";
    }
  };

  function matches(item, filters) {
    return Object.keys(filters).every(function (key) {
      return !filters[key] || FILTERS[key](item);
    });
  }

  function groupItems() {
    return items.filter(function (item) {
      return item.getAttribute("data-group") === activeGroup;
    });
  }

  function applyFilters() {
    holdCallBar();
    var list = groupItems();
    var visible = 0;

    list.forEach(function (item) {
      var ok = matches(item, activeFilters);
      item.classList.toggle("is-filtered", !ok);
      if (ok) visible++;
    });

    /* Hide sections that have no matching items */
    var group = groupEl(activeGroup);
    group.querySelectorAll(".menu-section").forEach(function (section) {
      section.classList.toggle("is-filtered", !section.querySelector(".menu-item:not(.is-filtered)"));
    });

    var empty = group.querySelector(".menu-empty");
    if (empty) empty.hidden = visible > 0;

    /* Counts on each chip: what you would see with that chip added */
    Object.keys(FILTERS).forEach(function (key) {
      var trial = Object.assign({}, activeFilters);
      trial[key] = true;
      var count = list.filter(function (item) {
        return matches(item, trial);
      }).length;
      var el = document.querySelector('[data-count="' + key + '"]');
      if (el) el.textContent = "(" + count + ")";
    });

    var activeCount = Object.keys(activeFilters).filter(function (k) {
      return activeFilters[k];
    }).length;
    var badge = nav.querySelector("[data-filter-count]");
    if (badge) {
      badge.hidden = activeCount === 0;
      badge.textContent = activeCount;
    }

    var done = nav.querySelector("[data-filter-done]");
    if (done) {
      done.textContent = visible === 0 ? "No dishes match" : "Show " + visible + (visible === 1 ? " dish" : " dishes");
    }

    var status = document.querySelector("[data-filter-status]");
    if (status && activeCount) {
      status.textContent = visible === 0 ? "No dishes match these filters." : visible + (visible === 1 ? " item matches." : " items match.");
    } else if (status) {
      status.textContent = "";
    }

    /* Fade the remaining items in softly */
    if (canAnimate && activeCount) {
      gsap.fromTo(list.filter(function (i) { return !i.classList.contains("is-filtered"); }),
        { opacity: 0.4 }, { opacity: 1, duration: 0.4, clearProps: "opacity" });
    }
  }

  function initFilters() {
    var toggle = nav.querySelector("[data-filters-toggle]");
    var panel = document.getElementById("menu-filters");

    toggle.addEventListener("click", function () {
      if (isSheetMode()) {
        toggle.setAttribute("aria-expanded", "true");
        openSheet(panel, toggle);
        return;
      }
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      updateNavHeight();
      if (!open) closePicker(false);
    });

    nav.querySelectorAll("[data-filter]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.getAttribute("data-filter");
        activeFilters[key] = !activeFilters[key];
        chip.setAttribute("aria-pressed", String(activeFilters[key]));
        applyFilters();
        refreshTriggers();
      });
    });

    document.querySelectorAll("[data-clear-filters]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilters = {};
        nav.querySelectorAll("[data-filter]").forEach(function (chip) {
          chip.setAttribute("aria-pressed", "false");
        });
        applyFilters();
        refreshTriggers();
      });
    });
  }

  /* "What should I eat?" picker */
  var picker = document.getElementById("menu-picker");
  var reel = picker && picker.querySelector("[data-picker-reel]");
  var result = picker && picker.querySelector("[data-picker-result]");
  var showBtn = picker && picker.querySelector("[data-picker-show]");
  var spinBtn = picker && picker.querySelector("[data-picker-spin]");
  var pickedItem = null;
  var pickerOpener = null;
  var spinTimer = null;

  /* Weekend-evening dishes count as available only Friday to Sunday after 4 PM */
  function isWeekendEvening() {
    var now = new Date();
    var day = now.getDay();
    return (day === 5 || day === 6 || day === 0) && now.getHours() >= 16;
  }

  function candidates() {
    return groupItems().filter(function (item) {
      var status = item.getAttribute("data-status");
      var available = status === "available" || (status === "weekend-evening" && isWeekendEvening());
      return available && !item.classList.contains("is-filtered");
    });
  }

  function renderResult(item) {
    var img = item.querySelector("[data-photo]");
    var sub = item.getAttribute("data-sub");
    var subLang = /[^\x00-\x7F]/.test(sub) ? ' lang="vi"' : "";
    result.innerHTML =
      (img ? '<img src="' + img.getAttribute("src") + '" alt="" width="72" height="72">' : "") +
      '<div><p class="picker-result-name"></p>' +
      (sub ? '<p class="picker-result-sub"' + subLang + "></p>" : "") +
      '<p class="picker-result-price"></p></div>';
    result.querySelector(".picker-result-name").textContent = item.getAttribute("data-code") + " · " + item.getAttribute("data-name");
    if (sub) result.querySelector(".picker-result-sub").textContent = sub;
    result.querySelector(".picker-result-price").textContent = item.getAttribute("data-price");
  }

  function spin() {
    var pool = candidates();
    clearTimeout(spinTimer);
    result.innerHTML = "";
    pickedItem = null;
    showBtn.disabled = true;

    if (!pool.length) {
      reel.textContent = "Nothing to pick";
      result.innerHTML = "<p>No available dishes match your filters. Try clearing them.</p>";
      return;
    }

    var winner = pool[Math.floor(Math.random() * pool.length)];

    function finish() {
      reel.classList.remove("is-spinning");
      reel.textContent = winner.getAttribute("data-name");
      pickedItem = winner;
      renderResult(winner);
      showBtn.disabled = false;
    }

    if (prefersReducedMotion) {
      finish();
      return;
    }

    /* Slot-machine spin: about 1.5 seconds, slowing down */
    var start = performance.now();
    var duration = 1500;
    reel.classList.add("is-spinning");
    (function tick() {
      var elapsed = performance.now() - start;
      if (elapsed >= duration) {
        finish();
        return;
      }
      reel.textContent = pool[Math.floor(Math.random() * pool.length)].getAttribute("data-name");
      var progress = elapsed / duration;
      spinTimer = setTimeout(tick, 45 + progress * progress * 260);
    })();
  }

  function openPicker(opener) {
    pickerOpener = opener || document.activeElement;
    /* The large Food button always picks from the Food group */
    if (opener && opener.closest(".menu-group")) setGroup("food");
    if (isSheetMode()) {
      openSheet(picker, pickerOpener, spinBtn);
      spin();
      return;
    }
    var filtersToggle = nav.querySelector("[data-filters-toggle]");
    if (filtersToggle.getAttribute("aria-expanded") === "true") filtersToggle.click();
    picker.hidden = false;
    document.addEventListener("keydown", onPickerKey);
    document.addEventListener("click", onOutsideClick, true);
    spinBtn.focus({ preventScroll: true });
    if (canAnimate) gsap.fromTo(picker, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.3, clearProps: "all" });
    spin();
  }

  function closePicker(returnFocus) {
    if (!picker || picker.hidden) return;
    if (openSheetEl === picker) {
      closeSheet(returnFocus);
      return;
    }
    clearTimeout(spinTimer);
    picker.hidden = true;
    document.removeEventListener("keydown", onPickerKey);
    document.removeEventListener("click", onOutsideClick, true);
    if (returnFocus !== false && pickerOpener) pickerOpener.focus({ preventScroll: true });
  }

  function onPickerKey(event) {
    if (event.key === "Escape") closePicker();
  }

  function onOutsideClick(event) {
    if (!picker.contains(event.target) && !event.target.closest("[data-open-picker]")) closePicker(false);
  }

  function initPicker() {
    if (!picker) return;
    document.querySelectorAll("[data-open-picker]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!picker.hidden && btn.closest(".menu-nav")) closePicker();
        else openPicker(btn);
      });
    });
    picker.querySelector("[data-close-picker]").addEventListener("click", function () {
      closePicker();
    });
    spinBtn.addEventListener("click", spin);
    showBtn.addEventListener("click", function () {
      if (!pickedItem) return;
      var item = pickedItem;
      closePicker(false);
      scrollToEl(item);
      item.classList.remove("is-highlighted");
      void item.offsetWidth;
      item.classList.add("is-highlighted");
      item.setAttribute("tabindex", "-1");
      setTimeout(function () {
        item.focus({ preventScroll: true });
      }, 900);
    });
  }

  /* Night mode while the Beer & Cocktail section is in view */
  var nightTrigger = null;

  function setupNightMode() {
    var section = document.getElementById("sec-beer-cocktail");
    if (!section) return;
    if (nightTrigger) {
      nightTrigger.kill();
      nightTrigger = null;
    }
    body.classList.remove("is-night");
    if (activeGroup !== "drinks" || !ScrollTrigger) return;

    nightTrigger = ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom 45%",
      onToggle: function (self) {
        body.classList.toggle("is-night", self.isActive);
      }
    });
  }

  /* Animations; content stays visible without them */
  function initAnimations() {
    if (!canAnimate) return;

    /* Hero: shop sign swings in, mascot pops up */
    var sign = document.querySelector(".shop-sign");
    if (sign) {
      gsap.fromTo(sign, { autoAlpha: 0, y: -60, rotation: -10 }, { autoAlpha: 1, y: 0, rotation: -1, duration: 2, ease: "elastic.out(1, 0.35)", delay: 0.15 });
    }
    var mascot = document.querySelector(".menu-hero-mascot");
    if (mascot) {
      gsap.fromTo(mascot, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.8, ease: "back.out(1.8)", delay: 0.6 });
    }

    if (!ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    /* Masthead double rules draw from the centre */
    document.querySelectorAll(".masthead-rule").forEach(function (rule) {
      gsap.fromTo(rule, { "--rule-scale": 0 }, {
        "--rule-scale": 1,
        duration: 1.2,
        ease: "power2.inOut",
        scrollTrigger: { trigger: rule, start: "top 88%", toggleActions: "play none none none" }
      });
    });

    /* Photo prints are pasted on one after another */
    document.querySelectorAll(".print-grid").forEach(function (grid) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: grid, start: "top 82%", toggleActions: "play none none none" } });
      grid.querySelectorAll(".menu-card").forEach(function (card, i) {
        var print = card.querySelector(".print--pasted");
        var rest = gsap.getProperty(print, "rotation");
        tl.fromTo(card, { autoAlpha: 0, y: -36 }, { autoAlpha: 1, y: 0, duration: 0.75, ease: "power3.out" }, i * 0.16)
          .fromTo(print, { rotation: rest + gsap.utils.random(-7, 7) }, { rotation: rest, duration: 0.9, ease: "back.out(1.6)" }, i * 0.16);
      });
    });

    /* Text rows fade up; dotted leaders draw left to right */
    document.querySelectorAll(".menu-columns").forEach(function (cols) {
      var rows = cols.querySelectorAll(".menu-row");
      gsap.fromTo(rows, { autoAlpha: 0, y: 18 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.05,
        scrollTrigger: { trigger: cols, start: "top 85%", toggleActions: "play none none none" }
      });
      gsap.fromTo(cols.querySelectorAll(".row-leader"), { scaleX: 0 }, {
        scaleX: 1,
        duration: 0.9,
        ease: "power2.out",
        stagger: 0.05,
        delay: 0.25,
        scrollTrigger: { trigger: cols, start: "top 85%", toggleActions: "play none none none" }
      });
    });

    /* Status stamps thump on */
    document.querySelectorAll(".status-stamp, .stamp--house").forEach(function (stamp) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: stamp.closest(".menu-item"), start: "top 80%", toggleActions: "play none none none" } });
      tl.fromTo(stamp, { autoAlpha: 0, scale: 2.2 }, { autoAlpha: 1, scale: 1, duration: 0.32, ease: "power4.in", delay: 0.5 })
        .to(stamp, { x: 2, duration: 0.05, repeat: 3, yoyo: true, ease: "none" })
        .set(stamp, { x: 0 });
    });

    /* Ration tickets slide in */
    document.querySelectorAll(".ration-ticket").forEach(function (ticket) {
      gsap.fromTo(ticket, { autoAlpha: 0, x: -50, rotation: -4 }, {
        autoAlpha: 1,
        x: 0,
        rotation: 0,
        duration: 1,
        ease: "back.out(1.4)",
        scrollTrigger: { trigger: ticket, start: "top 88%", toggleActions: "play none none none" }
      });
    });
  }

  initSheets();
  initTabs();
  initSigns();
  initFilters();
  initPicker();
  initAnimations();
  updateNavHeight();
  watchSections();
  window.addEventListener("resize", updateNavHeight);
  window.addEventListener("load", refreshTriggers);
})();
