import fs from 'fs';
import path from 'path';

const backupDir = './backups';
const dbFile = './database.json';

// Buscar el backup más reciente
const backups = fs.readdirSync(backupDir)
  .filter(f => f.startsWith('backup') && f.endsWith('.json'))
  .sort()
  .reverse();

const latest = backups[0];

if (!latest) {
  console.log('❌ No hay backups disponibles.');
  process.exit();
}

const source = path.join(backupDir, latest);
fs.copyFileSync(source, dbFile);

console.log(`✅ Base restaurada desde ${latest}`);
