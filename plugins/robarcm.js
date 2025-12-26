import { ensureCMUser, saveCM } from '../lib/cmManager.js';
export const command = 'robarcm';

const cooldown = 15 * 60 * 1000;
let robCooldown = {};

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const user = senderJid.split('@')[0];

  const data = ensureCMUser(user);
  const now = Date.now();

  if (robCooldown[user] && now - robCooldown[user] < cooldown) {
    const timeLeft = Math.ceil((cooldown - (now - robCooldown[user])) / 60000);
    return sock.sendMessage(from, {
      text: `🕒 *@${user}*, debes esperar ${timeLeft} minuto(s) para volver a usar *robar*.`
    }, { quoted: msg, mentions: [senderJid] });
  }

  const targetMention = args[0];
  if (!targetMention || !targetMention.startsWith('@')) {
    return sock.sendMessage(from, { text: `⚠️ Usa el comando así: *.robar @usuario*` }, { quoted: msg });
  }
  
  const targetNumber = targetMention.replace('@', '');
  const targetJid = `${targetNumber}@s.whatsapp.net`;
  
  if (targetJid === senderJid) {
    return sock.sendMessage(from, { text: `❌ No puedes robarte a ti mismo, eso es un robo con intimidacion.` }, { quoted: msg });
  }
  
  if (!global.cmDB[targetNumber]) {
    return sock.sendMessage(from, { text: `❌ El usuario mencionado no tiene cuenta en Coin Master.` }, { quoted: msg });
  }

  const targetData = ensureCMUser(targetNumber);

  const stolenCoins = Math.floor(Math.random() * 300000) + 100000;
  const coinsTaken = Math.min(stolenCoins, targetData.coins);
  targetData.coins -= coinsTaken;
  data.coins += coinsTaken;
  robCooldown[user] = now;
  saveCM();

  await sock.sendMessage(from, {
    text: `🦹 Robaste al usuario y obtuviste *${coinsTaken.toLocaleString()} monedas*.`,
    mentions: [targetJid]
  }, { quoted: msg });
}

