import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import assert from 'assert';
import { processSubmission } from '../api/submit.js';

console.log('--- STARTING 5-PAGE ARCHITECTURE & EMAIL INTEGRATION VERIFICATION TESTS ---');

const pages = [
  { path: './index.html', route: '/', activeTitle: 'Home' },
  { path: './how-it-works/index.html', route: '/how-it-works', activeTitle: 'How It Works' },
  { path: './services/index.html', route: '/services', activeTitle: 'Services' },
  { path: './about-us/index.html', route: '/about-us', activeTitle: 'About Us' },
  { path: './contact-us/index.html', route: '/contact-us', activeTitle: 'Contact Us' }
];

// 1. Verify existence of all 5 pages plus redirect
pages.forEach(p => {
  assert.ok(existsSync(resolve(p.path)), `Page file must exist: ${p.path}`);
});
assert.ok(existsSync(resolve('./service/index.html')), 'Compatibility alias /service/index.html must exist');
console.log('✔ All 5 page HTML files and service redirect alias exist.');

// Helper to load and parse DOM
function loadPageDOM(filePath) {
  const html = readFileSync(resolve(filePath), 'utf-8');
  const dom = new JSDOM(html, { url: 'http://localhost:3000' });
  return { html, document: dom.window.document };
}

// 2. Global Head, Favicon, Language, and Header Navigation Tests across all 5 pages
pages.forEach(p => {
  const { html, document } = loadPageDOM(p.path);

  // Favicon and language
  assert.ok(html.includes('<link rel="icon" href="data:,">'), `${p.path} must have blank data:, favicon`);
  assert.ok(html.includes('lang="en-GB"'), `${p.path} must have lang="en-GB"`);

  // Brand wordmark links to Home /
  const brand = document.querySelector('.brand-wordmark');
  assert.ok(brand, `${p.path} must have brand wordmark`);
  assert.strictEqual(brand.getAttribute('href'), '/', `${p.path} brand must link to /`);

  // Navigation must contain exactly 5 links in required order
  const navLinks = Array.from(document.querySelectorAll('#primary-navigation .nav-list a'));
  assert.strictEqual(navLinks.length, 5, `${p.path} must have exactly 5 main navigation links`);
  
  const linkTexts = navLinks.map(a => a.textContent.trim());
  assert.deepStrictEqual(linkTexts, ['Home', 'How It Works', 'Services', 'About Us', 'Contact Us'], `${p.path} nav links must be in exact order`);

  const linkHrefs = navLinks.map(a => a.getAttribute('href'));
  assert.deepStrictEqual(linkHrefs, ['/', '/how-it-works', '/services', '/about-us', '/contact-us'], `${p.path} nav hrefs must match routes`);

  // Active state validation
  const activeLink = document.querySelector('#primary-navigation a[aria-current="page"]');
  assert.ok(activeLink, `${p.path} must have an active link with aria-current="page"`);
  assert.strictEqual(activeLink.textContent.trim(), p.activeTitle, `${p.path} active link must be ${p.activeTitle}`);
  assert.ok(activeLink.classList.contains('nav-link--active'), `${p.path} active link must have nav-link--active class`);

  // Header CTA button: Join Early Access linking to /contact-us#early-access
  const headerBtn = document.querySelector('.header-actions a');
  assert.ok(headerBtn, `${p.path} must have header CTA button`);
  assert.strictEqual(headerBtn.textContent.trim(), 'Join Early Access', `${p.path} header button text must be "Join Early Access"`);
  assert.strictEqual(headerBtn.getAttribute('href'), '/contact-us#early-access', `${p.path} header button must link to /contact-us#early-access`);

  // Footer Navigation must contain all 5 links in exact order
  const footerLinks = Array.from(document.querySelectorAll('.footer-nav .footer-list a')).map(a => a.textContent.trim());
  assert.deepStrictEqual(footerLinks, ['Home', 'How It Works', 'Services', 'About Us', 'Contact Us'], `${p.path} footer nav links must be in exact order`);

  // Footer CTA button
  const footerBtn = document.querySelector('.footer-actions a');
  assert.ok(footerBtn, `${p.path} must have footer CTA button`);
  assert.strictEqual(footerBtn.textContent.trim(), 'Join Early Access', `${p.path} footer button text must be "Join Early Access"`);
  assert.strictEqual(footerBtn.getAttribute('href'), '/contact-us#early-access', `${p.path} footer button must link to /contact-us#early-access`);

  // No obsolete "Request a Pilot" visible in headers/buttons
  assert.ok(!html.includes('Request a Pilot'), `${p.path} must not contain user-facing "Request a Pilot" CTA`);
});
console.log('✔ Head, favicon, language, 5-link navigation, and active states verified across all 5 pages.');

// 3. HOME PAGE (/) VERIFICATION
{
  const { html, document } = loadPageDOM('./index.html');
  const bodyText = document.body.textContent;

  // Hero headline and development-stage copy
  const h1 = document.querySelector('h1');
  assert.ok(h1 && h1.textContent.includes('Test your product idea before you order stock.'), 'Home H1 matches');
  assert.ok(bodyText.includes('LaunchProof is being developed to help UK physical-product founders'), 'Home development wording present');
  assert.ok(bodyText.includes('LaunchProof is currently in development. Join early access to register your interest and receive development and pilot updates.'), 'Development notice near CTA matches exact required wording');

  // Hero CTA buttons
  const heroJoinBtn = document.querySelector('.hero-actions a[href="/contact-us#early-access"]');
  assert.ok(heroJoinBtn, 'Home hero must have "Join Early Access" linking to /contact-us#early-access');
  const heroHowBtn = document.querySelector('.hero-actions a[href="/how-it-works"]');
  assert.ok(heroHowBtn, 'Home hero must have "How It Works" linking to /how-it-works');

  // Illustrative Decision Room Preview
  const decisionRoom = document.querySelector('.decision-room-card');
  assert.ok(decisionRoom, 'Decision Room preview card exists');
  assert.ok(decisionRoom.textContent.includes('Illustrative preview'), 'Decision room preview must be labelled Illustrative preview');
  assert.ok(decisionRoom.textContent.includes('Visitors joined the waitlist at the advertised price.'), 'Demand signal copy exact');
  assert.ok(decisionRoom.textContent.includes('The minimum order exceeds projected 90-day demand.'), 'Supplier terms copy exact');
  assert.ok(decisionRoom.textContent.includes('Revise'), 'Recommendation Revise text present');
  assert.ok(decisionRoom.textContent.includes('Compare suppliers with a smaller minimum order before committing to stock.'), 'Next step copy exact');

  // Dedicated Homepage Innovation Section: "What Makes LaunchProof Different?"
  const innovationSec = document.querySelector('.section-innovation');
  assert.ok(innovationSec, 'Innovation section exists on Home');
  const innovationTitle = innovationSec.querySelector('h2');
  assert.strictEqual(innovationTitle.textContent.trim(), 'What Makes LaunchProof Different?', 'Innovation section title exact');

  assert.ok(innovationSec.textContent.includes('Integrated product validation'), 'Innovation Card 1 title matches');
  assert.ok(innovationSec.textContent.includes('LaunchProof is being developed to bring demand, competition, pricing and supplier risk analysis together in one product validation process.'), 'Innovation Card 1 copy exact');

  assert.ok(innovationSec.textContent.includes('Evidence-based insights'), 'Innovation Card 2 title matches');
  assert.ok(innovationSec.textContent.includes('The planned platform will help founders assess evidence and make informed decisions before investing in inventory.'), 'Innovation Card 2 copy exact');

  assert.ok(innovationSec.textContent.includes('Structured decision framework'), 'Innovation Card 3 title matches');
  assert.ok(innovationSec.textContent.includes('LaunchProof’s planned decision framework will combine multiple factors to assess product viability and support a Go, Revise or Stop recommendation.'), 'Innovation Card 3 copy exact');

  // Go, Revise or Stop Decision Standard
  assert.ok(bodyText.includes('Go, Revise or Stop'), 'Home contains Go, Revise or Stop decision standard');
  assert.ok(document.querySelector('.standard-card--go'), 'Go card present');
  assert.ok(document.querySelector('.standard-card--revise'), 'Revise card present');
  assert.ok(document.querySelector('.standard-card--stop'), 'Stop card present');

  // Final CTA
  const finalCta = document.querySelector('.section-cta a[href="/contact-us#early-access"]');
  assert.ok(finalCta, 'Home final CTA links to /contact-us#early-access');

  console.log('✔ Home page content, innovation section, Decision Room preview, and CTAs verified.');
}

// 4. HOW IT WORKS (/how-it-works) VERIFICATION
{
  const { html, document } = loadPageDOM('./how-it-works/index.html');
  const bodyText = document.body.textContent;

  // Title and intro
  const h1 = document.querySelector('h1');
  assert.ok(h1 && h1.textContent.includes('How a LaunchProof validation works'), 'How It Works H1 matches');

  // All 5 stages with indicative timings and descriptions
  assert.ok(bodyText.includes('1. Define the product idea and investigate demand'), 'Stage 1 title present');
  assert.ok(bodyText.includes('Capture the audience, budget and risk appetite'), 'Stage 1 description present');

  assert.ok(bodyText.includes('2. Check product economics, pricing and supplier terms'), 'Stage 2 title present');
  assert.ok(bodyText.includes('Screen category requirements, compare competitor prices'), 'Stage 2 description present');

  assert.ok(bodyText.includes('3. Approve the concept and agree decision thresholds'), 'Stage 3 title present');
  assert.ok(bodyText.includes('The founder approves the specification and price range'), 'Stage 3 description present');

  assert.ok(bodyText.includes('4. Run transparent demand tests at a stated price'), 'Stage 4 title present');
  assert.ok(bodyText.includes('Explain to visitors that the product is in development'), 'Stage 4 description present');

  assert.ok(bodyText.includes('5. Review the evidence and consider a Go, Revise or Stop recommendation'), 'Stage 5 title present');
  assert.ok(bodyText.includes('Review acquisition costs, the score range and supplier order risk'), 'Stage 5 description present');

  // Timings presented as indicative pilot targets
  assert.ok(bodyText.includes('Days 0–2') && bodyText.includes('Days 2–4') && bodyText.includes('Days 4–5') && bodyText.includes('Days 5–12') && bodyText.includes('Days 12–14'), 'All 5 stage timing targets present');
  assert.ok(bodyText.includes('indicative pilot targets') || bodyText.includes('Indicative Target'), 'Timings labelled as indicative targets');

  // Go, Revise or Stop decision framework explanation present
  assert.ok(bodyText.includes('Go, Revise or Stop Decision Framework'), 'Decision framework section present');

  // CTA
  const cta = document.querySelector('.section-cta a[href="/contact-us#early-access"]');
  assert.ok(cta, 'How It Works CTA links to /contact-us#early-access');

  console.log('✔ How It Works 5-stage validation workflow and indicative targets verified.');
}

// 5. SERVICES (/services) VERIFICATION
{
  const { html, document } = loadPageDOM('./services/index.html');
  const bodyText = document.body.textContent;

  // In-page subnav
  const subnav = document.querySelector('.service-subnav');
  assert.ok(subnav, 'Services page has in-page subnav');

  // 9 Platform Modules with planned status
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
  assert.strictEqual(moduleCards.length, 9, 'Services page must have exactly 9 module cards');
  modules.forEach(mod => {
    assert.ok(bodyText.includes(mod), `Platform module missing: ${mod}`);
  });
  assert.ok(bodyText.includes('Modules 1–8 form the planned core MVP') || bodyText.includes('planned core MVP'), 'Core MVP note present');
  assert.ok(bodyText.includes('Planned MVP Module'), 'Planned MVP Module status chips present');

  // Proposed Launch Pricing Heading & Note
  const pricingSec = document.getElementById('pricing');
  assert.ok(pricingSec, 'Pricing section exists');
  const pricingHeading = pricingSec.querySelector('h2');
  assert.strictEqual(pricingHeading.textContent.trim(), 'Proposed Launch Pricing', 'Pricing heading must be "Proposed Launch Pricing"');
  assert.ok(pricingSec.textContent.includes('LaunchProof is currently in development. These are proposed launch prices and may be refined before launch. Prices exclude VAT.'), 'Proposed launch pricing note matches exact required text');

  // Price numbers and plans
  assert.ok(pricingSec.textContent.includes('£0'), 'Free Discovery £0 present');
  assert.ok(pricingSec.textContent.includes('£39'), 'Starter £39 present');
  assert.ok(pricingSec.textContent.includes('£119'), 'Growth £119 present');
  assert.ok(pricingSec.textContent.includes('£349'), 'Enterprise £349 present');
  assert.ok(pricingSec.textContent.includes('£149'), 'Validation Sprint £149 present');
  assert.ok(pricingSec.textContent.includes('£450'), 'Expert Review £450 present');
  assert.ok(pricingSec.textContent.includes('Prices exclude VAT'), 'VAT notice present');
  assert.ok(pricingSec.textContent.includes('zero platform markup') || pricingSec.textContent.includes('adds no markup'), 'Planned ad spend commercial arrangement note present');

  // Registering does not purchase a plan note
  assert.ok(pricingSec.textContent.includes('Registering for early access does not purchase a plan.'), 'Early access non-purchase note present');

  // All pricing cards have CTA Join Early Access linking to /contact-us#early-access
  const pricingButtons = Array.from(pricingSec.querySelectorAll('a.btn'));
  pricingButtons.forEach(btn => {
    assert.strictEqual(btn.textContent.trim(), 'Join Early Access', 'Pricing button text must be "Join Early Access"');
    assert.strictEqual(btn.getAttribute('href'), '/contact-us#early-access', 'Pricing button must link to /contact-us#early-access');
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

  console.log('✔ Services page 9 modules, proposed pricing, and FAQs verified.');
}

// 6. ABOUT US (/about-us) VERIFICATION
{
  const { html, document } = loadPageDOM('./about-us/index.html');
  const bodyText = document.body.textContent;

  // Business Vision Section with exact required wording
  assert.ok(bodyText.includes('Our vision is to help physical-product founders make informed decisions before committing money to inventory by bringing demand, competition, pricing and supplier risk evidence into one structured validation process.'), 'Business vision matches exact required wording');

  // Indicative Development Roadmap
  const roadmapContainer = document.querySelector('.roadmap-container');
  assert.ok(roadmapContainer, 'Roadmap container exists on About Us');
  assert.ok(roadmapContainer.textContent.includes('Indicative development roadmap'), 'Roadmap labelled Indicative development roadmap');
  assert.ok(roadmapContainer.textContent.includes('Core platform development'), 'Roadmap milestone 1 present');
  assert.ok(roadmapContainer.textContent.includes('Early-access feedback and pilot preparation'), 'Roadmap milestone 2 present');
  assert.ok(roadmapContainer.textContent.includes('Pilot validation and refinement'), 'Roadmap milestone 3 present');
  assert.ok(roadmapContainer.textContent.includes('Planned outcome tracking and integration expansion'), 'Roadmap milestone 4 present');

  // Founder details
  assert.ok(bodyText.includes('Sharique Shahid'), 'Founder name must be Sharique Shahid');
  assert.ok(bodyText.includes('Founder and Managing Director'), 'Founder title must match');
  assert.ok(bodyText.includes('University of Stirling'), 'Founder university must be University of Stirling');
  assert.ok(bodyText.includes('online grocery purchasing behaviour'), 'UK English spelling for behaviour');

  // Intended customers and focus categories
  assert.ok(bodyText.includes('First-time physical-product founders'), 'Customer context present');
  assert.ok(bodyText.includes('Health and wellness consumables') && bodyText.includes('Pet products'), 'UK categories present');

  // CTA
  const ctaBtn = document.querySelector('.section-cta a[href="/contact-us#early-access"]');
  assert.ok(ctaBtn, 'About Us CTA links to /contact-us#early-access');

  console.log('✔ About Us business vision, indicative roadmap, founder details, and categories verified.');
}

// 7. CONTACT US (/contact-us) VERIFICATION
{
  const { html, document } = loadPageDOM('./contact-us/index.html');
  const bodyText = document.body.textContent;

  // Heading Contact Us
  const h1 = document.querySelector('h1');
  assert.ok(h1 && h1.textContent.includes('Contact Us'), 'H1 must be Contact Us');

  // Form 1: Early-Access Registration Form
  const eaForm = document.getElementById('early-access-form');
  assert.ok(eaForm, 'Early access form exists');
  assert.ok(document.getElementById('early-access'), 'Anchor #early-access exists for direct link destination');

  const eaName = eaForm.querySelector('input[name="fullName"]');
  assert.ok(eaName && eaName.required, 'Early access Full Name required');
  const eaPhone = eaForm.querySelector('input[name="phoneNumber"]');
  assert.ok(eaPhone && eaPhone.required, 'Early access Phone Number required');
  const eaEmail = eaForm.querySelector('input[name="emailAddress"]');
  assert.ok(eaEmail && eaEmail.required, 'Early access Email Address required');
  const eaOrg = eaForm.querySelector('input[name="organisationName"]');
  assert.ok(eaOrg && eaOrg.required, 'Early access Organisation Name required');
  const eaHp = eaForm.querySelector('input[name="_hp"]');
  assert.ok(eaHp, 'Anti-spam honeypot present in early access form');

  const eaSubmit = eaForm.querySelector('button[type="submit"]');
  assert.strictEqual(eaSubmit.textContent.trim(), 'Join Early Access', 'Early access submit button text must be "Join Early Access"');
  assert.ok(bodyText.includes('Register your interest to receive updates about LaunchProof’s development and upcoming pilot opportunities.'), 'Early access explanatory copy present');

  // Form 2: Contact Enquiry Form
  const ctForm = document.getElementById('contact-form');
  assert.ok(ctForm, 'Contact enquiry form exists');
  assert.ok(document.getElementById('enquiry'), 'Anchor #enquiry exists');

  const ctName = ctForm.querySelector('input[name="fullName"]');
  assert.ok(ctName && ctName.required, 'Contact Full Name required');
  const ctEmail = ctForm.querySelector('input[name="emailAddress"]');
  assert.ok(ctEmail && ctEmail.required, 'Contact Email Address required');
  const ctSubject = ctForm.querySelector('input[name="subject"]');
  assert.ok(ctSubject && ctSubject.required, 'Contact Subject required');
  const ctMessage = ctForm.querySelector('textarea[name="message"]');
  assert.ok(ctMessage && ctMessage.required, 'Contact Message required');
  const ctHp = ctForm.querySelector('input[name="_hp"]');
  assert.ok(ctHp, 'Anti-spam honeypot present in contact form');

  const ctSubmit = ctForm.querySelector('button[type="submit"]');
  assert.strictEqual(ctSubmit.textContent.trim(), 'Send Enquiry', 'Contact submit button text must be "Send Enquiry"');

  // Verified Business Contact Details
  assert.ok(bodyText.includes('Sharique Shahid'), 'Verified founder name present in contact info');
  assert.ok(!bodyText.includes('[BUSINESS_EMAIL]'), 'Must not display literal [BUSINESS_EMAIL] placeholder');
  assert.ok(!bodyText.includes('This form saves your details in this browser'), 'Must not contain browser-only storage notice');

  console.log('✔ Contact Us page early-access form, contact form, and verified details verified.');
}

// 8. SERVERLESS API ENDPOINT TEST (SUBMISSIONS, VALIDATION & SPAM PROTECTION)
{
  // Test A: Early Access Registration validation
  const invalidEa = await processSubmission({ type: 'early-access', fullName: 'John Doe' });
  assert.strictEqual(invalidEa.status, 400, 'Incomplete early access submission rejected');

  // Test B: Spam honeypot rejection
  const spamSubmission = await processSubmission({
    type: 'early-access',
    fullName: 'Bot User',
    phoneNumber: '123456',
    emailAddress: 'bot@example.com',
    organisationName: 'Bot Inc',
    _hp: 'http://spam-link.com'
  });
  assert.strictEqual(spamSubmission.status, 400, 'Spam bot submission caught by honeypot');

  // Test C: Valid Early Access Registration in test mode
  process.env.EMAIL_TEST_MODE = 'true';
  const validEa = await processSubmission({
    type: 'early-access',
    fullName: 'Eleanor Vance',
    phoneNumber: '+44 7700 900077',
    emailAddress: 'eleanor@example.co.uk',
    organisationName: 'Highlands Botanicals Ltd'
  });
  assert.strictEqual(validEa.status, 200, 'Valid early access accepted in test mode');
  assert.strictEqual(validEa.data.success, true);
  assert.ok(validEa.data.timestamp, 'Server generated timestamp with timezone present');

  // Test D: Valid Contact Enquiry in test mode
  const validContact = await processSubmission({
    type: 'contact',
    fullName: 'Marcus Sterling',
    emailAddress: 'marcus@example.co.uk',
    phoneNumber: '+44 7700 900088',
    organisationName: 'Sterling Goods Ltd',
    subject: 'Partnership question',
    message: 'Hello, I would like to inquire about the upcoming pilot launch.'
  });
  assert.strictEqual(validContact.status, 200, 'Valid contact enquiry accepted in test mode');
  assert.strictEqual(validContact.data.success, true);

  // Test E: Unconfigured provider in non-test mode returns 503
  delete process.env.EMAIL_TEST_MODE;
  const originalEnv = process.env.BUSINESS_EMAIL;
  delete process.env.BUSINESS_EMAIL;
  delete process.env.RESEND_API_KEY;
  const unconfiguredRes = await processSubmission({
    type: 'early-access',
    fullName: 'Test User',
    phoneNumber: '+44 7700 900077',
    emailAddress: 'test@example.co.uk',
    organisationName: 'Test Org Ltd'
  });
  assert.strictEqual(unconfiguredRes.status, 503, 'Returns 503 when email configuration is missing');
  assert.ok(unconfiguredRes.data.error.includes('BUSINESS_EMAIL'), 'Explains missing BUSINESS_EMAIL');
  if (originalEnv) process.env.BUSINESS_EMAIL = originalEnv;

  console.log('✔ Serverless API email validation, spam honeypot, and error handling tested.');
}

console.log('--- ALL 5-PAGE ARCHITECTURE & EMAIL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
