import { ensureCMUser, saveCM } from '../lib/cmManager.js';
export const command = 'regalartiros';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderID = sender.split('@')[0];

  if (!args[0] || !args[1]) {
    await sock.sendMessage(from, { text: '❌ Usa el comando así: *.regalartiros <cantidad> @usuario*' }, { quoted: msg });
    return;
  }

  const cantidad = parseInt(args[0]);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (isNaN(cantidad) || cantidad <= 0) {
    await sock.sendMessage(from, { text: '❌ La cantidad debe ser un número válido mayor a 0.' }, { quoted: msg });
    return;
  }

  if (!mentioned) {
    await sock.sendMessage(from, { text: '❌ Debes mencionar a un usuario para regalarle tiros.' }, { quoted: msg });
    return;
  }

  const receptorID = mentioned.split('@')[0];

  const senderData = ensureCMUser(senderID);
  const receptorData = ensureCMUser(receptorID);

  if (senderData.spins < cantidad) {
    await sock.sendMessage(from, { text: `❌ No tienes suficientes tiros. Actualmente tienes *${senderData.spins}* giros.` }, { quoted: msg });
    return;
  }

  senderData.spins -= cantidad;
  receptorData.spins += cantidad;
  saveCM();

  await sock.sendMessage(from, {
    text: `🎁 *@${senderID}* le ha regalado *${cantidad} tiros* a *@${receptorID}*! 🎉`,
    mentions: [sender, mentioned]
  }, { quoted: msg });
}
