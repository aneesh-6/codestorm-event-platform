import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncAndSaveSummary() {
  console.log('Fetching all migrated registrations from Google Sheets...');
  const res = await db.syncFromGoogleSheets();
  console.log('Sync result:', res);

  const scriptUrl = 'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';
  const sheetRes = await fetch(`${scriptUrl}?action=getRegistrations`);
  const sheetData = await sheetRes.json();

  const credsSummary = sheetData.registrations.map(r => ({
    registrationId: r.registrationId,
    participantId: r.participantId,
    tempPassword: r.temporaryPassword,
    name: r.name,
    rollNumber: r.rollNumber,
    email: r.email
  }));

  const summaryPath = path.join(__dirname, 'migration_credentials_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(credsSummary, null, 2), 'utf8');
  console.log(`Saved ${credsSummary.length} credentials to migration_credentials_summary.json!`);

  // Verify first 5
  credsSummary.slice(0, 5).forEach(c => {
    console.log(`  ${c.registrationId} | ${c.participantId} | Pwd: ${c.tempPassword} | Name: ${c.name}`);
  });
}

syncAndSaveSummary().catch(console.error);
