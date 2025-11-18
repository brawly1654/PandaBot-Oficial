import fs from 'fs';
import path from 'path';

function formatTimestamp(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

function cleanupBackups(backupsDir, maxBackups, filterFn) {
  if (!maxBackups || maxBackups <= 0) return;

  const entries = fs.readdirSync(backupsDir)
    .filter(filterFn)
    .map(file => ({
      file,
      time: fs.statSync(path.join(backupsDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  const toDelete = entries.slice(maxBackups);
  for (const entry of toDelete) {
    try {
      fs.unlinkSync(path.join(backupsDir, entry.file));
    } catch (error) {
      console.error(`No se pudo eliminar el backup ${entry.file}:`, error);
    }
  }
}

export function createDatabaseBackup({
  databasePath = './database.json',
  backupsDir = './backups',
  filenameFormatter,
  filenamePrefix = 'backup',
  maxBackups = 0,
  backupFilter
} = {}) {
  if (!fs.existsSync(databasePath)) {
    throw new Error(`El archivo de base de datos no existe en ${databasePath}`);
  }

  fs.mkdirSync(backupsDir, { recursive: true });

  const timestamp = formatTimestamp();
  const fileName = filenameFormatter
    ? filenameFormatter(timestamp)
    : `${filenamePrefix}_${timestamp}.json`;

  const backupPath = path.join(backupsDir, fileName);
  fs.copyFileSync(databasePath, backupPath);

  const filterFn = backupFilter || ((file) => file.startsWith(filenamePrefix) && file.endsWith('.json'));
  cleanupBackups(backupsDir, maxBackups, filterFn);

  return {
    backupPath,
    fileName,
    timestamp
  };
}
