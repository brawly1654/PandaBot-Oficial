import { cargarDatabase, guardarDatabase } from '../data/database.js';
export const command = 'favorito';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const personaje = args.join(' ').trim();

  if (!personaje) {
    await sock.sendMessage(from, {
      text: '❌ Especifica el nombre del personaje favorito. Ejemplo: *.favorito Tom*',
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();
  db.users = db.users || {};
  db.users[sender] = db.users[sender] || {};
  const user = db.users[sender];

  user.personajes = user.personajes || [];

  if (!user.personajes.includes(personaje)) {
    await sock.sendMessage(from, {
      text: `❌ No puedes elegir *${personaje}* como favorito porque no lo tienes en tu inventario.`,
    }, { quoted: msg });
    return;
  }

  user.favorito = personaje;
  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `✅ Personaje favorito actualizado: *${personaje}*`,
  }, { quoted: msg });
}
