/* Catering page: hero vendor, approved stamps, delivery fee calculator, tray builder and order slip */

(function () {
  "use strict";

  if (!document.body.classList.contains("catering-page")) return;

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var canAnimate = !!gsap && !prefersReducedMotion;

  var EMAIL = "nonekitchenandbar@gmail.com";
  var BASE_FEE = 20;
  var MAX_KM = 50;
  var MAX_QTY = 20;
  var MAILTO_BODY_LIMIT = 1800;

  /* Interactive parts only switch on when this script runs */
  root.classList.add("js-cater");
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Connects the calculator and the tray to the order slip */
  var slipApi = {
    setArea: function () {},
    setDishes: function () {},
    dishesField: null
  };

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

  /* Recalculate scroll trigger positions after the page height changes */
  var refreshTimer = null;
  function refreshTriggers() {
    if (!ScrollTrigger) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      ScrollTrigger.refresh();
    }, 200);
  }

  /* Smooth scroll to an element, just below the sticky header */
  function scrollToEl(el, done) {
    var header = document.getElementById("site-header");
    var offset = (header ? header.offsetHeight : 0) + 24;
    if (window.noNeHoldCallBar) window.noNeHoldCallBar(1800);

    if (window.noNeLenis) {
      window.noNeLenis.scrollTo(el, { offset: -offset, duration: 1.4, onComplete: done });
      return;
    }
    var top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    if (done) setTimeout(done, prefersReducedMotion ? 0 : 700);
  }

  /* Copy text, with a fallback for older browsers */
  function copyText(text) {
    function fallback() {
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
      return ok ? Promise.resolve() : Promise.reject();
    }

    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return fallback();
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  /* Hero and order slip buttons that jump down the page */
  function initScrollLinks() {
    document.querySelectorAll("[data-scroll-to]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        var target = document.querySelector(link.getAttribute("href"));
        if (!target) return;
        event.preventDefault();
        var field = document.getElementById("f-name");
        scrollToEl(target, function () {
          if (field) field.focus({ preventScroll: true });
        });
      });
    });
  }

  /* Hero: the street vendor walks in from the left and stops near the right edge */
  function initHeroVendor() {
    var vendor = document.querySelector("[data-hero-vendor]");
    if (!vendor) return;

    if (!canAnimate || !root.classList.contains("cater-motion")) {
      root.classList.remove("cater-motion");
      return;
    }

    vendor.classList.add("is-walking");
    gsap.fromTo(vendor,
      {
        x: function () {
          return -(vendor.offsetLeft + vendor.offsetWidth + 40);
        }
      },
      {
        x: 0,
        duration: 10,
        delay: 0.5,
        ease: "power1.out",
        clearProps: "transform",
        onComplete: function () {
          vendor.classList.remove("is-walking");
        }
      });
    root.classList.remove("cater-motion");
  }

  /* 01: coupons rise in, then an "Approved" stamp thumps onto each one */
  function initCoupons() {
    var list = document.querySelector("[data-coupons]");
    if (!list || !canAnimate) return;

    var coupons = list.querySelectorAll(".cater-coupon");
    var stamps = list.querySelectorAll(".approved-stamp");
    gsap.set(coupons, { autoAlpha: 0, y: 40 });
    gsap.set(stamps, { autoAlpha: 0 });

    onceInView(list, "top 75%", function () {
      var tl = gsap.timeline();
      tl.to(coupons, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12 });
      stamps.forEach(function (stamp, i) {
        var at = 1 + i * 0.45;
        tl.fromTo(stamp, { autoAlpha: 0, scale: 2.4 }, { autoAlpha: 0.85, scale: 1, duration: 0.26, ease: "power4.in" }, at)
          .to(coupons[i], { y: 3, duration: 0.06, yoyo: true, repeat: 1, ease: "power1.out" }, at + 0.26);
      });
      /* Hand the coupon layout back to the stylesheet */
      tl.set(coupons, { clearProps: "transform" });
    });
  }

  /* 02: delivery fee calculator with the vendor walking along the road */
  function initCalculator() {
    var controls = document.querySelector("[data-calc]");
    var road = document.querySelector("[data-road]");
    if (!controls || !road) return;

    var fallback = document.querySelector("[data-calc-fallback]");
    var kmGroup = controls.querySelector("[data-km-group]");
    var range = document.getElementById("km-range");
    var number = document.getElementById("km-number");
    var amountEl = document.querySelector("[data-fee-amount]");
    var detailEl = document.querySelector("[data-fee-detail]");
    var path = road.querySelector("[data-road-path]");
    var ticks = road.querySelector("[data-road-ticks]");
    var vendorGroup = road.querySelector("[data-road-vendor]");
    var heroVendor = document.querySelector("[data-hero-vendor] .vendor-svg");

    controls.hidden = false;
    road.hidden = false;
    if (fallback) fallback.hidden = true;

    var area = "downtown";
    var km = Number(range.value) || 0;
    var total = path.getTotalLength();
    var currentT = null;
    var walkTween = null;

    function tFor(a, k) {
      return a === "downtown" ? 0.1 : 0.2 + 0.8 * (k / MAX_KM);
    }

    function pointAt(t) {
      return path.getPointAtLength(total * t);
    }

    /* Distance labels under the road */
    function addLabel(t, text, extraClass) {
      var p = pointAt(t);
      var label = svgEl("text", { x: p.x.toFixed(1), y: (p.y + 36).toFixed(1), "text-anchor": "middle", "class": "road-tick" + (extraClass ? " " + extraClass : "") });
      label.textContent = text;
      ticks.appendChild(label);
    }

    var edge = pointAt(0.2);
    ticks.appendChild(svgEl("path", { d: "M" + edge.x.toFixed(1) + " " + (edge.y - 16).toFixed(1) + "v32", stroke: "#00686A", "stroke-width": "2", "stroke-dasharray": "3 3" }));
    addLabel(0.1, "Downtown", "road-tick--downtown");
    [10, 20, 30, 40, 50].forEach(function (k) {
      addLabel(tFor("outside", k), "+" + k + " km");
    });

    /* A copy of the hero vendor walks the road */
    if (heroVendor) {
      var clone = heroVendor.cloneNode(true);
      clone.removeAttribute("class");
      clone.setAttribute("width", "100");
      clone.setAttribute("height", "82");
      clone.setAttribute("overflow", "visible");
      vendorGroup.appendChild(clone);
    }

    function placeVendor(t, facingLeft) {
      var p = pointAt(t);
      var transform = facingLeft
        ? "translate(" + (p.x + 50).toFixed(1) + " " + (p.y - 74).toFixed(1) + ") scale(-1 1)"
        : "translate(" + (p.x - 50).toFixed(1) + " " + (p.y - 74).toFixed(1) + ")";
      vendorGroup.setAttribute("transform", transform);
    }

    function moveVendor() {
      var target = tFor(area, km);
      if (currentT === null || !canAnimate) {
        currentT = target;
        placeVendor(target, false);
        return;
      }
      if (walkTween) walkTween.kill();
      var facingLeft = target < currentT;
      var proxy = { t: currentT };
      vendorGroup.classList.add("is-walking");
      walkTween = gsap.to(proxy, {
        t: target,
        duration: 0.5 + Math.abs(target - currentT) * 2.2,
        ease: "power1.inOut",
        onUpdate: function () {
          currentT = proxy.t;
          placeVendor(proxy.t, facingLeft);
        },
        onComplete: function () {
          vendorGroup.classList.remove("is-walking");
          placeVendor(target, false);
        }
      });
    }

    function update(fromUser) {
      var fee = area === "downtown" ? BASE_FEE : BASE_FEE + km;
      amountEl.textContent = "$" + fee;
      detailEl.textContent = area === "downtown"
        ? "Downtown core"
        : km + " km outside downtown: $" + BASE_FEE + " + $" + km;
      range.style.setProperty("--fill", (km / MAX_KM) * 100 + "%");
      moveVendor();
      if (fromUser) slipApi.setArea(area === "downtown" ? "Downtown" : km + " km outside downtown");
    }

    function clampKm(value) {
      if (value === "" || value === null) return null;
      var n = Math.round(Number(value));
      if (!isFinite(n)) return null;
      return Math.min(MAX_KM, Math.max(0, n));
    }

    controls.querySelectorAll('input[name="delivery-area"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (!radio.checked) return;
        area = radio.value;
        kmGroup.hidden = area !== "outside";
        update(true);
        refreshTriggers();
      });
    });

    range.addEventListener("input", function () {
      km = clampKm(range.value) || 0;
      number.value = km;
      update(true);
    });

    number.addEventListener("input", function () {
      var value = clampKm(number.value);
      if (value === null) return;
      km = value;
      range.value = km;
      update(true);
    });

    /* Tidy the typed number when leaving the field */
    number.addEventListener("change", function () {
      number.value = km;
    });

    update(false);
  }

  /* 03: build your tray from the menu data */
  var SECTION_LABELS = {
    "appetizers": "Appetizers",
    "street-food": "Street Food",
    "pho": "Pho",
    "vermicelli": "Vermicelli",
    "rice": "Rice Plates",
    "banh-mi": "Banh Mi",
    "vegetarian": "Vegetarian",
    "desserts": "Desserts"
  };

  /* Dish photos, matched by item code as on the menu page */
  var PHOTO_DIR = "assets/images/dishes/";
  var PHOTOS = {
    AP4: "NoNeKitchenAndBar_CrispyCrabSpringRoll_2880x2304.jpg",
    AP9: "NoNeKitchenAndBar_VietnameseBeefSalad_2880x2304.jpg",
    S3: "NoNeKitchenAndBar_DeepFriedPorkRoll_2880x2304.jpg",
    S4: "NoNeKitchenAndBar_LegendaryStreetFoodPlatter.png",
    P1: "NoNeKitchenAndBar_Tung'sSignaturePanSearedBeefPho_2880x2304.jpg",
    P3: "NoNeKitchenAndBar_RareBeefPho_2880x2304.jpg",
    P4: "NoNeKitchenAndBar_RareBeefBrisketPho_2880x2304.jpg",
    P11: "NoNeKitchenAndBar_BeefStewPho_2880x2304.jpg",
    P12: "NoNeKitchenAndBar_LemongrassChickenPho_2880x2304.jpg",
    P13: "NoNeKitchenAndBar_SlicedFreeRangeChickenPho_2880x2304.jpg",
    V1: "NoNeKitchenAndBar_HanoiStyleGrilledPorkVermicelli_2880x2304.jpg",
    V2: "NoNeKitchenAndBar_GrilledPorkWithSpringRoll_2880x2304.jpg",
    V3: "NoNeKitchenAndBar_DeeFriedCrabSpringRollVermicelli_2880x2304.jpg",
    V4: "NoNeKitchenAndBar_NoodlesWithFermentedShrimpPasteAndTofu_2880x2304.jpg",
    V9: "NoNeKitchenAndBar_LemongrassChickenVermicelli_2880x2304.jpg",
    R8: "NoNeKitchenAndBar_LemongrassChickenWithRiceAndSpringRoll_2880x2304.jpg",
    R9: "NoNeKitchenAndBar_LemongrassChickenSunnySideWithRice_2880x2304.jpg",
    VE5: "NoNeKitchenAndBar_VegetarianPho_2880x2304.jpg"
  };

  var ICON_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>';
  var ICON_MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/></svg>';
  var ICON_REMOVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function initTray() {
    var ui = document.querySelector("[data-tray-ui]");
    if (!ui || !window.fetch) return;

    fetch("assets/data/menu.json")
      .then(function (response) {
        if (!response.ok) throw new Error("Menu not found");
        return response.json();
      })
      .then(function (data) {
        buildTray(data);
      })
      .catch(function () {
        /* Keep the link to the menu page */
      });
  }

  function buildTray(data) {
    var ui = document.querySelector("[data-tray-ui]");
    var fallback = document.querySelector("[data-tray-fallback]");
    var tabsWrap = ui.querySelector("[data-tray-tabs]");
    var panelsWrap = ui.querySelector("[data-tray-panels]");
    var platesWrap = ui.querySelector("[data-plates]");
    var emptyNote = ui.querySelector("[data-tray-empty]");
    var countEl = ui.querySelector("[data-tray-count]");
    var clearBtn = ui.querySelector("[data-tray-clear]");
    var sendBtn = ui.querySelector("[data-tray-send]");
    var live = ui.querySelector("[data-tray-live]");
    var miniCount = ui.querySelector("[data-tray-mini-count]");
    var sheet = ui.querySelector("[data-tray-sheet]");
    var openBtn = ui.querySelector("[data-tray-open]");
    var closeBtn = ui.querySelector(".tray-sheet-close");

    var food = (data.groups || []).filter(function (g) {
      return g.id === "food";
    })[0];
    if (!food) return;

    /* Food items that are available now; no paused, coming-soon or weekend-evening dishes */
    var sections = food.sections.map(function (s) {
      return {
        id: s.id,
        en: SECTION_LABELS[s.id] || s.en,
        vi: s.vi,
        items: s.items.filter(function (item) {
          return item.status === "available";
        })
      };
    }).filter(function (s) {
      return s.items.length > 0;
    });
    if (!sections.length) return;

    var entries = {};
    var order = [];
    var tabs = [];
    var panels = [];

    /* Plate spots on the tray: centre, an inner ring of 6 and an outer ring of 12 (percent of the tray) */
    var slots = [{ x: 50, y: 50, used: false }];
    function ring(radius, count, startDeg) {
      for (var i = 0; i < count; i++) {
        var a = ((startDeg + (i * 360) / count) * Math.PI) / 180;
        slots.push({ x: 50 + radius * Math.cos(a), y: 50 + radius * Math.sin(a), used: false });
      }
    }
    ring(18, 6, -90);
    ring(36, 12, -75);

    function pickSlot() {
      var free = slots.filter(function (s) {
        return !s.used;
      });
      if (free.length) {
        var slot = free[Math.floor(Math.random() * free.length)];
        slot.used = true;
        return { slot: slot, x: slot.x, y: slot.y };
      }
      /* Tray is full: pile on top of an existing plate */
      var base = slots[Math.floor(Math.random() * slots.length)];
      return { slot: null, x: base.x + (Math.random() * 8 - 4), y: base.y + (Math.random() * 8 - 4) };
    }

    function announce(message) {
      live.textContent = "";
      setTimeout(function () {
        live.textContent = message;
      }, 60);
    }

    function countText() {
      var n = order.length;
      return n === 1 ? "1 dish on your tray" : n + " dishes on your tray";
    }

    function updateSummary() {
      countEl.textContent = countText();
      if (miniCount) {
        var changed = miniCount.textContent !== countText();
        miniCount.textContent = countText();
        if (changed && canAnimate && sheetQuery.matches) {
          gsap.fromTo(miniCount, { scale: 1.12 }, { scale: 1, duration: 0.4, ease: "back.out(3)", clearProps: "transform" });
        }
      }
      emptyNote.hidden = order.length > 0;
      clearBtn.disabled = order.length === 0;
      sendBtn.disabled = order.length === 0;
    }

    /* Plate with the dish photo, or a cream plate with the dish code */
    var plateZ = 1;
    function dropPlate(entry) {
      var spot = pickSlot();
      var rotation = Math.round(Math.random() * 24 - 12);
      var plate = document.createElement("div");
      plate.className = "tray-plate";
      plate.style.left = spot.x + "%";
      plate.style.top = spot.y + "%";
      plate.style.zIndex = String(plateZ++);
      plate.style.setProperty("--r", rotation + "deg");

      var photo = PHOTOS[entry.item.code];
      if (photo) {
        var img = document.createElement("img");
        img.src = PHOTO_DIR + photo;
        img.alt = "";
        img.width = 120;
        img.height = 120;
        img.decoding = "async";
        plate.appendChild(img);
      } else {
        var code = document.createElement("span");
        code.className = "tray-plate-code";
        code.textContent = entry.item.code;
        plate.appendChild(code);
      }

      var qty = document.createElement("span");
      qty.className = "tray-plate-qty";
      qty.hidden = true;
      plate.appendChild(qty);

      platesWrap.appendChild(plate);
      entry.plate = plate;
      entry.plateQty = qty;
      entry.slot = spot.slot;

      if (canAnimate) {
        gsap.fromTo(plate,
          { y: -260, autoAlpha: 0, scale: 1.15, rotation: rotation - 30 },
          { y: 0, autoAlpha: 1, scale: 1, rotation: rotation, duration: 0.8, ease: "bounce.out" });
      }
    }

    function liftPlate(entry, delay) {
      var plate = entry.plate;
      if (entry.slot) entry.slot.used = false;
      entry.plate = null;
      entry.plateQty = null;
      entry.slot = null;
      if (!plate) return;

      if (canAnimate) {
        gsap.to(plate, {
          y: -200,
          autoAlpha: 0,
          scale: 1.08,
          rotation: "+=14",
          duration: 0.45,
          delay: delay || 0,
          ease: "power2.in",
          onComplete: function () {
            plate.remove();
          }
        });
      } else {
        plate.remove();
      }
    }

    function updatePlateQty(entry) {
      if (!entry.plateQty) return;
      entry.plateQty.textContent = "×" + entry.qty;
      entry.plateQty.hidden = entry.qty < 2;
      if (canAnimate && entry.qty > 1) {
        gsap.fromTo(entry.plateQty, { scale: 1.5 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
      }
    }

    function makeButton(className, label, icon) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pick-btn " + className;
      btn.setAttribute("aria-label", label);
      btn.innerHTML = icon;
      return btn;
    }

    /* "+" button before adding; quantity stepper and remove button after */
    function renderControls(entry) {
      var name = entry.item.en;
      var controls = entry.controls;
      controls.textContent = "";

      if (!entry.qty) {
        var add = makeButton("pick-add", "Add " + name + " to your tray", ICON_PLUS);
        add.addEventListener("click", function () {
          addDish(entry);
        });
        controls.appendChild(add);
        entry.addBtn = add;
        return;
      }

      var stepper = document.createElement("div");
      stepper.className = "stepper";
      stepper.setAttribute("role", "group");
      stepper.setAttribute("aria-label", "Quantity of " + name);

      var less = makeButton("stepper-less", "One less " + name, ICON_MINUS);
      var value = document.createElement("span");
      value.className = "stepper-value";
      var more = makeButton("stepper-more", "One more " + name, ICON_PLUS);
      var remove = makeButton("pick-remove", "Remove " + name + " from your tray", ICON_REMOVE);

      less.addEventListener("click", function () {
        changeQty(entry, -1);
      });
      more.addEventListener("click", function () {
        changeQty(entry, 1);
      });
      remove.addEventListener("click", function () {
        removeDish(entry, true);
      });

      stepper.appendChild(less);
      stepper.appendChild(value);
      stepper.appendChild(more);
      controls.appendChild(stepper);
      controls.appendChild(remove);

      entry.lessBtn = less;
      entry.moreBtn = more;
      entry.valueEl = value;
      syncStepper(entry);
    }

    function syncStepper(entry) {
      if (!entry.valueEl) return;
      entry.valueEl.textContent = entry.qty;
      entry.lessBtn.disabled = entry.qty <= 1;
      entry.moreBtn.disabled = entry.qty >= MAX_QTY;
    }

    function addDish(entry) {
      entry.qty = 1;
      order.push(entry);
      entry.row.classList.add("is-added");
      renderControls(entry);
      dropPlate(entry);
      updateSummary();
      entry.moreBtn.focus();
      announce(entry.item.en + " added. " + countText() + ".");
    }

    function changeQty(entry, delta) {
      var next = Math.min(MAX_QTY, Math.max(1, entry.qty + delta));
      if (next === entry.qty) return;
      entry.qty = next;
      syncStepper(entry);
      updatePlateQty(entry);
      /* Keep focus on a usable button when one becomes disabled */
      if (entry.lessBtn.disabled && document.activeElement === entry.lessBtn) entry.moreBtn.focus();
      if (entry.moreBtn.disabled && document.activeElement === entry.moreBtn) entry.lessBtn.focus();
      announce(entry.item.en + ": " + entry.qty);
    }

    function removeDish(entry, moveFocus, delay) {
      entry.qty = 0;
      order.splice(order.indexOf(entry), 1);
      entry.row.classList.remove("is-added");
      liftPlate(entry, delay);
      renderControls(entry);
      updateSummary();
      if (moveFocus) {
        entry.addBtn.focus();
        announce(entry.item.en + " removed. " + countText() + ".");
      }
    }

    function makeRow(item) {
      var row = document.createElement("li");
      row.className = "pick";

      var thumb = document.createElement("span");
      thumb.className = "pick-thumb";
      var photo = PHOTOS[item.code];
      if (photo) {
        var img = document.createElement("img");
        img.src = PHOTO_DIR + photo;
        img.alt = "";
        img.width = 56;
        img.height = 56;
        img.loading = "lazy";
        img.decoding = "async";
        thumb.appendChild(img);
      } else {
        var code = document.createElement("span");
        code.className = "pick-thumb-code";
        code.setAttribute("aria-hidden", "true");
        code.textContent = item.code;
        thumb.appendChild(code);
      }

      var names = document.createElement("span");
      names.className = "pick-names";
      var en = document.createElement("span");
      en.className = "pick-en";
      var codeTag = document.createElement("span");
      codeTag.className = "pick-code";
      codeTag.textContent = item.code;
      en.appendChild(codeTag);
      en.appendChild(document.createTextNode(item.en));
      names.appendChild(en);
      if (item.vi) {
        var vi = document.createElement("span");
        vi.className = "pick-vi";
        vi.lang = "vi";
        vi.textContent = item.vi;
        names.appendChild(vi);
      }

      var controls = document.createElement("div");
      controls.className = "pick-controls";

      row.appendChild(thumb);
      row.appendChild(names);
      row.appendChild(controls);

      var entry = { item: item, row: row, controls: controls, qty: 0, plate: null, slot: null };
      entries[item.code] = entry;
      renderControls(entry);
      return row;
    }

    /* Mobile: the tray opens as a bottom sheet from the mini tray bar */
    var sheetQuery = window.matchMedia("(max-width: 768px)");
    var sheetOpen = false;
    var focusable = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    function onSheetKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet(true);
        return;
      }
      if (event.key !== "Tab") return;
      var items = Array.prototype.slice.call(sheet.querySelectorAll(focusable));
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (!sheet.contains(document.activeElement)) {
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

    function openSheet() {
      if (sheetOpen || !sheetQuery.matches) return;
      sheetOpen = true;
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-modal", "true");
      sheet.setAttribute("aria-labelledby", "tray-sheet-title");
      sheet.classList.add("is-open");
      ui.classList.add("sheet-open");
      openBtn.setAttribute("aria-expanded", "true");
      if (window.noNeLockPage) window.noNeLockPage();
      document.addEventListener("keydown", onSheetKeydown);
      setTimeout(function () {
        closeBtn.focus({ preventScroll: true });
      }, 60);
    }

    function closeSheet(returnFocus) {
      if (!sheetOpen) return;
      sheetOpen = false;
      sheet.classList.remove("is-open");
      ui.classList.remove("sheet-open");
      sheet.removeAttribute("role");
      sheet.removeAttribute("aria-modal");
      sheet.removeAttribute("aria-labelledby");
      openBtn.setAttribute("aria-expanded", "false");
      if (window.noNeUnlockPage) window.noNeUnlockPage();
      document.removeEventListener("keydown", onSheetKeydown);
      if (returnFocus) openBtn.focus({ preventScroll: true });
    }

    openBtn.addEventListener("click", openSheet);
    ui.querySelectorAll("[data-tray-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        closeSheet(true);
      });
    });

    /* Back to the desktop or tablet layout: close the sheet */
    sheetQuery.addEventListener("change", function (event) {
      if (!event.matches) closeSheet(false);
    });

    /* Keep the selected tab visible when the tabs scroll sideways */
    function revealTab(tab) {
      if (tabsWrap.scrollWidth <= tabsWrap.clientWidth) return;
      var left = tab.offsetLeft;
      var right = left + tab.offsetWidth;
      if (left < tabsWrap.scrollLeft || right > tabsWrap.scrollLeft + tabsWrap.clientWidth) {
        tabsWrap.scrollTo({ left: Math.max(0, left - 16), behavior: prefersReducedMotion ? "auto" : "smooth" });
      }
    }

    /* Street-sign tabs, one per menu section */
    function selectTab(index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute("aria-selected", active ? "true" : "false");
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (moveFocus) tabs[index].focus();
      revealTab(tabs[index]);
      if (canAnimate && moveFocus !== null) {
        gsap.fromTo(tabs[index], { rotation: -6 }, { rotation: 0, duration: 1.4, ease: "elastic.out(1, 0.3)", clearProps: "transform" });
      }
      refreshTriggers();
    }

    sections.forEach(function (section, i) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tray-tab";
      tab.id = "tray-tab-" + section.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "tray-panel-" + section.id);
      tab.textContent = section.en;
      tab.addEventListener("click", function () {
        selectTab(i, false);
      });
      tabsWrap.appendChild(tab);
      tabs.push(tab);

      var panel = document.createElement("div");
      panel.className = "tray-panel";
      panel.id = "tray-panel-" + section.id;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.tabIndex = 0;

      var title = document.createElement("h3");
      title.className = "tray-panel-title";
      title.appendChild(document.createTextNode(section.en));
      if (section.vi) {
        var vi = document.createElement("span");
        vi.lang = "vi";
        vi.textContent = section.vi;
        title.appendChild(vi);
      }
      panel.appendChild(title);

      var list = document.createElement("ul");
      list.className = "pick-list";
      list.setAttribute("role", "list");
      section.items.forEach(function (item) {
        list.appendChild(makeRow(item));
      });
      panel.appendChild(list);
      panelsWrap.appendChild(panel);
      panels.push(panel);
    });

    /* Arrow keys, Home and End move between tabs */
    tabsWrap.addEventListener("keydown", function (event) {
      var index = tabs.indexOf(document.activeElement);
      if (index === -1) return;
      var next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      selectTab(next, true);
    });

    clearBtn.addEventListener("click", function () {
      order.slice().forEach(function (entry, i) {
        removeDish(entry, false, i * 0.05);
      });
      announce("Your tray is clear.");
      if (sheetOpen) {
        closeBtn.focus();
        return;
      }
      var active = tabs.filter(function (tab) {
        return tab.getAttribute("aria-selected") === "true";
      })[0];
      if (active) active.focus();
    });

    sendBtn.addEventListener("click", function () {
      var lines = order.map(function (entry) {
        return entry.qty + " × " + entry.item.code + " " + entry.item.en + (entry.item.vi ? " (" + entry.item.vi + ")" : "");
      });
      slipApi.setDishes(lines.join("\n"));
      announce("Your tray is on the order slip.");
      closeSheet(false);
      var field = slipApi.dishesField;
      if (!field) return;
      scrollToEl(field.closest(".slip-field") || field, function () {
        field.focus({ preventScroll: true });
      });
    });

    selectTab(0, null);
    updateSummary();
    ui.hidden = false;
    if (fallback) fallback.hidden = true;
    refreshTriggers();
  }

  /* 05: the order slip */
  function initSlip() {
    var form = document.querySelector("[data-slip]");
    if (!form) return;

    var wrap = form.closest("[data-slip-wrap]");
    var summary = form.querySelector("[data-slip-summary]");
    var summaryList = form.querySelector("[data-slip-summary-list]");
    var whenBox = form.querySelector("[data-slip-when]");
    var sign = form.querySelector("[data-slip-sign]");
    var stamp = form.querySelector("[data-slip-stamp]");
    var done = form.querySelector("[data-slip-done]");
    var status = form.querySelector("[data-slip-status]");
    var copyBtn = form.querySelector("[data-slip-copy]");
    var copyStatus = form.querySelector("[data-slip-copy-status]");
    var mailtoLink = form.querySelector("[data-slip-mailto]");

    var f = {
      name: document.getElementById("f-name"),
      phone: document.getElementById("f-phone"),
      date: document.getElementById("f-date"),
      time: document.getElementById("f-time"),
      guests: document.getElementById("f-guests"),
      area: document.getElementById("f-area"),
      address: document.getElementById("f-address"),
      dishes: document.getElementById("f-dishes"),
      notes: document.getElementById("f-notes")
    };

    /* Slip number and issue date */
    var slipNo = String(Math.floor(Math.random() * 10000));
    while (slipNo.length < 4) slipNo = "0" + slipNo;
    form.querySelectorAll("[data-slip-no]").forEach(function (el) {
      el.textContent = slipNo;
    });
    var now = new Date();
    var dateEl = form.querySelector("[data-slip-date]");
    if (dateEl) {
      dateEl.textContent = "Issued " + now.toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" });
      dateEl.hidden = false;
    }

    /* No past dates in the date picker */
    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }
    f.date.min = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());

    /* The name is written on the signature line as it is typed */
    f.name.addEventListener("input", function () {
      sign.textContent = f.name.value.trim();
    });

    /* Shared with the calculator and the tray */
    slipApi.dishesField = f.dishes;
    slipApi.setArea = function (text) {
      f.area.value = text;
    };
    slipApi.setDishes = function (text) {
      f.dishes.value = text;
    };

    /* Required fields */
    var rules = [
      { el: f.name, check: function (v) { return v.trim() ? "" : "Please enter your full name."; } },
      {
        el: f.phone,
        check: function (v) {
          if (!v.trim()) return "Please enter your phone number.";
          return v.replace(/\D/g, "").length >= 7 ? "" : "Please enter a valid phone number.";
        }
      },
      { el: f.date, check: function (v) { return v ? "" : "Please choose the event date."; } },
      { el: f.time, check: function (v) { return v ? "" : "Please choose the event time."; } },
      {
        el: f.guests,
        check: function (v) {
          if (!v.trim()) return "Please enter the number of guests.";
          var n = Number(v);
          return Math.floor(n) === n && n >= 1 ? "" : "Please enter the number of guests as a whole number.";
        }
      },
      { el: f.address, check: function (v) { return v.trim() ? "" : "Please enter the delivery address."; } }
    ];

    function setError(el, message) {
      var error = form.querySelector('[data-error-for="' + el.id + '"]');
      if (error) error.textContent = message;
      var timingProblem = (el === f.date || el === f.time) && timingIssues().length > 0;
      if (message || timingProblem) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    }

    function validateRule(rule) {
      var message = rule.check(rule.el.value);
      setError(rule.el, message);
      return message;
    }

    /* Check a field when leaving it, and again while fixing it */
    rules.forEach(function (rule) {
      rule.el.addEventListener("blur", function () {
        if (rule.el.value || rule.el.hasAttribute("aria-invalid")) validateRule(rule);
      });
      rule.el.addEventListener("input", function () {
        if (rule.el.hasAttribute("aria-invalid")) validateRule(rule);
      });
    });

    /* Timing checks: 48 hours' notice, and no Friday or Saturday orders after 5:30pm */
    var NOTICE_TEXT = "Catering orders need 48 hours' notice. Please choose a later time or call us at ";
    var PEAK_TEXT = "We can't take catering orders on Friday or Saturday after 5:30pm. Please choose another time.";

    function eventDate() {
      if (!f.date.value || !f.time.value) return null;
      var d = f.date.value.split("-").map(Number);
      var t = f.time.value.split(":").map(Number);
      if (d.length < 3 || t.length < 2) return null;
      return new Date(d[0], d[1] - 1, d[2], t[0], t[1]);
    }

    function timingIssues() {
      var when = eventDate();
      if (!when || isNaN(when.getTime())) return [];
      var issues = [];
      if (when.getTime() - Date.now() < 48 * 60 * 60 * 1000) issues.push("notice");
      var day = when.getDay();
      var minutes = when.getHours() * 60 + when.getMinutes();
      if ((day === 5 || day === 6) && minutes >= 17 * 60 + 30) issues.push("peak");
      return issues;
    }

    var lastIssues = "";
    function renderTiming() {
      var issues = timingIssues();
      [f.date, f.time].forEach(function (el) {
        var hasError = !!form.querySelector('[data-error-for="' + el.id + '"]').textContent;
        if (issues.length || hasError) el.setAttribute("aria-invalid", "true");
        else el.removeAttribute("aria-invalid");
      });

      /* Only rewrite the messages when they change, so they are not announced twice */
      var key = issues.join(",");
      if (key === lastIssues) return issues;
      lastIssues = key;
      whenBox.textContent = "";

      issues.forEach(function (issue) {
        var p = document.createElement("p");
        if (issue === "notice") {
          p.appendChild(document.createTextNode(NOTICE_TEXT));
          var link = document.createElement("a");
          link.href = "tel:+16046320022";
          link.textContent = "(604) 632-0022";
          p.appendChild(link);
          p.appendChild(document.createTextNode("."));
        } else {
          p.textContent = PEAK_TEXT;
        }
        whenBox.appendChild(p);
      });
      return issues;
    }

    ["input", "change"].forEach(function (type) {
      f.date.addEventListener(type, renderTiming);
      f.time.addEventListener(type, renderTiming);
    });

    /* Order text */
    function dateLabel() {
      var d = f.date.value.split("-").map(Number);
      if (d.length < 3) return f.date.value;
      return new Date(d[0], d[1] - 1, d[2]).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    function timeLabel() {
      var t = f.time.value.split(":").map(Number);
      if (t.length < 2) return f.time.value;
      return new Date(2000, 0, 1, t[0], t[1]).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
    }

    /* Fee from the delivery area text: "Downtown" or "12 km outside downtown" */
    function feeFromArea(text) {
      var t = text.trim().toLowerCase();
      if (!t) return null;
      var match = t.match(/^(\d+)\s*km\b/);
      if (match) return BASE_FEE + Math.min(Number(match[1]), 999);
      if (/^downtown\b/.test(t)) return BASE_FEE;
      return null;
    }

    function subjectText() {
      return "Catering order – " + f.name.value.trim() + " – " + dateLabel();
    }

    function compose(dishLines, hiddenCount, notes) {
      var area = f.area.value.trim();
      var fee = feeFromArea(area);
      var lines = [
        "CATERING ORDER SLIP No. " + slipNo,
        "No Nê Kitchen & Bar",
        "",
        "Full name: " + f.name.value.trim(),
        "Phone number: " + f.phone.value.trim(),
        "Event date: " + dateLabel(),
        "Event time: " + timeLabel(),
        "Number of guests: " + f.guests.value.trim(),
        "Delivery address: " + f.address.value.trim(),
        "Delivery area: " + (area || "Not given")
      ];
      if (fee !== null) lines.push("Estimated delivery fee: $" + fee + " (estimate only, to be confirmed)");

      lines.push("", "Dishes:");
      if (dishLines.length || hiddenCount) {
        dishLines.forEach(function (line) {
          lines.push("- " + line.replace(/^[-•]\s*/, ""));
        });
        if (hiddenCount) lines.push("- …and " + hiddenCount + " more (list shortened to fit this email)");
      } else {
        lines.push("- None listed");
      }

      lines.push("", "Notes:", notes || "None");
      return lines.join("\n");
    }

    function dishLines() {
      return f.dishes.value.split("\n").map(function (line) {
        return line.trim();
      }).filter(Boolean);
    }

    function fullText() {
      return compose(dishLines(), 0, f.notes.value.trim());
    }

    /* Email body kept under the mailto length limit by shortening the dish list, then the notes */
    function shortBody() {
      var fits = function (body) {
        return encodeURIComponent(body).length <= MAILTO_BODY_LIMIT;
      };
      var dishes = dishLines();
      var hidden = 0;
      var notes = f.notes.value.trim();
      var body = compose(dishes, hidden, notes);

      while (!fits(body) && dishes.length) {
        dishes.pop();
        hidden++;
        body = compose(dishes, hidden, notes);
      }
      while (!fits(body) && notes.length) {
        notes = notes.slice(0, Math.max(0, notes.length - 40));
        body = compose(dishes, hidden, notes + "… (shortened)");
      }
      while (!fits(body) && body.length > 40) {
        body = body.slice(0, -20);
      }
      return body;
    }

    function showSummary(items) {
      summaryList.textContent = "";
      items.forEach(function (item) {
        var li = document.createElement("li");
        var link = document.createElement("a");
        link.href = "#" + item.el.id;
        link.textContent = item.message;
        link.addEventListener("click", function (event) {
          event.preventDefault();
          item.el.focus();
        });
        li.appendChild(link);
        summaryList.appendChild(li);
      });
      summary.hidden = false;
      scrollToEl(summary, null);
      summary.focus({ preventScroll: true });
    }

    function thump() {
      form.classList.remove("is-sent");
      wrap.classList.remove("is-sent");
      void form.offsetWidth;
      form.classList.add("is-sent");
      wrap.classList.add("is-sent");
      if (canAnimate) {
        gsap.fromTo(stamp, { autoAlpha: 0, scale: 2.6 }, { autoAlpha: 0.88, scale: 1, duration: 0.3, ease: "power4.in" });
        gsap.fromTo(form, { y: 0 }, { y: 4, duration: 0.07, yoyo: true, repeat: 1, delay: 0.3, ease: "power1.out", clearProps: "transform" });
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var problems = [];
      rules.forEach(function (rule) {
        var message = validateRule(rule);
        if (message) problems.push({ el: rule.el, message: message });
      });
      renderTiming().forEach(function (issue) {
        problems.push({
          el: issue === "notice" ? f.date : f.time,
          message: issue === "notice" ? NOTICE_TEXT + "(604) 632-0022." : PEAK_TEXT
        });
      });

      if (problems.length) {
        showSummary(problems);
        return;
      }
      summary.hidden = true;

      var mailto = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subjectText()) + "&body=" + encodeURIComponent(shortBody());
      mailtoLink.href = mailto;
      window.location.href = mailto;

      thump();
      status.textContent = "Slip No. " + slipNo + " is ready to send. Your email app should open with your order to " + EMAIL + ". If it didn't open, copy your order and email it to us.";
      done.hidden = false;
    });

    copyBtn.addEventListener("click", function () {
      var text = "To: " + EMAIL + "\nSubject: " + subjectText() + "\n\n" + fullText();
      var original = "Copy my order";
      copyText(text).then(
        function () {
          copyBtn.textContent = "Copied!";
          copyStatus.textContent = "Your order is copied.";
        },
        function () {
          copyBtn.textContent = "Copy failed";
          copyStatus.textContent = "Sorry, your order could not be copied.";
        }
      ).then(function () {
        copyBtn.focus();
        setTimeout(function () {
          copyBtn.textContent = original;
          copyStatus.textContent = "";
        }, 2200);
      });
    });
  }

  initSlip();
  initScrollLinks();
  initHeroVendor();
  initCoupons();
  initCalculator();
  initTray();
})();
