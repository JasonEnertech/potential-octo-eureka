/* ==========================================================================
   Northline Industrial — site behaviour
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById("siteHeader");
  var lastY = 0;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) {
      header.classList.toggle("is-scrolled", y > 8);
    }
    lastY = y;
    updateActiveNav();
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("primaryNav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close when a link is tapped
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });

    // Close on escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Active nav link on scroll ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-link")
  );
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return null;
      var el = document.querySelector(id);
      return el ? { link: link, el: el } : null;
    })
    .filter(Boolean);

  function updateActiveNav() {
    if (!sections.length) return;
    var offset = window.innerHeight * 0.32;
    var current = null;

    sections.forEach(function (item) {
      var rect = item.el.getBoundingClientRect();
      if (rect.top <= offset) current = item;
    });

    navLinks.forEach(function (l) {
      l.classList.remove("is-active");
    });
    if (current) current.link.classList.add("is-active");
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealEls.forEach(function (el, i) {
      // subtle stagger within the same viewport batch
      el.style.transitionDelay = (i % 4) * 60 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Inquiry form ---------- */
  // FormSubmit.co AJAX endpoint — zero account required.
  // NOTE: the very first submission triggers an activation email to
  // alex@jsenertech.com; click the link once and the form is live forever.
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/alex@jsenertech.com";

  var form = document.getElementById("inquiryForm");
  var status = document.getElementById("formStatus");

  function setStatus(message, tone, html) {
    if (!status) return;
    status.style.display = "block";
    status.style.color = tone === "error" ? "#e8622c" : "#1a7f4b";
    if (html) {
      status.innerHTML = message;
    } else {
      status.textContent = message;
    }
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var btn = form.querySelector('button[type="submit"]');
      if (btn && btn.disabled) return; // guard against double submits

      var required = form.querySelectorAll("[required]");
      var valid = true;

      required.forEach(function (field) {
        var value = (field.value || "").trim();
        var ok = value.length > 0;
        if (ok && field.type === "email") {
          ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        }
        field.style.borderColor = ok ? "" : "#e8622c";
        if (!ok) valid = false;
      });

      if (!valid) {
        setStatus(
          "Please complete the required fields with a valid work email.",
          "error"
        );
        return;
      }

      var payload = {};
      new FormData(form).forEach(function (value, key) {
        if (typeof value === "string") payload[key] = value;
      });
      payload._captcha = "false";
      payload._replyto = (form.querySelector('[name="email"]') || {}).value || "";

      if (btn) {
        btn.disabled = true;
        btn.style.opacity = "0.7";
        btn.dataset.label = btn.textContent;
        btn.textContent = "Sending…";
      }
      setStatus("Sending your inquiry…", "ok");

      fetch(FORM_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok || result.data.success === "false") {
            var msg = "Submission failed.";
            if (result.data && result.data.message) msg = result.data.message;
            throw new Error(msg);
          }
          setStatus(
            "Thank you — your inquiry has been received. Our engineering team will reply within one business day.",
            "ok"
          );
          form.reset();
        })
        .catch(function () {
          if (status) {
            status.style.display = "block";
            status.style.color = "#e8622c";
            status.innerHTML =
              'Sorry, the form could not be sent right now. Please email us directly at <a href="mailto:alex@jsenertech.com" style="color:inherit;text-decoration:underline">alex@jsenertech.com</a> — we reply within one business day.';
          }
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.style.opacity = "";
            if (btn.dataset.label) btn.textContent = btn.dataset.label;
          }
        });
    });
  }

  /* ---------- Stat count-up ---------- */
  var statValues = document.querySelectorAll(".stat-value");

  function animateStat(el) {
    var raw = el.textContent.trim();
    var match = raw.match(/^([\d.,]+)(.*)$/);
    if (!match) return;

    var numText = match[1];
    var suffix = match[2];
    var target = parseFloat(numText.replace(/,/g, ""));
    if (isNaN(target)) return;

    var decimals = (numText.split(".")[1] || "").length;
    var duration = 1100;
    var start = null;

    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var current = target * eased;

      var out =
        decimals > 0
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString("en-US");

      el.textContent = out + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = numText + suffix;
    }

    requestAnimationFrame(step);
  }

  if ("IntersectionObserver" in window) {
    var statObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStat(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statValues.forEach(function (el) {
      statObserver.observe(el);
    });
  }

  /* ---------- Smooth anchor scroll with header offset ---------- */
  document.addEventListener("click", function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    var top =
      target.getBoundingClientRect().top +
      (window.scrollY || window.pageYOffset) -
      80;
    window.scrollTo({ top: top, behavior: "smooth" });
  });

  /* ---------- Topology diagram lightbox ---------- */
  (function () {
    var imgs = document.querySelectorAll(".solution-figure img");
    if (!imgs.length) return;

    var overlay = document.createElement("div");
    overlay.className = "zoom-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Enlarged diagram");
    overlay.innerHTML =
      '<button class="zoom-close" type="button" aria-label="Close">&times;</button><img alt="">';
    document.body.appendChild(overlay);

    var bigImg = overlay.querySelector("img");
    var closeBtn = overlay.querySelector(".zoom-close");

    function openZoom(src, alt) {
      bigImg.src = src;
      bigImg.alt = alt || "";
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function closeZoom() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
      bigImg.removeAttribute("src");
    }

    Array.prototype.forEach.call(imgs, function (img) {
      img.addEventListener("click", function () {
        openZoom(img.currentSrc || img.src, img.alt);
      });
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target === closeBtn) closeZoom();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        closeZoom();
      }
    });
  })();

  onScroll();
})();
