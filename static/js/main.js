// =============================================================================
// UXPLORES — main.js
// Custom cursor, header scroll state, mobile menu, scroll-reveal animations,
// animated counters, portfolio/blog filters + modal, FAQ accordion, contact form.
// Light theme only - no theme toggle
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  initCustomCursor();
  initHeaderScroll();
  initMobileMenu();
  initScrollReveal();
  initAnimatedCounters();
  initPortfolioFilter();
  initPortfolioModal();
  initBlogFilter();
  initFaqAccordion();
  initContactForm();
  initNewsletterForm();
});


// -----------------------------------------------------------------------------
// Custom cursor (dot + lagging ring), matches the original lerp-based cursor
// -----------------------------------------------------------------------------
function initCustomCursor() {
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring || window.matchMedia("(hover: none)").matches) return;

  const dotInner = dot.querySelector(".cursor-dot-inner");
  const ringInner = ring.querySelector(".cursor-ring-inner");

  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0, rafId;
  const lerp = (a, b, n) => a + (b - a) * n;

  const onMove = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = mouseX + "px";
    dot.style.top = mouseY + "px";
    dot.style.opacity = "1";
    ring.style.opacity = "1";

    const target = e.target;
    const isPointer = window.getComputedStyle(target).cursor === "pointer" ||
      target.tagName === "A" || target.tagName === "BUTTON" ||
      !!target.closest("a") || !!target.closest("button") || !!target.closest('[role="button"]');
    dotInner.classList.toggle("pointer", isPointer);
    ringInner.classList.toggle("pointer", isPointer);
  };

  const onLeave = () => { dot.style.opacity = "0"; ring.style.opacity = "0"; };
  const onEnter = () => { dot.style.opacity = "1"; ring.style.opacity = "1"; };

  const animate = () => {
    ringX = lerp(ringX, mouseX, 0.12);
    ringY = lerp(ringY, mouseY, 0.12);
    ring.style.left = ringX + "px";
    ring.style.top = ringY + "px";
    rafId = requestAnimationFrame(animate);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseleave", onLeave);
  document.addEventListener("mouseenter", onEnter);
  rafId = requestAnimationFrame(animate);
}

// -----------------------------------------------------------------------------
// Header — solid background after 50px scroll
// -----------------------------------------------------------------------------
function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => header.classList.toggle("scrolled", window.scrollY > 50);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

// -----------------------------------------------------------------------------
// Mobile menu toggle
// -----------------------------------------------------------------------------
function initMobileMenu() {
  const toggle = document.querySelector(".mobile-toggle");
  const menu = document.querySelector(".mobile-menu");
  if (!toggle || !menu) return;
  const iconMenu = toggle.querySelector(".icon-menu");
  const iconClose = toggle.querySelector(".icon-close");

  const setOpen = (open) => {
    menu.classList.toggle("open", open);
    if (iconMenu && iconClose) {
      iconMenu.style.display = open ? "none" : "block";
      iconClose.style.display = open ? "block" : "none";
    }
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
}

// -----------------------------------------------------------------------------
// Scroll-reveal — IntersectionObserver equivalent of framer-motion whileInView
// -----------------------------------------------------------------------------
function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal, .reveal-sm, .reveal-scale, .reveal-left, .reveal-right");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "-80px 0px -80px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}

// -----------------------------------------------------------------------------
// Animated counters — count up from 0 when scrolled into view, easeOutCubic
// -----------------------------------------------------------------------------
function initAnimatedCounters() {
  const counters = document.querySelectorAll("[data-counter]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.dataset.done) return;
        el.dataset.done = "1";

        const value = el.getAttribute("data-counter") || el.textContent.trim();
        const numericPart = parseFloat(value.replace(/[^0-9.]/g, ""));
        const suffix = value.replace(/[0-9.]/g, "");

        if (isNaN(numericPart)) { el.textContent = value; return; }

        const duration = 1800;
        const start = performance.now();

        const tick = (now) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(eased * numericPart);
          el.textContent = current + suffix;
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = value;
        };
        requestAnimationFrame(tick);

        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

// -----------------------------------------------------------------------------
// Portfolio category filter
// -----------------------------------------------------------------------------
function initPortfolioFilter() {
  const tabs = document.querySelectorAll("[data-filter-tab]");
  const cards = document.querySelectorAll("[data-project-category]");
  if (!tabs.length || !cards.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const cat = tab.getAttribute("data-filter-tab");
      cards.forEach((card) => {
        const show = cat === "all" || card.getAttribute("data-project-category") === cat;
        card.style.display = show ? "" : "none";
      });
    });
  });
}

// -----------------------------------------------------------------------------
// Portfolio case-study modal
// -----------------------------------------------------------------------------
function initPortfolioModal() {
  const backdrop = document.getElementById("case-study-modal");
  if (!backdrop) return;
  const panel = backdrop.querySelector(".modal-panel");
  const closeBtn = backdrop.querySelector(".modal-close");

  const fields = {
    img: backdrop.querySelector("[data-modal-img]"),
    tags: backdrop.querySelector("[data-modal-tags]"),
    title: backdrop.querySelector("[data-modal-title]"),
    desc: backdrop.querySelector("[data-modal-desc]"),
    stats: backdrop.querySelector("[data-modal-stats]"),
    challenge: backdrop.querySelector("[data-modal-challenge]"),
    solution: backdrop.querySelector("[data-modal-solution]"),
    results: backdrop.querySelector("[data-modal-results]"),
  };

  const open = (card) => {
    const data = JSON.parse(card.getAttribute("data-project"));
    fields.img.src = data.image;
    fields.img.alt = data.title;
    fields.tags.innerHTML = data.tags.map((t) => `<span class="modal-tag">${escapeHtml(t)}</span>`).join("");
    fields.title.textContent = data.title;
    fields.desc.textContent = data.full_description;
    fields.stats.innerHTML = data.stats.map((s) => `
      <div class="modal-stat">
        <div class="val text-gradient-primary">${escapeHtml(s.value)}</div>
        <div class="lbl">${escapeHtml(s.label)}</div>
      </div>`).join("");
    fields.challenge.textContent = data.challenge;
    fields.solution.textContent = data.solution;
    fields.results.textContent = data.results;

    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  };

  document.querySelectorAll("[data-open-project]").forEach((card) => {
    card.addEventListener("click", () => open(card));
  });

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop || e.target.classList.contains("modal-scrim")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// -----------------------------------------------------------------------------
// Blog category filter
// -----------------------------------------------------------------------------
function initBlogFilter() {
  const tabs = document.querySelectorAll("[data-blog-filter-tab]");
  const cards = document.querySelectorAll("[data-blog-category]");
  const featured = document.querySelector("[data-blog-featured]");
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const cat = tab.getAttribute("data-blog-filter-tab");

      cards.forEach((card) => {
        const show = cat === "all" || card.getAttribute("data-blog-category") === cat;
        card.style.display = show ? "" : "none";
      });

      if (featured) featured.style.display = cat === "all" ? "" : "none";
    });
  });
}

// -----------------------------------------------------------------------------
// FAQ accordion
// -----------------------------------------------------------------------------
function initFaqAccordion() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    item.addEventListener("click", () => item.classList.toggle("open"));
  });
}

// -----------------------------------------------------------------------------
// Contact form — posts to /api/contact
// -----------------------------------------------------------------------------
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const successEl = document.getElementById("form-success");
  const errorEl = document.getElementById("form-error");
  const submitBtn = form.querySelector(".submit-btn");
  const submitLabel = submitBtn ? submitBtn.querySelector(".submit-label") : null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    successEl.classList.remove("show");
    errorEl.classList.remove("show");

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      company: form.company.value.trim(),
      budget: form.budget.value,
      project_type: form.project_type.value.trim(),
      message: form.message.value.trim(),
    };

    submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = "Sending...";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");

      successEl.classList.add("show");
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message || "Something went wrong. Please try again.";
      errorEl.classList.add("show");
    } finally {
      submitBtn.disabled = false;
      if (submitLabel) submitLabel.textContent = "Send Message";
    }
  });
}

// -----------------------------------------------------------------------------
// Newsletter form (blog page) — cosmetic, shows confirmation
// -----------------------------------------------------------------------------
function initNewsletterForm() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    const original = btn.textContent;
    btn.textContent = "Subscribed!";
    form.reset();
    setTimeout(() => { btn.textContent = original; }, 2500);
  });
}
