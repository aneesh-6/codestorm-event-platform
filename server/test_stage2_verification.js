import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';

async function main() {
  console.log('================================================================================================');
  console.log('CODESTORM 2026 — STAGE 2 COMPREHENSIVE VERIFICATION TEST SUITE');
  console.log('================================================================================================\n');

  // Load migration credentials summary
  const summaryPath = path.join(__dirname, 'migration_credentials_summary.json');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`   ✅ PASS: ${message}`);
      return true;
    } else {
      console.error(`   ❌ FAIL: ${message}`);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 1: CRITICAL EXISTING PARTICIPANTS LOGIN (PART 11)
  // --------------------------------------------------------------------------
  console.log('--- TEST SECTION 1: CRITICAL EXISTING PARTICIPANTS (PART 11) ---');
  const targetRegIds = [
    'CODESTORM-2026-0001',
    'CODESTORM-2026-0002',
    'CODESTORM-2026-0003',
    'CODESTORM-2026-0004',
    'CODESTORM-2026-0033'
  ];

  for (const regId of targetRegIds) {
    const cred = summary.find(c => c.registrationId === regId);
    if (!cred) {
      console.error(`Missing credentials for ${regId}`);
      continue;
    }

    console.log(`\nTesting login for ${regId} (${cred.participantId}) | Name: "${cred.name}"`);
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: cred.participantId,
        password: cred.tempPassword
      })
    });

    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.token, `Login HTTP 200 & JWT received for ${cred.participantId}`);
    assert(loginData.user && loginData.user.participantId === cred.participantId, `User object participantId matches: ${cred.participantId}`);
    assert(loginData.user && loginData.user.registrationId === regId, `User object registrationId matches: ${regId}`);
    assert(loginData.user && loginData.user.name === cred.name, `User name matches Google Sheet: "${cred.name}"`);

    // Verify /api/auth/me (Dashboard profile load)
    if (loginData.token) {
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${loginData.token}` }
      });
      const meData = await meRes.json();
      assert(meRes.status === 200, `/api/auth/me returns 200`);
      assert(meData.participant && meData.participant.name === cred.name, `Dashboard participant.name matches: "${cred.name}"`);
      assert(meData.participant && meData.participant.registrationId === regId, `Dashboard participant.registrationId matches: ${regId}`);
      assert(meData.participant && meData.participant.participantId === cred.participantId, `Dashboard participant.participantId matches: ${cred.participantId}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 2: WRONG PASSWORD REJECTION (PART 13)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 2: WRONG PASSWORD REJECTION (PART 13) ---');
  const wrongPwdRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'CS26-0001',
      password: 'IncorrectSecretPassword!'
    })
  });
  const wrongPwdData = await wrongPwdRes.json();
  assert(wrongPwdRes.status === 401, 'Wrong password returns HTTP 401');
  assert(wrongPwdData.error && wrongPwdData.error.toLowerCase().includes('invalid credentials'), `Error message indicates "Invalid credentials" (Received: "${wrongPwdData.error}")`);

  // --------------------------------------------------------------------------
  // TEST SECTION 3: REMOVAL OF LEGACY LOGIN MECHANISMS (PART 5)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 3: REMOVAL OF LEGACY LOGIN (PART 5) ---');

  // Attempt 1: Registration ID + Registration ID
  const legacy1Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'CODESTORM-2026-0001',
      password: 'CODESTORM-2026-0001'
    })
  });
  assert(legacy1Res.status === 401, 'Legacy Registration ID + Registration ID rejected with 401');

  // Attempt 2: Registration ID + temporary password
  const cred0001 = summary.find(c => c.registrationId === 'CODESTORM-2026-0001');
  const legacy2Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'CODESTORM-2026-0001',
      password: cred0001.tempPassword
    })
  });
  assert(legacy2Res.status === 401, 'Legacy Registration ID + temporary password rejected with 401 (must use Participant ID)');

  // Attempt 3: Participant ID + Registration ID as password
  const legacy3Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'CS26-0001',
      password: 'CODESTORM-2026-0001'
    })
  });
  assert(legacy3Res.status === 401, 'Participant ID + Registration ID as password rejected with 401');

  // --------------------------------------------------------------------------
  // TEST SECTION 4: COMPLETELY NEW REGISTRATION FLOW (PART 12)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST SECTION 4: COMPLETELY NEW REGISTRATION FLOW (PART 12) ---');
  const uniqueSeq = Math.floor(1000 + Math.random() * 9000);
  const newRegData = {
    name: `Aanya Mukherjee`,
    rollNumber: `22WH1A${uniqueSeq}`,
    email: `aanya.mukherjee.${uniqueSeq}@mrem.ac.in`,
    mobile: '9876543210',
    year: '3rd Year',
    branch: 'CSE – Data Science',
    section: 'B',
    yearAndBranch: '3rd Year - CSE – Data Science (B)',
    paymentScreenshot: 'Paid'
  };

  console.log(`Submitting new registration for ${newRegData.name} (${newRegData.rollNumber})...`);

  // Call platform registration endpoint (or codestorm/api/register logic)
  const regRes = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRegData)
  });

  const regResponseJson = await regRes.json();
  console.log('Registration Response:', regResponseJson);

  assert(regRes.status === 200 || regRes.status === 201, 'Registration API returns 200/201 success');
  assert(!!regResponseJson.registrationId, `Registration ID generated: ${regResponseJson.registrationId}`);
  assert(!!regResponseJson.participantId, `Participant ID generated: ${regResponseJson.participantId}`);
  assert(!!regResponseJson.temporaryPassword, `Temporary password generated: ${regResponseJson.temporaryPassword}`);

  const newRegId = regResponseJson.registrationId;
  const newPartId = regResponseJson.participantId;
  const newTempPwd = regResponseJson.temporaryPassword;

  // Sync credentials to Google Sheet for this new participant
  console.log(`Syncing new participant to Google Sheet...`);
  const sheetSyncRes = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      registrationId: newRegId,
      participantId: newPartId,
      temporaryPassword: newTempPwd,
      name: newRegData.name,
      rollNumber: newRegData.rollNumber,
      email: newRegData.email,
      mobile: newRegData.mobile,
      year: newRegData.year,
      branch: newRegData.branch,
      section: newRegData.section,
      yearAndBranch: newRegData.yearAndBranch
    })
  });
  const sheetSyncJson = await sheetSyncRes.json();
  assert(sheetSyncJson.success === true, `Google Sheet updated for new participant (${newRegId})`);

  // Test immediate login using new Participant ID + Password
  console.log(`Testing immediate login for new participant (${newPartId} / ${newTempPwd})...`);
  const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: newPartId,
      password: newTempPwd
    })
  });

  const newLoginData = await newLoginRes.json();
  assert(newLoginRes.status === 200 && !!newLoginData.token, `Login successful for new participant with Participant ID + Password`);
  assert(newLoginData.user && newLoginData.user.name === newRegData.name, `Logged-in name matches: "${newRegData.name}"`);
  assert(newLoginData.user && newLoginData.user.registrationId === newRegId, `Logged-in registrationId matches: ${newRegId}`);
  assert(newLoginData.user && newLoginData.user.participantId === newPartId, `Logged-in participantId matches: ${newPartId}`);

  // Test dashboard load via /api/auth/me
  const newMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${newLoginData.token}` }
  });
  const newMeData = await newMeRes.json();
  assert(newMeRes.status === 200, `New participant dashboard loads via /api/auth/me`);
  assert(newMeData.participant && newMeData.participant.name === newRegData.name, `Dashboard participant name matches: "${newRegData.name}"`);
  assert(newMeData.participant && newMeData.participant.registrationId === newRegId, `Dashboard registrationId matches: ${newRegId}`);
  assert(newMeData.participant && newMeData.participant.participantId === newPartId, `Dashboard participantId matches: ${newPartId}`);
  assert(newMeData.participant && newMeData.participant.rollNumber === newRegData.rollNumber, `Dashboard rollNumber matches: ${newRegData.rollNumber}`);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================================================');
  console.log('FINAL TEST RESULTS SUMMARY');
  console.log('================================================================================================');
  console.log(`Total Checks Run:  ${totalTests}`);
  console.log(`Passed:            ${passedTests}`);
  console.log(`Failed:            ${totalTests - passedTests}`);
  console.log(`Status:            ${passedTests === totalTests ? 'ALL CHECKS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('================================================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});
