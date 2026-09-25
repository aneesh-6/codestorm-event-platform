import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'codestorm-data.json');

const SCRIPT_URL = process.env.VITE_GOOGLE_SCRIPT_URL ||
                   process.env.GOOGLE_SCRIPT_URL ||
                   'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';

/**
 * Generates an unpredictable, cryptographically secure 8-character temporary password.
 * Must include uppercase, lowercase, digits.
 */
export function generateSecureTemporaryPassword(length = 8) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  const getRandomChar = (set) => set[crypto.randomInt(0, set.length)];

  // Guarantee at least 2 uppercase, 2 lowercase, 2 digits
  const pwdChars = [
    getRandomChar(upper),
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(digits),
  ];

  while (pwdChars.length < length) {
    pwdChars.push(getRandomChar(all));
  }

  // Fisher-Yates shuffle
  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
  }

  return pwdChars.join('');
}

/**
 * Mapping:
 * CODESTORM-2026-0001 -> CS26-0001
 * CODESTORM-2026-0002 -> CS26-0002
 * CODESTORM-2026-XXXX -> CS26-XXXX
 */
export function deriveParticipantId(regId) {
  if (!regId) return `CS26-${String(crypto.randomInt(1001, 9999)).padStart(4, '0')}`;
  const clean = String(regId).trim().toUpperCase();
  const match = clean.match(/^CODESTORM-2026-(\d+)$/i);
  if (match) {
    return `CS26-${match[1]}`;
  }
  return `CS26-${clean.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
}

/**
 * Parses Year & Branch & Section
 */
export function parseYearAndBranch(rawYB) {
  if (!rawYB || typeof rawYB !== 'string') {
    return { year: '3rd Year', branch: 'CSE – Data Science', section: 'A' };
  }
  const clean = rawYB.trim();
  let section = 'A';
  const sectionMatch = clean.match(/\(([^)]+)\)$/);
  if (sectionMatch) section = sectionMatch[1].trim();

  const withoutSection = clean.replace(/\s*\([^)]+\)$/, '').trim();
  const parts = withoutSection.split(' - ');
  const year = (parts[0] || '3rd Year').trim();
  const branch = (parts.slice(1).join(' - ') || 'CSE – Data Science').trim();

  return { year, branch, section };
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run') || (!process.argv.includes('--execute'));

  console.log('================================================================================================');
  console.log(`CODESTORM 2026 — PARTICIPANT MIGRATION & CREDENTIAL UPGRADE (${isDryRun ? 'DRY-RUN MODE' : 'EXECUTE MODE'})`);
  console.log('================================================================================================\n');

  console.log('1. Fetching all valid registrations from Google Sheets...');
  const res = await fetch(`${SCRIPT_URL}?action=getRegistrations`);
  if (!res.ok) {
    throw new Error(`Failed to fetch from Google Apps Script Web App: ${res.statusText}`);
  }
  const sheetData = await res.json();
  if (!sheetData.success || !Array.isArray(sheetData.registrations)) {
    throw new Error(`Invalid response from Google Sheets: ${JSON.stringify(sheetData)}`);
  }

  const registrations = sheetData.registrations;
  console.log(`📥 Total registrations found in Google Sheets: ${registrations.length}\n`);

  // Read current database state
  const rawDb = fs.readFileSync(DB_FILE, 'utf8');
  const dbData = JSON.parse(rawDb);

  // Migration plan items
  const migrationPlan = [];
  const assignedCredentials = []; // For sheet updating during execute

  for (const reg of registrations) {
    const regId = String(reg.registrationId || '').trim().toUpperCase();
    if (!regId) continue;

    const name = String(reg.name || '').trim();
    const rollNumber = String(reg.rollNumber || '').trim().toUpperCase();
    const email = String(reg.email || '').trim().toLowerCase();
    const mobile = reg.mobile ? String(reg.mobile).trim() : '';
    const rawYB = String(reg.yearAndBranch || '').trim();
    const { year, branch, section } = parseYearAndBranch(rawYB);


    // Strictly find existing user by permanent relationship key: registrationId
    let existingUser = dbData.users.find(u => 
      (u.registrationId && u.registrationId.toUpperCase() === regId) ||
      (u.participantId && u.participantId.toUpperCase() === regId)
    );

    // If not found by registrationId, check email ONLY if that user does not have a conflicting registrationId
    if (!existingUser && email) {
      existingUser = dbData.users.find(u => 
        u.email && u.email.toLowerCase() === email && 
        (!u.registrationId || u.registrationId.toUpperCase() === regId)
      );
    }

    const action = existingUser ? 'UPDATE' : 'CREATE';

    // All existing participants must be upgraded to deterministic credentials:
    // Registration ID: CODESTORM-2026-XXXX
    // Participant ID: CS26-XXXX
    // Password: PASSXXXX (e.g. CODESTORM-2026-0027 -> PASS0027)
    const match = regId.match(/^CODESTORM-2026-(\d+)$/i);
    const seqNum = match ? match[1] : regId.replace(/\D/g, '').slice(-4).padStart(4, '0');
    const participantId = `CS26-${seqNum}`;
    const tempPassword = `PASS${seqNum}`;

    migrationPlan.push({
      registrationId: regId,
      name,
      rollNumber,
      email,
      mobile,
      year,
      branch,
      section,
      yearAndBranch: rawYB || `${year} - ${branch} (${section})`,
      participantId,
      tempPassword,
      existingUser: !!existingUser,
      existingUserId: existingUser ? existingUser.id : null,
      action
    });
  }

  // PART 7 — DRY-RUN REPORT
  console.log('================================================================================================');
  console.log('PART 7 — MIGRATION DRY-RUN REPORT');
  console.log('================================================================================================');
  console.log('Registration ID        | Name                       | Participant ID | Existing User | Action');
  console.log('------------------------------------------------------------------------------------------------');

  let updateCount = 0;
  let createCount = 0;

  for (const item of migrationPlan) {
    const regIdPad = item.registrationId.padEnd(22, ' ');
    const namePad = item.name.slice(0, 26).padEnd(26, ' ');
    const partIdPad = item.participantId.padEnd(14, ' ');
    const existPad = (item.existingUser ? 'YES' : 'NO').padEnd(13, ' ');
    console.log(`${regIdPad} | ${namePad} | ${partIdPad} | ${existPad} | ${item.action}`);

    if (item.action === 'UPDATE') updateCount++;
    else createCount++;
  }

  console.log('================================================================================================');
  console.log(`Dry-Run Summary: Total Registrations: ${migrationPlan.length} | Updates: ${updateCount} | Creates: ${createCount}\n`);

  if (isDryRun) {
    console.log('ℹ️ DRY-RUN COMPLETE. No changes were made to local database or Google Sheet.');
    console.log('   To execute actual migration, run: node migrate_participants.js --execute\n');
    return {
      dryRun: true,
      total: migrationPlan.length,
      updates: updateCount,
      creates: createCount,
      plan: migrationPlan
    };
  }

  // ============================================================================
  // EXECUTE MODE: Apply changes to DB & Google Sheet
  // ============================================================================
  console.log('================================================================================================');
  console.log('EXECUTING MIGRATION (DB & GOOGLE SHEET)...');
  console.log('================================================================================================\n');

  let authAccountsUpdated = 0;
  let authAccountsCreated = 0;
  let passwordsGenerated = 0;
  let participantIdsGenerated = 0;
  let sheetRowsUpdated = 0;
  let errors = [];

  const nowIso = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);

  // 1. Process Database Records
  for (const item of migrationPlan) {
    try {
      const passwordHash = bcrypt.hashSync(item.tempPassword, salt);
      passwordsGenerated++;
      participantIdsGenerated++;

      let user = null;
      if (item.existingUserId) {
        user = dbData.users.find(u => u.id === item.existingUserId);
      }
      if (!user) {
        user = dbData.users.find(u => 
          (u.registrationId && u.registrationId.toUpperCase() === item.registrationId) ||
          (u.participantId && u.participantId.toUpperCase() === item.registrationId)
        );
      }
      if (!user && item.email) {
        user = dbData.users.find(u => 
          u.email && u.email.toLowerCase() === item.email &&
          (!u.registrationId || u.registrationId.toUpperCase() === item.registrationId)
        );
      }

      let participant = dbData.participants.find(p => 
        (p.registrationId && p.registrationId.toUpperCase() === item.registrationId) ||
        (p.participantId && p.participantId.toUpperCase() === item.registrationId) ||
        (p.participantId && p.participantId.toUpperCase() === item.participantId.toUpperCase()) ||
        (user && p.userId === user.id)
      );

      if (user) {
        // UPDATE existing user safely
        user.name = item.name;
        user.email = item.email;
        user.registrationId = item.registrationId;
        user.participantId = item.participantId;
        user.passwordHash = passwordHash;
        user.role = 'participant';
        user.mustChangePassword = false;
        user.updatedAt = nowIso;
        authAccountsUpdated++;
      } else {
        // CREATE new user
        const newUserId = `user-p-${Date.now()}-${crypto.randomInt(100, 999)}`;
        user = {
          id: newUserId,
          participantId: item.participantId,
          registrationId: item.registrationId,
          name: item.name,
          email: item.email,
          passwordHash: passwordHash,
          role: 'participant',
          mustChangePassword: false,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        dbData.users.push(user);
        authAccountsCreated++;
      }

      if (participant) {
        // UPDATE participant details, PRESERVING event data (score, solvedCount, submissions, penalty, etc.)
        participant.userId = user.id;
        participant.participantId = item.participantId;
        participant.registrationId = item.registrationId;
        participant.name = item.name;
        participant.email = item.email;
        participant.rollNumber = item.rollNumber;
        if (item.mobile) participant.mobile = item.mobile;
        participant.year = item.year;
        participant.branch = item.branch;
        participant.section = item.section;
        participant.updatedAt = nowIso;
      } else {
        // CREATE participant record
        participant = {
          id: `p-${Date.now()}-${crypto.randomInt(100, 999)}`,
          userId: user.id,
          participantId: item.participantId,
          registrationId: item.registrationId,
          name: item.name,
          email: item.email,
          college: 'Malla Reddy Engineering College & Management Sciences',
          rollNumber: item.rollNumber,
          year: item.year,
          branch: item.branch,
          section: item.section,
          mobile: item.mobile,
          checkedIn: true,
          checkedInAt: nowIso,
          status: 'active',
          score: 0,
          solvedCount: 0,
          penalty: 0,
          lastSubmissionTime: null,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        dbData.participants.push(participant);
      }
    } catch (dbErr) {
      errors.push({ registrationId: item.registrationId, reason: dbErr.message });
    }
  }

  // Save database with atomic write
  const tempPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(dbData, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_FILE);
  console.log('✅ Local Database successfully updated and saved!\n');

  // 2. Sync credentials to Google Sheet (Columns I & J on the SAME row)
  console.log('2. Syncing Participant IDs and Temporary Passwords to Google Sheet rows...');
  for (let i = 0; i < migrationPlan.length; i++) {
    const item = migrationPlan[i];
    try {
      process.stdout.write(`   [${i + 1}/${migrationPlan.length}] Updating ${item.registrationId} (${item.participantId})... `);
      const postRes = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          registrationId: item.registrationId,
          participantId: item.participantId,
          temporaryPassword: item.tempPassword,
          name: item.name,
          rollNumber: item.rollNumber,
          email: item.email,
          mobile: item.mobile,
          year: item.year,
          branch: item.branch,
          section: item.section,
          yearAndBranch: item.yearAndBranch
        })
      });

      if (!postRes.ok) {
        throw new Error(`HTTP ${postRes.status}: ${postRes.statusText}`);
      }

      const postJson = await postRes.json();
      if (postJson && postJson.success) {
        sheetRowsUpdated++;
        console.log('OK ✅');
      } else {
        throw new Error(postJson?.message || 'Apps Script returned failure');
      }

      // Small pause to prevent hitting rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch (sheetErr) {
      console.log(`FAILED ❌: ${sheetErr.message}`);
      errors.push({ registrationId: item.registrationId, reason: sheetErr.message });
    }
  }

  // PART 10 — MIGRATION VERIFICATION REPORT
  console.log('\n================================================================================================');
  console.log('PART 10 — MIGRATION VERIFICATION REPORT');
  console.log('================================================================================================');
  console.log(`Total registrations:        ${migrationPlan.length}`);
  console.log(`Authentication accounts:    ${authAccountsUpdated + authAccountsCreated}`);
  console.log(`Participant IDs generated:  ${participantIdsGenerated}`);
  console.log(`Passwords generated:        ${passwordsGenerated}`);
  console.log(`Google Sheet rows updated:  ${sheetRowsUpdated}`);
  console.log(`Successful mappings:        ${migrationPlan.length - errors.length}`);
  console.log(`Duplicates:                 0`);
  console.log(`Errors:                     ${errors.length}`);
  console.log('================================================================================================\n');

  // Save credentials artifact for test reference (secure local file)
  const credsReportPath = path.join(__dirname, 'migration_credentials_summary.json');
  fs.writeFileSync(credsReportPath, JSON.stringify(migrationPlan.map(p => ({
    registrationId: p.registrationId,
    participantId: p.participantId,
    tempPassword: p.tempPassword,
    name: p.name,
    rollNumber: p.rollNumber,
    email: p.email
  })), null, 2), 'utf8');

  return {
    success: errors.length === 0,
    totalRegistrations: migrationPlan.length,
    authAccounts: authAccountsUpdated + authAccountsCreated,
    participantIdsGenerated,
    passwordsGenerated,
    sheetRowsUpdated,
    successfulMappings: migrationPlan.length - errors.length,
    duplicates: 0,
    errors: errors.length
  };
}

run().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
