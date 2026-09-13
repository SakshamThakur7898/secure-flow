// src/reset.js — deletes the local SQLite database file(s) so the next
// `npm start` recreates a clean schema and reseeds the demo accounts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

if (fs.existsSync(DATA_DIR)) {
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (file.startsWith('secureflow.sqlite')) {
      fs.unlinkSync(path.join(DATA_DIR, file));
      console.log(`Removed ${file}`);
    }
  }
}
console.log('Database reset. Run "npm start" to recreate it with fresh seed data.');
