import {
  cargarDatabase,
  guardarDatabase
} from '../data/database.js';

export const command = 'pozo';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const userId = msg.key.participant || msg.key.remoteJid;

  if (args.length < 1) {
    return sock.sendMessage(from, {
      text: '📌 Uso correcto:\n.pozo <cantidad>'
    });
  }

  const cantidad = Number(args[0]);

  if (isNaN(cantidad) || cantidad <= 0) {
    return sock.sendMessage(from, {
      text: '❌ Debes indicar una cantidad válida de pandacoins.'
    });
  }

  const data = cargarDatabase();
  if (!data || !data.users[userId]) {
    return sock.sendMessage(from, {
      text: '❌ No estás registrado en la base de datos.'
    });
  }

  const user = data.users[userId];

  if (user.pandacoins < cantidad) {
    return sock.sendMessage(from, {
      text: `❌ No tienes suficientes pandacoins.\n💰 Tienes: ${user.pandacoins}`
    });
  }

  // 🔥 Desperdiciar pandacoins
  user.pandacoins -= cantidad;

  guardarDatabase(data, sock);
  try { (await import('../middleware/trackAchievements.js')).trackPozoDonate(userId, cantidad, sock, from); } catch (e) {}

  await sock.sendMessage(from, {
    text:
      `🕳️ *Pozo económico*\n\n` +
      `Has arrojado *${cantidad}* 🪙 pandacoins al pozo.\n` +
      `💰 Saldo actual: ${user.pandacoins}`
  });
}