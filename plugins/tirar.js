import { trackCMTirada, checkSpecialAchievements } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatabase } from '../data/database.js';
import { ensureCMUser, saveCM } from '../lib/cmManager.js';

export const command = 'tirar';

const cooldowns = {};

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const user = sender.split('@')[0];
  const now = Date.now();
  const nombre = msg.pushName || 'Usuario';

  const db = cargarDatabase();
  if (!db.users[sender]?.achievements) {
    initializeAchievements(sender);
  }

  if (cooldowns[user] && now - cooldowns[user] < 2000) {
    const timeLeft = ((2000 - (now - cooldowns[user])) / 1000).toFixed(1);
    await sock.sendMessage(from, { text: `⏳ Espera *${timeLeft}s* para usar este comando de nuevo, *@${user}*.` }, { quoted: msg, mentions: [sender] });
    return;
  }

  cooldowns[user] = now;


  const data = ensureCMUser(user);

  if (data.spins <= 0) {
    await sock.sendMessage(from, {
      text: `⚠️ *@${nombre}*, no tienes más giros. Usa *.dailycm* para reclamar más.`,
      mentions: [sender]
    }, { quoted: msg });
    return;
  }

  data.spins--;

  const rewards = [
    {
      emoji: '🪙',
      action: () => {
        data.coins += 8000;
        return 'Ganaste *8,000 monedas* 🪙';
      }
    },
    {
      emoji: '🛡',
      action: () => {
        if (data.shields >= 1) return '⚠️ Ya tienes *un escudo*, no puedes obtener más 🛡';
        data.shields += 1;
        return 'Obtuviste *1 escudo* 🛡';
      }
    },
    {
      emoji: '🎫',
      action: () => {
        data.creditos +=15;
        return '¡+15 Créditos! 🎫';
      }
    },
    {
      emoji: '⚡️',
      action: () => {
        data.spins += 2;
        return '¡+2 giros extra! ⚡';
      }
    }
  ];

  const result = [
    rewards[Math.floor(Math.random() * rewards.length)],
    rewards[Math.floor(Math.random() * rewards.length)],
    rewards[Math.floor(Math.random() * rewards.length)],
  ];

  const resultText = result.map(r => r.emoji).join(' | ');
  const rewardMessages = result.map(r => r.action()).join('\n');

  saveCM();

  const reply = `
🎰 *Coin Master - TIRADA DE SLOT* 🎰

Usuario: *@${nombre}*

🎲 Resultado:
${resultText}

🎁 Recompensas:
${rewardMessages}

🎯 Giros restantes: ${data.spins}
🏘 Aldea nivel: ${data.villageLevel}
💰 Monedas: ${data.coins}
🛡 Escudos: ${data.shields}
🎫 Créditos: ${data.creditos}
`.trim();

  await sock.sendMessage(from, { text: reply }, { quoted: msg });


  trackCMTirada(sender, sock, from);
  checkSpecialAchievements(sender, sock, from);
}

