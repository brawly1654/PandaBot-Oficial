import { cargarDatabase } from '../data/database.js';
export const command = 'allstats';

export async function run(sock, msg, args) {
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  if (!db || !db.users || !db.users[sender]) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ No se encontró tu perfil en la base de datos.'
    });
    return;
  }

  const bloque = JSON.stringify({ [sender]: db.users[sender] }, null, 2);

  await sock.sendMessage(msg.key.remoteJid, {
    text: bloque
  });
}
