import fs from 'fs';
import path from 'path';

export const command = 'rewindbackup';

function getLatestBackup(backupsDir) {
  if (!fs.existsSync(backupsDir)) return null;

  const entries = fs.readdirSync(backupsDir)
    .filter(file => file.startsWith('backup') && file.endsWith('.json'))
    .map(file => ({
      file,
      time: fs.statSync(path.join(backupsDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return entries[0]?.file || null;
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const owners = [
    '56953508566', '573023181375', '166164298780822',
    '30868416512052', '97027992080542', '5215538830665',
    '267232999420158'
  ];

  if (!owners.includes(sender.split('@')[0])) {
    await sock.sendMessage(from, { text: '❌ Solo los dueños del bot pueden usar este comando.' });
    return;
  }

  const backupsDir = path.join(process.cwd(), 'backups');
  const dbPath = path.join(process.cwd(), 'database.json');

  await sock.sendMessage(from, { text: '⏪ Restaurando base de datos desde el backup más reciente...' });

  try {
    const latestBackup = getLatestBackup(backupsDir);

    if (!latestBackup) {
      await sock.sendMessage(from, { text: '❌ No se encontró ningún backup para restaurar.' });
      return;
    }

    fs.copyFileSync(path.join(backupsDir, latestBackup), dbPath);
    await sock.sendMessage(from, { text: `✅ Base restaurada correctamente desde:\n📁 *${latestBackup}*` });
  } catch (error) {
    await sock.sendMessage(from, { text: `❌ Error al restaurar backup: ${error.message}` });
  }
}
