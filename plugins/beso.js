export const command = 'beso';

import { trackBeso } from '../middleware/trackAchievements.js';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const mentions = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentions.length === 0) {
    await sock.sendMessage(from, { text: '😘 Usa .beso @usuario' });
    return;
  }

  const text = `😘 Le da un beso a @${mentions[0].split('@')[0]}!`;
  await sock.sendMessage(from, { text, mentions });
  try { trackBeso(sender, sock, from); } catch (e) {}
}
