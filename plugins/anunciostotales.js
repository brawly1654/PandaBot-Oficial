import { cargarDatabase } from '../data/database.js';

export const command = 'anunciostotales';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  
  // disponible para todos los usuarios (3.0)
  const db = cargarDatabase();
  const adCount = db.monetization?.adCount || 0;
  
  await sock.sendMessage(from, { text: `📊 *Total de anuncios vistos:* ${adCount}` });
}

