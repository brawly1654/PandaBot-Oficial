import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

export const command = 'weekly';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  inicializarUsuario(sender, db);
  
  const user = db.users[sender];

  const now = Date.now();
  const cooldown = 7 * 24 * 60 * 60 * 1000;
  
  user.cooldowns = user.cooldowns || {};
  const lastWeekly = user.cooldowns.weekly || 0;

  if (now - lastWeekly < cooldown) {
    const tiempoRestante = cooldown - (now - lastWeekly);
    const diasRestantes = Math.floor(tiempoRestante / (1000 * 60 * 60 * 24));
    const horasRestantes = Math.floor((tiempoRestante % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutosRestantes = Math.floor((tiempoRestante % (1000 * 60 * 60)) / (1000 * 60));
    
    await sock.sendMessage(from, { 
      text: `⏳ *Recompensa semanal en cooldown*\n\n⏰ *Tiempo restante:* ${diasRestantes}d ${horasRestantes}h ${minutosRestantes}m\n\n📅 *Vuelve en ${diasRestantes} días*` 
    });
    return;
  }

  const nivel = user.nivel || 1;
  const semanasConsecutivas = user.stats?.semanas_consecutivas || 0;
  
  const coinsBase = 700 + (nivel * 300);
  const expBase = 10000 + (nivel * 2000);
  
  let bonusConsecutivo = 0;
  let mensajeConsecutivo = '';
  
  if (semanasConsecutivas >= 4) {
    bonusConsecutivo = 1.0;
    mensajeConsecutivo = `🏆 *Bonus 4+ semanas:* +100%\n`;
  } else if (semanasConsecutivas >= 2) {
    bonusConsecutivo = 0.5;
    mensajeConsecutivo = `🏆 *Bonus 2+ semanas:* +50%\n`;
  }
  
  const hoy = new Date();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - hoy.getDay());
  const dailiesEstaSemana = user.stats?.dailies_esta_semana || 0;
  
  let bonusDailies = 0;
  if (dailiesEstaSemana >= 7) {
    bonusDailies = 0.4;
  } else if (dailiesEstaSemana >= 5) {
    bonusDailies = 0.2;
  } else if (dailiesEstaSemana >= 3) {
    bonusDailies = 0.1;
  }
  
  let coinsGanados = coinsBase + Math.floor(Math.random() * 800);
  let expGanada = expBase + Math.floor(Math.random() * 3000);
  
  coinsGanados = Math.floor(coinsGanados * (1 + bonusConsecutivo + bonusDailies));
  expGanada = Math.floor(expGanada * (1 + bonusConsecutivo + bonusDailies));
  
  const semanaMes = Math.ceil(new Date().getDate() / 7);
  let recompensaEspecial = null;
  
  switch(semanaMes) {
    case 1:
      recompensaEspecial = { tipo: 'diamantes', cantidad: 2, emoji: '💎', nombre: 'Diamantes' };
      break;
    case 2:
      recompensaEspecial = { tipo: 'oro', cantidad: 5, emoji: '💰', nombre: 'Oro' };
      break;
    case 3:
      recompensaEspecial = { tipo: 'pergamino', cantidad: 1, emoji: '📜', nombre: 'Pergamino Mágico' };
      break;
    case 4:
      recompensaEspecial = { tipo: 'llave', cantidad: 2, emoji: '🔑', nombre: 'Llaves Mágicas' };
      break;
    case 5:
      recompensaEspecial = { tipo: 'esmeraldas', cantidad: 3, emoji: '💚', nombre: 'Esmeraldas' };
      break;
  }
  
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

  user.pandacoins = (user.pandacoins || 0) + coinsGanados;
  user.exp = (user.exp || 0) + expGanada;
  
  const nuevasSemanasConsecutivas = semanasConsecutivas + 1;
  user.stats = user.stats || {};
  user.stats.semanas_consecutivas = nuevasSemanasConsecutivas;
  
  if (recompensaEspecial) {
    user.inventario = user.inventario || {};
    
    if (recompensaEspecial.tipo === 'pergamino' || recompensaEspecial.tipo === 'llave') {
      user.inventario.especiales = user.inventario.especiales || {};
      user.inventario.especiales[recompensaEspecial.tipo] = 
        (user.inventario.especiales[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
    } else {
      user.inventario.recursos = user.inventario.recursos || {};
      user.inventario.recursos[recompensaEspecial.tipo] = 
        (user.inventario.recursos[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
    }
  }
  
  if (nivel >= 20) {
    const bonusNivelAlto = Math.floor(nivel * 50);
    user.pandacoins += bonusNivelAlto;
    coinsGanados += bonusNivelAlto;
  }
  
  const expParaSubir = nivel * 100;
  let subioNivel = false;
  let nivelesSubidos = 0;
  
  if (user.exp >= expParaSubir) {
    nivelesSubidos = Math.floor(user.exp / expParaSubir);
    user.nivel = (user.nivel || 1) + nivelesSubidos;
    user.exp = user.exp % expParaSubir;
    subioNivel = true;
    
    const bonusNivel = 2000 * nivelesSubidos;
    user.pandacoins += bonusNivel;
    coinsGanados += bonusNivel;
  }
  
  user.stats.dailies_esta_semana = 0;
  user.stats.pescas_semana = 0;
  user.stats.cazas_semana = 0;
  user.stats.minas_semana = 0;
  
  user.cooldowns.weekly = now;
  
  guardarDatabase(db);

  let respuesta = `🗓️ *¡RECOMPENSA SEMANAL RECLAMADA!* 🗓️\n\n`;
  
  respuesta += `👤 *Usuario:* @${sender.split('@')[0]}\n`;
  respuesta += `⭐ *Nivel:* ${user.nivel || 1}\n`;
  respuesta += `📅 *Semanas consecutivas:* ${nuevasSemanasConsecutivas}\n`;
  respuesta += `📊 *Dailies esta semana:* ${dailiesEstaSemana}/7\n`;
  respuesta += `🏆 *Actividades esta semana:* ${actividadesEstaSemana}\n\n`;
  
  respuesta += `💰 *RECOMPENSAS PRINCIPALES:*\n`;
  respuesta += `🪙 Pandacoins: +${coinsGanados.toLocaleString()} (Total: ${user.pandacoins.toLocaleString()})\n`;
  respuesta += `⭐ Experiencia: +${expGanada} (Nivel ${user.nivel || 1}: ${user.exp}/${expParaSubir})\n\n`;
  
  respuesta += `✨ *BONUS APLICADOS:*\n`;
  if (mensajeConsecutivo) respuesta += mensajeConsecutivo;
  if (bonusDailies > 0) {
    respuesta += `📅 *Bonus dailies (${dailiesEstaSemana}/7):* +${Math.floor(bonusDailies * 100)}%\n`;
  }
  if (bonusActividades) respuesta += bonusActividades;
  if (nivel >= 20) {
    respuesta += `🏅 *Bonus nivel alto (${nivel}+):* +${Math.floor(nivel * 50)} coins\n`;
  }
  
  if (recompensaEspecial) {
    respuesta += `\n🎯 *RECOMPENSA ESPECIAL DE LA SEMANA ${semanaMes}:*\n`;
    respuesta += `${recompensaEspecial.emoji} ${recompensaEspecial.nombre}: +${recompensaEspecial.cantidad}\n`;
  }
  
  if (subioNivel) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL RECLAMANDO EL WEEKLY!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+${2000 * nivelesSubidos} coins de bonus\n`;
  }
  
  const siguienteWeekly = new Date(now + cooldown);
  const fechaSiguiente = siguienteWeekly.toLocaleDateString('es-ES', { 
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  
  respuesta += `\n⏰ *Próxima recompensa:* ${fechaSiguiente}\n`;
  
  respuesta += `\n💡 *CONSEJOS PARA LA PRÓXIMA SEMANA:*\n`;
  respuesta += `• Reclama el daily todos los días (hasta +40% bonus)\n`;
  respuesta += `• Haz al menos 50 actividades (+15% bonus)\n`;
  respuesta += `• Mantén tu racha de semanas (+50% a +100%)\n`;
  respuesta += `• La 4ª semana del mes da llaves extras\n\n`;
  
  respuesta += `🔧 *COMANDOS RELACIONADOS:*\n`;
  respuesta += `• \`.daily\` - Recompensa diaria\n`;
  respuesta += `• \`.monthly\` - Recompensa mensual\n`;
  respuesta += `• \`.inventario\` - Ver tus ganancias\n`;
  
  respuesta += `\n━━━━━━━━━━━━━━━━━━━\n`;
  respuesta += `🎮 *¡Excelente trabajo esta semana!*\n`;
  respuesta += `🏆 Sigue así para mejores recompensas`;

  await sock.sendMessage(from, { 
    text: respuesta,
    mentions: [sender]
  });
}