/**
 * LaunchProof — Client-side interaction script
 * Frontend-only UK landing page implementation
 */

const PILOT_STORAGE_KEY = "launchproof_pilot_requests";

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
      input.setCustomValidity("Please complete this field.");
      input.reportValidity();
      return false;
    }
    record[field] = value;
  }

  if (!form.reportValidity()) return false;
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
  document.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
}

export function initApp() {
  // Dialog Elements
  const dialog = document.getElementById("pilot-dialog");
  const form = document.getElementById("pilot-form");
  const submitBtn = document.getElementById("save-pilot-btn");
  const statusRegion = document.getElementById("form-status");
  const closeBtn = document.getElementById("close-dialog-btn");

  let lastActiveElement = null;

  // Open dialog handler for all "Request a Pilot" buttons
  const pilotTriggers = document.querySelectorAll("[data-pilot-trigger]");

  function openDialog(trigger) {
    lastActiveElement = trigger || document.activeElement;
    if (statusRegion) {
      statusRegion.textContent = "";
      statusRegion.className = "form-status";
    }

    if (dialog && typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (dialog) {
      dialog.setAttribute("open", "");
    }

    // Focus first interactive element in form
    const firstInput = form?.elements.namedItem("fullName");
    if (firstInput) {
      firstInput.focus();
    }
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }

    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      lastActiveElement.focus();
    }
  }

  pilotTriggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openDialog(btn);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDialog();
    });
  }

  // Close on backdrop click (click outside dialog container)
  if (dialog) {
    dialog.addEventListener("click", (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;
      if (!isInDialog) {
        closeDialog();
      }
    });

    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeDialog();
    });

    // Trap focus inside dialog for full accessibility
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
        return;
      }

      if (e.key === "Tab") {
        const focusable = dialog.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // Clear custom validity when the visitor edits that input
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
          input.setCustomValidity("");
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

  // Mobile Navigation
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const navContainer = document.getElementById("primary-navigation");
  const navLinks = navContainer ? navContainer.querySelectorAll("a") : [];

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

  // Close mobile menu when any link is clicked
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
}
