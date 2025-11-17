import fs from 'fs';
import { checkAchievements, initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatabase } from '../data/database.js';

const file = './data/parejas.json';

function cargarParejas() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}');
  return JSON.parse(fs.readFileSync(file));
}

function guardarParejas(parejas) {
  fs.writeFileSync(file, JSON.stringify(parejas, null, 2));
}

export const command = 'aceptar';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const user = msg.key.participant || msg.key.remoteJid;
  
  // ✅ Inicializar achievements si no existen
  const db = cargarDatabase();
  if (!db.users[user]?.achievements) {
    initializeAchievements(user);
  }

  const parejas = cargarParejas();
  const solicitud = parejas[`solicitud_${user}`];

  if (!solicitud) {
    await sock.sendMessage(from, { text: '❌ No tienes ninguna solicitud de matrimonio pendiente.' });
    return;
  }

  parejas[user] = solicitud;
  parejas[solicitud] = user;
  delete parejas[`solicitud_${user}`];
  guardarParejas(parejas);

  await sock.sendMessage(from, {
    text: `💖 <@${user.split('@')[0]}> y <@${solicitud.split('@')[0]}> ahora están casados! 🎉`,
    mentions: [user, solicitud]
  });

  // ✅ Verificar logros de matrimonio para AMBOS usuarios
  checkAchievements(user, sock, from);
  checkAchievements(solicitud, sock, from);
}
