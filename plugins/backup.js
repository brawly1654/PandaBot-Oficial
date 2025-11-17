import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export const command = 'backup';

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

  await sock.sendMessage(from, { text: '📦 Creando respaldo de la base de datos...' });

  // Crear carpeta backups si no existe
  const backupsFolder = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsFolder)) {
    fs.mkdirSync(backupsFolder);
  }

  // Crear nombre del archivo con fecha y hora
  const date = new Date();
  const timestamp = `${date.getFullYear()}-${(date.getMonth()+1)
    .toString().padStart(2,'0')}-${date.getDate()
    .toString().padStart(2,'0')}_${date.getHours()
    .toString().padStart(2,'0')}-${date.getMinutes()
    .toString().padStart(2,'0')}-${date.getSeconds()
    .toString().padStart(2,'0')}`;

  const backupFile = path.join(backupsFolder, `backup_${timestamp}.json`);

  // Comando compatible con Linux/Termux y Windows
  const copyCommand = process.platform === "win32"
    ? `copy database.json "${backupFile}"`
    : `cp database.json "${backupFile}"`;

  exec(copyCommand, async (error) => {
    if (error) {
      await sock.sendMessage(from, { text: `❌ Error al crear respaldo: ${error.message}` });
      return;
    }

    await sock.sendMessage(from, { text: `✅ Respaldo creado correctamente:\n📁 *${backupFile}*` });
  });
}
