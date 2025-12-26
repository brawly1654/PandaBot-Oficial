import { cargarDatabase, guardarDatabase, inicializarUsuario, addPandacoins } from '../data/database.js';

export const command = 'daily';
export const aliases = ['diario', 'cadadia'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();

  
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];

 
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;
  

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


  const nivel = user.nivel || 1;
  const diasConsecutivos = user.stats?.dias_consecutivos || 0;
  

  const coinsBase = 400 + (nivel * 100);
  const expBase = 6000 + (nivel * 500);
  

  let bonusConsecutivo = 0;
  let mensajeBonus = '';
  
  if (diasConsecutivos >= 7) {
    bonusConsecutivo = 0.5;
    mensajeBonus = `🎯 *Bonus 7+ días:* +50%\n`;
  } else if (diasConsecutivos >= 3) {
    bonusConsecutivo = 0.25; 
    mensajeBonus = `🎯 *Bonus 3+ días:* +25%\n`;
  }
  

  let bonusActividades = 0;
  const actividadesCompletadas = (user.stats?.pescas || 0) + (user.stats?.cazas || 0) + (user.stats?.minas || 0);
  
  if (actividadesCompletadas >= 50) {
    bonusActividades = 0.3; 
  } else if (actividadesCompletadas >= 20) {
    bonusActividades = 0.15; 
  }
  

  let coinsGanados = coinsBase + Math.floor(Math.random() * 1000);
  let expGanada = expBase + Math.floor(Math.random() * 2000);
  

  coinsGanados = Math.floor(coinsGanados * (1 + bonusConsecutivo + bonusActividades));
  expGanada = Math.floor(expGanada * (1 + bonusConsecutivo + bonusActividades));
  

  const diaSemana = new Date().getDay();
  let recompensaEspecial = null;
  let mensajeEspecial = '';
  
  switch(diaSemana) {
    case 0:
      recompensaEspecial = { tipo: 'diamantes', cantidad: 1 };
      mensajeEspecial = `✨ *Bonus domingo:* +1 💎 Diamante\n`;
      break;
    case 3:
      recompensaEspecial = { tipo: 'oro', cantidad: 2 };
      mensajeEspecial = `✨ *Bonus miércoles:* +2 💰 Oro\n`;
      break;
    case 5:
      recompensaEspecial = { tipo: 'pocion', cantidad: 2 };
      mensajeEspecial = `✨ *Bonus viernes:* +2 🧪 Poción\n`;
      break;
  }
  

  let recompensaAleatoria = null;
  if (Math.random() < 0.2) {
    const posiblesRecompensas = [
      { tipo: 'llave', cantidad: 1, emoji: '🔑', nombre: 'Llave Mágica' },
      { tipo: 'gema', cantidad: 1, emoji: '💎', nombre: 'Gema Brillante' },
      { tipo: 'pergamino', cantidad: 1, emoji: '📜', nombre: 'Pergamino Mágico' }
    ];
    recompensaAleatoria = posiblesRecompensas[Math.floor(Math.random() * posiblesRecompensas.length)];
  }
  

  const hoy = new Date();
  const diaMes = hoy.getDate();
  
  let bonusMensual = '';
  if (diaMes === 1) {

    coinsGanados = Math.floor(coinsGanados * 2);
    expGanada = Math.floor(expGanada * 2);
    bonusMensual = `📅 *Bonus primer día del mes:* ¡Doble recompensa! 🎊\n`;
  } else if (diaMes === 15) {

    user.inventario.especiales.llave = (user.inventario.especiales.llave || 0) + 1;
    bonusMensual = `📅 *Bonus mitad de mes:* +1 🔑 Llave Mágica\n`;
  }


  addPandacoins(db, sender, coinsGanados, { sharePercent: 0.10 });
  user.exp += expGanada;
  

  const nuevoDiasConsecutivos = diasConsecutivos + 1;
  user.stats.dias_consecutivos = nuevoDiasConsecutivos;
  

  user.stats.ultimo_daily = hoy.toISOString().split('T')[0];
  

  if (recompensaEspecial) {
    if (recompensaEspecial.tipo === 'pocion') {
      user.inventario.especiales.pocion = (user.inventario.especiales.pocion || 0) + recompensaEspecial.cantidad;
    } else {
      user.inventario.recursos[recompensaEspecial.tipo] = 
        (user.inventario.recursos[recompensaEspecial.tipo] || 0) + recompensaEspecial.cantidad;
    }
  }
  

  if (recompensaAleatoria) {
    user.inventario.especiales[recompensaAleatoria.tipo] = 
      (user.inventario.especiales[recompensaAleatoria.tipo] || 0) + recompensaAleatoria.cantidad;
  }
  

  const expParaSubir = nivel * 100;
  let subioNivel = false;
  
  if (user.exp >= expParaSubir) {
    const nivelesSubidos = Math.floor(user.exp / expParaSubir);
    user.nivel += nivelesSubidos;
    user.exp = user.exp % expParaSubir;
    subioNivel = true;
    

    const bonusNivel = 1000 * nivelesSubidos;
    addPandacoins(db, sender, bonusNivel, { sharePercent: 0.10 });
    coinsGanados += bonusNivel;
  }
  

  user.cooldowns.daily = now;
  

  guardarDatabase(db);


  let respuesta = `🎁 *¡RECOMPENSA DIARIA RECLAMADA!* 🎁\n\n`;
  

  respuesta += `👤 *Usuario:* @${sender.split('@')[0]}\n`;
  respuesta += `⭐ *Nivel:* ${user.nivel}\n`;
  respuesta += `📅 *Días consecutivos:* ${nuevoDiasConsecutivos}\n\n`;
  

  respuesta += `💰 *RECOMPENSAS PRINCIPALES:*\n`;
  respuesta += `🪙 Pandacoins: +${coinsGanados.toLocaleString()} (Total: ${user.pandacoins.toLocaleString()})\n`;
  respuesta += `⭐ Experiencia: +${expGanada} (Nivel ${user.nivel}: ${user.exp}/${expParaSubir})\n\n`;
  

  respuesta += `✨ *BONUS APLICADOS:*\n`;
  if (mensajeBonus) respuesta += mensajeBonus;
  if (bonusActividades > 0) {
    respuesta += `🏆 *Bonus actividades (${actividadesCompletadas}):* +${Math.floor(bonusActividades * 100)}%\n`;
  }
  if (mensajeEspecial) respuesta += mensajeEspecial;
  if (bonusMensual) respuesta += bonusMensual;
  

  if (recompensaEspecial) {
    respuesta += `\n🎯 *RECOMPENSA ESPECIAL DEL DÍA:*\n`;
    const emojis = { oro: '💰', diamantes: '💎', pocion: '🧪' };
    const emoji = emojis[recompensaEspecial.tipo];
    respuesta += `${emoji} ${recompensaEspecial.tipo}: +${recompensaEspecial.cantidad}\n`;
  }
  

  if (recompensaAleatoria) {
    respuesta += `\n🎰 *RECOMPENSA ALEATORIA (20%):*\n`;
    respuesta += `${recompensaAleatoria.emoji} ${recompensaAleatoria.nombre}: +${recompensaAleatoria.cantidad}\n`;
  }
  

  if (subioNivel) {
    respuesta += `\n🎉 *¡SUBISTE DE NIVEL RECLAMANDO EL DAILY!*\n`;
    respuesta += `Nuevo nivel: ${user.nivel}\n`;
    respuesta += `+${1000 * Math.floor(user.exp / expParaSubir)} coins de bonus\n`;
  }
  

  const siguienteDaily = new Date(now + cooldown);
  const horaSiguiente = siguienteDaily.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  respuesta += `\n⏰ *Próxima recompensa:* Mañana a las ${horaSiguiente}\n`;
  respuesta += `📊 *Mañana ganarás:* ~${Math.floor(coinsGanados * 1.1).toLocaleString()} coins\n\n`;
  

  respuesta += `💡 *CONSEJOS PARA MAÑANA:*\n`;
  respuesta += `• Completa actividades hoy: \`.pescar\`, \`.cazar\`, etc.\n`;
  respuesta += `• Sigue la racha para bonus mayores\n`;
  respuesta += `• Los viernes dan pociones extra\n`;
  respuesta += `• El día 1 y 15 del mes tienen bonus especial\n\n`;
  
  respuesta += `🔧 *COMANDOS RELACIONADOS:*\n`;
  respuesta += `• \`.inventario\` - Ver lo que ganaste\n`;
  respuesta += `• \`.shop\` - Gastar tus coins\n`;
  respuesta += `• \`.trabajar\` - Trabajo diario adicional\n`;
  

  respuesta += `\n━━━━━━━━━━━━━━━━━━━\n`;
  respuesta += `🎮 *¡Gracias por usar comandos cada día!*\n`;
  respuesta += `🏆 ¡La constancia tiene su recompensa!`;

  await sock.sendMessage(from, { 
    text: respuesta,
    mentions: [sender]
  });
}
