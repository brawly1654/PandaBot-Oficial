import { cargarDatabase, guardarDatabase } from '../data/database.js';
export const command = 'resetalineacion';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[sender] = db.users[sender] || {};

  if (!user.alineacion) {
    await sock.sendMessage(from, { text: '❌ No tienes ninguna alineación activa.' });
    return;
  }

  delete user.alineacion;
  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `🧹 Tu alineación ha sido reiniciada. Usa *.formacion* para comenzar de nuevo.`
  });
}
