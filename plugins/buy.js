import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'buy';
export const aliases = ['comprar']
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

  // Definir todos los items disponibles
  const todosLosItems = {
    // HERRAMIENTAS
    pico: { tipo: 'herramienta', emoji: '⛏️', nombre: 'Pico', precio: 500, desc: 'Mejora la minería', nivel: 1 },
    hacha: { tipo: 'herramienta', emoji: '🪓', nombre: 'Hacha', precio: 300, desc: 'Mejora la tala', nivel: 1 },
    caña: { tipo: 'herramienta', emoji: '🎣', nombre: 'Caña de Pescar', precio: 200, desc: 'Mejora la pesca', nivel: 1 },
    arco: { tipo: 'herramienta', emoji: '🏹', nombre: 'Arco', precio: 800, desc: 'Mejora la caza', nivel: 3 },
    espada: { tipo: 'herramienta', emoji: '⚔️', nombre: 'Espada', precio: 1200, desc: 'Mejora la caza', nivel: 5 },
    armadura: { tipo: 'herramienta', emoji: '🛡️', nombre: 'Armadura', precio: 1500, desc: 'Mejora defensa', nivel: 8 },
    
    // RECURSOS
    comida: { tipo: 'recurso', emoji: '🍖', nombre: 'Comida', precio: 50, desc: 'Para mascotas' },
    piedras: { tipo: 'recurso', emoji: '🪨', nombre: 'Piedras', precio: 30, desc: 'Para construcción' },
    madera: { tipo: 'recurso', emoji: '🪵', nombre: 'Madera', precio: 40, desc: 'Para construcción' },
    hierro: { tipo: 'recurso', emoji: '⚙️', nombre: 'Hierro', precio: 150, desc: 'Para herramientas' },
    oro: { tipo: 'recurso', emoji: '💰', nombre: 'Oro', precio: 300, desc: 'Para objetos especiales' },
    
    // ESPECIALES
    pocion: { tipo: 'especial', emoji: '🧪', nombre: 'Poción de Vida', precio: 300, desc: 'Cura 50 HP', nivel: 2 },
    llave: { tipo: 'especial', emoji: '🔑', nombre: 'Llave Mágica', precio: 1000, desc: 'Abre cofres', nivel: 4 },
    gema: { tipo: 'especial', emoji: '💎', nombre: 'Gema Brillante', precio: 500, desc: 'Para encantamientos', nivel: 6 },
    pergamino: { tipo: 'especial', emoji: '📜', nombre: 'Pergamino Mágico', precio: 2000, desc: 'Aprende habilidades', nivel: 10 },
    
    // MASCOTAS
    comida_basica: { tipo: 'mascota', emoji: '🍎', nombre: 'Comida Básica', precio: 80, desc: 'Para mascotas' },
    comida_premium: { tipo: 'mascota', emoji: '🍗', nombre: 'Comida Premium', precio: 200, desc: 'Para mascotas', nivel: 3 },
    juguete: { tipo: 'mascota', emoji: '🧸', nombre: 'Juguete', precio: 150, desc: 'Para mascotas' },
    
    // PAQUETES
    paquete_inicio: { 
      tipo: 'paquete', 
      emoji: '🎒', 
      nombre: 'Paquete Inicial', 
      precio: 500, 
      desc: 'Pico + Hacha + 5 Comida',
      contenido: { pico: 1, hacha: 1, comida: 5 }
    },
    
    // MEJORAS
    mejora_inventario: { tipo: 'mejora', emoji: '🎒', nombre: 'Inventario +50', precio: 1000, desc: 'Aumenta capacidad' }
  };

  // Buscar el item
  const item = todosLosItems[itemId];
  
  if (!item) {
    return await sock.sendMessage(from, {
      text: `❌ Item "${itemId}" no encontrado.\n💡 Usa \`.shop\` para ver los items disponibles.`
    }, { quoted: msg });
  }

  // Verificar nivel requerido
  if (item.nivel && user.nivel < item.nivel) {
    return await sock.sendMessage(from, {
      text: `❌ Necesitas nivel ${item.nivel} para comprar ${item.nombre}.\n👤 Tu nivel actual: ${user.nivel}`
    }, { quoted: msg });
  }

  // Calcular costo total
  const costoTotal = item.precio * cantidad;
  
  if (user.pandacoins < costoTotal) {
    return await sock.sendMessage(from, {
      text: `❌ No tienes suficiente dinero.\n💰 Necesitas: ${costoTotal.toLocaleString()} 🪙\n💳 Tienes: ${user.pandacoins.toLocaleString()} 🪙\n\n💡 Puedes ganar dinero con:\n• .trabajar (diario)\n• .pescar\n• .cazar\n• .minar\n• .vender recursos`
    }, { quoted: msg });
  }

  // Realizar la compra
  user.pandacoins -= costoTotal;
  
  // Manejar diferentes tipos de items
  let mensajeItems = '';
  
  if (item.tipo === 'paquete') {
    // Paquetes especiales
    for (const [subItem, subCantidad] of Object.entries(item.contenido)) {
      const totalCantidad = subCantidad * cantidad;
      
      if (todosLosItems[subItem].tipo === 'herramienta') {
        user.inventario.herramientas[subItem] = (user.inventario.herramientas[subItem] || 0) + totalCantidad;
        mensajeItems += `• ${todosLosItems[subItem].emoji} ${todosLosItems[subItem].nombre}: +${totalCantidad}\n`;
      } else if (todosLosItems[subItem].tipo === 'recurso') {
        user.inventario.recursos[subItem] = (user.inventario.recursos[subItem] || 0) + totalCantidad;
        mensajeItems += `• ${todosLosItems[subItem].emoji} ${todosLosItems[subItem].nombre}: +${totalCantidad}\n`;
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
    // Las mejoras se aplican directamente
    if (itemId === 'mejora_inventario') {
      user.inventario.capacidad = (user.inventario.capacidad || 100) + 50;
      mensajeItems = `• 🎒 Capacidad de inventario: +50 slots`;
    }
  }

  // Guardar cambios
  guardarDatabase(db);

  // Mensaje de confirmación
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
