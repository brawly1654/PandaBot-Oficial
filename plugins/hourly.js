import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'hourly';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  // Inicializar usuario si no existe
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];

  // Verificar cooldown (1 hora)
  const now = Date.now();
  const cooldown = 60 * 60 * 1000;
  
  user.cooldowns = user.cooldowns || {};
  const lastHourly = user.cooldowns.hourly || 0;

  if (now - lastHourly < cooldown) {
    const minutosRestantes = Math.ceil((cooldown - (now - lastHourly)) / 60000);
    const segundosRestantes = Math.ceil(((cooldown - (now - lastHourly)) % 60000) / 1000);
    
    await sock.sendMessage(from, { 
      text: `⏳ *Recompensa por hora en cooldown*\n\n⏰ *Tiempo restante:* ${minutosRestantes}m ${segundosRestantes}s\n\n💡 *Consejo:* Mientras esperas, puedes:\n• Completar misiones cortas\n• Revisar tu inventario (\`.inv\`)\n• Planificar tu próxima actividad\n• Socializar con otros jugadores` 
    });
    return;
  }

  // Cálculo de recompensas basado en nivel y actividad reciente
  const nivel = user.nivel || 1;
  const horaDia = new Date().getHours();
  
  // Recompensa base escalada por nivel
  const coinsBase = 30 + (nivel * 5);      // Antes: 50-250
  const expBase = 200 + (nivel * 30);      // Antes: 1000-1500
  
  // Bonus por hora del día (promueve actividad en horas específicas)
  let bonusHora = 0;
  let mensajeHora = '';
  
  // Horas pico con bonus
  if (horaDia >= 12 && horaDia <= 14) {
    bonusHora = 0.3; // +30% en horario de almuerzo
    mensajeHora = `🍽️ *Bonus horario almuerzo:* +30%\n`;
  } else if (horaDia >= 18 && horaDia <= 20) {
    bonusHora = 0.4; // +40% en horario nocturno
    mensajeHora = `🌙 *Bonus horario noche:* +40%\n`;
  } else if (horaDia >= 8 && horaDia <= 10) {
    bonusHora = 0.2; // +20% en horario mañana
    mensajeHora = `☀️ *Bonus horario mañana:* +20%\n`;
  }
  
  // Bonus por actividad reciente (última hora)
  let bonusActividad = 0;
  const actividadesUltimaHora = (user.stats?.pescas_hora || 0) + 
                                (user.stats?.cazas_hora || 0) + 
                                (user.stats?.minas_hora || 0);
  
  if (actividadesUltimaHora >= 10) {
    bonusActividad = 0.25; // +25% por ser activo
  } else if (actividadesUltimaHora >= 5) {
    bonusActividad = 0.15; // +15% por ser activo
  } else if (actividadesUltimaHora >= 2) {
    bonusActividad = 0.05; // +5% por ser activo
  }
  
  // Bonus por streak de hours
  const streakHours = user.stats?.streak_hours || 0;
  let bonusStreak = 0;
  let mensajeStreak = '';
  
  if (streakHours >= 24) {
    bonusStreak = 0.5; // +50% por streak de 24+ horas
    mensajeStreak = `🔥 *Streak 24+ horas:* +50%\n`;
  } else if (streakHours >= 12) {
    bonusStreak = 0.3; // +30% por streak de 12+ horas
    mensajeStreak = `🔥 *Streak 12+ horas:* +30%\n`;
  } else if (streakHours >= 6) {
    bonusStreak = 0.15; // +15% por streak de 6+ horas
    mensajeStreak = `🔥 *Streak 6+ horas:* +15%\n`;
  }
  
  // Cálculo final de recompensas
  let coinsGanados = coinsBase + Math.floor(Math.random() * 40);
  let expGanada = expBase + Math.floor(Math.random() * 100);
  
  // Aplicar bonuses
  coinsGanados = Math.floor(coinsGanados * (1 + bonusHora + bonusActividad + bonusStreak));
  expGanada = Math.floor(expGanada * (1 + bonusHora + bonusActividad + bonusStreak));
  
  // Recompensas especiales ocasionales (10% de probabilidad)
  let recompensaEspecial = null;
  if (Math.random() < 0.1) {
    const posiblesEspeciales = [
      { tipo: 'comida', cantidad: 1, emoji: '🍖', nombre: 'Comida' },
      { tipo: 'piedras', cantidad: 3, emoji: '🪨', nombre: 'Piedras' },
      { tipo: 'madera', cantidad: 2, emoji: '🪵', nombre: 'Madera' }
    ];
    recompensaEspecial = posiblesEspeciales[Math.floor(Math.random() * posiblesEspeciales.length)];
  }
  
  // Recompensa por hora específica (ejemplo: hora 15:00)
  let recompensaHoraEspecifica = null;
  if (horaDia === 15) { // 3 PM
    recompensaHoraEspecifica = { 
      tipo: 'pocion', 
      cantidad: 1, 
      emoji: '🧪', 
      nombre: 'Poción',
      mensaje: '🎯 *Hora especial 15:00:* +1 Poción'
    };
  }

  // ACTUALIZAR RECURSOS DEL USUARIO
  user.pandacoins += coinsGanados;
  user.exp += expGanada;
  
  // Actualizar streak de hours
  const nuevoStreakHours = streakHours + 1;
  user.stats.streak_hours = nuevoStreakHours;
  
  // Agregar recompensa especial si existe
  if (recompensaEspecial) {
    user.inventario.recursos[recompensaEspecial.tipo] = 
      (user.inventario.recursos[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
  }
  
  // Agregar recompensa de hora específica
  if (recompensaHoraEspecifica) {
    user.inventario.especiales[recompensaHoraEspecifica.tipo] = 
      (user.inventario.especiales[recompensaHoraEspecifica.tipo] || 0) + recompensaHoraEspecifica.cantidad;
  }
  
  // Bonus por nivel alto
  if (nivel >= 20) {
    const bonusNivelAlto = Math.floor(nivel * 2);
    user.pandacoins += bonusNivelAlto;
    coinsGanados += bonusNivelAlto;
  }
  
  // Verificar subida de nivel
  const expParaSubir = nivel * 100;
  let subioNivel = false;
  
  if (user.exp >= expParaSubir) {
    const nivelesSubidos = Math.floor(user.exp / expParaSubir);
    user.nivel += nivelesSubidos;
    user.exp = user.exp % expParaSubir;
    subioNivel = true;
    
    // Bonus por subir nivel al reclamar hourly
    const bonusNivel = 100 * nivelesSubidos;
    user.pandacoins += bonusNivel;
    coinsGanados += bonusNivel;
  }
  
  // Actualizar cooldown
  user.cooldowns.hourly = now;
  
  // Guardar cambios
  guardarDatabase(db);

  // CONSTRUIR MENSAJE DE RESPUESTA
  let respuesta = `⏰ *¡RECOMPENSA POR HORA RECLAMADA!* ⏰\n\n`;
  
  // Información del usuario
  respuesta += `👤 *Usuario:* @${sender.split('@')[0]}\n`;
  respuesta += `⭐ *Nivel:* ${user.nivel}\n`;
  respuesta += `🔥 *Streak horas:* ${nuevoStreakHours}\n`;
  respuesta += `⏱️ *Hora actual:* ${horaDia}:00\n\n`;
  
  // Recompensas principales
  respuesta += `💰 *RECOMPENSAS PRINCIPALES:*\n`;
  respuesta += `🪙 Pandacoins: +${coinsGanados} (Total: ${user.pandacoins})\n`;
  respuesta += `⭐ Experiencia: +${expGanada} (Nivel ${user.nivel}: ${user.exp}/${expParaSubir})\n\n`;
  
  // Mostrar bonuses aplicados
  respuesta += `✨ *BONUS APLICADOS:*\n`;
  if (mensajeHora) respuesta += mensajeHora;
  if (bonusActividad > 0) {
    respuesta += `🏆 *Bonus actividad (${actividadesUltimaHora}):* +${Math.floor(bonusActividad * 100)}%\n`;
  }
  if (mensajeStreak) respuesta += mensajeStreak;
  if (nivel >= 20) {
    respuesta += `🏅 *Bonus nivel alto (${nivel}+):* +${Math.floor(nivel * 2)} coins\n`;
  }
  
  // Mostrar recompensa especial
  if (recompensaEspecial) {
    respuesta += `\n🎁 *RECOMPENSA ESPECIAL (10%):*\n`;
    respuesta += `${recompensaEspecial.emoji} ${recompensaEspecial.nombre}: +${recompensaEspecial.cantidad}\n`;
  }
  
  // Mostrar recompensa de hora específica
  if (recompensaHoraEspecifica) {
    respuesta += `\n${recompensaHoraEspecifica.mensaje}\n`;
    respuesta += `${recompensaHoraEspecifica.emoji} ${recompensaHoraEspecifica.nombre}: +${recompensaHoraEspecifica.cantidad}\n`;
  }
  
  // Si subió de nivel
  if (subioNivel) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL RECLAMANDO EL HOURLY!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+${100 * Math.floor(user.exp / expParaSubir)} coins de bonus\n`;
  }
  
  // Próxima recompensa
  const siguienteHourly = new Date(now + cooldown);
  const horaSiguiente = siguienteHourly.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  respuesta += `\n⏰ *Próxima recompensa:* ${horaSiguiente}\n`;
  
  // Información sobre bonus horarios
  respuesta += `\n💡 *HORAS CON BONUS EXTRA:*\n`;
  respuesta += `• 8:00-10:00: +20% (Mañana)\n`;
  respuesta += `• 12:00-14:00: +30% (Almuerzo)\n`;
  respuesta += `• 18:00-20:00: +40% (Noche)\n`;
  respuesta += `• 15:00: Poción especial\n\n`;
  
  respuesta += `📊 *Actividad recomendada:*\n`;
  respuesta += `• Haz 2+ actividades para bonus\n`;
  respuesta += `• Mantén tu streak de horas\n`;
  respuesta += `• Reclama en horas con bonus\n\n`;
  
  respuesta += `🔧 *COMANDOS RELACIONADOS:*\n`;
  respuesta += `• \`.daily\` - Recompensa diaria\n`;
  respuesta += `• \`.weekly\` - Recompensa semanal\n`;
  respuesta += `• \`.inventario\` - Ver lo que ganaste\n`;
  respuesta += `• \`.pescar\` - Actividad rápida\n`;
  
  // Footer
  respuesta += `\n━━━━━━━━━━━━━━━━━━━\n`;
  respuesta += `⏱️ *¡Vuelve en una hora!*\n`;
  respuesta += `🎮 La constancia tiene sus recompensas`;

  await sock.sendMessage(from, { 
    text: respuesta,
    mentions: [sender]
  });
}
