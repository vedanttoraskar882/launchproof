/**
 * LaunchProof — Client-side interaction script
 * Frontend-only UK multi-page implementation
 */

export const PILOT_STORAGE_KEY = "launchproof_pilot_requests";

/**
 * Storage implementation strictly adhering to prompt specifications.
 * Saves pilot request to localStorage under PILOT_STORAGE_KEY as a JSON array.
 */
export async function savePilotRequest(form) {
  const data = new FormData(form);
  const record = {};

  for (const field of [
    "fullName",
    "phoneNumber",
    "emailAddress",
    "organisationName"
  ]) {
    const value = String(data.get(field) ?? "").trim();
    if (!value) {
      const input = form.elements.namedItem(field);
      if (input && typeof input.setCustomValidity === "function") {
        input.setCustomValidity("Please complete this field.");
        if (typeof input.reportValidity === "function") {
          input.reportValidity();
        }
      }
      return false;
    }
    record[field] = value;
  }

  if (typeof form.reportValidity === "function" && !form.reportValidity()) {
    return false;
  }
  record.submissionDateTime = new Date().toISOString();

  function appendRecord() {
    const raw = window.localStorage.getItem(PILOT_STORAGE_KEY);
    const previous = raw === null ? [] : JSON.parse(raw);

    if (!Array.isArray(previous)) {
      throw new Error("Existing pilot requests could not be read.");
    }

    window.localStorage.setItem(
      PILOT_STORAGE_KEY,
      JSON.stringify([...previous, record])
    );
  }

  // Serialise simultaneous saves from tabs where Web Locks is available.
  if (navigator.locks?.request) {
    await navigator.locks.request(PILOT_STORAGE_KEY, appendRecord);
  } else {
    appendRecord();
  }

  return true;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initApp();
    });
  } else {
    initApp();
  }
}

export function initApp() {
  // Pilot Request Form (Contact Us Page)
  const form = document.getElementById("pilot-form");
  const submitBtn = document.getElementById("save-pilot-btn");
  const statusRegion = document.getElementById("form-status");

  if (form) {
    const fields = [
      "fullName",
      "phoneNumber",
      "emailAddress",
      "organisationName"
    ];

    fields.forEach((name) => {
      const input = form.elements.namedItem(name);
      if (input) {
        input.addEventListener("input", () => {
          if (typeof input.setCustomValidity === "function") {
            input.setCustomValidity("");
          }
          if (statusRegion && statusRegion.classList.contains("form-status--error")) {
            statusRegion.textContent = "";
            statusRegion.className = "form-status";
          }
        });
      }
    });

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
      }

      try {
        const success = await savePilotRequest(form);
        if (success) {
          form.reset();
          if (statusRegion) {
            statusRegion.className = "form-status form-status--success";
            statusRegion.textContent = "Pilot request saved in this browser.";
          }
        }
      } catch (err) {
        if (statusRegion) {
          statusRegion.className = "form-status form-status--error";
          statusRegion.textContent =
            "Your request could not be saved in this browser. Your details are still in the form.";
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
        }
      }
    });
  }

  // Mobile Navigation Toggle
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const navContainer = document.getElementById("primary-navigation");
  const navLinks = navContainer ? navContainer.querySelectorAll(".nav-link") : [];

  function openMobileMenu() {
    if (!menuToggle || !navContainer) return;
    menuToggle.setAttribute("aria-expanded", "true");
    navContainer.classList.add("nav-menu--open");
    document.body.classList.add("mobile-menu-active");
    if (navLinks.length > 0) {
      navLinks[0].focus();
    }
  }

  function closeMobileMenu() {
    if (!menuToggle || !navContainer) return;
    menuToggle.setAttribute("aria-expanded", "false");
    navContainer.classList.remove("nav-menu--open");
    document.body.classList.remove("mobile-menu-active");
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      if (isExpanded) {
        closeMobileMenu();
        menuToggle.focus();
      } else {
        openMobileMenu();
      }
    });
  }

  // Close mobile menu when any nav link is clicked
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (navContainer && navContainer.classList.contains("nav-menu--open")) {
        closeMobileMenu();
      }
    });
  });

  // Close mobile menu on Escape key
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      navContainer &&
      navContainer.classList.contains("nav-menu--open")
    ) {
      closeMobileMenu();
      if (menuToggle) menuToggle.focus();
    }
  });

  // Highlight Current Navigation Link based on route
  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
    navLinks.forEach((link) => {
      const href = link.getAttribute("href")?.replace(/\/$/, "") || "/";
      if (href === currentPath) {
        link.classList.add("nav-link--active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  // Scroll Reveal Animations
  if (typeof window !== "undefined" && "IntersectionObserver" in window) {
    const revealElements = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px"
      }
    );

    revealElements.forEach((el) => {
      observer.observe(el);
    });
  } else if (typeof document !== "undefined") {
    // Fallback: reveal immediately if observer not supported
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.classList.add("is-revealed");
    });
  }
}
