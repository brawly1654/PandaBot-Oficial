import { cargarDatabase, guardarDatabase } from '../data/database.js';
export const command = 'remover';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[sender] = db.users[sender] || {};

  if (!user.alineacion || !user.alineacion.posiciones) {
    await sock.sendMessage(from, { text: '❌ No tienes ninguna alineación activa.' });
    return;
  }

  const posicion = args[0];
  const posicionesValidas = ['POR','LD','LI','DFC1','DFC2','MC1','MC2','MCO','ED','EI','DC','DFC3','DC2'];

  if (!posicion || !posicionesValidas.includes(posicion)) {
    await sock.sendMessage(from, {
      text: `❌ Usa: .remover <posición>\nPosiciones válidas:\n${posicionesValidas.join(', ')}`
    });
    return;
  }

  if (!user.alineacion.posiciones[posicion]) {
    await sock.sendMessage(from, { text: `⚠️ No hay ningún jugador en la posición *${posicion}*.` });
    return;
  }

  const nombre = user.alineacion.posiciones[posicion];
  delete user.alineacion.posiciones[posicion];
  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `✅ *${nombre}* fue removido de la posición *${posicion}*.`
  });
}
