import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'daily';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  // Inicializar usuario si no existe
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];

  // Verificar cooldown
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000; // 24 horas
  
  // Inicializar cooldowns si no existen
  user.cooldowns = user.cooldowns || {};
  const lastDaily = user.cooldowns.daily || 0;

  if (now - lastDaily < cooldown) {
    const horasRestantes = Math.ceil((cooldown - (now - lastDaily)) / (1000 * 60 * 60));
    const minutosRestantes = Math.ceil(((cooldown - (now - lastDaily)) % (1000 * 60 * 60)) / (1000 * 60));
    
    await sock.sendMessage(from, { 
      text: `⏳ *Recompensa diaria en cooldown*\n\n⏰ *Tiempo restante:* ${horasRestantes}h ${minutosRestantes}m\n\n📅 *Vuelve mañana a la misma hora*\n💡 *Consejo:* Mientras esperas, usa:\n• \`.pescar\`\n• \`.cazar\`\n• \`.minar\`\n• \`.trabajar\`` 
    });
    return;
  }

  // Cálculo de recompensas basado en nivel y estadísticas
  const nivel = user.nivel || 1;
  const diasConsecutivos = user.stats?.dias_consecutivos || 0;
  
  // Recompensa base escalada por nivel
  const coinsBase = 400 + (nivel * 100);
  const expBase = 6000 + (nivel * 500);
  
  // Bonus por días consecutivos
  let bonusConsecutivo = 0;
  let mensajeBonus = '';
  
  if (diasConsecutivos >= 7) {
    bonusConsecutivo = 0.5; // +50% por 7+ días
    mensajeBonus = `🎯 *Bonus 7+ días:* +50%\n`;
  } else if (diasConsecutivos >= 3) {
    bonusConsecutivo = 0.25; // +25% por 3+ días
    mensajeBonus = `🎯 *Bonus 3+ días:* +25%\n`;
  }
  
  // Bonus por actividades completadas
  let bonusActividades = 0;
  const actividadesCompletadas = (user.stats?.pescas || 0) + (user.stats?.cazas || 0) + (user.stats?.minas || 0);
  
  if (actividadesCompletadas >= 50) {
    bonusActividades = 0.3; // +30% por ser activo
  } else if (actividadesCompletadas >= 20) {
    bonusActividades = 0.15; // +15% por ser activo
  }
  
  // Cálculo final de recompensas
  let coinsGanados = coinsBase + Math.floor(Math.random() * 1000);
  let expGanada = expBase + Math.floor(Math.random() * 2000);
  
  // Aplicar bonuses
  coinsGanados = Math.floor(coinsGanados * (1 + bonusConsecutivo + bonusActividades));
  expGanada = Math.floor(expGanada * (1 + bonusConsecutivo + bonusActividades));
  
  // Recompensas especiales por días específicos
  const diaSemana = new Date().getDay();
  let recompensaEspecial = null;
  let mensajeEspecial = '';
  
  switch(diaSemana) {
    case 0: // Domingo
      recompensaEspecial = { tipo: 'diamantes', cantidad: 1 };
      mensajeEspecial = `✨ *Bonus domingo:* +1 💎 Diamante\n`;
      break;
    case 3: // Miércoles
      recompensaEspecial = { tipo: 'oro', cantidad: 2 };
      mensajeEspecial = `✨ *Bonus miércoles:* +2 💰 Oro\n`;
      break;
    case 5: // Viernes
      recompensaEspecial = { tipo: 'pocion', cantidad: 2 };
      mensajeEspecial = `✨ *Bonus viernes:* +2 🧪 Poción\n`;
      break;
  }
  
  // Recompensas aleatorias adicionales (20% de probabilidad)
  let recompensaAleatoria = null;
  if (Math.random() < 0.2) {
    const posiblesRecompensas = [
      { tipo: 'llave', cantidad: 1, emoji: '🔑', nombre: 'Llave Mágica' },
      { tipo: 'gema', cantidad: 1, emoji: '💎', nombre: 'Gema Brillante' },
      { tipo: 'pergamino', cantidad: 1, emoji: '📜', nombre: 'Pergamino Mágico' }
    ];
    recompensaAleatoria = posiblesRecompensas[Math.floor(Math.random() * posiblesRecompensas.length)];
  }
  
  // Recompensas por streak mensual
  const hoy = new Date();
  const diaMes = hoy.getDate();
  
  let bonusMensual = '';
  if (diaMes === 1) {
    // Primer día del mes - bonus extra
    coinsGanados = Math.floor(coinsGanados * 2);
    expGanada = Math.floor(expGanada * 2);
    bonusMensual = `📅 *Bonus primer día del mes:* ¡Doble recompensa! 🎊\n`;
  } else if (diaMes === 15) {
    // Mitad de mes - recompensa especial
    user.inventario.especiales.llave = (user.inventario.especiales.llave || 0) + 1;
    bonusMensual = `📅 *Bonus mitad de mes:* +1 🔑 Llave Mágica\n`;
  }

  // ACTUALIZAR RECURSOS DEL USUARIO
  user.pandacoins += coinsGanados;
  user.exp += expGanada;
  
  // Agregar días consecutivos
  const nuevoDiasConsecutivos = diasConsecutivos + 1;
  user.stats.dias_consecutivos = nuevoDiasConsecutivos;
  
  // Actualizar último día que reclamó
  user.stats.ultimo_daily = hoy.toISOString().split('T')[0];
  
  // Agregar recompensa especial del día
  if (recompensaEspecial) {
    if (recompensaEspecial.tipo === 'pocion') {
      user.inventario.especiales.pocion = (user.inventario.especiales.pocion || 0) + recompensaEspecial.cantidad;
    } else {
      user.inventario.recursos[recompensaEspecial.tipo] = 
        (user.inventario.recursos[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
    }
  }
  
  // Agregar recompensa aleatoria
  if (recompensaAleatoria) {
    user.inventario.especiales[recompensaAleatoria.tipo] = 
      (user.inventario.especiales[recompensaAleatoria.tipo] || 0) + recompensaAleatoria.cantidad;
  }
  
  // Verificar subida de nivel
  const expParaSubir = nivel * 100;
  let subioNivel = false;
  
  if (user.exp >= expParaSubir) {
    const nivelesSubidos = Math.floor(user.exp / expParaSubir);
    user.nivel += nivelesSubidos;
    user.exp = user.exp % expParaSubir;
    subioNivel = true;
    
    // Bonus por subir nivel al reclamar daily
    const bonusNivel = 1000 * nivelesSubidos;
    user.pandacoins += bonusNivel;
    coinsGanados += bonusNivel;
  }
  
  // Actualizar cooldown
  user.cooldowns.daily = now;
  
  // Guardar cambios
  guardarDatabase(db);

  // CONSTRUIR MENSAJE DE RESPUESTA
  let respuesta = `🎁 *¡RECOMPENSA DIARIA RECLAMADA!* 🎁\n\n`;
  
  // Información del usuario
  respuesta += `👤 *Usuario:* @${sender.split('@')[0]}\n`;
  respuesta += `⭐ *Nivel:* ${user.nivel}\n`;
  respuesta += `📅 *Días consecutivos:* ${nuevoDiasConsecutivos}\n\n`;
  
  // Recompensas principales
  respuesta += `💰 *RECOMPENSAS PRINCIPALES:*\n`;
  respuesta += `🪙 Pandacoins: +${coinsGanados.toLocaleString()} (Total: ${user.pandacoins.toLocaleString()})\n`;
  respuesta += `⭐ Experiencia: +${expGanada} (Nivel ${user.nivel}: ${user.exp}/${expParaSubir})\n\n`;
  
  // Mostrar bonuses aplicados
  respuesta += `✨ *BONUS APLICADOS:*\n`;
  if (mensajeBonus) respuesta += mensajeBonus;
  if (bonusActividades > 0) {
    respuesta += `🏆 *Bonus actividades (${actividadesCompletadas}):* +${Math.floor(bonusActividades * 100)}%\n`;
  }
  if (mensajeEspecial) respuesta += mensajeEspecial;
  if (bonusMensual) respuesta += bonusMensual;
  
  // Mostrar recompensas especiales
  if (recompensaEspecial) {
    respuesta += `\n🎯 *RECOMPENSA ESPECIAL DEL DÍA:*\n`;
    const emojis = { oro: '💰', diamantes: '💎', pocion: '🧪' };
    const emoji = emojis[recompensaEspecial.tipo];
    respuesta += `${emoji} ${recompensaEspecial.tipo}: +${recompensaEspecial.cantidad}\n`;
  }
  
  // Mostrar recompensa aleatoria
  if (recompensaAleatoria) {
    respuesta += `\n🎰 *RECOMPENSA ALEATORIA (20%):*\n`;
    respuesta += `${recompensaAleatoria.emoji} ${recompensaAleatoria.nombre}: +${recompensaAleatoria.cantidad}\n`;
  }
  
  // Si subió de nivel
  if (subioNivel) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL RECLAMANDO EL DAILY!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+${1000 * Math.floor(user.exp / expParaSubir)} coins de bonus\n`;
  }
  
  // Próxima recompensa
  const siguienteDaily = new Date(now + cooldown);
  const horaSiguiente = siguienteDaily.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  respuesta += `\n⏰ *Próxima recompensa:* Mañana a las ${horaSiguiente}\n`;
  respuesta += `📊 *Mañana ganarás:* ~${Math.floor(coinsGanados * 1.1).toLocaleString()} coins\n\n`;
  
  // Consejos y comandos relacionados
  respuesta += `💡 *CONSEJOS PARA MAÑANA:*\n`;
  respuesta += `• Completa actividades hoy: \`.pescar\`, \`.cazar\`, etc.\n`;
  respuesta += `• Sigue la racha para bonus mayores\n`;
  respuesta += `• Los viernes dan pociones extra\n`;
  respuesta += `• El día 1 y 15 del mes tienen bonus especial\n\n`;
  
  respuesta += `🔧 *COMANDOS RELACIONADOS:*\n`;
  respuesta += `• \`.inventario\` - Ver lo que ganaste\n`;
  respuesta += `• \`.shop\` - Gastar tus coins\n`;
  respuesta += `• \`.trabajar\` - Trabajo diario adicional\n`;
  
  // Footer
  respuesta += `\n━━━━━━━━━━━━━━━━━━━\n`;
  respuesta += `🎮 *¡Gracias por jugar cada día!*\n`;
  respuesta += `🏆 La constancia tiene su recompensa`;

  await sock.sendMessage(from, { 
    text: respuesta,
    mentions: [sender]
  });
}
