import { ownerNumber } from '../config.js';

export const command = 'checkowner';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
  const isOwner = ownerNumber.includes('+' + sender);
  const nombre = msg.pushName || 'Usuario';

  let texto = '';
  if (isOwner) {
    texto += `✅ Eres un *Owner* del bot.\n📱 Tu usuario: ${nombre}\n\n`;
  } else {
    texto += `❌ No eres un *Owner* del bot.\n📱 Tu usuario: ${nombre}\n\n`;
  }
  
  await sock.sendMessage(from, {
    text: texto, 
    mentions: ownersJid 
  }, { quoted: msg });
}
