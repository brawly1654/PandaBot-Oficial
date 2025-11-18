import { createDatabaseBackup } from '../tools/createBackup.js';

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

  try {
    const timestamp = new Date().toISOString();
    const { backupPath } = createDatabaseBackup({
      filenameFormatter: (timestamp) => `backup(${timestamp}).json`,
      filenamePrefix: 'backup',
      maxBackups: 10
    });
    await sock.sendMessage(from, { text: `✅ Respaldo creado correctamente:\n📁 *${backupPath}*` });
  } catch (error) {
    await sock.sendMessage(from, { text: `❌ Error al crear respaldo: ${error.message}` });
  }
}
