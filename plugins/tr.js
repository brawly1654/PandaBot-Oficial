import { ensureCMUser, saveCM } from '../lib/cmManager.js';
export const command = 'tr';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderID = sender.split('@')[0];

  // Validaciones básicas
  if (!args[0] || !args[1]) {
    await sock.sendMessage(from, { text: '❌ Usa el comando así: *.pay <cantidad> @usuario*' }, { quoted: msg });
    return;
  }

  const cantidad = parseInt(args[0]);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (isNaN(cantidad) || cantidad <= 0) {
    await sock.sendMessage(from, { text: '❌ La cantidad debe ser un número válido mayor a 0.' }, { quoted: msg });
    return;
  }

  if (!mentioned) {
    await sock.sendMessage(from, { text: '❌ Debes mencionar a un usuario para transferirle monedas.' }, { quoted: msg });
    return;
  }

  const receptorID = mentioned.split('@')[0];

  const senderData = ensureCMUser(senderID);
  const receptorData = ensureCMUser(receptorID);

  // Validar saldo
  if (senderData.coins < cantidad) {
    await sock.sendMessage(from, {
      text: `❌ No tienes suficientes monedas. Actualmente tienes *${senderData.coins}* 🪙.`,
    }, { quoted: msg });
    return;
  }

  // Realizar transferencia
  senderData.coins -= cantidad;
  receptorData.coins += cantidad;
  saveCM();

  // Enviar mensaje
  await sock.sendMessage(from, {
    text: `💸 *@${senderID}* le ha transferido *${cantidad.toLocaleString()} monedas* a *@${receptorID}*!😳`,
    mentions: [sender, mentioned]
  }, { quoted: msg });
}
