import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('================================================================================================');
  console.log('CODESTORM 2026 — REGISTRATION SYNCHRONIZATION & MIGRATION TOOL');
  console.log('================================================================================================\n');

  // Step 1: Attempt auto-sync directly from live Google Apps Script endpoint
  console.log('1. Attempting automatic sync from Google Apps Script Web App...');
  const sheetsResult = await db.syncFromGoogleSheets();

  if (sheetsResult.success) {
    console.log(`✅ Successfully synced ${sheetsResult.synced} registrations directly from Google Sheets!`);
  } else {
    console.log(`ℹ️ Google Apps Script Web App response: ${sheetsResult.message || sheetsResult.error}`);
    console.log('   (If getRegistrations is not yet deployed as New Version in Apps Script, local files will be checked)\n');
  }

  // Step 2: Check for local data dumps (registrations.json, registrations.tsv, registrations.csv)
  const candidateFiles = [
    path.join(__dirname, 'registrations.json'),
    path.join(__dirname, 'registrations.tsv'),
    path.join(__dirname, 'registrations.csv'),
    path.join(__dirname, '..', '..', 'codestorm', 'registrations.csv'),
    path.join(__dirname, '..', '..', 'codestorm', 'registrations.json')
  ];

  let localSynced = false;
  for (const filePath of candidateFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`2. Found local data file: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');

      if (filePath.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          const list = Array.isArray(parsed) ? parsed : (parsed.registrations || []);
          if (list.length > 0) {
            const res = db.syncAllRegistrations(list);
            console.log(`✅ Synced ${res.synced} registrations from ${path.basename(filePath)} (${res.created} created, ${res.updated} updated)`);
            localSynced = true;
          }
        } catch (e) {
          console.error(`Error parsing ${filePath}:`, e.message);
        }
      } else {
        // TSV / CSV parsing
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let startIndex = 0;
        if (lines.length > 0) {
          const lower = lines[0].toLowerCase();
          if (lower.includes('registration') || lower.includes('roll') || lower.includes('timestamp') || lower.includes('name')) {
            startIndex = 1;
          }
        }

        const registrations = [];
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          const sep = line.includes('\t') ? '\t' : ',';
          const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length >= 2) {
            let regIdIndex = parts.findIndex(p => p.toUpperCase().startsWith('CODESTORM-2026-'));
            if (regIdIndex === -1 && parts.length >= 8) regIdIndex = 7;

            if (regIdIndex !== -1 && parts[regIdIndex]) {
              registrations.push({
                registrationId: parts[regIdIndex],
                name: parts[1] || '',
                rollNumber: parts[2] || '',
                email: parts[3] || '',
                mobile: parts[4] || '',
                yearAndBranch: parts[5] || ''
              });
            }
          }
        }

        if (registrations.length > 0) {
          const res = db.syncAllRegistrations(registrations);
          console.log(`✅ Synced ${res.synced} registrations from ${path.basename(filePath)} (${res.created} created, ${res.updated} updated)`);
          localSynced = true;
        }
      }
    }
  }

  // Step 3: Run and print the migration diagnostic report
  console.log('\n================================================================================================');
  console.log('MIGRATION DIAGNOSTIC REPORT (ALL PARTICIPANTS)');
  console.log('================================================================================================');
  console.log('Registration ID        | Name                       | Auth Account | Dashboard Profile | Status');
  console.log('------------------------------------------------------------------------------------------------');

  const diagnostic = db.getMigrationDiagnostic();
  for (const item of diagnostic) {
    const regIdPad = item.registrationId.padEnd(22, ' ');
    const namePad = (item.name || 'N/A').slice(0, 26).padEnd(26, ' ');
    const authPad = item.authStatus.padEnd(12, ' ');
    const profPad = item.profileStatus.padEnd(17, ' ');
    console.log(`${regIdPad} | ${namePad} | ${authPad} | ${profPad} | ${item.status}`);
  }
  console.log('================================================================================================');
  console.log(`Total Verified Synchronized Participants: ${diagnostic.length}`);
  console.log('All participants authenticate using: Login ID = Registration ID, Password = Registration ID\n');
}

run().catch(console.error);
