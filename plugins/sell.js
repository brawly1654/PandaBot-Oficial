import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'sell';
export const aliases = ['vender'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  if (args.length < 2) {
    return await sock.sendMessage(from, {
      text: '❌ Uso: .vender <recurso> <cantidad>\n📋 Ejemplos:\n• .vender pescado 5\n• .vender carne 10\n• .vender oro 2\n\n💡 Usa \`.inventario\` para ver tus recursos'
    }, { quoted: msg });
  }

  const recurso = args[0].toLowerCase();
  const cantidad = parseInt(args[1]);

  if (isNaN(cantidad) || cantidad <= 0 || cantidad > 1000) {
    return await sock.sendMessage(from, {
      text: '❌ Cantidad inválida. Debe ser entre 1 y 1000.'
    }, { quoted: msg });
  }

  const db = cargarDatabase();
  const user = db.users?.[sender];

  if (!user) {
    return await sock.sendMessage(from, {
      text: '❌ Primero debes registrarte en el bot. Usa `.registrar`'
    }, { quoted: msg });
  }

  // Precios de venta (80% del precio de compra)
  const preciosVenta = {
    // Recursos
    pescado: 40,      // Compra: 50
    carne: 56,        // Compra: 70
    madera: 32,       // Compra: 40
    oro: 240,         // Compra: 300
    diamantes: 400,   // Compra: 500
    piedras: 24,      // Compra: 30
    comida: 40,       // Compra: 50
    hierro: 120,      // Compra: 150
    carbon: 32,       // Compra: 40
    cuero: 48,        // Compra: 60
    tela: 36,         // Compra: 45
    plata: 120,       // Compra: 150
    esmeraldas: 640,  // Compra: 800
    rubies: 800,      // Compra: 1000
    
    // Herramientas (50% del precio)
    pico: 250,
    hacha: 150,
    caña: 100,
    arco: 400,
    espada: 600,
    armadura: 750
  };

  // Verificar si el recurso existe
  if (!preciosVenta[recurso]) {
    const recursosValidos = Object.keys(preciosVenta).join(', ');
    return await sock.sendMessage(from, {
      text: `❌ Recurso "${recurso}" no válido.\n\n📋 Recursos vendibles:\n${recursosValidos}\n\n💡 Usa \`.inventario\` para ver lo que tienes`
    }, { quoted: msg });
  }

  // Verificar si tiene el recurso
  let cantidadActual = 0;
  let categoria = '';
  
  // Buscar en diferentes categorías
  if (user.inventario?.recursos?.[recurso] > 0) {
    categoria = 'recursos';
    cantidadActual = user.inventario.recursos[recurso];
  } else if (user.inventario?.herramientas?.[recurso] > 0) {
    categoria = 'herramientas';
    cantidadActual = user.inventario.herramientas[recurso];
  } else {
    return await sock.sendMessage(from, {
      text: `❌ No tienes "${recurso}" para vender.\n📊 Tienes: 0\n📊 Quieres vender: ${cantidad}`
    }, { quoted: msg });
  }

  if (cantidadActual < cantidad) {
    return await sock.sendMessage(from, {
      text: `❌ No tienes suficiente "${recurso}".\n📊 Tienes: ${cantidadActual}\n📊 Quieres vender: ${cantidad}`
    }, { quoted: msg });
  }

  // Calcular ganancia
  const precioUnitario = preciosVenta[recurso];
  const gananciaTotal = precioUnitario * cantidad;

  // Actualizar inventario
  if (categoria === 'recursos') {
    user.inventario.recursos[recurso] -= cantidad;
    if (user.inventario.recursos[recurso] <= 0) {
      delete user.inventario.recursos[recurso];
    }
  } else if (categoria === 'herramientas') {
    user.inventario.herramientas[recurso] -= cantidad;
    if (user.inventario.herramientas[recurso] <= 0) {
      delete user.inventario.herramientas[recurso];
    }
  }

  // Agregar dinero
  user.pandacoins += gananciaTotal;
  
  // Registrar estadística
  user.stats = user.stats || {};
  user.stats.ventas = (user.stats.ventas || 0) + cantidad;
  user.stats.ganancias_ventas = (user.stats.ganancias_ventas || 0) + gananciaTotal;

  // Guardar cambios
  guardarDatabase(db);

  // Emojis para los recursos
  const emojis = {
    pescado: '🐟', carne: '🥩', madera: '🪵', oro: '💰',
    diamantes: '💎', piedras: '🪨', comida: '🍖', hierro: '⚙️',
    carbon: '🪨', cuero: '🧵', tela: '👕', plata: '🥈',
    esmeraldas: '💚', rubies: '❤️',
    pico: '⛏️', hacha: '🪓', caña: '🎣', arco: '🏹',
    espada: '⚔️', armadura: '🛡️'
  };

  const emoji = emojis[recurso] || '📦';

  // Mensaje de respuesta
  let respuesta = `🏪 *VENTA EXITOSA!*\n\n`;
  respuesta += `${emoji} *Recurso:* ${recurso}\n`;
  respuesta += `📦 *Cantidad vendida:* ${cantidad}\n`;
  respuesta += `💰 *Precio unitario:* ${precioUnitario} 🪙\n`;
  respuesta += `💎 *Ganancia total:* ${gananciaTotal.toLocaleString()} 🪙\n`;
  respuesta += `📊 *Quedan:* ${cantidadActual - cantidad}\n`;
  respuesta += `💳 *Saldo total:* ${user.pandacoins.toLocaleString()} 🪙\n\n`;
  
  // Consejos según el recurso
  respuesta += `💡 *Consejo:* `;
  if (recurso === 'oro' || recurso === 'diamantes') {
    respuesta += `Estos recursos son valiosos, considera guardarlos para crafting.\n`;
  } else if (categoria === 'herramientas') {
    respuesta += `Las herramientas solo se venden al 50% de su valor original.\n`;
  } else {
    respuesta += `Puedes obtener más con \`.pescar\`, \`.cazar\`, etc.\n`;
  }
  
  respuesta += `\n📈 *Estadísticas de ventas:*\n`;
  respuesta += `📦 Total vendido: ${user.stats.ventas || 0} items\n`;
  respuesta += `💰 Total ganado: ${(user.stats.ganancias_ventas || 0).toLocaleString()} 🪙\n`;
  
  respuesta += `\n🔄 *Volver a comprar:* \`.shop\``;

  await sock.sendMessage(from, { text: respuesta }, { quoted: msg });
}
