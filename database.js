import fs from 'fs';
import { enviarAlerta } from '../utils/alertaGrupo.js';

const dbFile = './database.json';
const logFile = './logs/db.log';

function logEvento(texto) {
  const timestamp = new Date().toISOString();
  fs.mkdirSync('./logs', { recursive: true });
  fs.appendFileSync(logFile, `[${timestamp}] ${texto}\n`);
}

export function cargarDatabase() {
  if (!fs.existsSync(dbFile)) {
    logEvento('⚠️ database.json no existe. Se requiere restauración manual.');
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(dbFile));
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

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/backup(${timestamp}).json`;
    fs.mkdirSync('./backups', { recursive: true });
    fs.copyFileSync(dbFile, backupPath);
    logEvento(`📦 Backup creado: ${backupPath}`);

    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
    logEvento('💾 Base de datos guardada correctamente.');

    if (sock) {
      enviarAlerta(sock, `⚠️ *La base de datos fue modificada.*\nBackup creado: ${timestamp}`);
    }
  } catch (err) {
    logEvento(`❌ Error al guardar la base: ${err.message}`);
  }
}

export function guardarPersonajes(personajes) {
  fs.writeFileSync('./data/personajes.json', JSON.stringify({ characters: personajes }, null, 2));
  logEvento('📁 Personajes guardados.');
}
