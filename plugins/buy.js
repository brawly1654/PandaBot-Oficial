import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'buy';
export const aliases = ['comprar', 'compra'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .comprar <item> [cantidad]\n📋 Ejemplos:\n• .comprar pico 1\n• .comprar comida 5\n• .comprar paquete_inicio\n\n💡 Usa `.shop` para ver los items disponibles'
    }, { quoted: msg });
  }

  const itemId = args[0].toLowerCase();
  const cantidad = parseInt(args[1]) || 1;

  if (cantidad <= 0 || cantidad > 100) {
    return await sock.sendMessage(from, {
      text: '❌ Cantidad inválida. Debe ser entre 1 y 100.'
    }, { quoted: msg });
  }

  const db = cargarDatabase();
  const user = db.users?.[sender];

  if (!user) {
    return await sock.sendMessage(from, {
      text: '❌ Primero debes registrarte en el bot. Usa `.registrar`'
    }, { quoted: msg });
  }


  user.pandacoins = user.pandacoins || 0;
  user.inventario = user.inventario || {};
  user.inventario.herramientas = user.inventario.herramientas || {};
  user.inventario.recursos = user.inventario.recursos || {};
  user.inventario.especiales = user.inventario.especiales || {};
  user.inventario.mascotas = user.inventario.mascotas || {};
  user.inventario.capacidad = user.inventario.capacidad || 100;


  const todosLosItems = {
  
    pico: { tipo: 'herramienta', emoji: '⛏️', nombre: 'Pico', precio: 500, desc: 'Mejora la minería', nivel: 1 },
    hacha: { tipo: 'herramienta', emoji: '🪓', nombre: 'Hacha', precio: 300, desc: 'Mejora la tala', nivel: 1 },
    caña: { tipo: 'herramienta', emoji: '🎣', nombre: 'Caña de Pescar', precio: 200, desc: 'Mejora la pesca', nivel: 1 },
    arco: { tipo: 'herramienta', emoji: '🏹', nombre: 'Arco', precio: 800, desc: 'Mejora la caza', nivel: 3 },
    espada: { tipo: 'herramienta', emoji: '⚔️', nombre: 'Espada', precio: 1200, desc: 'Mejora la caza', nivel: 5 },
    armadura: { tipo: 'herramienta', emoji: '🛡️', nombre: 'Armadura', precio: 1500, desc: 'Mejora defensa', nivel: 8 },
    
  
    comida: { tipo: 'recurso', emoji: '🍖', nombre: 'Comida', precio: 50, desc: 'Para mascotas' },
    piedras: { tipo: 'recurso', emoji: '🪨', nombre: 'Piedras', precio: 30, desc: 'Para construcción' },
    madera: { tipo: 'recurso', emoji: '🪵', nombre: 'Madera', precio: 40, desc: 'Para construcción' },
    hierro: { tipo: 'recurso', emoji: '⚙️', nombre: 'Hierro', precio: 150, desc: 'Para herramientas' },
    oro: { tipo: 'recurso', emoji: '💰', nombre: 'Oro', precio: 300, desc: 'Para objetos especiales' },
    
  
    pocion: { tipo: 'especial', emoji: '🧪', nombre: 'Poción de Vida', precio: 300, desc: 'Cura 50 HP', nivel: 2 },
    llave: { tipo: 'especial', emoji: '🔑', nombre: 'Llave Mágica', precio: 1000, desc: 'Abre cofres', nivel: 4 },
    gema: { tipo: 'especial', emoji: '💎', nombre: 'Gema Brillante', precio: 500, desc: 'Para encantamientos', nivel: 6 },
    pergamino: { tipo: 'especial', emoji: '📜', nombre: 'Pergamino Mágico', precio: 2000, desc: 'Aprende habilidades', nivel: 10 },
    
  
    comida_basica: { tipo: 'mascota', emoji: '🍎', nombre: 'Comida Básica', precio: 80, desc: 'Para mascotas' },
    comida_premium: { tipo: 'mascota', emoji: '🍗', nombre: 'Comida Premium', precio: 200, desc: 'Para mascotas', nivel: 3 },
    juguete: { tipo: 'mascota', emoji: '🧸', nombre: 'Juguete', precio: 150, desc: 'Para mascotas' },
    
  
    paquete_inicio: { 
      tipo: 'paquete', 
      emoji: '🎒', 
      nombre: 'paquete_inicio', 
      precio: 500, 
      desc: 'Pico + Hacha + 5 Comida',
      contenido: { pico: 1, hacha: 1, comida: 5 }
    },
    paquete_cazador: {
      tipo: 'paquete',
      emoji: '🏹',
      nombre: 'paquete_cazador',
      precio: 1500,
      desc: 'Arco + Espada + 3 Pociones',
      nivel: 5,
      contenido: { arco: 1, espada: 1, pocion: 3 }
    },
    paquete_minero: {
      tipo: 'paquete',
      emoji: '⛏️',
      nombre: 'paquete_minero',
      precio: 2000,
      desc: '2 Picos + 100 Piedras + 50 Hierro',
      nivel: 7,
      contenido: { pico: 2, piedras: 100, hierro: 50 }
    },
    
   
    mejora_inventario: { tipo: 'mejora', emoji: '🎒', nombre: 'Inventario +50', precio: 1000, desc: 'Aumenta capacidad' }
  };

  
  const item = todosLosItems[itemId];
  
  if (!item) {
    return await sock.sendMessage(from, {
      text: `❌ Item "${itemId}" no encontrado.\n💡 Usa \`.shop\` para ver los items disponibles.`
    }, { quoted: msg });
  }

 
  if (item.nivel && user.nivel < item.nivel) {
    return await sock.sendMessage(from, {
      text: `❌ Necesitas nivel ${item.nivel} para comprar ${item.nombre}.\n👤 Tu nivel actual: ${user.nivel}`
    }, { quoted: msg });
  }

  
  const costoTotal = item.precio * cantidad;
  
  if (user.pandacoins < costoTotal) {
    return await sock.sendMessage(from, {
      text: `❌ No tienes suficiente dinero.\n💰 Necesitas: ${costoTotal.toLocaleString()} 🪙\n💳 Tienes: ${user.pandacoins.toLocaleString()} 🪙\n\n💡 Puedes ganar dinero con:\n• .trabajar (diario)\n• .pescar\n• .cazar\n• .minar\n• .vender recursos`
    }, { quoted: msg });
  }

 
  user.pandacoins -= costoTotal;
  

  let mensajeItems = '';
  
  if (item.tipo === 'paquete') {

    for (const [subItem, subCantidad] of Object.entries(item.contenido)) {
      const totalCantidad = subCantidad * cantidad;
      const catalog = todosLosItems[subItem] || {};
      const tipoSub = catalog.tipo;

      if (tipoSub === 'herramienta') {
        user.inventario.herramientas[subItem] = (user.inventario.herramientas[subItem] || 0) + totalCantidad;
        mensajeItems += `• ${catalog.emoji || ''} ${catalog.nombre || subItem}: +${totalCantidad}\n`;
      } else if (tipoSub === 'recurso') {
        user.inventario.recursos[subItem] = (user.inventario.recursos[subItem] || 0) + totalCantidad;
        mensajeItems += `• ${catalog.emoji || ''} ${catalog.nombre || subItem}: +${totalCantidad}\n`;
      } else if (tipoSub === 'especial') {
        user.inventario.especiales[subItem] = (user.inventario.especiales[subItem] || 0) + totalCantidad;
        mensajeItems += `• ${catalog.emoji || ''} ${catalog.nombre || subItem}: +${totalCantidad}\n`;
      } else if (tipoSub === 'mascota') {
        user.inventario.mascotas[subItem] = (user.inventario.mascotas[subItem] || 0) + totalCantidad;
        mensajeItems += `• ${catalog.emoji || ''} ${catalog.nombre || subItem}: +${totalCantidad}\n`;
      } else if (tipoSub === 'mejora') {

        if (subItem === 'mejora_inventario') {
          user.inventario.capacidad = (user.inventario.capacidad || 100) + 50 * cantidad;
          mensajeItems += `• 🎒 Capacidad de inventario: +${50 * cantidad} slots\n`;
        }
      } else {

        user.inventario.recursos[subItem] = (user.inventario.recursos[subItem] || 0) + totalCantidad;
        mensajeItems += `• ${catalog.emoji || ''} ${catalog.nombre || subItem}: +${totalCantidad}\n`;
      }
    }
  } else if (item.tipo === 'herramienta') {
    user.inventario.herramientas[itemId] = (user.inventario.herramientas[itemId] || 0) + cantidad;
    mensajeItems = `• ${item.emoji} ${item.nombre}: +${cantidad}`;
  } else if (item.tipo === 'recurso') {
    user.inventario.recursos[itemId] = (user.inventario.recursos[itemId] || 0) + cantidad;
    mensajeItems = `• ${item.emoji} ${item.nombre}: +${cantidad}`;
  } else if (item.tipo === 'especial') {
    user.inventario.especiales[itemId] = (user.inventario.especiales[itemId] || 0) + cantidad;
    mensajeItems = `• ${item.emoji} ${item.nombre}: +${cantidad}`;
  } else if (item.tipo === 'mascota') {
    user.inventario.mascotas[itemId] = (user.inventario.mascotas[itemId] || 0) + cantidad;
    mensajeItems = `• ${item.emoji} ${item.nombre}: +${cantidad}`;
  } else if (item.tipo === 'mejora') {
  
    if (itemId === 'mejora_inventario') {
      user.inventario.capacidad = (user.inventario.capacidad || 100) + 50;
      mensajeItems = `• 🎒 Capacidad de inventario: +50 slots`;
    }
  }

  
  guardarDatabase(db);

 
  let respuesta = `🛒 *COMPRA EXITOSA!*\n\n`;
  respuesta += `${item.emoji} *Item:* ${item.nombre}\n`;
  
  if (cantidad > 1) {
    respuesta += `📦 *Cantidad:* ${cantidad}\n`;
  }
  
  respuesta += `💰 *Precio unitario:* ${item.precio.toLocaleString()} 🪙\n`;
  respuesta += `💳 *Costo total:* ${costoTotal.toLocaleString()} 🪙\n`;
  respuesta += `📊 *Saldo restante:* ${user.pandacoins.toLocaleString()} 🪙\n\n`;
  
  if (mensajeItems) {
    respuesta += `📥 *Contenido recibido:*\n${mensajeItems}\n`;
  }
  
  respuesta += `📝 *Descripción:* ${item.desc}\n\n`;
  
  if (item.tipo === 'herramienta') {
    respuesta += `💡 *Uso:* Se aplica automáticamente en actividades\n`;
  } else if (item.tipo === 'recurso') {
    respuesta += `💡 *Uso:* Puedes venderlo o usarlo para crafting\n`;
  } else if (item.tipo === 'paquete') {
    respuesta += `🎁 *¡Paquete especial con descuento!*\n`;
  }
  
  respuesta += `\n🔄 *Ver tu inventario:* \`.inventario\``;

  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
}
