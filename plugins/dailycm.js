import { ensureCMUser, saveCM } from '../lib/cmManager.js';
export const command = 'dailycm';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const user = sender.split('@')[0];

  const data = ensureCMUser(user);

  const now = Date.now();
  if (!data.lastDaily || now - data.lastDaily > 86400000) {
    data.spins = (Number(data.spins) || 0) + 5;
    data.lastDaily = now;
    saveCM();
    await sock.sendMessage(from, { text: `🎁 Has reclamado tus *5 giros diarios!*` }, { quoted: msg });
  } else {
    const timeLeft = 86400000 - (now - data.lastDaily);
    const mins = Math.floor(timeLeft / 60000);
    await sock.sendMessage(from, { text: `⏳ Debes esperar *${mins} minutos* para reclamar el siguiente daily.` }, { quoted: msg });
  }
}
