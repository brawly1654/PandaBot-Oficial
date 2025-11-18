import fs from 'fs';
import { enviarAlerta } from '../utils/alertaGrupo.js';
import { createDatabaseBackup } from '../tools/createBackup.js';

const dbFile = './database.json';
const logFile = './logs/db.log';
const MAX_SAVES_WITHOUT_BACKUP = 25;

function logEvento(texto) {
  const timestamp = new Date().toISOString();
  fs.mkdirSync('./logs', { recursive: true });
  fs.appendFileSync(logFile, `[${timestamp}] ${texto}\n`);
}

function ensureMeta(data) {
  if (!data || typeof data !== 'object') return;
  data._meta = data._meta || {};
  if (typeof data._meta.savesWithoutBackup !== 'number') {
    data._meta.savesWithoutBackup = 0;
  }
}

export function cargarDatabase() {
  if (!fs.existsSync(dbFile)) {
    logEvento('⚠️ database.json no existe. Se requiere restauración manual.');
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(dbFile));
    ensureMeta(data);
    logEvento('✅ Base de datos cargada correctamente.');
    return data;
  } catch (err) {
    logEvento(`❌ Error al leer la base: ${err.message}`);
    return null;
  }
}

export function guardarDatabase(data, sock = null) {
  if (!data || typeof data !== 'object') {
    logEvento('❌ Intento de guardar base inválida (no es un objeto).');
    return;
  }

  ensureMeta(data);

  let savesWithoutBackup = data._meta.savesWithoutBackup ?? 0;
  savesWithoutBackup += 1;

  let backupInfo = null;

  if (savesWithoutBackup >= MAX_SAVES_WITHOUT_BACKUP) {
    try {
      backupInfo = createDatabaseBackup({
        filenameFormatter: (timestamp) => `backup(${timestamp}).json`,
        filenamePrefix: 'backup',
        maxBackups: 10
      });
      logEvento(`📦 Backup creado: ${backupInfo.backupPath}`);
      savesWithoutBackup = 0;
    } catch (err) {
      logEvento(`⚠️ No se pudo crear el backup automático: ${err.message}`);
    }
  }

  data._meta.savesWithoutBackup = savesWithoutBackup;

  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
    logEvento('💾 Base de datos guardada correctamente.');

    if (sock) {
      const backupDato = backupInfo?.fileName || 'sin información';
      const alertMessage = backupInfo
        ? `⚠️ *La base de datos fue modificada.*\nBackup creado: ${backupDato}`
        : '⚠️ *La base de datos fue modificada.*\nNo se pudo crear el backup automático.';
      enviarAlerta(sock, alertMessage);
    }
  } catch (err) {
    logEvento(`❌ Error al guardar la base: ${err.message}`);
  }
}

export function guardarPersonajes(personajes) {
  fs.writeFileSync('./data/personajes.json', JSON.stringify({ characters: personajes }, null, 2));
  logEvento('📁 Personajes guardados.');
}
