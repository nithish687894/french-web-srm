const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealItems = document.querySelectorAll(".reveal");
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".navbar a");
const cursorGlow = document.querySelector(".cursor-glow");

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Inject UI polish (loader, progress, cursor dots, mobile nav) without changing existing copy/structure order.
function injectChrome() {
  // Scroll progress
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.innerHTML = "<span></span>";
  document.body.appendChild(progress);

  // Loader (2s max)
  const loader = document.createElement("div");
  loader.className = "loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.innerHTML = `
    <div class="loader-inner">
      <div class="loader-mark">${(document.querySelector(".logo")?.textContent || "MÉMOIRES COLONIALES").trim()}</div>
      <div class="loader-bar"><i></i></div>
    </div>
  `;
  document.body.appendChild(loader);

  const hide = () => loader.setAttribute("aria-hidden", "true");
  // Safety cap for slow networks
  const cap = window.setTimeout(hide, 1900);
  window.addEventListener("load", () => {
    window.clearTimeout(cap);
    window.setTimeout(hide, 650);
  });

  // Cursor trailing dot
  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  const trail = document.createElement("div");
  trail.className = "cursor-trail";
  trail.setAttribute("aria-hidden", "true");
  document.body.appendChild(trail);
  document.body.appendChild(dot);

  // Mobile overlay menu based on existing navbar links
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    const toggle = document.createElement("button");
    toggle.className = "nav-toggle";
    toggle.type = "button";
    toggle.textContent = "Menu";
    toggle.setAttribute("aria-label", "Ouvrir le menu");
    navbar.appendChild(toggle);

    const overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const links = Array.from(navbar.querySelectorAll("a")).filter((a) => a.className !== "logo");
    overlay.innerHTML = `
      <header>
        <div class="loader-mark">${(document.querySelector(".logo")?.textContent || "MÉMOIRES COLONIALES").trim()}</div>
        <button class="nav-close" type="button" aria-label="Fermer le menu">Fermer</button>
      </header>
      <nav>${links.map((a) => `<a href="${a.getAttribute("href")}">${a.textContent}</a>`).join("")}</nav>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector(".nav-close");
    const openMenu = () => {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";
    };
    const closeMenu = () => {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
    };

    toggle.addEventListener("click", openMenu);
    closeBtn?.addEventListener("click", closeMenu);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeMenu();
    });
    overlay.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  return { progress, dot, trail };
}

const chrome = injectChrome();

if (!prefersReduced) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const parallaxBgs = Array.from(document.querySelectorAll(".parallax-bg"));
const hero = document.querySelector(".hero");
const heroImg = document.querySelector(".hero-image");
const navbar = document.querySelector(".navbar");

function onScroll() {
  const scrollY = window.scrollY || 0;

  // Navbar appears on scroll + frosted style
  if (navbar) {
    const showAt = 60;
    navbar.classList.toggle("is-visible", scrollY > showAt);
    navbar.classList.toggle("is-scrolled", scrollY > showAt + 40);
  }

  // Scroll progress
  const span = chrome?.progress?.querySelector("span");
  if (span) {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const pct = clamp((scrollY / max) * 100, 0, 100);
    span.style.width = `${pct}%`;
  }

  // Parallax sections
  if (!prefersReduced) {
    parallaxBgs.forEach((bg, i) => {
      const rate = 0.14 + i * 0.02;
      const y = scrollY * rate;
      bg.style.transform = `translateY(${y}px) scale(1.08)`;
    });
  }

  // Hero depth (CSS var to avoid layout shift)
  if (!prefersReduced && hero && heroImg) {
    const rect = hero.getBoundingClientRect();
    const progress = clamp(1 - rect.top / Math.max(1, rect.height), 0, 1);
    const px = Math.round(progress * 26);
    hero.style.setProperty("--hero-parallax", `${px}px`);
  }
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

window.addEventListener("scroll", () => {
  let currentSection = "";
  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 120;
    if (window.scrollY >= sectionTop) {
      currentSection = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    const isHash = href?.includes("#");
    const isActive = isHash ? href.endsWith(`#${currentSection}`) : false;
    link.classList.toggle("active", isActive);
  });
});

// Lazy image loading + fade-in on load
document.querySelectorAll("img").forEach((img) => {
  img.loading = img.loading || "lazy";
  img.decoding = "async";
  const markLoaded = () => img.classList.add("is-loaded");
  if (img.complete) markLoaded();
  img.addEventListener("load", markLoaded, { once: true });
});

// Ripple on click for interactive elements
const interactiveSelector = "a, button, .context-card, .timeline-item, blockquote, .mosaic-item";
document.querySelectorAll(interactiveSelector).forEach((el) => {
  el.addEventListener("pointerdown", (e) => {
    if (prefersReduced) return;
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    el.style.position = el.style.position || "relative";
    el.style.overflow = el.style.overflow || "hidden";
    el.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });
});

// Cursor glow + trailing dots (smooth)
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let trailX = mouseX;
let trailY = mouseY;

window.addEventListener(
  "mousemove",
  (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (cursorGlow) {
      cursorGlow.style.left = `${mouseX}px`;
      cursorGlow.style.top = `${mouseY}px`;
    }
    if (chrome?.dot) {
      chrome.dot.style.left = `${mouseX}px`;
      chrome.dot.style.top = `${mouseY}px`;
    }
  },
  { passive: true }
);

function animateCursor() {
  if (!prefersReduced && chrome?.trail) {
    trailX += (mouseX - trailX) * 0.12;
    trailY += (mouseY - trailY) * 0.12;
    chrome.trail.style.left = `${trailX}px`;
    chrome.trail.style.top = `${trailY}px`;
  } else if (chrome?.trail) {
    chrome.trail.style.left = `${mouseX}px`;
    chrome.trail.style.top = `${mouseY}px`;
  }
  requestAnimationFrame(animateCursor);
}
animateCursor();
