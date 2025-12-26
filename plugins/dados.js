
import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

const partidasDados = new Map();

export const command = 'dados';
export const aliases = ['dicegame', 'tirardados', 'juegodados'];
export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  
  const subcomando = args[0]?.toLowerCase() || 'jugar';
  
  switch(subcomando) {
    case 'jugar':
    case 'roll':
    case 'tirar':
      await jugarDados(sock, msg, from, sender, args.slice(1));
      break;
    
    case 'vs':
    case 'contra':
    case 'desafiar':
      await desafiarDados(sock, msg, from, sender, args.slice(1));
      break;
    
    case 'aceptar':
      await aceptarDesafioDados(sock, msg, from, sender);
      break;
    
    case 'rechazar':
      await rechazarDesafioDados(sock, msg, from, sender);
      break;
    
    case 'ranking':
    case 'top':
      await mostrarRankingDados(sock, from, msg);
      break;
    
    case 'ayuda':
    default:
      await mostrarAyudaDados(sock, from, msg);
  }
}

async function mostrarAyudaDados(sock, from, msg) {
  const ayuda = `🎲 *JUEGO DE DADOS* 🎯

🎮 *COMANDOS:*
• .dados jugar <apuesta> - Jugar contra la banca
• .dados vs @usuario <apuesta> - Desafiar a un jugador
• .dados aceptar - Aceptar desafío
• .dados rechazar - Rechazar desafío
• .dados ranking - Top 10 jugadores
• .dados ayuda - Esta ayuda

🎯 *REGLAS:*
• Gana quien saque el número más alto (1-6)
• Empate: Se tira de nuevo
• Apuesta mínima: 50 pandacoins
• Banca: El bot siempre tira segundo

💰 *MULTIPLICADORES:*
• 6 vs 1-3 → x2.0
• 6 vs 4-5 → x1.5  
• 5 vs 1-3 → x1.8
• 5 vs 4 → x1.3
• 4 vs 1-2 → x1.6
• 4 vs 3 → x1.2
• Empate → x1.0 (recuperas apuesta)

⚡ *¡Demuestra tu suerte y gana grande!*`;

  await sock.sendMessage(from, { text: ayuda }, { quoted: msg });
}

async function jugarDados(sock, msg, from, sender, args) {

  const apuesta = parseInt(args[0]) || 100;
  
  if (apuesta < 50) {
    return await sock.sendMessage(from, {
      text: '❌ Apuesta mínima: 50 pandacoins.'
    }, { quoted: msg });
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];
  
  if (user.pandacoins < apuesta) {
    return await sock.sendMessage(from, {
      text: `❌ No tienes suficientes pandacoins.\n💰 Necesitas: ${apuesta}\n💳 Tienes: ${user.pandacoins}`
    }, { quoted: msg });
  }


  user.pandacoins -= apuesta;
  guardarDatabase(db);


  const dadosEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  

  const dadoJugador = Math.floor(Math.random() * 6) + 1;
  const dadoBanca = Math.floor(Math.random() * 6) + 1;
  
  
  let resultado = '';
  let multiplicador = 1.0;
  let ganancias = 0;
  
  if (dadoJugador > dadoBanca) {
 
    const diferencia = dadoJugador - dadoBanca;
    
    if (dadoJugador === 6 && dadoBanca <= 3) {
      multiplicador = 2.0;
    } else if (dadoJugador === 6 && dadoBanca >= 4) {
      multiplicador = 1.5;
    } else if (dadoJugador === 5 && dadoBanca <= 3) {
      multiplicador = 1.8;
    } else if (dadoJugador === 5 && dadoBanca === 4) {
      multiplicador = 1.3;
    } else if (dadoJugador === 4 && dadoBanca <= 2) {
      multiplicador = 1.6;
    } else if (dadoJugador === 4 && dadoBanca === 3) {
      multiplicador = 1.2;
    } else {
      multiplicador = 1.1 + (diferencia * 0.1);
    }
    
    ganancias = Math.floor(apuesta * multiplicador);
    resultado = `🎉 *¡GANASTE!*`;
    
  } else if (dadoJugador < dadoBanca) {
    resultado = `💔 *¡PERDISTE!*`;
    ganancias = 0;
  } else {
    resultado = `🤝 *¡EMPATE!*`;
    multiplicador = 1.0;
    ganancias = apuesta;
  }

  
  user.pandacoins += ganancias;
  
 
  user.stats = user.stats || {};
  user.stats.dados_jugados = (user.stats.dados_jugados || 0) + 1;
  
  if (dadoJugador > dadoBanca) {
    user.stats.dados_ganados = (user.stats.dados_ganados || 0) + 1;
    user.stats.dados_ganancias = (user.stats.dados_ganancias || 0) + (ganancias - apuesta);
  } else if (dadoJugador < dadoBanca) {
    user.stats.dados_perdidos = (user.stats.dados_perdidos || 0) + 1;
  } else {
    user.stats.dados_empatados = (user.stats.dados_empatados || 0) + 1;
  }
  
  guardarDatabase(db);


  const respuesta = `🎲 *JUEGO DE DADOS* 🎯

👤 *Jugador:* @${sender.split('@')[0]}
🎮 *Modo:* Contra la banca
💰 *Apuesta:* ${apuesta.toLocaleString()} coins

🎯 *RESULTADO:*
${dadosEmoji[dadoJugador-1]} **TÚ:** ${dadoJugador}
${dadosEmoji[dadoBanca-1]} **BANCA:** ${dadoBanca}

${resultado}

📊 *DETALLES:*
${dadoJugador > dadoBanca ? `✨ Multiplicador: x${multiplicador.toFixed(1)}\n` : ''}💸 ${dadoJugador > dadoBanca ? `Ganancias:` : dadoJugador < dadoBanca ? `Pérdida:` : `Recuperas:`} ${Math.abs(ganancias - (dadoJugador >= dadoBanca ? apuesta : 0)).toLocaleString()} coins
💰 *Nuevo saldo:* ${user.pandacoins.toLocaleString()} coins

${dadoJugador > dadoBanca ? '🎊 ¡Felicidades!' : dadoJugador < dadoBanca ? '💪 ¡Suerte para la próxima!' : '⚡ ¡Vuelve a intentar!'}`;

  await sock.sendMessage(from, { 
    text: respuesta,
    mentions: [sender]
  }, { quoted: msg });
}

async function desafiarDados(sock, msg, from, sender, args) {

  const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  if (!mencionado) {
    return await sock.sendMessage(from, {
      text: '❌ Debes mencionar a un jugador.\n💡 Ejemplo: .dados vs @usuario 200'
    }, { quoted: msg });
  }

  if (mencionado === sender) {
    return await sock.sendMessage(from, {
      text: '❌ No puedes jugar contra ti mismo.'
    }, { quoted: msg });
  }


  const apuesta = parseInt(args.find(arg => !isNaN(arg))) || 100;
  
  if (apuesta < 50) {
    return await sock.sendMessage(from, {
      text: '❌ Apuesta mínima: 50 pandacoins.'
    }, { quoted: msg });
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  inicializarUsuario(mencionado, db);
  
  const jugador1 = db.users[sender];
  const jugador2 = db.users[mencionado];
  
  
  if (jugador1.pandacoins < apuesta) {
    return await sock.sendMessage(from, {
      text: `❌ No tienes suficientes pandacoins.\n💰 Necesitas: ${apuesta}\n💳 Tienes: ${jugador1.pandacoins}`
    }, { quoted: msg });
  }
  
  if (jugador2.pandacoins < apuesta) {
    return await sock.sendMessage(from, {
      text: `❌ @${mencionado.split('@')[0]} no tiene suficientes pandacoins para apostar.`,
      mentions: [mencionado]
    }, { quoted: msg });
  }
  
 
  const partidaId = `dados_${sender}_${mencionado}_${Date.now()}`;
  
  partidasDados.set(partidaId, {
    id: partidaId,
    jugador1: sender,
    jugador2: mencionado,
    apuesta: apuesta,
    estado: 'pendiente',
    creado: Date.now()
  });
  

  jugador1.pandacoins -= apuesta;
  guardarDatabase(db);
  
 
  const mensajeDesafio = `🎲 *DESAFÍO DE DADOS* ⚔️

👤 *Desafiante:* @${sender.split('@')[0]}
👤 *Retado:* @${mencionado.split('@')[0]}
💰 *Apuesta:* ${apuesta.toLocaleString()} pandacoins

🎯 *Reglas:*
• Gana quien saque el número más alto (1-6)
• Empate: Se tira de nuevo hasta desempate
• El ganador se lleva toda la apuesta

⚡ @${mencionado.split('@')[0]}, ¿aceptas el desafío?

✅ *Para aceptar:* .dados aceptar
❌ *Para rechazar:* .dados rechazar

⏰ *Tienes 2 minutos para responder.*`;
  
  await sock.sendMessage(from, {
    text: mensajeDesafio,
    mentions: [sender, mencionado]
  }, { quoted: msg });
  

  setTimeout(() => {
    const partida = partidasDados.get(partidaId);
    if (partida && partida.estado === 'pendiente') {
      partidasDados.delete(partidaId);
      
  
      jugador1.pandacoins += apuesta;
      guardarDatabase(db);
      
      sock.sendMessage(from, {
        text: `⏰ *Desafío expirado*\n\nEl desafío de @${sender.split('@')[0]} a @${mencionado.split('@')[0]} ha expirado.\n💰 ${apuesta.toLocaleString()} pandacoins devueltos a @${sender.split('@')[0]}.`,
        mentions: [sender, mencionado]
      });
    }
  }, 2 * 60 * 1000);
}

async function aceptarDesafioDados(sock, msg, from, sender) {

  let partida = null;
  let partidaId = null;
  
  for (const [id, p] of partidasDados) {
    if (p.jugador2 === sender && p.estado === 'pendiente') {
      partida = p;
      partidaId = id;
      break;
    }
  }
  
  if (!partida) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes desafíos pendientes para aceptar.'
    }, { quoted: msg });
  }
  
  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  
  const jugador2 = db.users[sender];
  

  if (jugador2.pandacoins < partida.apuesta) {
    return await sock.sendMessage(from, {
      text: `❌ Ya no tienes suficientes pandacoins.\n💰 Necesitas: ${partida.apuesta}\n💳 Tienes: ${jugador2.pandacoins}`
    }, { quoted: msg });
  }
  
  jugador2.pandacoins -= partida.apuesta;
  

  partida.estado = 'activa';
  partidasDados.set(partidaId, partida);
  
  guardarDatabase(db);
  

  await jugarPartidaDados(sock, from, partida);
  

  partidasDados.delete(partidaId);
}

async function jugarPartidaDados(sock, from, partida) {
  const db = cargarDatabase();
  const dadosEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  

  let ganador = null;
  let dado1 = 0, dado2 = 0;
  let rondas = [];
  
  for (let i = 0; i < 5; i++) {
    dado1 = Math.floor(Math.random() * 6) + 1;
    dado2 = Math.floor(Math.random() * 6) + 1;
    
    rondas.push({
      ronda: i + 1,
      dado1: dado1,
      dado2: dado2,
      emoji1: dadosEmoji[dado1-1],
      emoji2: dadosEmoji[dado2-1]
    });
    
    if (dado1 > dado2) {
      ganador = partida.jugador1;
      break;
    } else if (dado2 > dado1) {
      ganador = partida.jugador2;
      break;
    }

  }
  
 
  if (!ganador) {
    ganador = Math.random() < 0.5 ? partida.jugador1 : partida.jugador2;
  }
  
  const perdedor = ganador === partida.jugador1 ? partida.jugador2 : partida.jugador1;
  

  const ganadorUser = db.users[ganador];
  const perdedorUser = db.users[perdedor];
  
  ganadorUser.pandacoins += partida.apuesta * 2;
  
 
  ganadorUser.stats = ganadorUser.stats || {};
  ganadorUser.stats.dados_pvp_ganados = (ganadorUser.stats.dados_pvp_ganados || 0) + 1;
  ganadorUser.stats.dados_pvp_ganancias = (ganadorUser.stats.dados_pvp_ganancias || 0) + partida.apuesta;
  
  perdedorUser.stats = perdedorUser.stats || {};
  perdedorUser.stats.dados_pvp_perdidos = (perdedorUser.stats.dados_pvp_perdidos || 0) + 1;
  
  guardarDatabase(db);
  

  let rondasTexto = '';
  rondas.forEach((r, index) => {
    const resultado = r.dado1 > r.dado2 ? '⚡ Gana J1' : 
                     r.dado2 > r.dado1 ? '⚡ Gana J2' : '🤝 Empate';
    rondasTexto += `R${r.ronda}: ${r.emoji1} ${r.dado1} vs ${r.emoji2} ${r.dado2} - ${resultado}\n`;
  });
  

  const respuesta = `🎲 *PARTIDA DE DADOS PVP* ⚔️

👤 *Jugador 1:* @${partida.jugador1.split('@')[0]}
👤 *Jugador 2:* @${partida.jugador2.split('@')[0]}
💰 *Apuesta:* ${partida.apuesta.toLocaleString()} pandacoins

📊 *DESARROLLO:*
${rondasTexto}

🏆 *RESULTADO FINAL:*
${dadosEmoji[dado1-1]} **J1:** ${dado1} | ${dadosEmoji[dado2-1]} **J2:** ${dado2}

🎉 *¡GANADOR:* @${ganador.split('@')[0]}!*

💸 *Premio:* ${(partida.apuesta * 2).toLocaleString()} pandacoins
🏅 *Nuevo saldo de @${ganador.split('@')[0]}:* ${ganadorUser.pandacoins.toLocaleString()} coins

${ganador === partida.jugador1 ? '⚡ ¡El desafiante triunfa!' : '✨ ¡El retado se impone!'}`;
  
  await sock.sendMessage(from, {
    text: respuesta,
    mentions: [partida.jugador1, partida.jugador2]
  });
}

async function rechazarDesafioDados(sock, msg, from, sender) {

  let partida = null;
  let partidaId = null;
  
  for (const [id, p] of partidasDados) {
    if (p.jugador2 === sender && p.estado === 'pendiente') {
      partida = p;
      partidaId = id;
      break;
    }
  }
  
  if (!partida) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes desafíos pendientes para rechazar.'
    }, { quoted: msg });
  }
  
 
  const db = cargarDatabase();
  const jugador1 = db.users[partida.jugador1];
  
  if (jugador1) {
    jugador1.pandacoins += partida.apuesta;
    guardarDatabase(db);
  }
  

  partidasDados.delete(partidaId);
  
  await sock.sendMessage(from, {
    text: `❌ *DESAFÍO RECHAZADO*\n\n@${sender.split('@')[0]} ha rechazado el desafío de @${partida.jugador1.split('@')[0]}.\n💰 ${partida.apuesta.toLocaleString()} pandacoins devueltos a @${partida.jugador1.split('@')[0]}.`,
    mentions: [sender, partida.jugador1]
  });
}

async function mostrarRankingDados(sock, from, msg) {
  const db = cargarDatabase();
  
  if (!db.users) {
    return await sock.sendMessage(from, {
      text: '📊 *RANKING DE DADOS*\n\n📭 Aún no hay jugadores con estadísticas.'
    }, { quoted: msg });
  }
  
  
  const usuariosConStats = Object.entries(db.users)
    .filter(([_, user]) => user.stats?.dados_jugados)
    .map(([id, user]) => ({
      id,
      nombre: `@${id.split('@')[0]}`,
      jugados: user.stats.dados_jugados || 0,
      ganados: user.stats.dados_ganados || 0,
      ganancias: user.stats.dados_ganancias || 0,
      pvpGanados: user.stats.dados_pvp_ganados || 0,
      pvpGanancias: user.stats.dados_pvp_ganancias || 0
    }));
  
 
  usuariosConStats.sort((a, b) => {
    const totalA = (a.ganancias || 0) + (a.pvpGanancias || 0);
    const totalB = (b.ganancias || 0) + (b.pvpGanancias || 0);
    return totalB - totalA;
  });
  
  let rankingTexto = `🏆 *TOP 10 JUGADORES DE DADOS* 🎲\n\n`;
  
  if (usuariosConStats.length === 0) {
    rankingTexto += `📭 Aún no hay jugadores con estadísticas.\n💡 ¡Sé el primero en jugar!`;
  } else {
    const top10 = usuariosConStats.slice(0, 10);
    
    top10.forEach((usuario, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
      const totalGanancias = (usuario.ganancias || 0) + (usuario.pvpGanancias || 0);
      const winRate = usuario.jugados > 0 ? Math.round((usuario.ganados / usuario.jugados) * 100) : 0;
      
      rankingTexto += `${emoji} ${usuario.nombre}\n`;
      rankingTexto += `   📊 ${usuario.jugados} partidas | ${winRate}% victorias\n`;
      rankingTexto += `   💰 ${totalGanancias.toLocaleString()} coins ganados\n`;
      if (usuario.pvpGanados > 0) {
        rankingTexto += `   ⚔️ ${usuario.pvpGanados} PVP ganados\n`;
      }
      rankingTexto += '\n';
    });
  }
  
  rankingTexto += `\n🎮 *Tus estadísticas:* .dados jugar <apuesta>\n`;
  rankingTexto += `⚔️ *Desafiar:* .dados vs @usuario <apuesta>`;
  
  await sock.sendMessage(from, { text: rankingTexto }, { quoted: msg });
}


setInterval(() => {
  const ahora = Date.now();
  
  for (const [partidaId, partida] of partidasDados) {
    if (partida.estado === 'pendiente' && (ahora - partida.creado) > 5 * 60 * 1000) {
      partidasDados.delete(partidaId);
      
  
      const db = cargarDatabase();
      const jugador1 = db.users[partida.jugador1];
      
      if (jugador1) {
        jugador1.pandacoins += partida.apuesta;
        guardarDatabase(db);
      }
    }
  }
}, 60 * 1000);