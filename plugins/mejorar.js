import { ensureCMUser, saveCM } from '../lib/cmManager.js';
export const command = 'mejorar';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const user = sender.split('@')[0];

  const data = ensureCMUser(user);
  const cost = data.villageLevel * 10000;

  if (data.coins < cost) {
    await sock.sendMessage(from, { text: `❌ Necesitas *${cost} monedas* para mejorar tu aldea.` }, { quoted: msg });
    return;
  }

  data.coins -= cost;
  data.villageLevel++;

  saveCM();

  await sock.sendMessage(from, { text: `✅ ¡Has mejorado tu aldea al *nivel ${data.villageLevel}*!🏘` }, { quoted: msg });
}
