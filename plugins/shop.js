// commands/shop.js
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'shop';
export const aliases = ['kiosco', 'tiendita', 'tienda'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const db = cargarDatabase();
  const user = db.users?.[sender];

  if (!user) {
    return await sock.sendMessage(from, {
      text: '❌ Primero debes registrarte en el bot. Usa `.registrar`'
    }, { quoted: msg });
  }

  // Categorías de la tienda
  let response = `🛒 *TIENDA PANDABOT* 🛒\n\n`;
  response += `💰 *Tu saldo:* ${user.pandacoins?.toLocaleString() || 0} 🪙\n`;
  response += `👤 *Nivel:* ${user.nivel || 1}\n\n`;
  
  response += `📌 *Usa:* .comprar <item> <cantidad>\n`;
  response += `📌 *Ejemplo:* .comprar pico 1\n\n`;
  
  // SECCIÓN 1: HERRAMIENTAS (Mejoran eficiencia)
  response += `⚒️ *HERRAMIENTAS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const herramientas = [
    { id: 'pico', emoji: '⛏️', nombre: 'Pico', precio: 500, desc: '+100% recursos al minar', nivel: 1 },
    { id: 'hacha', emoji: '🪓', nombre: 'Hacha', precio: 300, desc: '+80% madera al talar', nivel: 1 },
    { id: 'caña', emoji: '🎣', nombre: 'Caña de Pescar', precio: 200, desc: '+50% pescado', nivel: 1 },
    { id: 'arco', emoji: '🏹', nombre: 'Arco', precio: 800, desc: '+40% carne al cazar', nivel: 3 },
    { id: 'espada', emoji: '⚔️', nombre: 'Espada', precio: 1200, desc: '+100% cuero al cazar', nivel: 5 },
    { id: 'armadura', emoji: '🛡️', nombre: 'Armadura', precio: 1500, desc: '+30% defensa en combate', nivel: 8 }
  ];
  
  herramientas.forEach(item => {
    const disponible = user.nivel >= item.nivel;
    const icono = disponible ? '✅' : '🔒';
    const nivelReq = disponible ? '' : `(Nivel ${item.nivel}+)`;
    response += `${icono} ${item.emoji} *${item.nombre}* - ${item.precio.toLocaleString()} 🪙\n`;
    response += `   ${item.desc} ${nivelReq}\n`;
  });
  
  // SECCIÓN 2: RECURSOS PARA CRAFTING
  response += `\n📦 *RECURSOS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const recursos = [
    { id: 'comida', emoji: '🍖', nombre: 'Comida', precio: 50, desc: 'Para alimentar mascotas' },
    { id: 'piedras', emoji: '🪨', nombre: 'Piedras', precio: 30, desc: 'Para construcción' },
    { id: 'madera', emoji: '🪵', nombre: 'Madera', precio: 40, desc: 'Para construcción' },
    { id: 'hierro', emoji: '⚙️', nombre: 'Hierro', precio: 150, desc: 'Para herramientas' },
    { id: 'oro', emoji: '💰', nombre: 'Oro', precio: 300, desc: 'Para objetos especiales' }
  ];
  
  recursos.forEach(item => {
    response += `✅ ${item.emoji} *${item.nombre}* - ${item.precio.toLocaleString()} 🪙\n`;
    response += `   ${item.desc}\n`;
  });
  
  // SECCIÓN 3: OBJETOS ESPECIALES
  response += `\n✨ *OBJETOS ESPECIALES*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const especiales = [
    { id: 'pocion', emoji: '🧪', nombre: 'Poción de Vida', precio: 300, desc: 'Cura 50 HP', nivel: 2 },
    { id: 'llave', emoji: '🔑', nombre: 'Llave Mágica', precio: 1000, desc: 'Abre cofres secretos', nivel: 4 },
    { id: 'gema', emoji: '💎', nombre: 'Gema Brillante', precio: 500, desc: 'Para encantamientos', nivel: 6 },
    { id: 'pergamino', emoji: '📜', nombre: 'Pergamino Mágico', precio: 2000, desc: 'Aprende habilidades', nivel: 10 }
  ];
  
  especiales.forEach(item => {
    const disponible = user.nivel >= item.nivel;
    const icono = disponible ? '✅' : '🔒';
    const nivelReq = disponible ? '' : `(Nivel ${item.nivel}+)`;
    response += `${icono} ${item.emoji} *${item.nombre}* - ${item.precio.toLocaleString()} 🪙\n`;
    response += `   ${item.desc} ${nivelReq}\n`;
  });
  
  // SECCIÓN 4: MASCOTAS
  response += `\n🐾 *MASCOTAS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const mascotas = [
    { id: 'comida_basica', emoji: '🍎', nombre: 'Comida Básica', precio: 80, desc: 'Alimenta mascotas (+10 felicidad)' },
    { id: 'comida_premium', emoji: '🍗', nombre: 'Comida Premium', precio: 200, desc: 'Alimenta mascotas (+30 felicidad)', nivel: 3 },
    { id: 'juguete', emoji: '🧸', nombre: 'Juguete', precio: 150, desc: 'Jugar con mascotas (+20 felicidad)' }
  ];
  
  mascotas.forEach(item => {
    const disponible = !item.nivel || user.nivel >= item.nivel;
    const icono = disponible ? '✅' : '🔒';
    const nivelReq = item.nivel && !disponible ? `(Nivel ${item.nivel}+)` : '';
    response += `${icono} ${item.emoji} *${item.nombre}* - ${item.precio.toLocaleString()} 🪙\n`;
    response += `   ${item.desc} ${nivelReq}\n`;
  });
  
  // SECCIÓN 5: PAQUETES ESPECIALES
  response += `\n🎁 *PAQUETES ESPECIALES*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const paquetes = [
    { id: 'paquete_inicio', emoji: '🎒', nombre: 'Paquete Inicial', precio: 500, desc: 'Pico + Hacha + 5 Comida (Ahorras 200)' },
    { id: 'paquete_cazador', emoji: '🏹', nombre: 'Paquete Cazador', precio: 1500, desc: 'Arco + Espada + 3 Pociones (Ahorras 500)', nivel: 5 },
    { id: 'paquete_minero', emoji: '⛏️', nombre: 'Paquete Minero', precio: 2000, desc: '2 Picos + 100 Piedras + 50 Hierro (Ahorras 800)', nivel: 7 }
  ];
  
  paquetes.forEach(item => {
    const disponible = !item.nivel || user.nivel >= item.nivel;
    const icono = disponible ? '✅' : '🔒';
    const nivelReq = item.nivel && !disponible ? `(Nivel ${item.nivel}+)` : '';
    response += `${icono} ${item.emoji} *${item.nombre}* - ${item.precio.toLocaleString()} 🪙\n`;
    response += `   ${item.desc} ${nivelReq}\n`;
  });
  
  // SECCIÓN 6: MEJORAS
  response += `\n⬆️ *MEJORAS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const mejoras = [
    { id: 'mejora_inventario', emoji: '🎒', nombre: 'Inventario +50', precio: 1000, desc: 'Aumenta capacidad de inventario' },
    { id: 'mejora_cooldown', emoji: '⏱️', nombre: 'Cooldown -20%', precio: 2000, desc: 'Reduce tiempos de espera', nivel: 5 },
    { id: 'mejora_suerte', emoji: '🍀', nombre: 'Suerte +15%', precio: 3000, desc: 'Aumenta probabilidad de rarezas', nivel: 8 }
  ];
  
  mejoras.forEach(item => {
    const disponible = !item.nivel || user.nivel >= item.nivel;
    const icono = disponible ? '✅' : '🔒';
    const nivelReq = item.nivel && !disponible ? `(Nivel ${item.nivel}+)` : '';
    response += `${icono} ${item.emoji} *${item.nombre}* - ${item.precio.toLocaleString()} 🪙\n`;
    response += `   ${item.desc} ${nivelReq}\n`;
  });
  
  // INFORMACIÓN ADICIONAL
  response += `\n📋 *INFORMACIÓN*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  response += `💡 *Tips de compra:*\n`;
  response += `• Prioriza herramientas para ganar más recursos\n`;
  response += `• Los paquetes ofrecen descuentos\n`;
  response += `• Sube de nivel para desbloquear más items\n`;
  response += `• Vende recursos que no uses (.vender)\n\n`;
  response += `🔄 *Actualizado cada:* 24 horas\n`;
  response += `📞 *Soporte:* .soporte`;

  await sock.sendMessage(from, { text: response }, { quoted: msg });
}
