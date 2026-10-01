import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'codestorm-data.json');

/**
 * Generates an unpredictable, cryptographically secure temporary password.
 * Requirements:
 * - Minimum 8 characters (default 10)
 * - Includes uppercase letters
 * - Includes lowercase letters
 * - Includes numbers
 * - Includes safe special characters
 * - Never predictable
 */
export function generateSecureTemporaryPassword(length = 8) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  const getRandomChar = (set) => set[crypto.randomInt(0, set.length)];

  // Ensure presence of uppercase, lowercase, and digits
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

  // Fisher-Yates shuffle with crypto.randomInt
  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
  }

  return pwdChars.join('');
}

/**
 * Derives the Participant ID from the Registration sequence:
 * CODESTORM-2026-0001 -> CS26-0001
 */
export function generateParticipantId(regId) {
  if (!regId) return `CS26-${String(crypto.randomInt(1001, 9999)).padStart(4, '0')}`;
  const clean = String(regId).trim().toUpperCase();
  const match = clean.match(/^CODESTORM-2026-(\d+)$/i);
  if (match) {
    return `CS26-${match[1]}`;
  }
  return `CS26-${clean.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
}

/**
 * Derives deterministic password from Registration sequence:
 * CODESTORM-2026-XXXX -> PASSXXXX (e.g., CODESTORM-2026-9216 -> PASS9216)
 */
export function generateDeterministicPassword(regId) {
  if (!regId) return 'PASS0001';
  const clean = String(regId).trim().toUpperCase();
  const match = clean.match(/^CODESTORM-2026-(\d+)$/i);
  if (match) {
    return `PASS${match[1]}`;
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `PASS${digits.slice(-4)}`;
  }
  return `PASS${digits.padStart(4, '0')}`;
}

// Default initial state
function getInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const hash = (pwd) => bcrypt.hashSync(pwd, salt);

  const users = [
    {
      id: 'user-admin-1',
      name: 'ADMIN',
      email: 'admin@codestorm.mrem.ac.in',
      participantId: null,
      passwordHash: hash('admin123'),
      role: 'admin',
      createdAt: '2026-09-20T10:00:00.000Z'
    },
    {
      id: 'user-coord-1',
      name: 'FACULTY COORDINATOR',
      email: 'coordinator@codestorm.mrem.ac.in',
      participantId: null,
      passwordHash: hash('coord123'),
      role: 'coordinator',
      createdAt: '2026-09-20T10:00:00.000Z'
    }
  ];

  const participants = [];

  const rounds = [
    {
      id: 1,
      roundNumber: 1,
      name: 'BUGBUSTER',
      subtitle: 'Code Debugging Championship',
      description: 'Pinpoint and squash hidden syntax, logical, and runtime bugs across C, C++, Java, and Python. Restore proper behavior and beat the test runner.',
      durationMinutes: 30,
      status: 'live', // Default live for instant testing
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      remainingSeconds: 1800,
      isPaused: false
    },
    {
      id: 2,
      roundNumber: 2,
      name: 'TRACE & RACE',
      subtitle: 'Speed Output Prediction & Logic Sprint',
      description: 'Fast-paced mental tracing, pointer arithmetic, bitwise wizardry, and language quirk prediction. Time is of the essence!',
      durationMinutes: 25,
      status: 'upcoming',
      startTime: null,
      endTime: null,
      remainingSeconds: 1500,
      isPaused: false
    },
    {
      id: 3,
      roundNumber: 3,
      name: 'CODE CHALLENGE',
      subtitle: 'Full-Scale Competitive Programming',
      description: 'Design optimal algorithmic solutions to complex computational problems. Pass all strict time, memory, and hidden edge cases.',
      durationMinutes: 45,
      status: 'locked',
      startTime: null,
      endTime: null,
      remainingSeconds: 2700,
      isPaused: false
    }
  ];

  let questions = [];
  try {
    if (fs.existsSync(DB_FILE)) {
      const existing = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (Array.isArray(existing.questions)) questions = existing.questions;
    }
  } catch (err) {
    questions = [];
  }

  const submissions = [];

  const announcements = [
    {
      id: 'ann-1',
      message: '⚡ Welcome to CODESTORM 2026! Ensure your devices are plugged in and stable network connected.',
      priority: 'normal',
      createdBy: 'Dr. Jagat Jeeta Mohanty',
      createdAt: '2026-09-23T08:30:00.000Z'
    },
    {
      id: 'ann-2',
      message: '🚨 Round 1: BUGBUSTER is officially LIVE! You have 30 minutes to eliminate all bugs.',
      priority: 'urgent',
      createdBy: 'Admin Control Center',
      createdAt: '2026-09-23T09:00:00.000Z'
    }
  ];

  const antiCheatLogs = [];

  const eventSettings = {
    eventStatus: 'round1_live',
    currentRoundId: 1,
    leaderboardVisible: false, // HIDDEN by default as per requirement
    leaderboardFrozen: false,
    resultsPublished: false,
    bannerAnnouncement: 'Round 1: BUGBUSTER is in progress! Keep your focus.'
  };

  return {
    users,
    participants,
    rounds,
    questions,
    submissions,
    progress: {},
    announcements,
    antiCheatLogs,
    eventSettings
  };
}

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      console.log('📦 Initializing fresh CodeStorm database with rich seeded data...');
      this.data = getInitialData();
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log('✅ Loaded existing CodeStorm database successfully.');
      } catch (err) {
        console.error('⚠️ Error reading database, recreating default state:', err.message);
        this.data = getInitialData();
        this.save();
      }
    }
    this.normalizeRegistrations();
  }

  normalizeRegistrations() {
    if (!this.data || !Array.isArray(this.data.users)) return;
    let changed = false;
    const salt = bcrypt.genSaltSync(10);

    // Normalize all participants to use Participant ID (CS26-XXXX) and deterministic Password (PASSXXXX)
    for (const u of this.data.users) {
      if (u.role === 'participant') {
        if (u.registrationId) {
          u.registrationId = u.registrationId.trim().toUpperCase();
          const match = u.registrationId.match(/^CODESTORM-2026-(\d+)$/i);
          const seqNum = match ? match[1] : u.registrationId.replace(/\D/g, '').slice(-4).padStart(4, '0');
          const expectedPartId = `CS26-${seqNum}`;
          const expectedPassword = `PASS${seqNum}`;

          const isHashValid = u.passwordHash && bcrypt.compareSync(expectedPassword, u.passwordHash);
          if (u.participantId !== expectedPartId || !isHashValid) {
            u.participantId = expectedPartId;
            u.passwordHash = bcrypt.hashSync(expectedPassword, salt);
            u.mustChangePassword = false;
            changed = true;
          }
        }
      }
    }

    for (const p of this.data.participants) {
      if (p.registrationId) {
        p.registrationId = p.registrationId.trim().toUpperCase();
        const match = p.registrationId.match(/^CODESTORM-2026-(\d+)$/i);
        const seqNum = match ? match[1] : p.registrationId.replace(/\D/g, '').slice(-4).padStart(4, '0');
        const expectedPartId = `CS26-${seqNum}`;
        if (p.participantId !== expectedPartId) {
          p.participantId = expectedPartId;
          changed = true;
        }
      }
    }

    if (changed) {
      this.save();
    }
  }

  parseYearAndBranch(rawYB) {
    if (!rawYB || typeof rawYB !== 'string') {
      return { year: '', branch: '', section: '' };
    }
    const clean = rawYB.trim();
    let section = '';
    const sectionMatch = clean.match(/\(([^)]+)\)$/);
    if (sectionMatch) section = sectionMatch[1].trim();

    const withoutSection = clean.replace(/\s*\([^)]+\)$/, '').trim();
    const parts = withoutSection.split(' - ');
    const year = (parts[0] || '').trim();
    const branch = (parts.slice(1).join(' - ') || '').trim();

    return { year, branch, section };
  }

  async syncParticipantFromGoogleSheets(targetRegistrationId) {
    if (!targetRegistrationId) return null;
    const cleanRegId = targetRegistrationId.trim().toUpperCase();

    const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL ||
                      process.env.GOOGLE_SCRIPT_URL ||
                      'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';

    if (!scriptUrl) return null;

    try {
      let reg = null;

      // 1. Try GET lookup
      try {
        const res = await fetch(`${scriptUrl}?action=lookup&registrationId=${encodeURIComponent(cleanRegId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.registrations) && json.registrations.length > 0) {
            reg = json.registrations.find(r => (r.registrationId || '').toUpperCase() === cleanRegId) || json.registrations[0];
          }
        }
      } catch (getErr) {
        console.warn('[syncParticipantFromGoogleSheets GET lookup note]', getErr.message);
      }

      // 2. Try POST lookup if GET didn't succeed
      if (!reg) {
        try {
          const postRes = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'lookup', registrationId: cleanRegId })
          });
          if (postRes.ok) {
            const postJson = await postRes.json();
            if (postJson && postJson.success && Array.isArray(postJson.registrations) && postJson.registrations.length > 0) {
              reg = postJson.registrations.find(r => (r.registrationId || '').toUpperCase() === cleanRegId) || postJson.registrations[0];
            }
          }
        } catch (postErr) {
          console.warn('[syncParticipantFromGoogleSheets POST lookup note]', postErr.message);
        }
      }

      if (reg) {
        const rawYB = reg.yearAndBranch || '';
        const { year, branch, section } = this.parseYearAndBranch(rawYB);

        const created = this.createParticipantFromRegistration({
          name: reg.name,
          rollNumber: reg.rollNumber,
          email: reg.email,
          mobile: reg.mobile,
          yearAndBranch: rawYB,
          year: reg.year || year,
          branch: reg.branch || branch,
          section: reg.section || section,
          registrationId: cleanRegId,
          participantId: reg.participantId || undefined,
          temporaryPassword: reg.temporaryPassword || reg.password || undefined
        });
        return created;
      }
    } catch (err) {
      console.warn('[syncParticipantFromGoogleSheets]', err.message);
    }
    return null;
  }

  async syncFromGoogleSheets() {
    const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL ||
                      process.env.GOOGLE_SCRIPT_URL ||
                      'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';

    if (!scriptUrl) return { success: false, message: 'Google Script URL not configured' };

    try {
      console.log('🔄 Checking Google Apps Script for all registrations...');
      let json = null;

      // 1. Try GET ?action=getRegistrations
      try {
        const res = await fetch(`${scriptUrl}?action=getRegistrations`);
        if (res.ok) {
          json = await res.json();
        }
      } catch (getErr) {
        console.warn('GET ?action=getRegistrations note:', getErr.message);
      }

      // 2. If not array, try POST action=getRegistrations
      if (!json || !json.registrations || !Array.isArray(json.registrations)) {
        try {
          const postRes = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getRegistrations' })
          });
          if (postRes.ok) {
            json = await postRes.json();
          }
        } catch (postErr) {
          console.warn('POST action=getRegistrations note:', postErr.message);
        }
      }

      if (json && json.success && Array.isArray(json.registrations) && json.registrations.length > 0) {
        console.log(`📥 Received ${json.registrations.length} registrations from Google Sheets. Synchronizing...`);
        const syncResult = this.syncAllRegistrations(json.registrations, { reconcile: true });
        return {
          success: true,
          count: json.registrations.length,
          ...syncResult
        };
      } else {
        return {
          success: false,
          message: 'Google Apps Script has not yet returned registrations list. The Apps Script deployment may need to be updated with New Version.',
          raw: json
        };
      }
    } catch (err) {
      console.warn('syncFromGoogleSheets error:', err.message);
      return { success: false, error: err.message };
    }
  }

  syncAllRegistrations(registrations, options = { reconcile: true }) {
    if (!Array.isArray(registrations)) {
      return { total: 0, synced: 0, created: 0, updated: 0, pruned: 0, errors: [] };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let prunedCount = 0;
    const errors = [];
    const activeRegIds = new Set();
    const activePartIds = new Set();

    for (const reg of registrations) {
      try {
        const regId = String(reg.registrationId || reg['Registration ID'] || reg.id || '').trim().toUpperCase();
        const name = String(reg.name || reg['Name'] || reg['Full Name'] || '').trim();
        if (!regId) {
          errors.push({ record: reg, reason: 'Missing Registration ID' });
          continue;
        }

        activeRegIds.add(regId);
        const match = regId.match(/^CODESTORM-2026-(\d+)$/i);
        const seqNum = match ? match[1] : regId.replace(/\D/g, '').slice(-4).padStart(4, '0');
        const expectedPartId = `CS26-${seqNum}`;
        activePartIds.add(expectedPartId);
        if (reg.participantId) {
          activePartIds.add(String(reg.participantId).trim().toUpperCase());
        }

        const rollNumber = String(reg.rollNumber || reg['Roll Number'] || reg['Roll No'] || '').trim().toUpperCase();
        const email = String(reg.email || reg['Email'] || reg['Email Address'] || '').trim().toLowerCase();
        const mobile = String(reg.mobile || reg['Mobile Number'] || reg['Mobile'] || reg['Phone'] || '').trim();
        const rawYB = String(reg.yearAndBranch || reg['Year & Branch'] || reg['Year and Branch'] || '').trim();

        let year = String(reg.year || reg['Year'] || '').trim();
        let branch = String(reg.branch || reg['Branch'] || '').trim();
        let section = String(reg.section || reg['Section'] || '').trim();

        if ((!year || !branch) && rawYB) {
          const parsed = this.parseYearAndBranch(rawYB);
          if (!year) year = parsed.year;
          if (!branch) branch = parsed.branch;
          if (!section && parsed.section) section = parsed.section;
        }

        let normalizedPartId = String(reg.participantId || '').trim();
        if (!normalizedPartId || normalizedPartId.toUpperCase().startsWith('CODESTORM-2026-')) {
          normalizedPartId = expectedPartId;
        }

        const res = this.createParticipantFromRegistration({
          registrationId: regId,
          participantId: normalizedPartId,
          temporaryPassword: reg.temporaryPassword || reg.password || undefined,
          name: name || `Participant ${regId}`,
          rollNumber: rollNumber || 'N/A',
          email: email || `${regId.toLowerCase()}@codestorm.live`,
          mobile: mobile || '',
          yearAndBranch: rawYB || `${year} - ${branch}`,
          year: year || '3rd Year',
          branch: branch || 'CSE – Data Science',
          section: section || 'A',
          college: reg.college || 'Malla Reddy Engineering College and Management Sciences'
        });

        if (res.alreadyExists) {
          updatedCount++;
        } else {
          createdCount++;
        }
      } catch (err) {
        errors.push({ record: reg, reason: err.message });
      }
    }

    // RECONCILIATION: Safely prune participants no longer present in Google Sheets
    // NEVER prune ADMIN or FACULTY COORDINATOR!
    if (options.reconcile && activeRegIds.size > 0) {
      const initialPartLen = this.data.participants.length;
      this.data.participants = this.data.participants.filter(p => {
        const pRegId = (p.registrationId || '').toUpperCase();
        const pPartId = (p.participantId || '').toUpperCase();
        return activeRegIds.has(pRegId) || activePartIds.has(pPartId);
      });
      prunedCount = initialPartLen - this.data.participants.length;

      this.data.users = this.data.users.filter(u => {
        if (u.role !== 'participant') return true; // KEEP ADMIN & COORDINATOR
        const uRegId = (u.registrationId || '').toUpperCase();
        const uPartId = (u.participantId || '').toUpperCase();
        return activeRegIds.has(uRegId) || activePartIds.has(uPartId);
      });
    }

    this.save();
    return {
      total: registrations.length,
      synced: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
      pruned: prunedCount,
      errors
    };
  }

  getMigrationDiagnostic() {
    const participants = this.data.participants || [];
    const report = [];

    // Sort by registrationId
    const sorted = [...participants].sort((a, b) => {
      const idA = a.registrationId || a.participantId || '';
      const idB = b.registrationId || b.participantId || '';
      return idA.localeCompare(idB);
    });

    for (const p of sorted) {
      const regId = (p.registrationId || p.participantId || '').trim().toUpperCase();
      const user = this.findUserByRegistrationId(regId);

      const hasAuth = !!user && user.role === 'participant';
      const match = regId.match(/^CODESTORM-2026-(\d+)$/i);
      const seqNum = match ? match[1] : regId.replace(/\D/g, '').slice(-4).padStart(4, '0');
      const expectedPassword = `PASS${seqNum}`;
      const authValid = hasAuth && (bcrypt.compareSync(expectedPassword, user.passwordHash) || bcrypt.compareSync(regId, user.passwordHash));
      const profileValid = !!p.name && (p.name.trim() !== '') && !!p.rollNumber;

      const authStatus = authValid ? 'AUTH OK' : (hasAuth ? 'AUTH PENDING HASH' : 'AUTH MISSING');
      const profileStatus = profileValid ? 'PROFILE OK' : 'PROFILE INCOMPLETE';
      const status = (authValid && profileValid) ? 'OK' : 'NEEDS ATTENTION';

      report.push({
        registrationId: regId,
        name: p.name,
        rollNumber: p.rollNumber,
        email: p.email,
        authStatus,
        profileStatus,
        status
      });
    }

    return report;
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Failed saving database:', err);
    }
  }

  // --- Users ---
  findUserByEmailOrParticipantId(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    const cleanUpper = identifier.trim().toUpperCase();
    return this.data.users.find(u => {
      const email = (u.email || '').toLowerCase();
      if (email === clean) return true;
      if (u.registrationId && u.registrationId.toUpperCase() === cleanUpper) return true;
      if (u.participantId && u.participantId.toLowerCase() === clean) return true;
      if (u.participantId && u.participantId.toUpperCase() === cleanUpper) return true;
      if (u.role === 'admin' && (clean === 'admin' || clean === 'admin@codestorm.live' || clean === 'admin@codestorm.mrem.ac.in')) return true;
      if (u.role === 'coordinator' && (clean === 'coordinator' || clean === 'coordinator@codestorm.live' || clean === 'coordinator@codestorm.mrem.ac.in')) return true;
      return false;
    });
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  findUserByParticipantId(participantId) {
    if (!participantId) return null;
    const clean = participantId.trim().toLowerCase();
    return this.data.users.find(u => u.participantId && u.participantId.toLowerCase() === clean);
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  updateUserPassword(userId, newPasswordHash) {
    const user = this.findUserById(userId);
    if (!user) return false;
    user.passwordHash = newPasswordHash;
    user.mustChangePassword = false;
    this.save();
    return true;
  }

  findUserByRegistrationId(registrationId) {
    if (!registrationId) return null;
    const clean = registrationId.trim().toUpperCase();
    return this.data.users.find(u => {
      if (u.registrationId && u.registrationId.toUpperCase() === clean) return true;
      if (u.participantId && u.participantId.toUpperCase() === clean) return true;
      return false;
    });
  }

  generateUniqueRegistrationId() {
    let seq = 1;
    while (this.findUserByRegistrationId(`CODESTORM-2026-${String(seq).padStart(4, '0')}`)) {
      seq++;
    }
    return `CODESTORM-2026-${String(seq).padStart(4, '0')}`;
  }

  createParticipantFromRegistration(regData) {
    const email = String(regData.email || '').trim().toLowerCase();
    const rollNumber = String(regData.rollNumber || '').trim().toUpperCase();
    let registrationId = String(regData.registrationId || '').trim();
    if (!registrationId) {
      registrationId = this.generateUniqueRegistrationId();
    }
    const cleanRegId = registrationId.toUpperCase();

    // Generate Participant ID based on registration sequence (CODESTORM-2026-XXXX -> CS26-XXXX)
    let participantId = String(regData.participantId || '').trim();
    if (!participantId || participantId.toUpperCase().startsWith('CODESTORM-2026-')) {
      participantId = generateParticipantId(cleanRegId);
    }

    // Generate deterministic password: PASS + 4-digit registration number (e.g. PASS9216)
    const temporaryPassword = String(
      regData.temporaryPassword ||
      regData.password ||
      generateDeterministicPassword(cleanRegId || participantId)
    ).trim();

    // 1. Prevent duplicate account creation if submitted twice or retried
    let existingUser = null;
    if (cleanRegId) {
      existingUser = this.findUserByRegistrationId(cleanRegId);
    }
    if (!existingUser && email) {
      existingUser = this.findUserByEmailOrParticipantId(email);
    }
    if (!existingUser && rollNumber) {
      const existingParticipant = this.data.participants.find(
        p => p.rollNumber && p.rollNumber.toUpperCase() === rollNumber
      );
      if (existingParticipant) {
        existingUser = this.findUserById(existingParticipant.userId) || this.findUserByParticipantId(existingParticipant.participantId);
      }
    }

    let year = String(regData.year || '').trim();
    let branch = String(regData.branch || '').trim();
    let section = String(regData.section || '').trim();
    if ((!year || !branch) && regData.yearAndBranch) {
      const parsed = this.parseYearAndBranch(String(regData.yearAndBranch));
      if (!year) year = parsed.year;
      if (!branch) branch = parsed.branch;
      if (!section && parsed.section) section = parsed.section;
    }

    const salt = bcrypt.genSaltSync(10);

    if (existingUser) {
      // The registration submission / Google Sheet record is authoritative
      if (regData.name && String(regData.name).trim()) {
        existingUser.name = String(regData.name).trim();
      }
      if (email) {
        existingUser.email = email;
      }
      existingUser.registrationId = cleanRegId;
      if (participantId) {
        existingUser.participantId = participantId;
      }
      // ONLY update passwordHash if explicit temporaryPassword/password was passed in regData
      if (regData.temporaryPassword || regData.password) {
        existingUser.passwordHash = bcrypt.hashSync(String(regData.temporaryPassword || regData.password).trim(), salt);
      }
      existingUser.mustChangePassword = false;

      // Update associated participant record as well
      let existingParticipant = this.data.participants.find(
        p => (p.registrationId && p.registrationId.toUpperCase() === cleanRegId) ||
             (p.userId && p.userId === existingUser.id) ||
             (p.participantId && p.participantId.toUpperCase() === cleanRegId) ||
             (p.participantId && p.participantId.toUpperCase() === participantId.toUpperCase())
      );

      const nowIso = new Date().toISOString();
      if (existingParticipant) {
        existingParticipant.name = existingUser.name;
        existingParticipant.email = existingUser.email;
        if (rollNumber) existingParticipant.rollNumber = rollNumber;
        if (regData.mobile) existingParticipant.mobile = String(regData.mobile).trim();
        if (year) existingParticipant.year = year;
        if (branch) existingParticipant.branch = branch;
        if (section) existingParticipant.section = section;
        existingParticipant.registrationId = cleanRegId;
        existingParticipant.participantId = participantId;
      } else {
        existingParticipant = {
          id: `p-${Date.now()}-${crypto.randomInt(100, 999)}`,
          userId: existingUser.id,
          participantId: participantId,
          registrationId: cleanRegId,
          name: existingUser.name,
          email: existingUser.email,
          college: regData.college || 'Malla Reddy Engineering College and Management Sciences',
          rollNumber: rollNumber || 'N/A',
          year: year || '3rd Year',
          branch: branch || 'CSE – Data Science',
          section: section || 'A',
          mobile: regData.mobile ? String(regData.mobile).trim() : '',
          checkedIn: false,
          checkedInAt: null,
          status: 'active',
          score: 0,
          solvedCount: 0,
          penalty: 0,
          lastSubmissionTime: null,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        this.data.participants.push(existingParticipant);
      }

      this.save();

      return {
        alreadyExists: true,
        registrationId: cleanRegId,
        participantId: participantId,
        temporaryPassword: temporaryPassword,
        name: existingUser.name,
        email: existingUser.email,
        rollNumber: (existingParticipant && existingParticipant.rollNumber) || rollNumber,
        message: 'Registration synchronized successfully'
      };
    }

    // 2. Hash temporary password securely (Store passwordHash, never plaintext password)
    const passwordHash = bcrypt.hashSync(temporaryPassword, salt);

    const nowIso = new Date().toISOString();
    const userId = `user-p-${Date.now()}-${crypto.randomInt(100, 999)}`;

    // 3. Save User Account using Registration ID as permanent unique link and passwordHash
    const newUser = {
      id: userId,
      participantId: participantId,
      registrationId: cleanRegId,
      name: (regData.name || '').trim(),
      email,
      passwordHash,
      role: 'participant',
      mustChangePassword: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 4. Save Participant Record associated with registration
    const newParticipant = {
      id: `p-${Date.now()}-${crypto.randomInt(100, 999)}`,
      userId,
      participantId: participantId,
      registrationId: cleanRegId,
      name: (regData.name || '').trim(),
      email,
      college: regData.college || 'Malla Reddy Engineering College and Management Sciences',
      rollNumber,
      year: year || '3rd Year',
      branch: branch || 'CSE – Data Science',
      section: section || 'A',
      mobile: regData.mobile ? String(regData.mobile).trim() : '',
      checkedIn: false,
      checkedInAt: null,
      status: 'active',
      score: 0,
      solvedCount: 0,
      penalty: 0,
      lastSubmissionTime: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.data.users.push(newUser);
    this.data.participants.push(newParticipant);
    this.save();

    return {
      alreadyExists: false,
      registrationId: cleanRegId,
      participantId: participantId,
      temporaryPassword: temporaryPassword,
      name: newParticipant.name,
      email: newParticipant.email,
      rollNumber: newParticipant.rollNumber,
      message: 'Registration successful'
    };
  }


  // --- Participants ---
  getParticipants() {
    return this.data.participants;
  }

  findParticipantById(idOrParticipantId) {
    if (!idOrParticipantId) return null;
    const clean = idOrParticipantId.trim().toLowerCase();
    const cleanUpper = idOrParticipantId.trim().toUpperCase();
    return this.data.participants.find(p => 
      (p.id && p.id.toLowerCase() === clean) || 
      (p.registrationId && p.registrationId.toUpperCase() === cleanUpper) ||
      (p.participantId && p.participantId.toUpperCase() === cleanUpper) ||
      (p.userId && p.userId.toLowerCase() === clean)
    );
  }

  updateParticipant(idOrParticipantId, updates) {
    const p = this.findParticipantById(idOrParticipantId);
    if (!p) return null;
    Object.assign(p, updates);
    this.save();
    return p;
  }

  deleteParticipant(idOrParticipantId) {
    const p = this.findParticipantById(idOrParticipantId);
    if (!p) return null;

    // Remove from participants
    this.data.participants = this.data.participants.filter(item => item.id !== p.id && item.participantId !== p.participantId);

    // Remove associated user (only if participant role - NEVER remove admin/coordinator)
    if (p.userId || p.participantId || p.registrationId) {
      this.data.users = this.data.users.filter(u => {
        if (u.role === 'admin' || u.role === 'coordinator') return true;
        if (p.userId && u.id === p.userId) return false;
        if (p.participantId && u.participantId === p.participantId) return false;
        if (p.registrationId && u.registrationId === p.registrationId) return false;
        return true;
      });
    }

    // Remove associated submissions
    this.data.submissions = this.data.submissions.filter(s => s.participantId !== p.participantId && s.participantId !== p.id);

    // Remove progress
    Object.keys(this.data.progress).forEach(key => {
      if (key.startsWith(`${p.participantId}_`) || key.startsWith(`${p.id}_`)) {
        delete this.data.progress[key];
      }
    });

    this.save();
    return p;
  }

  resetParticipantCheckIn(idOrParticipantId) {
    const p = this.findParticipantById(idOrParticipantId);
    if (!p) return null;
    p.checkedIn = false;
    p.checkedInAt = null;
    this.save();
    return p;
  }

  // --- Rounds ---
  getRounds() {
    return this.data.rounds;
  }

  getRoundById(roundId) {
    return this.data.rounds.find(r => r.id === Number(roundId));
  }

  updateRound(roundId, updates) {
    const r = this.getRoundById(roundId);
    if (!r) return null;
    Object.assign(r, updates);
    this.save();
    return r;
  }

  // --- Questions ---
  getQuestionsByRound(roundId) {
    return this.data.questions.filter(q => q.roundId === Number(roundId));
  }

  getQuestionById(id) {
    return this.data.questions.find(q => q.id === id);
  }

  createQuestion(questionData) {
    const newQ = { id: `q-${Date.now()}`, ...questionData };
    this.data.questions.push(newQ);
    this.save();
    return newQ;
  }

  updateQuestion(id, updates) {
    const q = this.getQuestionById(id);
    if (!q) return null;
    Object.assign(q, updates);
    this.save();
    return q;
  }

  deleteQuestion(id) {
    const idx = this.data.questions.findIndex(q => q.id === id);
    if (idx !== -1) {
      const removed = this.data.questions.splice(idx, 1)[0];
      this.save();
      return removed;
    }
    return null;
  }

  // --- Submissions ---
  getSubmissions(filter = {}) {
    return this.data.submissions.filter(s => {
      if (filter.participantId && s.participantId !== filter.participantId) return false;
      if (filter.roundId && s.roundId !== Number(filter.roundId)) return false;
      if (filter.questionId && s.questionId !== filter.questionId) return false;
      return true;
    });
  }

  createSubmission(submissionData) {
    const newSub = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      submittedAt: new Date().toISOString(),
      ...submissionData
    };
    this.data.submissions.unshift(newSub);

    // Update participant score and rank calculation
    this.recalculateParticipantStats(newSub.participantId);
    this.save();
    return newSub;
  }

  recalculateParticipantStats(participantId) {
    const participant = this.findParticipantById(participantId);
    if (!participant) return;

    const userSubs = this.data.submissions.filter(s => s.participantId === participant.participantId);
    
    // Group by questionId to take best score
    const bestByQuestion = {};
    let totalScore = 0;
    let solvedCount = 0;
    let penalty = 0;

    userSubs.forEach(s => {
      if (!bestByQuestion[s.questionId] || s.score > bestByQuestion[s.questionId].score) {
        bestByQuestion[s.questionId] = s;
      }
    });

    Object.values(bestByQuestion).forEach(s => {
      // CODESTORM 2026: Strict NO Negative Marking
      totalScore += Math.max(0, s.score || 0);
      if (s.status === 'Accepted' || (s.score && s.score > 0)) {
        solvedCount++;
      }
    });

    participant.score = Math.max(0, totalScore);
    participant.solvedCount = solvedCount;
    participant.penalty = 0;
    participant.lastSubmissionTime = new Date().toISOString();
  }

  // --- Auto-Save Progress ---
  saveProgress(participantId, roundId, questionId, data) {
    const key = `${participantId}_${roundId}_${questionId}`;
    this.data.progress[key] = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.progress[key];
  }

  getProgress(participantId, roundId, questionId) {
    const key = `${participantId}_${roundId}_${questionId}`;
    return this.data.progress[key] || null;
  }

  // --- Announcements ---
  getAnnouncements() {
    return this.data.announcements;
  }

  createAnnouncement(message, priority = 'normal', createdBy = 'Admin') {
    const ann = {
      id: `ann-${Date.now()}`,
      message,
      priority,
      createdBy,
      createdAt: new Date().toISOString()
    };
    this.data.announcements.unshift(ann);
    this.save();
    return ann;
  }

  // --- Anti Cheat Logs ---
  getAntiCheatLogs() {
    return this.data.antiCheatLogs;
  }

  logAntiCheat(participantId, participantName, eventType, details, severity = 'low') {
    const log = {
      id: `ac-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      participantId,
      participantName: participantName || participantId,
      eventType,
      details,
      severity,
      timestamp: new Date().toISOString()
    };
    this.data.antiCheatLogs.unshift(log);
    this.save();
    return log;
  }

  // --- Event Settings ---
  getEventSettings() {
    return this.data.eventSettings;
  }

  updateEventSettings(updates) {
    Object.assign(this.data.eventSettings, updates);
    this.save();
    return this.data.eventSettings;
  }

  // --- Certificates ---
  getCertificate(participantId, previewType = null) {
    if (!this.data.certificates) {
      this.data.certificates = {};
    }
    const participant = this.findParticipantById(participantId);
    if (!participant) return null;

    const eventSettings = this.getEventSettings() || {};
    const isFinalized = Boolean(eventSettings.resultsPublished);
    const eventDate = eventSettings.eventDate || 'October 2, 2026';

    // Compute official rankings across all participants strictly by competition scores
    // NO negative marking (Math.max(0, p.score)).
    // Tie breaks: solvedCount descending, then penalty ascending.
    const participants = [...this.getParticipants()].sort((a, b) => {
      const scoreA = Math.max(0, a.score || 0);
      const scoreB = Math.max(0, b.score || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      const solvedA = a.solvedCount || 0;
      const solvedB = b.solvedCount || 0;
      if (solvedB !== solvedA) return solvedB - solvedA;
      const penA = a.penalty || 0;
      const penB = b.penalty || 0;
      return penA - penB;
    });

    const rankIndex = participants.findIndex(p => p.id === participant.id || p.participantId === participant.participantId);
    const officialRank = rankIndex >= 0 ? rankIndex + 1 : participants.length;
    const participantScore = Math.max(0, participant.score || 0);

    // Tie Handling & Safety (Requirement 16 & 17)
    // If top candidates have identical score, solvedCount, and penalty, flag for Faculty Review
    let tieFlag = false;
    let tieMessage = null;
    if (rankIndex === 0 && participants.length > 1) {
      const p1 = participants[0];
      const p2 = participants[1];
      if (p1.score === p2.score && (p1.solvedCount || 0) === (p2.solvedCount || 0) && (p1.penalty || 0) === (p2.penalty || 0) && p1.score > 0) {
        tieFlag = true;
        tieMessage = 'Tie detected for 1st Position. Flagged for Admin/Faculty review.';
      }
    } else if (rankIndex === 1 && participants.length > 2) {
      const p2 = participants[1];
      const p3 = participants[2];
      if (p2.score === p3.score && (p2.solvedCount || 0) === (p3.solvedCount || 0) && (p2.penalty || 0) === (p3.penalty || 0) && p2.score > 0) {
        tieFlag = true;
        tieMessage = 'Tie detected for 2nd Position. Flagged for Admin/Faculty review.';
      }
    }

    // Automatic Certificate Assignment (Requirements 13, 14, 17)
    // Never generate a Winner certificate from placeholder data or 0 points
    let certType = 'participation';
    let status = isFinalized ? 'OFFICIALLY ISSUED' : 'PENDING RESULT';

    if (isFinalized) {
      if (officialRank === 1 && participantScore > 0 && !tieFlag) {
        certType = 'winner';
      } else if (officialRank === 2 && participantScore > 0 && !tieFlag) {
        certType = 'runner_up';
      } else {
        certType = 'participation';
      }
    } else {
      certType = 'participation';
    }

    // Allow previewType ONLY when explicitly requested for QA/Visual Verification (Requirement 31)
    if (previewType && ['winner', 'runner_up', 'participation'].includes(previewType.toLowerCase())) {
      certType = previewType.toLowerCase();
    }

    // Title and Achievement Text (Requirements 10 & 18)
    let title = 'CERTIFICATE OF PARTICIPATION';
    let badgeText = 'CODESTORM 2026 PARTICIPANT';
    let achievement = 'has successfully participated in CODESTORM 2026, a 3-round coding event organized by Malla Reddy Engineering College and Management Sciences.';

    if (certType === 'winner') {
      title = 'CERTIFICATE OF MERIT';
      badgeText = 'WINNER / 1ST POSITION';
      achievement = 'has secured the Winner / 1st Position in CODESTORM 2026, a 3-round coding event organized by Malla Reddy Engineering College and Management Sciences.';
    } else if (certType === 'runner_up') {
      title = 'CERTIFICATE OF MERIT';
      badgeText = 'RUNNER-UP / 2ND POSITION';
      achievement = 'has secured the Runner-Up / 2nd Position in CODESTORM 2026, a 3-round coding event organized by Malla Reddy Engineering College and Management Sciences.';
    }

    // Unique Persistent Certificate Number (Requirement 27)
    // Stored permanently in this.data.certificates[participant.participantId]
    const certKey = participant.participantId;
    const numMatch = String(participant.participantId).match(/(\d{4})$/);
    const seqStr = numMatch ? numMatch[1] : String(participant.participantId.replace(/\D/g, '') || '1042').slice(-4).padStart(4, '0');
    const typeCode = certType === 'winner' ? 'WIN' : (certType === 'runner_up' ? 'RUN' : 'PRT');
    const expectedCertNum = `CS26-MREM-${typeCode}-${seqStr}`;

    if (!this.data.certificates[certKey]) {
      this.data.certificates[certKey] = {
        certificateNumber: expectedCertNum,
        certificateType: certType,
        issuedDate: eventDate,
        createdAt: new Date().toISOString()
      };
      this.save();
    }

    const record = this.data.certificates[certKey];
    // Keep certificate number updated with finalized type and standard 4-digit format
    if (record.certificateType !== certType || !record.certificateNumber.match(/^CS26-MREM-(WIN|RUN|PRT)-\d{4}$/)) {
      record.certificateType = certType;
      record.certificateNumber = expectedCertNum;
      this.save();
    }

    const displayRank = isFinalized
      ? (certType === 'winner' ? 'Rank #1' : (certType === 'runner_up' ? 'Rank #2' : (participantScore > 0 ? `Rank #${officialRank}` : 'Participant')))
      : (participantScore > 0 ? `Rank #${officialRank}` : 'Pending');

    return {
      certificateNumber: record.certificateNumber,
      certificateType: certType,
      status,
      isFinalized,
      title,
      badgeText,
      achievement,
      participantName: participant.name,
      participantId: participant.participantId,
      registrationId: participant.registrationId || participant.participantId,
      college: 'Malla Reddy Engineering College and Management Sciences',
      department: 'Department of CSE – Data Science',
      branch: participant.branch || 'CSE – Data Science',
      year: participant.year || '3rd Year',
      rank: displayRank,
      score: participantScore,
      tieFlag,
      tieMessage,
      eventName: 'CODESTORM 2026',
      symposiumName: 'COMPETITIVE PROGRAMMING SYMPOSIUM',
      eventDate: eventDate,
      issuedDate: record.issuedDate || eventDate
    };
  }

  // --- Admin/Faculty Certificates Summary Registry (Requirement 29) ---
  getAllCertificates() {
    const participants = [...this.getParticipants()].sort((a, b) => {
      const scoreA = Math.max(0, a.score || 0);
      const scoreB = Math.max(0, b.score || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      const solvedA = a.solvedCount || 0;
      const solvedB = b.solvedCount || 0;
      if (solvedB !== solvedA) return solvedB - solvedA;
      const penA = a.penalty || 0;
      const penB = b.penalty || 0;
      return penA - penB;
    });

    return participants.map((p, idx) => {
      const cert = this.getCertificate(p.participantId);
      return {
        id: p.id,
        participantName: p.name,
        participantId: p.participantId,
        registrationId: p.registrationId || p.participantId,
        branch: p.branch,
        year: p.year,
        finalScore: p.score || 0,
        rank: idx + 1,
        certificateType: cert ? cert.certificateType : 'participation',
        certificateNumber: cert ? cert.certificateNumber : `CS26-MREM-PRT-${(String(p.participantId).match(/(\d{4})$/) || ['','1042'])[1]}`,
        certificateStatus: cert ? cert.status : 'PENDING RESULT',
        tieFlag: cert ? cert.tieFlag : false,
        tieMessage: cert ? cert.tieMessage : null
      };
    });
  }

  // --- Reset Entire Database to Seed ---
  resetAll() {
    this.data = getInitialData();
    this.save();
    return this.data;
  }
}

export const db = new Database();
export default db;
