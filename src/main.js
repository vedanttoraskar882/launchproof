/**
 * LaunchProof — Client-side interaction script
 * Multi-page architecture with Serverless Email Delivery Integration
 */

export const PILOT_STORAGE_KEY = "launchproof_pilot_requests";

/**
 * Storage implementation strictly adhering to historical specifications.
 * Retained for backwards compatibility with historical test suites.
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

  if (navigator.locks?.request) {
    await navigator.locks.request(PILOT_STORAGE_KEY, appendRecord);
  } else {
    appendRecord();
  }

  return true;
}

/**
 * Post submission to backend/serverless email endpoint
 */
export async function submitToEmailEndpoint(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Submission could not be delivered at this time.");
  }

  return data;
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
  // 1. EARLY ACCESS REGISTRATION FORM
  const earlyAccessForm = document.getElementById("early-access-form") || document.getElementById("pilot-form");
  const earlyAccessSubmitBtn = document.getElementById("early-access-submit-btn") || document.getElementById("save-pilot-btn");
  const earlyAccessStatus = document.getElementById("early-access-status") || document.getElementById("form-status");

  if (earlyAccessForm) {
    const fields = [
      "fullName",
      "phoneNumber",
      "emailAddress",
      "organisationName"
    ];

    fields.forEach((name) => {
      const input = earlyAccessForm.elements.namedItem(name);
      if (input) {
        input.addEventListener("input", () => {
          if (typeof input.setCustomValidity === "function") {
            input.setCustomValidity("");
          }
          if (earlyAccessStatus && earlyAccessStatus.classList.contains("form-status--error")) {
            earlyAccessStatus.textContent = "";
            earlyAccessStatus.className = "form-status";
          }
        });
      }
    });

    earlyAccessForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Client validation
      const formData = new FormData(earlyAccessForm);
      const payload = {
        type: "early-access",
        fullName: String(formData.get("fullName") || "").trim(),
        phoneNumber: String(formData.get("phoneNumber") || "").trim(),
        emailAddress: String(formData.get("emailAddress") || "").trim(),
        organisationName: String(formData.get("organisationName") || "").trim(),
        _hp: String(formData.get("_hp") || "")
      };

      for (const key of ["fullName", "phoneNumber", "emailAddress", "organisationName"]) {
        if (!payload[key]) {
          const input = earlyAccessForm.elements.namedItem(key);
          if (input && typeof input.setCustomValidity === "function") {
            input.setCustomValidity("Please complete this field.");
            if (typeof input.reportValidity === "function") input.reportValidity();
          }
          return;
        }
      }

      if (earlyAccessSubmitBtn) {
        earlyAccessSubmitBtn.disabled = true;
        earlyAccessSubmitBtn.setAttribute("aria-busy", "true");
        earlyAccessSubmitBtn.textContent = "Submitting...";
      }

      if (earlyAccessStatus) {
        earlyAccessStatus.className = "form-status form-status--loading";
        earlyAccessStatus.textContent = "Submitting your early access registration...";
      }

      try {
        await submitToEmailEndpoint("/api/early-access", payload);
        earlyAccessForm.reset();
        if (earlyAccessStatus) {
          earlyAccessStatus.className = "form-status form-status--success";
          earlyAccessStatus.textContent = "Thank you. Your early-access registration has been received.";
        }
      } catch (err) {
        if (earlyAccessStatus) {
          earlyAccessStatus.className = "form-status form-status--error";
          earlyAccessStatus.textContent = err.message || "Your registration could not be submitted. Please check your details and try again.";
        }
      } finally {
        if (earlyAccessSubmitBtn) {
          earlyAccessSubmitBtn.disabled = false;
          earlyAccessSubmitBtn.removeAttribute("aria-busy");
          earlyAccessSubmitBtn.textContent = "Join Early Access";
        }
      }
    });
  }

  // 2. CONTACT ENQUIRY FORM
  const contactForm = document.getElementById("contact-form");
  const contactSubmitBtn = document.getElementById("contact-submit-btn");
  const contactStatus = document.getElementById("contact-status");

  if (contactForm) {
    const contactFields = ["fullName", "emailAddress", "subject", "message"];

    contactFields.forEach((name) => {
      const input = contactForm.elements.namedItem(name);
      if (input) {
        input.addEventListener("input", () => {
          if (typeof input.setCustomValidity === "function") {
            input.setCustomValidity("");
          }
          if (contactStatus && contactStatus.classList.contains("form-status--error")) {
            contactStatus.textContent = "";
            contactStatus.className = "form-status";
          }
        });
      }
    });

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(contactForm);
      const payload = {
        type: "contact",
        fullName: String(formData.get("fullName") || "").trim(),
        emailAddress: String(formData.get("emailAddress") || "").trim(),
        phoneNumber: String(formData.get("phoneNumber") || "").trim(),
        organisationName: String(formData.get("organisationName") || "").trim(),
        subject: String(formData.get("subject") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        _hp: String(formData.get("_hp") || "")
      };

      for (const key of ["fullName", "emailAddress", "subject", "message"]) {
        if (!payload[key]) {
          const input = contactForm.elements.namedItem(key);
          if (input && typeof input.setCustomValidity === "function") {
            input.setCustomValidity("Please complete this field.");
            if (typeof input.reportValidity === "function") input.reportValidity();
          }
          return;
        }
      }

      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = true;
        contactSubmitBtn.setAttribute("aria-busy", "true");
        contactSubmitBtn.textContent = "Sending...";
      }

      if (contactStatus) {
        contactStatus.className = "form-status form-status--loading";
        contactStatus.textContent = "Sending your enquiry...";
      }

      try {
        await submitToEmailEndpoint("/api/contact", payload);
        contactForm.reset();
        if (contactStatus) {
          contactStatus.className = "form-status form-status--success";
          contactStatus.textContent = "Thank you. Your enquiry has been received.";
        }
      } catch (err) {
        if (contactStatus) {
          contactStatus.className = "form-status form-status--error";
          contactStatus.textContent = err.message || "Your enquiry could not be sent. Please check your details and try again.";
        }
      } finally {
        if (contactSubmitBtn) {
          contactSubmitBtn.disabled = false;
          contactSubmitBtn.removeAttribute("aria-busy");
          contactSubmitBtn.textContent = "Send Enquiry";
        }
      }
    });
  }

  // 3. Mobile Navigation Toggle & Accessibility
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
      if (href === currentPath || (currentPath === "/service" && href === "/services")) {
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
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.classList.add("is-revealed");
    });
  }
}
