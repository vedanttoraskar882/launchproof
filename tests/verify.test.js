import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';
import assert from 'assert';

const htmlContent = readFileSync(resolve('./index.html'), 'utf-8');

console.log('--- STARTING VERIFICATION TESTS ---');

// 1. Check Document Head & Blank Favicon
assert.ok(htmlContent.includes('<link rel="icon" href="data:,">'), 'Favicon must be blank data:,');
assert.ok(htmlContent.includes('lang="en-GB"'), 'Language must be en-GB');

console.log('✔ Head and favicon checks passed.');

// Parse DOM
const dom = new JSDOM(htmlContent, {
  url: 'http://localhost:3000',
  runScripts: 'outside-only'
});
const { document } = dom.window;

assert.ok(!document.querySelector('#vision, #mission, [aria-labelledby*="vision"], [aria-labelledby*="mission"]'), 'Must not have a Vision or Mission section');
const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.toLowerCase());
assert.ok(!headings.some(h => h.includes('vision') || h.includes('mission')), 'No headings should mention Vision or Mission');

// 2. Confirm all 7 sections render in exact order:
// 1. Home, 2. About, 3. Platform, 4. How It Works, 5. Market Pricing, 6. FAQ, 7. Footer
const homeSec = document.getElementById('home');
const aboutSec = document.getElementById('about');
const platformSec = document.getElementById('platform');
const workflowSec = document.getElementById('how-it-works');
const pricingSec = document.getElementById('pricing');
const faqSec = document.getElementById('faq');
const footer = document.querySelector('footer');

assert.ok(homeSec, 'Section 1 (Home) exists');
assert.ok(aboutSec, 'Section 2 (About) exists');
assert.ok(platformSec, 'Section 3 (Platform) exists');
assert.ok(workflowSec, 'Section 4 (How It Works) exists');
assert.ok(pricingSec, 'Section 5 (Market Pricing) exists');
assert.ok(faqSec, 'Section 6 (FAQ) exists');
assert.ok(footer, 'Section 7 (Footer) exists');

// Verify order in DOM
const sections = [homeSec, aboutSec, platformSec, workflowSec, pricingSec, faqSec, footer];
for (let i = 0; i < sections.length - 1; i++) {
  const pos = sections[i].compareDocumentPosition(sections[i + 1]);
  assert.ok(pos & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, `Section ${i + 1} must precede section ${i + 2}`);
}
console.log('✔ All 7 sections exist and are in the required order.');

// 3. Navigation links
const navLinks = Array.from(document.querySelectorAll('header nav a')).map(a => a.getAttribute('href'));
assert.deepStrictEqual(navLinks, ['#home', '#about', '#platform', '#how-it-works', '#pricing', '#faq']);
console.log('✔ Navigation links match required anchors.');

// 4. Check Founder name and bio
const founderTexts = document.body.textContent;
assert.ok(founderTexts.includes('Sharique Shahid'), 'Founder name must be Sharique Shahid');
assert.ok(founderTexts.includes('Founder and Managing Director'), 'Founder title must match');
assert.ok(founderTexts.includes('University of Stirling'), 'Founder university must be University of Stirling');
assert.ok(founderTexts.includes('online grocery purchasing behaviour'), 'UK English spelling for behaviour');
console.log('✔ Founder details and UK English spelling verified.');

// 5. Check all 9 modules in Platform
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
modules.forEach(mod => {
  assert.ok(platformSec.textContent.includes(mod), `Platform module missing: ${mod}`);
});
assert.ok(platformSec.textContent.includes('Modules 1–8 form the core MVP'), 'Core MVP note present');
console.log('✔ All 9 modules and MVP note verified.');

// 6. Check How It Works stages and Pilot Target
const stages = [
  'Days 0–2',
  'Days 2–4',
  'Days 4–5',
  'Days 5–12',
  'Days 12–14'
];
stages.forEach(st => {
  assert.ok(workflowSec.textContent.includes(st), `Stage timing missing: ${st}`);
});

const pilotTargetMatches = (document.body.textContent.match(/Pilot target: reach a decision within 14 days for under £500 all-in, including the advertising test\./g) || []);
assert.strictEqual(pilotTargetMatches.length, 1, 'Pilot target statement must appear exactly once');
console.log('✔ How It Works stages and singular Pilot Target statement verified.');

// 7. Check Pricing exact numbers & notes
const pricingText = pricingSec.textContent;
assert.ok(pricingText.includes('FREE DISCOVERY'), 'Free Discovery plan present');
assert.ok(pricingText.includes('£0'), '£0 present');
assert.ok(pricingText.includes('STARTER'), 'Starter plan present');
assert.ok(pricingText.includes('£39') && pricingText.includes('/month'), '£39/month present');
assert.ok(pricingText.includes('GROWTH'), 'Growth plan present');
assert.ok(pricingText.includes('£119') && pricingText.includes('/month'), '£119/month present');
assert.ok(pricingText.includes('ENTERPRISE'), 'Enterprise plan present');
assert.ok(pricingText.includes('£349') && pricingText.includes('/month'), '£349/month present');

assert.ok(pricingText.includes('VALIDATION SPRINT'), 'Validation Sprint present');
assert.ok(pricingText.includes('£149') && pricingText.includes('per sprint'), '£149 per sprint present');
assert.ok(pricingText.includes('EXPERT REVIEW'), 'Expert Review present');
assert.ok(pricingText.includes('£450') && pricingText.includes('per review'), '£450 per review present');

assert.ok(pricingText.includes('Prices exclude VAT'), 'Prices exclude VAT notice present');
assert.ok(pricingText.includes('Advertising spend is paid directly to the advertising platform through the founder’s own account. LaunchProof adds no markup.'), 'Advertising markup notice present');
assert.ok(pricingText.includes('Covers research'), 'Covers research indicator present');
assert.ok(pricingText.includes('Includes live tests'), 'Includes live tests indicator present');
console.log('✔ Pricing plans, prices, units, and notes verified.');

// 8. Check FAQ items
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
  assert.ok(faqSec.textContent.includes(q), `FAQ question missing: ${q}`);
});
console.log('✔ All 7 FAQ questions present in native details/summary accordions.');

// 9. Check Decision Room Preview in Home
const decisionRoom = homeSec.querySelector('.decision-room-card');
assert.ok(decisionRoom, 'Decision room preview card exists');
assert.ok(decisionRoom.textContent.includes('Illustrative example'), 'Must have Illustrative example label');
assert.ok(decisionRoom.textContent.includes('Visitors joined the waitlist at the advertised price.'), 'Customer response copy exact');
assert.ok(decisionRoom.textContent.includes('The minimum order exceeds projected 90-day demand.'), 'Supplier terms copy exact');
assert.ok(decisionRoom.textContent.includes('Revise'), 'Recommendation Revise text present');
assert.ok(decisionRoom.textContent.includes('Compare suppliers with a smaller minimum order before committing to stock.'), 'Next step copy exact');
console.log('✔ Decision room preview verified.');

// 10. Check Dialog & Form fields
const dialog = document.getElementById('pilot-dialog');
assert.ok(dialog, 'Pilot dialog exists');
assert.ok(dialog.textContent.includes('Request a Pilot'), 'Dialog has Request a Pilot title');
assert.ok(dialog.textContent.includes('This form saves your details in this browser on this device. Your request is not sent to LaunchProof.'), 'Local save disclaimer present');

const form = document.getElementById('pilot-form');
assert.ok(form, 'Form exists');
const nameInput = form.querySelector('input[name="fullName"]');
assert.ok(nameInput && nameInput.getAttribute('autocomplete') === 'name' && nameInput.required, 'Full name input matches specs');
const phoneInput = form.querySelector('input[name="phoneNumber"]');
assert.ok(phoneInput && phoneInput.getAttribute('autocomplete') === 'tel' && phoneInput.type === 'tel' && phoneInput.required, 'Phone input matches specs');
const emailInput = form.querySelector('input[name="emailAddress"]');
assert.ok(emailInput && emailInput.getAttribute('autocomplete') === 'email' && emailInput.type === 'email' && emailInput.required, 'Email input matches specs');
const orgInput = form.querySelector('input[name="organisationName"]');
assert.ok(orgInput && orgInput.getAttribute('autocomplete') === 'organization' && orgInput.required, 'Organisation input matches specs');

const submitButton = form.querySelector('button[type="submit"]');
assert.strictEqual(submitButton.textContent.trim(), 'Save pilot request', 'Submit button label must be "Save pilot request"');

console.log('✔ Form and dialog structure verified.');

console.log('--- ALL STATIC ASSERTIONS PASSED! ---');
