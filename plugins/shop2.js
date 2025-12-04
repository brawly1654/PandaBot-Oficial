import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { getAllTitles } from '../utils/titlesManager.js';

export const command = 'shop2';
export const aliases = ['shoptitles', 'tiendatitulos'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const db = cargarDatabase();
  const user = db.users[sender];
  
  if (!user) {
    await sock.sendMessage(from, { text: '❌ Primero regístrate en el bot usando algún comando.' });
    return;
  }

  const titles = getAllTitles();
  const userTitles = user.achievements?.titles || [];
  const userCoins = user.pandacoins || 0;

  if (titles.length === 0) {
    await sock.sendMessage(from, { 
      text: '🏪 *TIENDA DE TÍTULOS*\n\n📭 No hay títulos disponibles en la tienda en este momento.\n\n💡 Los owners pueden añadir títulos con .creartitulo' 
    });
    return;
  }

  let mensaje = `🏪 *TIENDA DE TÍTULOS* 🏪\n\n`;
  mensaje += `💰 *Tus pandacoins:* ${userCoins.toLocaleString()} 🐼\n`;
  mensaje += `👑 *Tus títulos:* ${userTitles.length}\n`;
  mensaje += `🛒 *Disponibles:* ${titles.length} títulos\n\n`;
  mensaje += `📋 *CATÁLOGO:*\n\n`;

  titles.forEach((title, index) => {
    const owned = userTitles.includes(title.displayName);
    const canAfford = userCoins >= title.price;
    const status = owned ? "✅ COMPRADO" : (canAfford ? "🟢 COMPRAR" : "🔴 NO ALCANZA");
    
    mensaje += `${index + 1}. ${title.emoji} *${title.name}*\n`;
    mensaje += `   📝 ${title.description}\n`;
    mensaje += `   💰 Precio: ${title.price.toLocaleString()} 🐼\n`;
    mensaje += `   📍 Estado: ${status}\n`;
    
    if (!owned) {
      mensaje += `   🛒 Comando: .buytitle ${index + 1}\n`;
    } else {
      mensaje += `   ✅ Ya en tu colección\n`;
    }
    mensaje += `\n`;
  });

  mensaje += `💡 *Comandos útiles:*\n`;
  mensaje += `• .buytitle <número> - Comprar título\n`;
  mensaje += `• .titles - Ver tus títulos\n`;
  mensaje += `• .title <número> - Equipar título`;

  await sock.sendMessage(from, { text: mensaje });
}
