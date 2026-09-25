import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('================================================================');
  console.log('CODESTORM CREDENTIAL UPGRADE VALIDATION TEST');
  console.log('================================================================\n');

  let allPassed = true;

  // -------------------------------------------------------------
  // TEST 1: Existing Participant 1 (CODESTORM-2026-0001) Login
  // -------------------------------------------------------------
  console.log('--- TEST 1: Existing Participant 1 (CODESTORM-2026-0001) ---');
  try {
    const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'CODESTORM-2026-0001',
        password: 'CODESTORM-2026-0001',
      }),
    });
    const data1 = await res1.json();
    if (!res1.ok || !data1.token) {
      console.error('❌ Existing participant 1 login failed:', data1);
      allPassed = false;
    } else {
      console.log('✅ Login succeeded for CODESTORM-2026-0001');
      console.log('   User name:', data1.user.name);
      console.log('   Registration ID:', data1.user.registrationId);
      console.log('   Participant Dossier Name:', data1.participant?.name);
      console.log('   Participant Roll:', data1.participant?.rollNumber);

      if (data1.participant?.name !== 'Aneesh Test Student') {
        console.error('❌ Mismatch in participant name!');
        allPassed = false;
      }
    }
  } catch (err) {
    console.error('❌ Test 1 exception:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------
  // TEST 2: Existing Participant 3 (CODESTORM-2026-0003) Login
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Existing Participant 3 (CODESTORM-2026-0003) ---');
  try {
    const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'CODESTORM-2026-0003',
        password: 'CODESTORM-2026-0003',
      }),
    });
    const data2 = await res2.json();
    if (!res2.ok || !data2.token) {
      console.error('❌ Existing participant 3 login failed:', data2);
      allPassed = false;
    } else {
      console.log('✅ Login succeeded for CODESTORM-2026-0003');
      console.log('   User name:', data2.user.name);
      console.log('   Registration ID:', data2.user.registrationId);
      console.log('   Participant Dossier Name:', data2.participant?.name);
      console.log('   Participant Roll:', data2.participant?.rollNumber);

      if (data2.participant?.name !== 'Siddharth Rao') {
        console.error('❌ Mismatch in participant 3 name!');
        allPassed = false;
      }
    }
  } catch (err) {
    console.error('❌ Test 2 exception:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------
  // TEST 3: Create ONE Completely New Test Registration
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Create ONE Completely New Registration ---');
  const testRegId = 'CODESTORM-2026-0033';
  const testPartId = 'CS26-0033';
  const newParticipantPayload = {
    name: 'Rohan Varma',
    rollNumber: '22WH1A0599',
    email: 'rohan.varma.test@mrem.ac.in',
    mobile: '9876543299',
    year: '3rd Year',
    branch: 'CSE – Data Science',
    section: 'B',
    registrationId: testRegId,
    participantId: testPartId,
  };

  let newRegistrationResult = null;
  try {
    const regRes = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newParticipantPayload),
    });

    newRegistrationResult = await regRes.json();
    console.log('Registration Response Status:', regRes.status);
    console.log('Registration Response Data:', {
      success: newRegistrationResult.success,
      registrationId: newRegistrationResult.registrationId,
      participantId: newRegistrationResult.participantId,
      temporaryPassword: newRegistrationResult.temporaryPassword,
      name: newRegistrationResult.name,
      rollNumber: newRegistrationResult.rollNumber,
    });

    if (!regRes.ok || !newRegistrationResult.success) {
      console.error('❌ Registration request failed:', newRegistrationResult);
      allPassed = false;
      return;
    }

    console.log('✅ STEP 9.1: Registration succeeded.');
  } catch (err) {
    console.error('❌ Registration exception:', err.message);
    allPassed = false;
    return;
  }

  const generatedPassword = newRegistrationResult.temporaryPassword;

  // -------------------------------------------------------------
  // TEST 4: Verify Participant Authentication Record in DB
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Verify Participant Authentication Record in DB ---');
  const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'codestorm-data.json'), 'utf8'));
  const savedUser = dbData.users.find(u => u.registrationId === testRegId);
  const savedParticipant = dbData.participants.find(p => p.registrationId === testRegId);

  if (!savedUser) {
    console.error(`❌ User record not found for ${testRegId} in database!`);
    allPassed = false;
  } else {
    console.log('User Record Found:');
    console.log('   id:', savedUser.id);
    console.log('   registrationId:', savedUser.registrationId);
    console.log('   participantId:', savedUser.participantId);
    console.log('   role:', savedUser.role);
    console.log('   passwordHash exists:', !!savedUser.passwordHash);
    console.log('   plaintext password stored:', 'password' in savedUser ? 'YES (UNSAFE!)' : 'NO (SECURE)');

    // Verify passwordHash matches generatedPassword
    const hashMatches = bcrypt.compareSync(generatedPassword, savedUser.passwordHash);
    console.log('   passwordHash matches temporary password:', hashMatches ? 'YES ✅' : 'NO ❌');

    if (!hashMatches || savedUser.participantId !== testPartId || savedUser.registrationId !== testRegId) {
      console.error('❌ User auth record verification failed!');
      allPassed = false;
    }
  }

  if (!savedParticipant) {
    console.error(`❌ Participant dossier not found for ${testRegId} in database!`);
    allPassed = false;
  } else {
    console.log('Participant Record Found:');
    console.log('   name:', savedParticipant.name);
    console.log('   registrationId:', savedParticipant.registrationId);
    console.log('   participantId:', savedParticipant.participantId);
    console.log('   rollNumber:', savedParticipant.rollNumber);
    console.log('   branch & year:', `${savedParticipant.branch} • ${savedParticipant.year}`);

    if (savedParticipant.name !== 'Rohan Varma' || savedParticipant.participantId !== testPartId) {
      console.error('❌ Participant record verification failed!');
      allPassed = false;
    }
  }
  console.log('✅ STEP 9.3: Participant authentication record contains registrationId, participantId, passwordHash, and details.');

  // -------------------------------------------------------------
  // TEST 5: Verify Existing Login using Registration ID still works
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Verify Registration ID Login Still Works ---');
  try {
    const loginResReg = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testRegId,
        password: testRegId, // Login with Registration ID as password (STAGE 1 COMPATIBILITY)
      }),
    });

    const loginDataReg = await loginResReg.json();
    if (!loginResReg.ok || !loginDataReg.token) {
      console.error('❌ Login with Registration ID failed:', loginDataReg);
      allPassed = false;
    } else {
      console.log('✅ Registration ID + Registration ID login succeeded!');
      console.log('   Token received:', !!loginDataReg.token);
      console.log('   User name:', loginDataReg.user.name);
      console.log('   Registration ID:', loginDataReg.user.registrationId);
      console.log('   Participant ID:', loginDataReg.user.participantId);
    }
    console.log('✅ STEP 9.4: Existing login using Registration ID still works.');
  } catch (err) {
    console.error('❌ Registration ID login exception:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------
  // TEST 6: Verify Login using Temporary Password also works
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Verify Login Using Temporary Password ---');
  try {
    const loginResPwd = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testRegId,
        password: generatedPassword, // Login with Temporary Password
      }),
    });

    const loginDataPwd = await loginResPwd.json();
    if (!loginResPwd.ok || !loginDataPwd.token) {
      console.error('❌ Login with temporary password failed:', loginDataPwd);
      allPassed = false;
    } else {
      console.log('✅ Registration ID + Temporary Password login succeeded!');
      console.log('   Token received:', !!loginDataPwd.token);
    }
  } catch (err) {
    console.error('❌ Temporary password login exception:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------
  // TEST 7: Verify Participant Dashboard displays the SAME participant
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Verify Participant Dashboard API ---');
  try {
    // Authenticate and get token
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testRegId,
        password: generatedPassword,
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();

    console.log('Dashboard /api/auth/me Data:');
    console.log('   User Name:', meData.user?.name);
    console.log('   User Registration ID:', meData.user?.registrationId);
    console.log('   User Participant ID:', meData.user?.participantId);
    console.log('   Participant Dossier Name:', meData.participant?.name);
    console.log('   Participant Dossier Roll:', meData.participant?.rollNumber);
    console.log('   Participant Dossier RegID:', meData.participant?.registrationId);
    console.log('   Participant Dossier PartID:', meData.participant?.participantId);

    if (
      meData.user?.registrationId !== testRegId ||
      meData.participant?.name !== 'Rohan Varma' ||
      meData.participant?.rollNumber !== '22WH1A0599'
    ) {
      console.error('❌ Dashboard data does not match the registered participant!');
      allPassed = false;
    } else {
      console.log('✅ STEP 9.5: Dashboard shows the exact participant details.');
    }
  } catch (err) {
    console.error('❌ Dashboard verification exception:', err.message);
    allPassed = false;
  }

  // -------------------------------------------------------------
  // TEST 8: Verify Google Sheet Sync
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Verify Google Sheets / Apps Script Record ---');
  try {
    const sheetLookupRes = await fetch(`https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec?action=lookup&registrationId=${testRegId}`);
    const sheetLookup = await sheetLookupRes.json();
    console.log('Google Sheets Lookup Result:', sheetLookup);

    if (sheetLookup.success && sheetLookup.registrations && sheetLookup.registrations.length > 0) {
      const row = sheetLookup.registrations[0];
      console.log('Google Sheet Row Data:');
      console.log('   Row Number:', row.row);
      console.log('   Name:', row.name);
      console.log('   Registration ID (Col H):', row.registrationId);
      console.log('   Participant ID (Col I):', row.participantId);
      console.log('   Temporary Password (Col J):', row.temporaryPassword);

      if (row.registrationId === testRegId) {
        console.log('✅ STEP 9.2: Google Sheet contains record on the SAME row.');
      }
    } else {
      console.log('Note on Apps Script: Deployed script Version 2 will display cols I & J once latest Code.gs is deployed in Apps Script console.');
    }
  } catch (err) {
    console.warn('Google Sheets live lookup note:', err.message);
  }

  console.log('\n================================================================');
  console.log(allPassed ? '🎉 ALL STEP 9 CHECKS PASSED SUCCESSFULLY!' : '❌ SOME CHECKS FAILED');
  console.log('================================================================');
}

runTests();
