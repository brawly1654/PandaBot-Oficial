export const command = 'walletcm';
import { ensureCMUser } from '../lib/cmManager.js';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;

  const isMention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const targetJid = isMention || senderJid;
  const user = targetJid.split('@')[0];

  const data = ensureCMUser(user);

  const rankingAldea = Object.entries(global.cmDB)
    .sort((a, b) => (Number(b[1].villageLevel) || 0) - (Number(a[1].villageLevel) || 0))
    .map(([u]) => u);
  const positionAldea = rankingAldea.indexOf(user) + 1;

  const rankingCoins = Object.entries(global.cmDB)
    .sort((a, b) => (Number(b[1].coins) || 0) - (Number(a[1].coins) || 0))
    .map(([u]) => u);
  const positionCoins = rankingCoins.indexOf(user) + 1;

  const nombre = msg.pushName || `@${user}`;
  const text = `
🧑 Perfil de *${nombre}* – Coin Master

🎯 Giros: ${data.spins}
💰 Monedas: ${data.coins}
🛡 Escudos: ${data.shields}
🏘 Aldea Nivel: ${data.villageLevel}
🎫 Créditos: ${data.creditos}
📍 Posición en el top de aldeas: ${positionAldea}
🏅 Posición en el top de monedas: ${positionCoins}
`.trim();

  await sock.sendMessage(from, { text, mentions: [targetJid] }, { quoted: msg });
}

