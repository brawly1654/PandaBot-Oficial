import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'monthly';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  // Inicializar usuario si no existe
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];

  // Verificar cooldown (30 días)
  const now = Date.now();
  const cooldown = 30 * 24 * 60 * 60 * 1000;
  
  user.cooldowns = user.cooldowns || {};
  const lastMonthly = user.cooldowns.monthly || 0;

  if (now - lastMonthly < cooldown) {
    const diasRestantes = Math.ceil((cooldown - (now - lastMonthly)) / (1000 * 60 * 60 * 24));
    const semanasRestantes = Math.floor(diasRestantes / 7);
    const diasExtra = diasRestantes % 7;
    
    let tiempoTexto = '';
    if (semanasRestantes > 0) {
      tiempoTexto += `${semanasRestantes} semana${semanasRestantes > 1 ? 's' : ''}`;
      if (diasExtra > 0) tiempoTexto += ` y ${diasExtra} día${diasExtra > 1 ? 's' : ''}`;
    } else {
      tiempoTexto += `${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`;
    }
    
    await sock.sendMessage(from, { 
      text: `⏳ *Recompensa mensual en cooldown*\n\n⏰ *Tiempo restante:* ${tiempoTexto}\n\n📅 *Vuelve el próximo mes*\n💡 *Consejo:* Mientras esperas, completa los weekly (\`.weekly\`) y daily (\`.daily\`)` 
    });
    return;
  }

  // Cálculo de recompensas basado en nivel y actividad
  const nivel = user.nivel || 1;
  const mesesConsecutivos = user.stats?.meses_consecutivos || 0;
  
  // Recompensa base escalada por nivel
  const coinsBase = 10000 + (nivel * 2000);
  const expBase = 60000 + (nivel * 10000);
  
  // Bonus por meses consecutivos
  let bonusConsecutivo = 0;
  let mensajeConsecutivo = '';
  
  if (mesesConsecutivos >= 12) {
    bonusConsecutivo = 2.0; // +200% por 12+ meses (1 año)
    mensajeConsecutivo = `🎊 *Bonus 1 año+:* +200% (¡Felicidades!)\n`;
  } else if (mesesConsecutivos >= 6) {
    bonusConsecutivo = 1.0; // +100% por 6+ meses
    mensajeConsecutivo = `🏅 *Bonus 6+ meses:* +100%\n`;
  } else if (mesesConsecutivos >= 3) {
    bonusConsecutivo = 0.5; // +50% por 3+ meses
    mensajeConsecutivo = `🏆 *Bonus 3+ meses:* +50%\n`;
  }
  
  // Bonus por actividad del mes
  const dailiesEsteMes = user.stats?.dailies_este_mes || 0;
  const weekliesEsteMes = user.stats?.weeklies_este_mes || 0;
  const actividadesEsteMes = (user.stats?.pescas_mes || 0) + 
                             (user.stats?.cazas_mes || 0) + 
                             (user.stats?.minas_mes || 0);
  
  let bonusActividad = 0;
  let mensajeActividad = '';
  
  if (dailiesEsteMes >= 28 && weekliesEsteMes >= 4 && actividadesEsteMes >= 300) {
    bonusActividad = 0.8; // +80% por actividad completa
    mensajeActividad = `⭐ *Actividad completa:* +80%\n`;
  } else if (dailiesEsteMes >= 20 && weekliesEsteMes >= 3 && actividadesEsteMes >= 200) {
    bonusActividad = 0.5; // +50% por buena actividad
    mensajeActividad = `⭐ *Buena actividad:* +50%\n`;
  } else if (dailiesEsteMes >= 15 && weekliesEsteMes >= 2) {
    bonusActividad = 0.2; // +20% por actividad básica
    mensajeActividad = `⭐ *Actividad básica:* +20%\n`;
  }
  
  // Cálculo final de recompensas
  let coinsGanados = coinsBase + Math.floor(Math.random() * 6000);
  let expGanada = expBase + Math.floor(Math.random() * 20000);
  
  // Aplicar bonuses
  coinsGanados = Math.floor(coinsGanados * (1 + bonusConsecutivo + bonusActividad));
  expGanada = Math.floor(expGanada * (1 + bonusConsecutivo + bonusActividad));
  
  // Recompensas especiales mensuales
  const mesActual = new Date().getMonth() + 1;
  let recompensaEspecial = null;
  let paqueteEspecial = null;
  
  // Recompensa según el mes
  const recompensasMensuales = [
    { mes: 1,  nombre: 'Año Nuevo',      tipo: 'rubies', cantidad: 3, emoji: '❤️' },
    { mes: 2,  nombre: 'San Valentín',   tipo: 'corazon', cantidad: 5, emoji: '💖' },
    { mes: 3,  nombre: 'Primavera',      tipo: 'flores', cantidad: 10, emoji: '🌸' },
    { mes: 4,  nombre: 'Abril',          tipo: 'diamantes', cantidad: 4, emoji: '💎' },
    { mes: 5,  nombre: 'Mayo',           tipo: 'oro', cantidad: 8, emoji: '💰' },
    { mes: 6,  nombre: 'Verano',         tipo: 'esmeraldas', cantidad: 5, emoji: '💚' },
    { mes: 7,  nombre: 'Independencia',  tipo: 'bandera', cantidad: 1, emoji: '🇨🇱' },
    { mes: 8,  nombre: 'Invierno',       tipo: 'nieve', cantidad: 7, emoji: '❄️' },
    { mes: 9,  nombre: 'Primavera',      tipo: 'hojas', cantidad: 9, emoji: '🍂' },
    { mes: 10, nombre: 'Halloween',      tipo: 'calabaza', cantidad: 3, emoji: '🎃' },
    { mes: 11, nombre: 'Acción de Gracias', tipo: 'pavo', cantidad: 1, emoji: '🦃' },
    { mes: 12, nombre: 'Navidad',        tipo: 'regalo', cantidad: 12, emoji: '🎁' }
  ];
  
  recompensaEspecial = recompensasMensuales.find(r => r.mes === mesActual);
  
  // Paquete especial por nivel
  if (nivel >= 30) {
    paqueteEspecial = {
      nombre: 'Paquete Élite',
      contenido: { pico: 2, espada: 1, armadura: 1, pergamino: 1 },
      emoji: '👑'
    };
  } else if (nivel >= 20) {
    paqueteEspecial = {
      nombre: 'Paquete Avanzado',
      contenido: { pico: 1, arco: 1, llave: 2, pocion: 5 },
      emoji: '⚔️'
    };
  } else if (nivel >= 10) {
    paqueteEspecial = {
      nombre: 'Paquete Intermedio',
      contenido: { hacha: 1, caña: 1, comida: 20, piedras: 50 },
      emoji: '🎒'
    };
  }

  // ACTUALIZAR RECURSOS DEL USUARIO
  user.pandacoins += coinsGanados;
  user.exp += expGanada;
  
  // Agregar meses consecutivos
  const nuevosMesesConsecutivos = mesesConsecutivos + 1;
  user.stats.meses_consecutivos = nuevosMesesConsecutivos;
  
  // Agregar recompensa especial del mes
  if (recompensaEspecial) {
    // Para propósitos especiales, guardamos en recursos
    user.inventario.recursos[recompensaEspecial.tipo] = 
      (user.inventario.recursos[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
  }
  
  // Agregar paquete especial
  if (paqueteEspecial) {
    for (const [item, cantidad] of Object.entries(paqueteEspecial.contenido)) {
      if (['pico', 'hacha', 'caña', 'arco', 'espada', 'armadura'].includes(item)) {
        user.inventario.herramientas[item] = (user.inventario.herramientas[item] || 0) + cantidad;
      } else if (['llave', 'pocion', 'pergamino'].includes(item)) {
        user.inventario.especiales[item] = (user.inventario.especiales[item] || 0) + cantidad;
      } else {
        user.inventario.recursos[item] = (user.inventario.recursos[item] || 0) + cantidad;
      }
    }
  }
  
  // Recompensa por hitos
  let hitos = [];
  if (actividadesEsteMes >= 500) {
    const bonusHito = Math.floor(coinsGanados * 0.2);
    user.pandacoins += bonusHito;
    coinsGanados += bonusHito;
    hitos.push(`🏅 +${bonusHito.toLocaleString()} coins por 500+ actividades`);
  }
  
  if (dailiesEsteMes >= 30) {
    user.inventario.especiales.llave = (user.inventario.especiales.llave || 0) + 3;
    hitos.push(`🔑 +3 Llaves por 30+ dailies`);
  }
  
  // Verificar subida de nivel
  const expParaSubir = nivel * 100;
  let subioNivel = false;
  
  if (user.exp >= expParaSubir) {
    const nivelesSubidos = Math.floor(user.exp / expParaSubir);
    user.nivel += nivelesSubidos;
    user.exp = user.exp % expParaSubir;
    subioNivel = true;
    
    // Bonus por subir nivel al reclamar monthly
    const bonusNivel = 5000 * nivelesSubidos;
    user.pandacoins += bonusNivel;
    coinsGanados += bonusNivel;
  }
  
  // Reiniciar contadores mensuales
  user.stats.dailies_este_mes = 0;
  user.stats.weeklies_este_mes = 0;
  user.stats.pescas_mes = 0;
  user.stats.cazas_mes = 0;
  user.stats.minas_mes = 0;
  
  // Actualizar cooldown
  user.cooldowns.monthly = now;
  
  // Guardar cambios
  guardarDatabase(db);

  // CONSTRUIR MENSAJE DE RESPUESTA
  let respuesta = `📅 *¡RECOMPENSA MENSUAL RECLAMADA!* 📅\n\n`;
  
  // Información del usuario
  respuesta += `👤 *Usuario:* @${sender.split('@')[0]}\n`;
  respuesta += `⭐ *Nivel:* ${user.nivel}\n`;
  respuesta += `📅 *Meses consecutivos:* ${nuevosMesesConsecutivos}\n`;
  respuesta += `📊 *Resumen del mes:*\n`;
  respuesta += `   📅 Dailies: ${dailiesEsteMes}/30\n`;
  respuesta += `   🗓️ Weeklies: ${weekliesEsteMes}/4\n`;
  respuesta += `   🏆 Actividades: ${actividadesEsteMes}\n\n`;
  
  // Recompensas principales
  respuesta += `💰 *RECOMPENSAS PRINCIPALES:*\n`;
  respuesta += `🪙 Pandacoins: +${coinsGanados.toLocaleString()} (Total: ${user.pandacoins.toLocaleString()})\n`;
  respuesta += `⭐ Experiencia: +${expGanada} (Nivel ${user.nivel}: ${user.exp}/${expParaSubir})\n\n`;
  
  // Mostrar bonuses aplicados
  respuesta += `✨ *BONUS APLICADOS:*\n`;
  if (mensajeConsecutivo) respuesta += mensajeConsecutivo;
  if (mensajeActividad) respuesta += mensajeActividad;
  
  // Mostrar hitos alcanzados
  if (hitos.length > 0) {
    respuesta += `\n🎯 *HITOS ALCANZADOS:*\n`;
    hitos.forEach(hito => respuesta += `${hito}\n`);
  }
  
  // Mostrar recompensa especial del mes
  if (recompensaEspecial) {
    respuesta += `\n🎁 *RECOMPENSA ESPECIAL DE ${recompensaEspecial.nombre.toUpperCase()}:*\n`;
    respuesta += `${recompensaEspecial.emoji} ${recompensaEspecial.tipo}: +${recompensaEspecial.cantidad}\n`;
  }
  
  // Mostrar paquete especial
  if (paqueteEspecial) {
    respuesta += `\n🎪 *PAQUETE ESPECIAL (Nivel ${nivel}+):*\n`;
    respuesta += `${paqueteEspecial.emoji} ${paqueteEspecial.nombre}\n`;
    for (const [item, cantidad] of Object.entries(paqueteEspecial.contenido)) {
      const emojisItems = {
        pico: '⛏️', hacha: '🪓', caña: '🎣', arco: '🏹', espada: '⚔️', armadura: '🛡️',
        llave: '🔑', pocion: '🧪', pergamino: '📜', comida: '🍖', piedras: '🪨'
      };
      respuesta += `   ${emojisItems[item] || '📦'} ${item}: +${cantidad}\n`;
    }
  }
  
  // Si subió de nivel
  if (subioNivel) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL RECLAMANDO EL MONTHLY!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+${5000 * Math.floor(user.exp / expParaSubir)} coins de bonus\n`;
  }
  
  // Próxima recompensa
  const siguienteMonthly = new Date(now + cooldown);
  const fechaSiguiente = siguienteMonthly.toLocaleDateString('es-ES', { 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  respuesta += `\n⏰ *Próxima recompensa:* ${fechaSiguiente}\n`;
  
  // Consejos para el próximo mes
  respuesta += `\n💡 *CONSEJOS PARA EL PRÓXIMO MES:*\n`;
  respuesta += `• Reclama el daily todos los días (objetivo: 30/30)\n`;
  respuesta += `• No te pierdas los weeklies (objetivo: 4/4)\n`;
  respuesta += `• Haz al menos 15 actividades diarias (450+/mes)\n`;
  respuesta += `• Mantén tu racha de meses para bonus mayores\n\n`;
  
  respuesta += `🔧 *COMANDOS RELACIONADOS:*\n`;
  respuesta += `• \`.daily\` - Recompensa diaria\n`;
  respuesta += `• \`.weekly\` - Recompensa semanal\n`;
  respuesta += `• \`.inventario\` - Ver todo lo que ganaste\n`;
  respuesta += `• \`.shop\` - Gastar tus recompensas\n`;
  
  // Footer especial para meses consecutivos
  respuesta += `\n━━━━━━━━━━━━━━━━━━━\n`;
  if (nuevosMesesConsecutivos >= 12) {
    respuesta += `🎊 *¡FELICIDADES POR 1 AÑO CONSECUTIVO!*\n`;
    respuesta += `🏆 Eres un jugador legendario`;
  } else if (nuevosMesesConsecutivos >= 6) {
    respuesta += `🏅 *¡Excelente compromiso de medio año!*\n`;
    respuesta += `⭐ Sigue así para convertirte en leyenda`;
  } else {
    respuesta += `🎮 *¡Gracias por jugar este mes!*\n`;
    respuesta += `📈 Cada mes es una nueva oportunidad`;
  }

  await sock.sendMessage(from, { 
    text: respuesta,
    mentions: [sender]
  });
}
