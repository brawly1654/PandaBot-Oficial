import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { getAllTitles, getTitleByIndex } from '../utils/titlesManager.js';

export const command = 'buytitle';
export const aliases = ['comprartitle', 'comprartitulo'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (args.length === 0) {
    await sock.sendMessage(from, {
      text: '❌ Debes especificar el número del título.\n\n💡 Ejemplo: .buytitle 1\n💡 Ve la tienda con: .shop'
    });
    return;
  }

  const titles = getAllTitles();
  
  if (titles.length === 0) {
    await sock.sendMessage(from, {
      text: '❌ No hay títulos disponibles en la tienda.\n\n💡 Los owners pueden añadir títulos con .creartitulo'
    });
    return;
  }

  const titleIndex = parseInt(args[0]) - 1;
  
  if (isNaN(titleIndex) || titleIndex < 0 || titleIndex >= titles.length) {
    await sock.sendMessage(from, {
      text: `❌ Número inválido. Usa un número del 1 al ${titles.length}.\n\n💡 Ve la tienda con: .shop`
    });
    return;
  }

  const db = cargarDatabase();
  const user = db.users[sender];
  
  if (!user) {
    await sock.sendMessage(from, { text: '❌ Primero regístrate en el bot.' });
    return;
  }

  const selectedTitle = titles[titleIndex];
  const userCoins = user.pandacoins || 0;
  const userTitles = user.achievements?.titles || [];


  if (userTitles.includes(selectedTitle.displayName)) {
    await sock.sendMessage(from, {
      text: `❌ Ya tienes el título *${selectedTitle.name}*.\n\n💡 Puedes seleccionarlo con: .title "${selectedTitle.displayName}"`
    });
    return;
  }


  if (userCoins < selectedTitle.price) {
    await sock.sendMessage(from, {
      text: `❌ No tienes suficientes pandacoins.\n\n${selectedTitle.emoji} *Título:* ${selectedTitle.name}\n💰 Necesitas: ${selectedTitle.price.toLocaleString()} 🐼\n💳 Tienes: ${userCoins.toLocaleString()} 🐼\n🔻 Te faltan: ${(selectedTitle.price - userCoins).toLocaleString()} 🐼`
    });
    return;
  }


  if (args[1] !== 'confirmar') {
    await sock.sendMessage(from, {
      text: `🛒 *CONFIRMAR COMPRA*\n\n${selectedTitle.emoji} *Título:* ${selectedTitle.name}\n📝 ${selectedTitle.description}\n💰 Precio: ${selectedTitle.price.toLocaleString()} 🐼\n\n💳 *Saldo actual:* ${userCoins.toLocaleString()} 🐼\n💸 *Saldo después:* ${(userCoins - selectedTitle.price).toLocaleString()} 🐼\n\n✅ Para confirmar usa:\n.buytitle ${args[0]} confirmar\n\n❌ Esta acción no se puede deshacer.`
    });
    return;
  }


  user.pandacoins = userCoins - selectedTitle.price;
  

  if (!user.achievements) {
    user.achievements = {
      unlocked: [],
      progress: {},
      points: 0,
      titles: [],
      selectedTitle: null,
      stats: {}
    };
  }


  if (!user.achievements.titles.includes(selectedTitle.displayName)) {
    user.achievements.titles.push(selectedTitle.displayName);
  }

  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `🎉 *¡COMPRA EXITOSA!* 🎉\n\n${selectedTitle.emoji} Has comprado: *${selectedTitle.name}*\n📝 ${selectedTitle.description}\n\n💰 *Gastado:* ${selectedTitle.price.toLocaleString()} 🐼\n💳 *Saldo restante:* ${user.pandacoins.toLocaleString()} 🐼\n\n👑 *Ahora puedes usar:*\n.title "${selectedTitle.displayName}"\n\n💫 ¡Disfruta de tu nuevo título!`
  });
}
