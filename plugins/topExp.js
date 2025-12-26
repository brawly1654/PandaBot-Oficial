import { cargarDatabase } from '../data/database.js';

export const command = 'topExp';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const db = cargarDatabase();
  db.users = db.users || {};

  const top = Object.entries(db.users)
    .map(([id, u]) => ({ id, exp: Number(u.exp) || 0 }))
    .sort((a, b) => b.exp - a.exp)
    .slice(0, 10);

  let text = '🏆 *Top 10 usuarios con mayor experiencia*\n';
  const mentions = [];

  top.forEach((u, i) => {
    const uid = u.id.split('@')[0];
    const jid = u.id.includes('@') ? u.id : `${uid}@s.whatsapp.net`;
    mentions.push(jid);
    text += `\n${i + 1}. @${uid}: ${u.exp} exp`;
  });

  await sock.sendMessage(from, { text, mentions }, { quoted: msg });
}
