import { cargarDatabase } from '../data/database.js';

export const command = 'inv'
export const aliases = ['inventario', 'miscosas'];

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

  // Inicializar inventario si no existe
  if (!user.inventario) {
    user.inventario = {
      recursos: {},
      herramientas: {},
      especiales: {},
      mascotas: {}
    };
  }

  // Función para formatear cantidad
  const formatCantidad = (cant) => {
    if (cant >= 1000000) return `${(cant / 1000000).toFixed(1)}M`;
    if (cant >= 1000) return `${(cant / 1000).toFixed(1)}K`;
    return cant.toString();
  };

  // Construir respuesta
  let response = `🎒 *INVENTARIO DE @${sender.split('@')[0]}*\n\n`;
  
  // CABECERA CON ESTADÍSTICAS
  response += `📊 *ESTADÍSTICAS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  response += `👤 Nivel: ${user.nivel || 1}\n`;
  response += `⭐ Experiencia: ${user.exp || 0}/${(user.nivel || 1) * 100}\n`;
  response += `💰 Pandacoins: ${user.pandacoins?.toLocaleString() || 0} 🪙\n`;
  
  // Estadísticas de actividades
  if (user.stats) {
    response += `\n🏆 *ACTIVIDADES*\n`;
    response += `🎣 Pescas: ${user.stats.pescas || 0}\n`;
    response += `🏹 Cazas: ${user.stats.cazas || 0}\n`;
    response += `⛏️ Minas: ${user.stats.minas || 0}\n`;
    response += `🪓 Talas: ${user.stats.talas || 0}\n`;
  }
  
  // SECCIÓN 1: HERRAMIENTAS ACTIVAS
  response += `\n⚒️ *HERRAMIENTAS ACTIVAS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const herramientas = [
    { key: 'pico', emoji: '⛏️', nombre: 'Pico' },
    { key: 'hacha', emoji: '🪓', nombre: 'Hacha' },
    { key: 'caña', emoji: '🎣', nombre: 'Caña' },
    { key: 'arco', emoji: '🏹', nombre: 'Arco' },
    { key: 'espada', emoji: '⚔️', nombre: 'Espada' },
    { key: 'armadura', emoji: '🛡️', nombre: 'Armadura' }
  ];
  
  let tieneHerramientas = false;
  herramientas.forEach(herramienta => {
    const cantidad = user.inventario.herramientas?.[herramienta.key] || 0;
    if (cantidad > 0) {
      response += `${herramienta.emoji} *${herramienta.nombre}:* ${cantidad}\n`;
      tieneHerramientas = true;
      
      // Mostrar bonus de la herramienta
      switch(herramienta.key) {
        case 'pico':
          response += `   ⚡ Bonus: +100% recursos al minar\n`;
          break;
        case 'hacha':
          response += `   ⚡ Bonus: +80% madera al talar\n`;
          break;
        case 'caña':
          response += `   ⚡ Bonus: +50% pescado\n`;
          break;
        case 'arco':
          response += `   ⚡ Bonus: +40% carne al cazar\n`;
          break;
        case 'espada':
          response += `   ⚡ Bonus: +100% cuero al cazar\n`;
          break;
        case 'armadura':
          response += `   ⚡ Bonus: +30% defensa\n`;
          break;
      }
    }
  });
  
  if (!tieneHerramientas) {
    response += `🔨 No tienes herramientas\n`;
    response += `💡 Compra en \`.shop\` para mejorar\n`;
  }
  
  // SECCIÓN 2: RECURSOS
  response += `\n📦 *RECURSOS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const recursosOrdenados = [
    { key: 'oro', emoji: '💰', nombre: 'Oro' },
    { key: 'diamantes', emoji: '💎', nombre: 'Diamantes' },
    { key: 'esmeraldas', emoji: '💚', nombre: 'Esmeraldas' },
    { key: 'rubies', emoji: '❤️', nombre: 'Rubíes' },
    { key: 'plata', emoji: '🥈', nombre: 'Plata' },
    { key: 'hierro', emoji: '⚙️', nombre: 'Hierro' },
    { key: 'carbon', emoji: '🪨', nombre: 'Carbón' },
    { key: 'piedras', emoji: '🪨', nombre: 'Piedras' },
    { key: 'carne', emoji: '🥩', nombre: 'Carne' },
    { key: 'pescado', emoji: '🐟', nombre: 'Pescado' },
    { key: 'madera', emoji: '🪵', nombre: 'Madera' },
    { key: 'comida', emoji: '🍖', nombre: 'Comida' },
    { key: 'cuero', emoji: '🧵', nombre: 'Cuero' },
    { key: 'tela', emoji: '👕', nombre: 'Tela' }
  ];
  
  let tieneRecursos = false;
  let recursosTexto = '';
  
  recursosOrdenados.forEach(recurso => {
    const cantidad = user.inventario.recursos?.[recurso.key] || 0;
    if (cantidad > 0) {
      const formateado = cantidad >= 1000 ? formatCantidad(cantidad) : cantidad;
      recursosTexto += `${recurso.emoji} *${recurso.nombre}:* ${formateado}\n`;
      tieneRecursos = true;
    }
  });
  
  if (tieneRecursos) {
    response += recursosTexto;
  } else {
    response += `📭 No tienes recursos\n`;
    response += `💡 Consigue con \`.pescar\`, \`.cazar\`, etc.\n`;
  }
  
  // SECCIÓN 3: OBJETOS ESPECIALES
  response += `\n✨ *OBJETOS ESPECIALES*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const especiales = [
    { key: 'pocion', emoji: '🧪', nombre: 'Poción' },
    { key: 'llave', emoji: '🔑', nombre: 'Llave' },
    { key: 'gema', emoji: '💎', nombre: 'Gema' },
    { key: 'pergamino', emoji: '📜', nombre: 'Pergamino' }
  ];
  
  let tieneEspeciales = false;
  especiales.forEach(especial => {
    const cantidad = user.inventario.especiales?.[especial.key] || 0;
    if (cantidad > 0) {
      response += `${especial.emoji} *${especial.nombre}:* ${cantidad}\n`;
      tieneEspeciales = true;
    }
  });
  
  if (!tieneEspeciales) {
    response += `🎁 No tienes objetos especiales\n`;
    response += `💡 Consíguelos en misiones o comprando\n`;
  }
  
  // SECCIÓN 4: MASCOTAS
  response += `\n🐾 *ITEMS DE MASCOTAS*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  const mascotasItems = [
    { key: 'comida_basica', emoji: '🍎', nombre: 'Comida Básica' },
    { key: 'comida_premium', emoji: '🍗', nombre: 'Comida Premium' },
    { key: 'juguetes', emoji: '🧸', nombre: 'Juguetes' }
  ];
  
  let tieneMascotasItems = false;
  mascotasItems.forEach(item => {
    const cantidad = user.inventario.mascotas?.[item.key] || 0;
    if (cantidad > 0) {
      response += `${item.emoji} *${item.nombre}:* ${cantidad}\n`;
      tieneMascotasItems = true;
    }
  });
  
  if (!tieneMascotasItems) {
    response += `🐕 No tienes items para mascotas\n`;
    response += `💡 Compra en \`.shop\` o usa \`.mascota\`\n`;
  }
  
  // SECCIÓN 5: VALOR TOTAL ESTIMADO
  response += `\n💰 *VALOR ESTIMADO*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  
  let valorTotal = user.pandacoins || 0;
  
  // Calcular valor de recursos (precios base)
  const preciosRecursos = {
    oro: 300, diamantes: 500, esmeraldas: 800, rubies: 1000,
    plata: 150, hierro: 150, carbon: 40, piedras: 30,
    carne: 70, pescado: 50, madera: 40, comida: 50,
    cuero: 60, tela: 45
  };
  
  for (const [recurso, cantidad] of Object.entries(user.inventario.recursos || {})) {
    if (preciosRecursos[recurso]) {
      valorTotal += preciosRecursos[recurso] * cantidad;
    }
  }
  
  // Calcular valor de herramientas
  const preciosHerramientas = {
    pico: 500, hacha: 300, caña: 200, arco: 800, espada: 1200, armadura: 1500
  };
  
  for (const [herramienta, cantidad] of Object.entries(user.inventario.herramientas || {})) {
    if (preciosHerramientas[herramienta]) {
      valorTotal += preciosHerramientas[herramienta] * cantidad;
    }
  }
  
  // Calcular valor de especiales
  const preciosEspeciales = {
    pocion: 300, llave: 1000, gema: 500, pergamino: 2000
  };
  
  for (const [especial, cantidad] of Object.entries(user.inventario.especiales || {})) {
    if (preciosEspeciales[especial]) {
      valorTotal += preciosEspeciales[especial] * cantidad;
    }
  }
  
  response += `📈 Valor total estimado: ${valorTotal.toLocaleString()} 🪙\n`;
  response += `💼 Riqueza personal: ${user.pandacoins?.toLocaleString() || 0} 🪙\n`;
  response += `📦 Valor en items: ${(valorTotal - (user.pandacoins || 0)).toLocaleString()} 🪙\n`;
  
  // SECCIÓN 6: COMANDOS ÚTILES
  response += `\n🔧 *COMANDOS ÚTILES*\n`;
  response += `━━━━━━━━━━━━━━━━━━━\n`;
  response += `🛒 \`.shop\` - Ver tienda\n`;
  response += `💰 \`.vender <recurso> <cantidad>\` - Vender recursos\n`;
  response += `🎣 \`.pescar\` - Pescar recursos\n`;
  response += `🏹 \`.cazar\` - Cazar animales\n`;
  response += `⛏️ \`.minar\` - Minar minerales\n`;
  response += `🪓 \`.talar\` - Talar madera\n`;
  response += `💼 \`.trabajar\` - Trabajo diario\n`;
  
  // PIE DE PÁGINA
  response += `\n━━━━━━━━━━━━━━━━━━━\n`;
  response += `📅 Actualizado: ${new Date().toLocaleTimeString()}\n`;
  response += `💾 Total items: ${Object.keys(user.inventario.recursos || {}).length + Object.keys(user.inventario.herramientas || {}).length}`;

  await sock.sendMessage(from, { 
    text: response,
    mentions: [sender]
  }, { quoted: msg });
}
