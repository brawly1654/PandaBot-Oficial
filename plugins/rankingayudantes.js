import { cargarDatabase } from '../data/database.js';

export const command = 'rankingayudantes';
export const aliases = ['rankingayuda', 'rankayuda', 'rankayudantes', 'topayudantes', 'topreputacion'];
export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const db = cargarDatabase();

  if (!db.users) {
    await sock.sendMessage(from, { text: '❌ No hay datos de reputación aún.' });
    return;
  }

  const ranking = Object.entries(db.users)
    .map(([jid, data]) => ({
      jid,
      reputacion: data.reputacion || 0
    }))
    .filter(u => u.reputacion > 0)
    .sort((a, b) => b.reputacion - a.reputacion)
    .slice(0, 10);

  if (ranking.length === 0) {
    await sock.sendMessage(from, { text: '⭐ Aún no hay usuarios con reputación.' });
    return;
  }

  let texto = '🏆 *Ranking de Ayudantes PandaBot* 🏆\n\n';
  const mentions = [];

  ranking.forEach((u, i) => {
    texto += `${i + 1}. @${u.jid.split('@')[0]}: ⭐️ ${u.reputacion} estrellitas ⭐️\n`;
    mentions.push(u.jid);
  });

  await sock.sendMessage(from, {
    text: texto.trim(),
    mentions
  });
}