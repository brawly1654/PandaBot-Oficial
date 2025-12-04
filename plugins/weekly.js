import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'weekly';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  // Inicializar usuario si no existe
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];

  // Verificar cooldown (7 días)
  const now = Date.now();
  const cooldown = 7 * 24 * 60 * 60 * 1000;
  
  user.cooldowns = user.cooldowns || {};
  const lastWeekly = user.cooldowns.weekly || 0;

  if (now - lastWeekly < cooldown) {
    const diasRestantes = Math.ceil((cooldown - (now - lastWeekly)) / (1000 * 60 * 60 * 24));
    const horasRestantes = Math.ceil(((cooldown - (now - lastWeekly)) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    await sock.sendMessage(from, { 
      text: `⏳ *Recompensa semanal en cooldown*\n\n⏰ *Tiempo restante:* ${diasRestantes}d ${horasRestantes}h\n\n📅 *Vuelve en ${diasRestantes} días*\n💡 *Consejo:* Completa el daily (\`.daily\`) mientras esperas` 
    });
    return;
  }

  // Cálculo de recompensas basado en nivel y actividad
  const nivel = user.nivel || 1;
  const semanasConsecutivas = user.stats?.semanas_consecutivas || 0;
  
  // Recompensa base escalada por nivel
  const coinsBase = 700 + (nivel * 300);
  const expBase = 10000 + (nivel * 2000);
  
  // Bonus por semanas consecutivas
  let bonusConsecutivo = 0;
  let mensajeConsecutivo = '';
  
  if (semanasConsecutivos >= 4) {
    bonusConsecutivo = 1.0; // +100% por 4+ semanas
    mensajeConsecutivo = `🏆 *Bonus 4+ semanas:* +100%\n`;
  } else if (semanasConsecutivos >= 2) {
    bonusConsecutivo = 0.5; // +50% por 2+ semanas
    mensajeConsecutivo = `🏆 *Bonus 2+ semanas:* +50%\n`;
  }
  
  // Bonus por dailies completados esta semana
  const hoy = new Date();
  const inicioSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
  const dailiesEstaSemana = user.stats?.dailies_esta_semana || 0;
  
  let bonusDailies = 0;
  if (dailiesEstaSemana >= 7) {
    bonusDailies = 0.4; // +40% por 7 dailies
  } else if (dailiesEstaSemana >= 5) {
    bonusDailies = 0.2; // +20% por 5+ dailies
  } else if (dailiesEstaSemana >= 3) {
    bonusDailies = 0.1; // +10% por 3+ dailies
  }
  
  // Cálculo final de recompensas
  let coinsGanados = coinsBase + Math.floor(Math.random() * 800);
  let expGanada = expBase + Math.floor(Math.random() * 3000);
  
  // Aplicar bonuses
  coinsGanados = Math.floor(coinsGanados * (1 + bonusConsecutivo + bonusDailies));
  expGanada = Math.floor(expGanada * (1 + bonusConsecutivo + bonusDailies));
  
  // Recompensas especiales semanales
  const semanaMes = Math.ceil(new Date().getDate() / 7);
  let recompensaEspecial = null;
  
  switch(semanaMes) {
    case 1: // Primera semana del mes
      recompensaEspecial = { tipo: 'diamantes', cantidad: 2, emoji: '💎', nombre: 'Diamantes' };
      break;
    case 2: // Segunda semana del mes
      recompensaEspecial = { tipo: 'oro', cantidad: 5, emoji: '💰', nombre: 'Oro' };
      break;
    case 3: // Tercera semana del mes
      recompensaEspecial = { tipo: 'pergamino', cantidad: 1, emoji: '📜', nombre: 'Pergamino Mágico' };
      break;
    case 4: // Cuarta semana del mes
      recompensaEspecial = { tipo: 'llave', cantidad: 2, emoji: '🔑', nombre: 'Llaves Mágicas' };
      break;
    case 5: // Quinta semana (raro)
      recompensaEspecial = { tipo: 'esmeraldas', cantidad: 3, emoji: '💚', nombre: 'Esmeraldas' };
      break;
  }
  
  // Recompensa por actividades de la semana
  const actividadesEstaSemana = (user.stats?.pescas_semana || 0) + 
                               (user.stats?.cazas_semana || 0) + 
                               (user.stats?.minas_semana || 0);
  
  let bonusActividades = '';
  if (actividadesEstaSemana >= 100) {
    coinsGanados = Math.floor(coinsGanados * 1.3);
    expGanada = Math.floor(expGanada * 1.3);
    bonusActividades = `🔥 *Bonus actividades (100+):* +30%\n`;
  } else if (actividadesEstaSemana >= 50) {
    coinsGanados = Math.floor(coinsGanados * 1.15);
    expGanada = Math.floor(expGanada * 1.15);
    bonusActividades = `🔥 *Bonus actividades (50+):* +15%\n`;
  }

  // ACTUALIZAR RECURSOS DEL USUARIO
  user.pandacoins += coinsGanados;
  user.exp += expGanada;
  
  // Agregar semanas consecutivas
  const nuevasSemanasConsecutivas = semanasConsecutivas + 1;
  user.stats.semanas_consecutivas = nuevasSemanasConsecutivas;
  
  // Agregar recompensa especial
  if (recompensaEspecial) {
    if (recompensaEspecial.tipo === 'pergamino' || recompensaEspecial.tipo === 'llave') {
      user.inventario.especiales[recompensaEspecial.tipo] = 
        (user.inventario.especiales[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
    } else {
      user.inventario.recursos[recompensaEspecial.tipo] = 
        (user.inventario.recursos[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
    }
  }
  
  // Bonus por nivel alto
  if (nivel >= 20) {
    const bonusNivelAlto = Math.floor(nivel * 50);
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
    
    // Bonus por subir nivel al reclamar weekly
    const bonusNivel = 2000 * nivelesSubidos;
    user.pandacoins += bonusNivel;
    coinsGanados += bonusNivel;
  }
  
  // Reiniciar contadores semanales
  user.stats.dailies_esta_semana = 0;
  user.stats.pescas_semana = 0;
  user.stats.cazas_semana = 0;
  user.stats.minas_semana = 0;
  
  // Actualizar cooldown
  user.cooldowns.weekly = now;
  
  // Guardar cambios
  guardarDatabase(db);

  // CONSTRUIR MENSAJE DE RESPUESTA
  let respuesta = `🗓️ *¡RECOMPENSA SEMANAL RECLAMADA!* 🗓️\n\n`;
  
  // Información del usuario
  respuesta += `👤 *Usuario:* @${sender.split('@')[0]}\n`;
  respuesta += `⭐ *Nivel:* ${user.nivel}\n`;
  respuesta += `📅 *Semanas consecutivas:* ${nuevasSemanasConsecutivas}\n`;
  respuesta += `📊 *Dailies esta semana:* ${dailiesEstaSemana}/7\n`;
  respuesta += `🏆 *Actividades esta semana:* ${actividadesEstaSemana}\n\n`;
  
  // Recompensas principales
  respuesta += `💰 *RECOMPENSAS PRINCIPALES:*\n`;
  respuesta += `🪙 Pandacoins: +${coinsGanados.toLocaleString()} (Total: ${user.pandacoins.toLocaleString()})\n`;
  respuesta += `⭐ Experiencia: +${expGanada} (Nivel ${user.nivel}: ${user.exp}/${expParaSubir})\n\n`;
  
  // Mostrar bonuses aplicados
  respuesta += `✨ *BONUS APLICADOS:*\n`;
  if (mensajeConsecutivo) respuesta += mensajeConsecutivo;
  if (bonusDailies > 0) {
    respuesta += `📅 *Bonus dailies (${dailiesEstaSemana}/7):* +${Math.floor(bonusDailies * 100)}%\n`;
  }
  if (bonusActividades) respuesta += bonusActividades;
  if (nivel >= 20) {
    respuesta += `🏅 *Bonus nivel alto (${nivel}+):* +${Math.floor(nivel * 50)} coins\n`;
  }
  
  // Mostrar recompensa especial
  if (recompensaEspecial) {
    respuesta += `\n🎯 *RECOMPENSA ESPECIAL DE LA SEMANA ${semanaMes}:*\n`;
    respuesta += `${recompensaEspecial.emoji} ${recompensaEspecial.nombre}: +${recompensaEspecial.cantidad}\n`;
  }
  
  // Si subió de nivel
  if (subioNivel) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL RECLAMANDO EL WEEKLY!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+${2000 * Math.floor(user.exp / expParaSubir)} coins de bonus\n`;
  }
  
  // Próxima recompensa
  const siguienteWeekly = new Date(now + cooldown);
  const fechaSiguiente = siguienteWeekly.toLocaleDateString('es-ES', { 
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  
  respuesta += `\n⏰ *Próxima recompensa:* ${fechaSiguiente}\n`;
  
  // Consejos para la próxima semana
  respuesta += `\n💡 *CONSEJOS PARA LA PRÓXIMA SEMANA:*\n`;
  respuesta += `• Reclama el daily todos los días (hasta +40% bonus)\n`;
  respuesta += `• Haz al menos 50 actividades (+15% bonus)\n`;
  respuesta += `• Mantén tu racha de semanas (+50% a +100%)\n`;
  respuesta += `• La 4ª semana del mes da llaves extras\n\n`;
  
  respuesta += `🔧 *COMANDOS RELACIONADOS:*\n`;
  respuesta += `• \`.daily\` - Recompensa diaria\n`;
  respuesta += `• \`.monthly\` - Recompensa mensual\n`;
  respuesta += `• \`.inventario\` - Ver tus ganancias\n`;
  
  // Footer
  respuesta += `\n━━━━━━━━━━━━━━━━━━━\n`;
  respuesta += `🎮 *¡Excelente trabajo esta semana!*\n`;
  respuesta += `🏆 Sigue así para mejores recompensas`;

  await sock.sendMessage(from, { 
    text: respuesta,
    mentions: [sender]
  });
}
