async function testAll() {
  const tests = [
    { id: 'CODESTORM-2026-0001', expectedName: 'Aneesh Test Student' },
    { id: 'CODESTORM-2026-0002', expectedName: 'Test Participant' },
    { id: 'CODESTORM-2026-0003', expectedName: 'Siddharth Rao' },
    { id: 'CODESTORM-2026-0004', expectedName: 'Chinni Aravind' },
    { id: 'CODESTORM-2026-0027', expectedName: 'Production Trace Test' }
  ];

  console.log('================================================================================================');
  console.log('PART 12 VERIFICATION: TESTING EXISTING PARTICIPANTS LOGIN');
  console.log('================================================================================================\n');

  let existingPassed = 0;
  for (const t of tests) {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: t.id, password: t.id })
    });

    const data = await res.json();
    const resolvedName = data.participant?.name || data.user?.name;
    const ok = res.status === 200 && data.token && (resolvedName === t.expectedName);
    if (ok) existingPassed++;

    console.log(`[TEST ${t.id}] Status: ${res.status} | Auth: ${data.token ? 'OK' : 'FAIL'} | Name: "${resolvedName}" (Expected: "${t.expectedName}") -> ${ok ? 'PASSED ✅' : 'FAILED ❌'}`);
  }

  console.log(`\nExisting Participants Verified: ${existingPassed}/${tests.length}\n`);

  console.log('================================================================================================');
  console.log('PART 12 VERIFICATION: TESTING NEW REGISTRATION AUTOMATIC IMMEDIATE LOGIN');
  console.log('================================================================================================\n');

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const newRegPayload = {
    name: 'Kavya Sharma',
    rollNumber: `22WH1A${randSuffix}`,
    email: `kavya.${randSuffix}@example.com`,
    mobile: '9876543210',
    year: '3rd Year',
    branch: 'CSE – Data Science',
    section: 'A'
  };

  console.log(`1. Submitting new registration for "${newRegPayload.name}" (${newRegPayload.rollNumber})...`);
  const regRes = await fetch('http://localhost:5000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRegPayload)
  });
  const regData = await regRes.json();
  console.log(`   Registration Status: ${regRes.status}`);
  console.log(`   Assigned Registration ID: ${regData.registrationId}`);
  console.log(`   Registered Name: ${regData.name}`);

  console.log(`\n2. Immediately testing login with Registration ID: ${regData.registrationId} as ID & Password...`);
  const newLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: regData.registrationId, password: regData.registrationId })
  });
  const newLoginData = await newLoginRes.json();
  const newLoginOk = newLoginRes.status === 200 && newLoginData.token && newLoginData.participant?.name === 'Kavya Sharma' && (newLoginData.participant?.registrationId === regData.registrationId);

  console.log(`[NEW USER LOGIN: ${regData.registrationId}] Status: ${newLoginRes.status} | Auth: ${newLoginData.token ? 'OK' : 'FAIL'} | Name: "${newLoginData.participant?.name}" -> ${newLoginOk ? 'PASSED ✅' : 'FAILED ❌'}`);

  console.log('\n3. Verifying /api/auth/me for new participant:');
  const meRes = await fetch('http://localhost:5000/api/auth/me', {
    headers: { Authorization: `Bearer ${newLoginData.token}` }
  });
  const meData = await meRes.json();
  console.log(`   Dashboard Profile: Name="${meData.participant?.name}", RegID="${meData.participant?.registrationId}", Roll="${meData.participant?.rollNumber}"`);

  console.log('\n================================================================================================');
  console.log(`FINAL RESULT: ${existingPassed === tests.length && newLoginOk ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('================================================================================================\n');
}

testAll().catch(console.error);
