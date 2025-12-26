import { addNewTitle, getAllTitles } from '../utils/titlesManager.js';
import { ownerNumber } from '../config.js';

export const command = 'creartitulo';
export const aliases = ['addtitle', 'createtitle'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];


  if (!ownerNumber.includes(`+${sender}`)) {
    await sock.sendMessage(from, { text: '❌ Solo los owners pueden usar este comando.' });
    return;
  }

  if (args.length === 0) {
    await sock.sendMessage(from, {
      text: `👑 *CREAR TÍTULO - OWNERS*\n\n📝 *Formato:*\n.creartitulo nombre_visible | nombre_equipable | precio\n\n🎯 *Ejemplos:*\n.creartitulo ⭐ Estrella Legendaria | ⭐ Estrella Legendaria | 500000\n.creartitulo 🏆 Campeón | 🏆 Campeón | 1000000\n\n💡 El "nombre_visible" aparece en la tienda\n💡 El "nombre_equipable" es el que usan los jugadores\n💡 El precio es en pandacoins`
    });
    return;
  }

  const input = args.join(' ');
  const parts = input.split('|').map(part => part.trim());

  if (parts.length !== 3) {
    await sock.sendMessage(from, {
      text: '❌ Formato incorrecto.\n\n💡 Usa: .creartitulo nombre_visible | nombre_equipable | precio\n\n🎯 Ejemplo: .creartitulo ⭐ Estrella | ⭐ Estrella | 500000'
    });
    return;
  }

  const [visibleName, equipName, priceStr] = parts;
  const price = parseInt(priceStr.replace(/[^0-9]/g, ''));

  if (isNaN(price) || price <= 0) {
    await sock.sendMessage(from, {
      text: '❌ Precio inválido. Debe ser un número mayor a 0.\n\n💡 Ejemplo: 500000'
    });
    return;
  }


  const id = equipName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const titleData = {
    id: id,
    name: visibleName,
    displayName: equipName,
    price: price,
    emoji: visibleName.charAt(0),
    createdBy: sender
  };

  const result = addNewTitle(titleData);

  if (result.success) {
    const titles = getAllTitles();
    await sock.sendMessage(from, {
      text: `✅ *TÍTULO CREADO EXITOSAMENTE*\n\n🏷️ *ID:* ${result.title.id}\n👀 *Visible:* ${result.title.name}\n🎮 *Equipable:* ${result.title.displayName}\n💰 *Precio:* ${result.title.price.toLocaleString()} 🐼\n📝 *Descripción:* ${result.title.description}\n\n📊 *Total títulos en tienda:* ${titles.length}\n\n🛒 Los usuarios ya pueden comprarlo con:\n.shop\n.buytitle ${titles.length}`
    });
  } else {
    await sock.sendMessage(from, {
      text: `❌ Error al crear el título: ${result.error}`
    });
  }
}
