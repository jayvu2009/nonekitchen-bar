/* Contact page: rotary dial, postcard, telegrams, day and night storefront, door sign and suggestion box */

(function () {
  "use strict";

  if (!document.body.classList.contains("contact-page")) return;

  var root = document.documentElement;
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var canAnimate = !!gsap && !prefersReducedMotion;

  var EMAIL = "nonekitchenandbar@gmail.com";
  var PHONE_DIGITS = "6046320022";

  root.classList.add("js-contact");
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

  /* 01: the rotary dial turns for each digit, then calls (phones) or shows the number (desktop) */
  function initDial() {
    var button = document.querySelector("[data-dial]");
    var wheel = document.querySelector("[data-dial-wheel]");
    var result = document.querySelector("[data-dial-result]");
    var live = document.querySelector("[data-dial-live]");
    var copyBtn = document.querySelector("[data-copy-number]");
    if (!button) return;

    var isPhone = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    var busy = false;

    function afterDial() {
      busy = false;
      if (isPhone) {
        window.location.href = button.getAttribute("href");
        return;
      }
      result.hidden = false;
      live.textContent = "Our number is (604) 632-0022.";
    }

    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (busy) return;
      busy = true;

      if (!canAnimate || !wheel) {
        afterDial();
        return;
      }

      /* Each digit turns the dial to the finger stop and back: about 1.5 seconds in all */
      var tl = gsap.timeline({ onComplete: afterDial });
      PHONE_DIGITS.split("").forEach(function (digit) {
        var n = digit === "0" ? 10 : Number(digit);
        tl.to(wheel, { rotation: 30 + n * 30, svgOrigin: "120 140", duration: 0.08, ease: "power1.in" })
          .to(wheel, { rotation: 0, svgOrigin: "120 140", duration: 0.07, ease: "power1.out" });
      });
    });

    if (copyBtn) {
      var label = copyBtn.querySelector("[data-copy-number-label]");
      var timer = null;
      copyBtn.addEventListener("click", function () {
        copyText(copyBtn.getAttribute("data-copy-number")).then(
          function () {
            label.textContent = "Copied!";
            live.textContent = "Phone number copied.";
          },
          function () {
            label.textContent = "Copy failed";
            live.textContent = "Sorry, the number could not be copied.";
          }
        );
        clearTimeout(timer);
        timer = setTimeout(function () {
          label.textContent = "Copy number";
        }, 2000);
      });
    }
  }

  /* 02: the postcard folds into the envelope, gets a postmark, then opens the email app */
  function initPostcard() {
    var form = document.querySelector("[data-postcard]");
    if (!form) return;

    var envelope = document.querySelector("[data-envelope]");
    var postmark = document.querySelector("[data-new-postmark]");
    var postmarkDate = document.querySelector("[data-postmark-date]");
    var summary = form.querySelector("[data-pc-summary]");
    var summaryList = form.querySelector("[data-pc-summary-list]");
    var done = document.querySelector("[data-pc-done]");
    var status = document.querySelector("[data-pc-status]");
    var copyBtn = document.querySelector("[data-pc-copy]");
    var copyLive = document.querySelector("[data-pc-copy-live]");
    var mailtoLink = document.querySelector("[data-pc-mailto]");

    var f = {
      name: document.getElementById("pc-name"),
      email: document.getElementById("pc-email"),
      message: document.getElementById("pc-message")
    };

    var rules = [
      { el: f.message, check: function (v) { return v.trim() ? "" : "Please write a message."; } },
      { el: f.name, check: function (v) { return v.trim() ? "" : "Please enter your name."; } },
      {
        el: f.email,
        check: function (v) {
          if (!v.trim()) return "Please enter your email.";
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Please enter a valid email address.";
        }
      }
    ];

    function setError(el, message) {
      var error = form.querySelector('[data-error-for="' + el.id + '"]');
      if (error) error.textContent = message;
      if (message) el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    }

    function validate(rule) {
      var message = rule.check(rule.el.value);
      setError(rule.el, message);
      return message;
    }

    /* Check a field when leaving it, and again while fixing it */
    rules.forEach(function (rule) {
      rule.el.addEventListener("blur", function () {
        if (rule.el.value || rule.el.hasAttribute("aria-invalid")) validate(rule);
      });
      rule.el.addEventListener("input", function () {
        if (rule.el.hasAttribute("aria-invalid")) validate(rule);
      });
    });

    /* The mobile call bar hides while a field is in use */
    form.addEventListener("focusin", function (event) {
      if (event.target.matches("input, textarea")) document.body.classList.add("form-focused");
    });
    form.addEventListener("focusout", function () {
      setTimeout(function () {
        if (!form.contains(document.activeElement)) document.body.classList.remove("form-focused");
      }, 50);
    });

    function subject() {
      return "Message from " + f.name.value.trim();
    }

    function body() {
      return f.message.value.trim() + "\n\n" + f.name.value.trim() + "\n" + f.email.value.trim();
    }

    /* Today's date in Vancouver for the postmark */
    function today() {
      try {
        return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver", day: "numeric", month: "short", year: "numeric" }).format(new Date());
      } catch (err) {
        return new Date().toDateString();
      }
    }

    function stampEnvelope() {
      postmarkDate.textContent = today();
      postmark.hidden = false;
      if (canAnimate) {
        gsap.fromTo(postmark, { autoAlpha: 0, scale: 2.6 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power4.in", clearProps: "transform" });
        gsap.fromTo(envelope, { y: 0 }, { y: 5, duration: 0.07, yoyo: true, repeat: 1, delay: 0.3, ease: "power1.out", clearProps: "transform" });
      }
    }

    /* Tablets and phones stack the envelope above the card */
    var smallScreen = window.matchMedia("(max-width: 1024px)");

    function postIt() {
      if (!canAnimate || !envelope) {
        stampEnvelope();
        return;
      }

      /* Stacked layout: fold in place, then scroll up to the envelope */
      if (smallScreen.matches) {
        gsap.timeline()
          .to(form, { scaleY: 0.5, rotationX: 55, transformPerspective: 900, transformOrigin: "50% 0%", duration: 0.35, ease: "power2.in" })
          .to(form, { scale: 0.3, y: -40, autoAlpha: 0, duration: 0.45, ease: "power2.in" })
          .add(function () {
            envelope.scrollIntoView({ behavior: "smooth", block: "center" });
          })
          .add(stampEnvelope, "+=0.7")
          .fromTo(form,
            { y: 30, scale: 1, scaleY: 1, rotationX: 0, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", clearProps: "transform,transformOrigin,opacity,visibility" },
            "+=0.4");
        return;
      }
      var from = form.getBoundingClientRect();
      var to = envelope.getBoundingClientRect();
      var dx = to.left + to.width / 2 - (from.left + from.width / 2);
      var dy = to.top + to.height / 2 - (from.top + from.height / 2);

      gsap.timeline()
        .to(form, { scaleY: 0.5, rotationX: 55, transformPerspective: 900, transformOrigin: "50% 50%", duration: 0.35, ease: "power2.in" })
        .to(form, { x: dx, y: dy, scale: 0.28, autoAlpha: 0, duration: 0.6, ease: "power2.in" })
        .add(stampEnvelope)
        .fromTo(form,
          { x: 0, y: 30, scale: 1, scaleY: 1, rotationX: 0, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", clearProps: "transform,transformOrigin,opacity,visibility" },
          "+=0.6");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var problems = [];
      rules.forEach(function (rule) {
        var message = validate(rule);
        if (message) problems.push({ el: rule.el, message: message });
      });

      if (problems.length) {
        summaryList.textContent = "";
        problems.forEach(function (problem) {
          var li = document.createElement("li");
          var link = document.createElement("a");
          link.href = "#" + problem.el.id;
          link.textContent = problem.message;
          link.addEventListener("click", function (e) {
            e.preventDefault();
            problem.el.focus();
          });
          li.appendChild(link);
          summaryList.appendChild(li);
        });
        summary.hidden = false;
        summary.focus();
        return;
      }
      summary.hidden = true;

      var mailto = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject()) + "&body=" + encodeURIComponent(body());
      mailtoLink.href = mailto;
      window.location.href = mailto;

      postIt();
      status.textContent = "Your postcard is ready. Your email app should open with your message to " + EMAIL + ". If it didn't open, copy your message and email it to us.";
      done.hidden = false;
    });

    copyBtn.addEventListener("click", function () {
      var text = "To: " + EMAIL + "\nSubject: " + subject() + "\n\n" + body();
      copyText(text).then(
        function () {
          copyBtn.textContent = "Copied!";
          copyLive.textContent = "Your message is copied.";
        },
        function () {
          copyBtn.textContent = "Copy failed";
          copyLive.textContent = "Sorry, your message could not be copied.";
        }
      ).then(function () {
        setTimeout(function () {
          copyBtn.textContent = "Copy my message";
          copyLive.textContent = "";
        }, 2000);
      });
    });
  }

  /* 03: telegram text types out like a teleprinter, one slip after another */
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

  function initTelegrams() {
    var list = document.querySelector("[data-telegrams]");
    if (!list) return;
    var texts = Array.prototype.slice.call(list.querySelectorAll("[data-teleprint]"));

    if (!canAnimate || !ScrollTrigger || !root.classList.contains("ct-motion")) {
      root.classList.remove("ct-motion");
      return;
    }

    function type(el, next) {
      var source = el.querySelector(".telegram-strips");
      /* Keep the non-breaking spaces so the typed lines wrap like the real text */
      var chars = splitGraphemes(source.textContent.replace(/[ \t\r\n]+/g, " ").trim());
      var layer = document.createElement("span");
      layer.className = "telegram-typed";
      layer.setAttribute("aria-hidden", "true");
      var strip = document.createElement("span");
      strip.className = "telegram-strips";
      var cursor = document.createElement("span");
      cursor.className = "telegram-cursor";
      layer.appendChild(strip);
      layer.appendChild(cursor);
      el.appendChild(layer);
      el.classList.add("is-typing");

      var i = 0;
      (function step() {
        if (i < chars.length) {
          strip.textContent += chars[i++];
          setTimeout(step, 24);
          return;
        }
        setTimeout(function () {
          el.classList.add("is-typed");
          el.classList.remove("is-typing");
          layer.remove();
          next();
        }, 180);
      })();
    }

    onceInView(list, "top 75%", function () {
      var index = 0;
      (function nextSlip() {
        if (index >= texts.length) return;
        type(texts[index++], nextSlip);
      })();
    });
  }

  /* 04: crossfade the storefront between day and dusk */
  function initDayNight() {
    var toggle = document.querySelector("[data-dn]");
    var button = document.querySelector("[data-dn-switch]");
    var day = document.querySelector('[data-dn-img="day"]');
    var night = document.querySelector('[data-dn-img="night"]');
    if (!toggle || !button || !day || !night) return;

    toggle.hidden = false;
    button.addEventListener("click", function () {
      var toNight = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", toNight ? "true" : "false");
      night.classList.toggle("is-shown", toNight);
      day.classList.toggle("is-shown", !toNight);
      night.setAttribute("aria-hidden", toNight ? "false" : "true");
      day.setAttribute("aria-hidden", toNight ? "true" : "false");
    });
  }

  /* 05: the door sign says open or closed in Vancouver time; hours and status come from js/main.js */
  function initDoorSign() {
    var sign = document.querySelector("[data-door-sign]");
    var state = document.querySelector("[data-door-state]");
    if (!sign || !state) return;

    function apply(status) {
      if (!status) return;
      sign.classList.toggle("is-open", status.isOpen);
      sign.classList.toggle("is-closed", !status.isOpen);
      state.textContent = "";
      var vi = document.createElement("span");
      vi.lang = "vi";
      vi.textContent = status.isOpen ? "Đang mở cửa" : "Đã đóng cửa";
      var en = document.createElement("span");
      en.className = "door-state-en";
      en.textContent = status.isOpen ? "We're open" : "We're closed";
      state.appendChild(vi);
      state.appendChild(en);
    }

    if (window.noNeHours) apply(window.noNeHours.status());
    document.addEventListener("nonehours", function (event) {
      apply(event.detail);
    });
  }

  /* 06: on touch screens a tap posts the note into the box, then opens the review link */
  function initReviewTap() {
    var section = document.querySelector(".ct-review");
    var button = section && section.querySelector(".review-btn");
    if (!button || !window.matchMedia("(hover: none)").matches || prefersReducedMotion) return;

    /* A new tab opened after a delay is blocked on phones, so the link opens in this tab */
    button.removeAttribute("target");
    var note = button.querySelector(".visually-hidden");
    if (note) note.remove();

    var posting = false;
    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (posting) return;
      posting = true;
      section.classList.add("is-posting");
      setTimeout(function () {
        window.location.assign(button.href);
        setTimeout(function () {
          section.classList.remove("is-posting");
          posting = false;
        }, 1000);
      }, 950);
    });
  }

  /* 06: the suggestion box swings in slightly from its wall hook */
  function initSuggestionBox() {
    var box = document.querySelector("[data-sbox]");
    if (!box || !canAnimate || !ScrollTrigger) return;
    gsap.set(box, { rotation: -9 });
    onceInView(box, "top 80%", function () {
      gsap.to(box, { rotation: 0, duration: 2.4, ease: "elastic.out(1, 0.25)", clearProps: "transform" });
    });
  }

  initDial();
  initPostcard();
  initTelegrams();
  initDayNight();
  initDoorSign();
  initSuggestionBox();
  initReviewTap();
})();
