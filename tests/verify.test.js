import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import assert from 'assert';

console.log('--- STARTING 4-PAGE ARCHITECTURE VERIFICATION TESTS ---');

const pages = [
  { path: './index.html', route: '/', activeTitle: 'Home' },
  { path: './service/index.html', route: '/service', activeTitle: 'Service' },
  { path: './contact-us/index.html', route: '/contact-us', activeTitle: 'Contact Us' },
  { path: './about-us/index.html', route: '/about-us', activeTitle: 'About Us' }
];

// 1. Verify existence of all 4 pages
pages.forEach(p => {
  assert.ok(existsSync(resolve(p.path)), `Page file must exist: ${p.path}`);
});
console.log('✔ All 4 page HTML files exist.');

// Helper to load and parse DOM
function loadPageDOM(filePath) {
  const html = readFileSync(resolve(filePath), 'utf-8');
  const dom = new JSDOM(html, { url: 'http://localhost:3000' });
  return { html, document: dom.window.document };
}

// 2. Global Head, Favicon, Language, and Header Navigation Tests
pages.forEach(p => {
  const { html, document } = loadPageDOM(p.path);

  // Favicon and language
  assert.ok(html.includes('<link rel="icon" href="data:,">'), `${p.path} must have blank data:, favicon`);
  assert.ok(html.includes('lang="en-GB"'), `${p.path} must have lang="en-GB"`);

  // Brand wordmark links to Home /
  const brand = document.querySelector('.brand-wordmark');
  assert.ok(brand, `${p.path} must have brand wordmark`);
  assert.strictEqual(brand.getAttribute('href'), '/', `${p.path} brand must link to /`);

  // Navigation must contain exactly the 4 links in exact order
  const navLinks = Array.from(document.querySelectorAll('#primary-navigation .nav-list a'));
  assert.strictEqual(navLinks.length, 4, `${p.path} must have exactly 4 main navigation links`);
  
  const linkTexts = navLinks.map(a => a.textContent.trim());
  assert.deepStrictEqual(linkTexts, ['Home', 'Service', 'Contact Us', 'About Us'], `${p.path} nav links must be in exact order`);

  const linkHrefs = navLinks.map(a => a.getAttribute('href'));
  assert.deepStrictEqual(linkHrefs, ['/', '/service', '/contact-us', '/about-us'], `${p.path} nav hrefs must match routes`);

  // Active state validation
  const activeLink = document.querySelector('#primary-navigation a[aria-current="page"]');
  assert.ok(activeLink, `${p.path} must have an active link with aria-current="page"`);
  assert.strictEqual(activeLink.textContent.trim(), p.activeTitle, `${p.path} active link must be ${p.activeTitle}`);
  assert.ok(activeLink.classList.contains('nav-link--active'), `${p.path} active link must have nav-link--active class`);

  // Header CTA button
  const headerBtn = document.querySelector('.header-actions a');
  assert.ok(headerBtn, `${p.path} must have header CTA button`);
  assert.strictEqual(headerBtn.getAttribute('href'), '/contact-us#pilot-form', `${p.path} header button must link to /contact-us#pilot-form`);

  // No Vision or Mission sections
  assert.ok(!document.querySelector('#vision, #mission, [aria-labelledby*="vision"], [aria-labelledby*="mission"]'), `${p.path} must not have vision or mission section`);
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.toLowerCase());
  assert.ok(!headings.some(h => h.includes('vision') || h.includes('mission')), `${p.path} headings must not mention Vision or Mission`);
});
console.log('✔ Head, favicon, language, navigation, and active states verified across all 4 pages.');

// 3. HOME PAGE (/) VERIFICATION
{
  const { html, document } = loadPageDOM('./index.html');
  const bodyText = document.body.textContent;

  // Hero headline and copy
  const h1 = document.querySelector('h1');
  assert.ok(h1 && h1.textContent.includes('Test your product idea before you order stock.'), 'Home H1 matches');
  assert.ok(bodyText.includes('Will customers pay a price that leaves you a margin?'), 'Home hero description matches');

  // CTA buttons
  const heroPilotBtn = document.querySelector('.hero-actions a[href="/contact-us#pilot-form"]');
  assert.ok(heroPilotBtn, 'Home hero must have "Request a Pilot" linking to /contact-us#pilot-form');
  const heroExploreBtn = document.querySelector('.hero-actions a[href="/service"]');
  assert.ok(heroExploreBtn, 'Home hero must have "Explore Services" linking to /service');

  // Decision Room Preview
  const decisionRoom = document.querySelector('.decision-room-card');
  assert.ok(decisionRoom, 'Decision Room preview card exists');
  assert.ok(decisionRoom.textContent.includes('Illustrative example'), 'Decision room preview must be labelled Illustrative example');
  assert.ok(decisionRoom.textContent.includes('Visitors joined the waitlist at the advertised price.'), 'Demand signal copy exact');
  assert.ok(decisionRoom.textContent.includes('The minimum order exceeds projected 90-day demand.'), 'Supplier terms copy exact');
  assert.ok(decisionRoom.textContent.includes('Revise'), 'Recommendation Revise text present');
  assert.ok(decisionRoom.textContent.includes('Compare suppliers with a smaller minimum order before committing to stock.'), 'Next step copy exact');

  // Go, Revise or Stop Decision Standard
  assert.ok(bodyText.includes('Go, Revise or Stop'), 'Home contains Go, Revise or Stop decision standard');
  assert.ok(document.querySelector('.standard-card--go'), 'Go card present');
  assert.ok(document.querySelector('.standard-card--revise'), 'Revise card present');
  assert.ok(document.querySelector('.standard-card--stop'), 'Stop card present');

  // 5-stage workflow overview
  const workflowOverview = document.querySelector('.workflow-summary-grid');
  assert.ok(workflowOverview, 'Home contains 5-stage workflow overview');
  const stages = ['Days 0–2', 'Days 2–4', 'Days 4–5', 'Days 5–12', 'Days 12–14'];
  stages.forEach(st => assert.ok(workflowOverview.textContent.includes(st), `Home workflow overview missing stage: ${st}`));

  // Final CTA
  const finalCta = document.querySelector('.section-cta a[href="/contact-us#pilot-form"]');
  assert.ok(finalCta, 'Home final CTA links to /contact-us#pilot-form');

  console.log('✔ Home page content, Decision Room preview, standards, and workflow overview verified.');
}

// 4. SERVICE PAGE (/service) VERIFICATION
{
  const { html, document } = loadPageDOM('./service/index.html');
  const bodyText = document.body.textContent;

  // In-page subnav
  const subnav = document.querySelector('.service-subnav');
  assert.ok(subnav, 'Service page has in-page subnav');
  const subnavLinks = Array.from(subnav.querySelectorAll('a')).map(a => a.getAttribute('href'));
  assert.ok(subnavLinks.includes('#platform') && subnavLinks.includes('#how-it-works') && subnavLinks.includes('#pricing') && subnavLinks.includes('#faq'), 'Subnav links to all 4 sections');

  // 9 Platform Modules
  const modules = [
    'Idea Studio',
    'Market Radar',
    'Voice of Customer',
    'Price and Position Lab',
    'Compliance Pre-Screen',
    'Supplier Match',
    'Test Launcher',
    'Decision Room',
    'Outcome Loop'
  ];
  const moduleCards = document.querySelectorAll('.module-card');
  assert.strictEqual(moduleCards.length, 9, 'Service page must have exactly 9 module cards');
  modules.forEach(mod => {
    assert.ok(bodyText.includes(mod), `Platform module missing: ${mod}`);
  });
  assert.ok(bodyText.includes('Modules 1–8 form the core MVP'), 'Core MVP note present');

  // How It Works 5-stage timeline
  const workflowSec = document.getElementById('how-it-works');
  assert.ok(workflowSec, 'How It Works section exists');
  const stages = ['Days 0–2', 'Days 2–4', 'Days 4–5', 'Days 5–12', 'Days 12–14'];
  stages.forEach(st => assert.ok(workflowSec.textContent.includes(st), `Stage missing: ${st}`));

  // User specifically requested to REMOVE the pilot target £500 line
  assert.ok(!bodyText.includes('Pilot target: reach a decision within 14 days for under £500 all-in, including the advertising test.'), 'Pilot target £500 statement successfully removed as requested');

  // Pricing verification
  const pricingSec = document.getElementById('pricing');
  assert.ok(pricingSec, 'Pricing section exists');
  assert.ok(pricingSec.textContent.includes('£0'), 'Free Discovery £0 present');
  assert.ok(pricingSec.textContent.includes('£39'), 'Starter £39 present');
  assert.ok(pricingSec.textContent.includes('£119'), 'Growth £119 present');
  assert.ok(pricingSec.textContent.includes('£349'), 'Enterprise £349 present');
  assert.ok(pricingSec.textContent.includes('£149'), 'Validation Sprint £149 present');
  assert.ok(pricingSec.textContent.includes('£450'), 'Expert Review £450 present');
  assert.ok(pricingSec.textContent.includes('Prices exclude VAT'), 'VAT notice present');
  assert.ok(pricingSec.textContent.includes('no markup') || pricingSec.textContent.includes('Zero markup') || pricingSec.textContent.includes('zero markup'), 'Zero ad markup notice present');

  // All pricing cards have Request a Pilot linking to /contact-us#pilot-form
  const pricingButtons = Array.from(pricingSec.querySelectorAll('a.btn'));
  pricingButtons.forEach(btn => {
    assert.strictEqual(btn.getAttribute('href'), '/contact-us#pilot-form', 'Pricing button must link to /contact-us#pilot-form');
  });

  // FAQs: 7 accordions
  const faqSec = document.getElementById('faq');
  assert.ok(faqSec, 'FAQ section exists');
  const faqQuestions = [
    'What can I learn for free?',
    'What counts as evidence that customers will buy?',
    'Why might a promising idea receive a Revise recommendation?',
    'Who pays for advertising and handles deposits?',
    'Does the compliance pre-screen certify my product?',
    'What do I receive after a full validation?',
    'Can I validate one idea without a subscription?'
  ];
  faqQuestions.forEach(q => {
    assert.ok(faqSec.textContent.includes(q), `FAQ missing: ${q}`);
  });

  console.log('✔ Service page modules, timeline, pricing, and FAQs verified.');
}

// 5. CONTACT US PAGE (/contact-us) VERIFICATION
{
  const { html, document } = loadPageDOM('./contact-us/index.html');
  const bodyText = document.body.textContent;

  // Heading Contact Us
  const h1 = document.querySelector('h1');
  assert.ok(h1 && h1.textContent.includes('Contact Us'), 'H1 must be Contact Us');

  // Form with id="pilot-form"
  const form = document.getElementById('pilot-form');
  assert.ok(form, 'Form #pilot-form exists on Contact Us page');

  // 4 required fields
  const nameInput = form.querySelector('input[name="fullName"]');
  assert.ok(nameInput && nameInput.required && nameInput.getAttribute('autocomplete') === 'name', 'Full name required');
  const phoneInput = form.querySelector('input[name="phoneNumber"]');
  assert.ok(phoneInput && phoneInput.required && phoneInput.getAttribute('autocomplete') === 'tel', 'Phone required');
  const emailInput = form.querySelector('input[name="emailAddress"]');
  assert.ok(emailInput && emailInput.required && emailInput.getAttribute('autocomplete') === 'email', 'Email required');
  const orgInput = form.querySelector('input[name="organisationName"]');
  assert.ok(orgInput && orgInput.required && orgInput.getAttribute('autocomplete') === 'organization', 'Organisation required');

  // Submit button
  const submitBtn = form.querySelector('button[type="submit"]');
  assert.strictEqual(submitBtn.textContent.trim(), 'Save pilot request', 'Submit button text is Save pilot request');

  // User specifically requested to REMOVE "This form saves your details in this browser on this device. Your request is not sent to LaunchProof."
  assert.ok(!bodyText.includes('This form saves your details in this browser on this device. Your request is not sent to LaunchProof.'), 'Browser save disclaimer successfully removed as requested');

  console.log('✔ Contact Us page form, required fields, and genuine pilot info verified.');
}

// 6. ABOUT US PAGE (/about-us) VERIFICATION
{
  const { html, document } = loadPageDOM('./about-us/index.html');
  const bodyText = document.body.textContent;

  // Founder details
  assert.ok(bodyText.includes('Sharique Shahid'), 'Founder name must be Sharique Shahid');
  assert.ok(bodyText.includes('Founder and Managing Director'), 'Founder title must match');
  assert.ok(bodyText.includes('University of Stirling'), 'Founder university must be University of Stirling');
  assert.ok(bodyText.includes('online grocery purchasing behaviour'), 'UK English spelling for behaviour');

  // Problem and customer context
  assert.ok(bodyText.includes('The Commercial Problem') || bodyText.includes('A product can attract clicks'), 'Problem context present');
  assert.ok(bodyText.includes('Health and wellness') && bodyText.includes('Pet products'), 'UK product categories present');

  // CTA
  const ctaBtn = document.querySelector('.section-cta a[href="/contact-us#pilot-form"]');
  assert.ok(ctaBtn, 'About Us CTA links to /contact-us#pilot-form');

  console.log('✔ About Us page founder bio, problem context, categories, and CTA verified.');
}

// 7. STYLESHEET & ANIMATION VERIFICATION
{
  const css = readFileSync(resolve('./src/style.css'), 'utf-8');
  assert.ok(css.includes('#FFFFFF') || css.includes('#ffffff') || css.includes('255, 255, 255'), 'Crisp white background token present');
  assert.ok(css.includes('#0F172A') || css.includes('#0f172a'), 'Deep slate text token present');
  assert.ok(css.includes('#4F46E5') || css.includes('#4f46e5'), 'Electric indigo accent token present');
  assert.ok(css.includes('prefers-reduced-motion'), 'prefers-reduced-motion media query present');
  console.log('✔ Color tokens and accessible motion rules verified in style.css.');
}

console.log('--- ALL 4-PAGE ARCHITECTURE VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
