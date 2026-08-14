(function () {
  "use strict";

  /* ---------- Theme (persisted) ---------- */
  var THEME_KEY = "agency-theme";
  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(savedTheme === "dark" ? "dark" : "light");

  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  ready(function () {
    var toggle = document.querySelector(".theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var isDark = document.documentElement.getAttribute("data-theme") === "dark";
        var next = isDark ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      });
    }

    /* ---------- Sticky nav shadow ---------- */
    var nav = document.querySelector(".nav");
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });

      /* ---------- Mobile menu ---------- */
      var burger = nav.querySelector(".nav-burger");
      if (burger) {
        burger.addEventListener("click", function () {
          var isOpen = nav.classList.toggle("menu-open");
          burger.setAttribute("aria-expanded", isOpen ? "true" : "false");
          document.body.style.overflow = isOpen ? "hidden" : "";
        });
      }
      nav.querySelectorAll(".mobile-panel a").forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("menu-open");
          if (burger) burger.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("menu-open")) {
          nav.classList.remove("menu-open");
          if (burger) burger.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        }
      });
    }

    /* ---------- Scroll reveal ---------- */
    var revealEls = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && revealEls.length) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      revealEls.forEach(function (el) { io.observe(el); });

      /* Safety net: some embedding contexts (e.g. content injected
         after load, unusual viewport/timing) never fire intersection
         callbacks. Force reveal after a short delay so content is
         never permanently stuck invisible. */
      setTimeout(function () {
        revealEls.forEach(function (el) { el.classList.add("is-visible"); });
      }, 1500);
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var btn = item.querySelector(".faq-q");
      var panel = item.querySelector(".faq-a");
      if (!btn || !panel) return;
      btn.addEventListener("click", function () {
        var isOpen = item.getAttribute("data-open") === "true";
        document.querySelectorAll(".faq-item").forEach(function (other) {
          other.setAttribute("data-open", "false");
          other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
          other.querySelector(".faq-a").style.maxHeight = null;
        });
        if (!isOpen) {
          item.setAttribute("data-open", "true");
          btn.setAttribute("aria-expanded", "true");
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      });
    });

    /* ---------- Testimonial slider ---------- */
    var testiWrap = document.querySelector(".testi-wrap");
    if (testiWrap) {
      var slides = testiWrap.querySelectorAll(".testi-slide");
      var dotsWrap = testiWrap.querySelector(".testi-dots");
      var current = 0;

      function show(i) {
        slides.forEach(function (s, idx) {
          s.classList.toggle("is-active", idx === i);
        });
        if (dotsWrap) {
          dotsWrap.querySelectorAll("button").forEach(function (d, idx) {
            d.setAttribute("aria-current", idx === i ? "true" : "false");
          });
        }
        current = i;
      }
      if (dotsWrap) {
        slides.forEach(function (_, idx) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.setAttribute("aria-label", "Show testimonial " + (idx + 1));
          dot.addEventListener("click", function () { show(idx); });
          dotsWrap.appendChild(dot);
        });
      }
      var prevBtn = testiWrap.querySelector(".testi-prev");
      var nextBtn = testiWrap.querySelector(".testi-next");
      if (prevBtn) prevBtn.addEventListener("click", function () { show((current - 1 + slides.length) % slides.length); });
      if (nextBtn) nextBtn.addEventListener("click", function () { show((current + 1) % slides.length); });
      show(0);
    }

    /* ---------- Contact form: validate, then submit to Basin ---------- */
    var form = document.querySelector("#contact-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var valid = true;
        form.querySelectorAll("[data-required]").forEach(function (field) {
          var wrap = field.closest(".form-field");
          var ok = field.value && field.value.trim().length > 0;
          if (field.type === "email" && ok) {
            ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
          }
          wrap.classList.toggle("has-error", !ok);
          if (!ok) valid = false;
        });
        if (!valid) return;

        var successEl = document.querySelector(".form-success");
        var errorEl = document.querySelector(".form-error");
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalLabel = submitBtn ? submitBtn.textContent : "";
        if (errorEl) errorEl.classList.remove("is-visible");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Sending…";
        }

        fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" }
        })
          .then(function (response) {
            if (response.ok) {
              form.style.display = "none";
              if (successEl) successEl.classList.add("is-visible");
            } else {
              throw new Error("Form submission failed");
            }
          })
          .catch(function () {
            if (errorEl) errorEl.classList.add("is-visible");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalLabel;
            }
          });
      });
    }
  });
})();
