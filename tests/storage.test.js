import { JSDOM } from 'jsdom';
import assert from 'assert';
import { savePilotRequest } from '../src/main.js';

console.log('--- TESTING PILOT REQUEST STORAGE & BEHAVIOUR ---');

// Mock a browser environment with localStorage
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] ?? null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();

// Setup JSDOM
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body>
      <form id="pilot-form">
        <input type="text" name="fullName" required>
        <input type="tel" name="phoneNumber" required>
        <input type="email" name="emailAddress" required>
        <input type="text" name="organisationName" required>
        <button type="submit" id="save-pilot-btn">Save pilot request</button>
      </form>
      <div id="form-status" role="status"></div>
    </body>
  </html>
`, { url: 'http://localhost:3000' });

const { window } = dom;
global.window = window;
global.document = window.document;
global.FormData = window.FormData;
Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  configurable: true,
  writable: true
});

const form = document.getElementById('pilot-form');

// Helper to fill form
function fillForm(name, phone, email, org) {
  form.elements.namedItem('fullName').value = name;
  form.elements.namedItem('phoneNumber').value = phone;
  form.elements.namedItem('emailAddress').value = email;
  form.elements.namedItem('organisationName').value = org;
}

// TEST 1: Reject whitespace-only name
fillForm('   ', '+44 7700 900077', 'test@example.co.uk', 'Acme Ltd');
let res1 = await savePilotRequest(form);
assert.strictEqual(res1, false, 'Whitespace-only name must be rejected');
assert.strictEqual(mockStorage.getItem('launchproof_pilot_requests'), null, 'Nothing saved on invalid submission');
console.log('✔ Whitespace-only name rejected correctly.');

// Clear validity
form.elements.namedItem('fullName').setCustomValidity('');

// TEST 2: First valid submission
fillForm('Eleanor Vance', '+44 7700 900077', 'eleanor@example.co.uk', 'Vance Innovations');
let res2 = await savePilotRequest(form);
assert.strictEqual(res2, true, 'Valid submission 1 must succeed');

let dataAfterFirst = JSON.parse(mockStorage.getItem('launchproof_pilot_requests'));
assert.strictEqual(Array.isArray(dataAfterFirst), true);
assert.strictEqual(dataAfterFirst.length, 1);
assert.strictEqual(dataAfterFirst[0].fullName, 'Eleanor Vance');
assert.strictEqual(dataAfterFirst[0].phoneNumber, '+44 7700 900077');
assert.strictEqual(dataAfterFirst[0].emailAddress, 'eleanor@example.co.uk');
assert.strictEqual(dataAfterFirst[0].organisationName, 'Vance Innovations');
assert.ok(dataAfterFirst[0].submissionDateTime, 'Must have ISO timestamp');
console.log('✔ First submission saved with all 5 fields.');

// TEST 3: Second valid submission ("Reload between submissions")
// Simulate reload by reading directly from storage
fillForm('Marcus Sterling', '07700900123', 'marcus@sterlinggoods.co.uk', 'Sterling Goods Ltd');
let res3 = await savePilotRequest(form);
assert.strictEqual(res3, true, 'Valid submission 2 must succeed');

let dataAfterSecond = JSON.parse(mockStorage.getItem('launchproof_pilot_requests'));
assert.strictEqual(Array.isArray(dataAfterSecond), true);
assert.strictEqual(dataAfterSecond.length, 2, 'Must contain 2 records');

// First record intact
assert.strictEqual(dataAfterSecond[0].fullName, 'Eleanor Vance');
assert.strictEqual(dataAfterSecond[0].phoneNumber, '+44 7700 900077');
assert.strictEqual(dataAfterSecond[0].emailAddress, 'eleanor@example.co.uk');
assert.strictEqual(dataAfterSecond[0].organisationName, 'Vance Innovations');

// Second record
assert.strictEqual(dataAfterSecond[1].fullName, 'Marcus Sterling');
assert.strictEqual(dataAfterSecond[1].phoneNumber, '07700900123');
assert.strictEqual(dataAfterSecond[1].emailAddress, 'marcus@sterlinggoods.co.uk');
assert.strictEqual(dataAfterSecond[1].organisationName, 'Sterling Goods Ltd');
assert.ok(dataAfterSecond[1].submissionDateTime);
console.log('✔ Second submission appended; first record intact and all 5 fields present.');

// TEST 4: Malformed storage test (must not overwrite or silently discard)
mockStorage.setItem('launchproof_pilot_requests', '{"corrupted": true}'); // Not an array
fillForm('Test Person', '+44 7700 900999', 'test@test.co.uk', 'Test Org');

let errorCaught = false;
try {
  await savePilotRequest(form);
} catch (e) {
  errorCaught = true;
  assert.strictEqual(e.message, 'Existing pilot requests could not be read.');
}
assert.strictEqual(errorCaught, true, 'Must throw when existing data is not an array');
assert.strictEqual(mockStorage.getItem('launchproof_pilot_requests'), '{"corrupted": true}', 'Must not overwrite malformed data');
console.log('✔ Corrupted/malformed storage handled safely without overwrite.');

console.log('--- ALL STORAGE TESTS PASSED SUCCESSFULLY! ---');
