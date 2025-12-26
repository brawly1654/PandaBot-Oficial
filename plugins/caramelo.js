import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';

const partidasCaramelo = new Map();
const mensajesPrivados = new Map();


const PLANTILLA = `
🍭🍬🍫🍬🍭
🍬🍭🍬🍭🍬
🍫🍬🍭🍬🍫
🍬🍭🍬🍭🍬
🍭🍬🍫🍬🍭`;


const POSICIONES = {
  1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [0, 3], 5: [0, 4],
  6: [1, 0], 7: [1, 1], 8: [1, 2], 9: [1, 3], 10: [1, 4],
  11: [2, 0], 12: [2, 1], 13: [2, 2], 14: [2, 3], 15: [2, 4],
  16: [3, 0], 17: [3, 1], 18: [3, 2], 19: [3, 3], 20: [3, 4],
  21: [4, 0], 22: [4, 1], 23: [4, 2], 24: [4, 3], 25: [4, 4]
};

export const command = 'caramelo';
export const aliases = ['candy', 'veneno', 'poison'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  
  const subcomando = args[0]?.toLowerCase() || 'ayuda';

  switch (subcomando) {
    case 'jugar':
    case 'vs':
    case 'desafiar':
      await iniciarPartida(sock, msg, from, sender, args.slice(1));
      break;
    
    case 'aceptar':
    case 'accept':
      await aceptarPartida(sock, msg, from, sender);
      break;
    
    case 'rechazar':
    case 'decline':
      await rechazarPartida(sock, msg, from, sender);
      break;
    
    case 'elegir':
    case 'choose':
    case 'pick':
      await elegirCaramelo(sock, msg, from, sender, args.slice(1));
      break;
    
    case 'tablero':
    case 'board':
      await mostrarTablero(sock, msg, from, sender);
      break;
    
    case 'rendirse':
    case 'surrender':
      await rendirsePartida(sock, msg, from, sender);
      break;
    
    case 'posicion':
    case 'position':
      await colocarCaramelo(sock, msg, from, sender, args.slice(1));
      break;
    
    case 'ranking':
    case 'top':
      await mostrarRanking(sock, from, msg);
      break;
    
    case 'racha':
    case 'streak':
      await mostrarRacha(sock, from, sender, msg);
      break;
    
    case 'ayuda':
    case 'help':
    default:
      await mostrarAyuda(sock, from, msg);
  }
}

async function mostrarAyuda(sock, from, msg) {
  const ayuda = `🍭 *CARAMELO ENVENENADO* ☠️

🎮 *COMANDOS PRINCIPALES:*
• .caramelo jugar @usuario <apuesta> - Desafiar a un jugador
• .caramelo aceptar - Aceptar partida pendiente
• .caramelo rechazar - Rechazar partida
• .caramelo posicion <1-25> - Colocar tu caramelo (PRIVADO)
• .caramelo elegir <posición> - Elegir caramelo en partida
• .caramelo tablero - Ver tablero actual
• .caramelo rendirse - Rendirse de la partida
• .caramelo ranking - Top 10 jugadores
• .caramelo racha - Tu racha y estadísticas
• .caramelo ayuda - Esta ayuda

🎯 *CÓMO JUGAR:*
1. Un jugador desafía a otro con apuesta
2. Ambos reciben mensaje PRIVADO para colocar su caramelo envenenado (1-25)
3. En el grupo, los jugadores alternan turnos para elegir caramelos
4. ¡Evita elegir tu propio caramelo envenenado!
5. Quien elija un caramelo envenenado PIERDE

📊 *TABLERO (25 posiciones):*
 1  2  3  4  5
 6  7  8  9  10
11 12 13 14 15
16 17 18 19 20
21 22 23 24 25

💰 *APUESTAS Y PREMIOS:*
• Mínimo: 100 pandacoins
• Ganador: x2 (recibe el doble de su apuesta)
• Empate (ambos eligen envenenado): Devolución
• Racha de victorias: Bonificación extra

⚡ *¡Memoriza bien dónde pusiste tu caramelo!*`;

  await sock.sendMessage(from, { text: ayuda }, { quoted: msg });
}

async function iniciarPartida(sock, msg, from, sender, args) {
  // Obtener usuario mencionado
  const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  if (!mencionado) {
    return await sock.sendMessage(from, {
      text: '❌ Debes mencionar a un jugador.\n💡 Ejemplo: .caramelo jugar @usuario 500'
    }, { quoted: msg });
  }

  if (mencionado === sender) {
    return await sock.sendMessage(from, {
      text: '❌ No puedes jugar contra ti mismo.'
    }, { quoted: msg });
  }

  // Obtener apuesta
  const apuesta = parseInt(args.find(arg => !isNaN(arg))) || 100;
  
  if (apuesta < 100) {
    return await sock.sendMessage(from, {
      text: '❌ Apuesta mínima: 100 pandacoins.'
    }, { quoted: msg });
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  inicializarUsuario(mencionado, db);

  const jugador1 = db.users[sender];
  const jugador2 = db.users[mencionado];

  // Verificar fondos
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

  // Verificar si ya hay partida pendiente
  for (const [partidaId, partida] of partidasCaramelo) {
    if (partida.jugador1 === sender && partida.jugador2 === mencionado && partida.estado === 'pendiente') {
      return await sock.sendMessage(from, {
        text: `⚠️ Ya tienes un desafío pendiente con @${mencionado.split('@')[0]}.`
      }, { quoted: msg });
    }
  }

  // Crear nueva partida
  const partidaId = `${sender}_${mencionado}_${Date.now()}`;
  
  partidasCaramelo.set(partidaId, {
    id: partidaId,
    grupo: from,
    jugador1: sender,
    jugador2: mencionado,
    apuesta: apuesta,
    tablero: Array(5).fill().map(() => Array(5).fill(null)),
    caramelosElegidos: [],
    caramelosEnvenenados: {
      [sender]: null,
      [mencionado]: null
    },
    turno: Math.random() < 0.5 ? sender : mencionado,
    estado: 'pendiente',
    creado: Date.now(),
    fase: 'colocacion',
    ganador: null,
    mensajesEnviados: false
  });

  // Congelar apuesta del jugador 1
  jugador1.pandacoins -= apuesta;
  guardarDatabase(db);

  // Mensaje de desafío
  const mensajeDesafio = `🍭 *DESAFÍO DE CARAMELO ENVENENADO* ☠️

👤 *Desafiante:* @${sender.split('@')[0]}
👤 *Retado:* @${mencionado.split('@')[0]}
💰 *Apuesta:* ${apuesta.toLocaleString()} pandacoins

🎯 *REGLAS:*
1. Ambos colocan SECRETAMENTE su caramelo envenenado
2. Por turnos eligen caramelos del tablero
3. ¡Evita tu propio veneno y busca el del rival!
4. Quien coma veneno PIERDE

⚡ @${mencionado.split('@')[0]}, ¿aceptas el desafío?

✅ *Para aceptar:*
.caramelo aceptar

❌ *Para rechazar:*
.caramelo rechazar

⏰ *Tienes 2 minutos para responder.*`;

  await sock.sendMessage(from, {
    text: mensajeDesafio,
    mentions: [sender, mencionado]
  }, { quoted: msg });

  // Timer para expirar desafío
  setTimeout(() => {
    const partida = partidasCaramelo.get(partidaId);
    if (partida && partida.estado === 'pendiente') {
      partidasCaramelo.delete(partidaId);
      
      // Devolver apuesta
      jugador1.pandacoins += apuesta;
      guardarDatabase(db);

      sock.sendMessage(from, {
        text: `⏰ *Desafío expirado*\n\nEl desafío de @${sender.split('@')[0]} a @${mencionado.split('@')[0]} ha expirado.\n💰 ${apuesta.toLocaleString()} pandacoins devueltos a @${sender.split('@')[0]}.`,
        mentions: [sender, mencionado]
      });
    }
  }, 2 * 60 * 1000);
}

async function aceptarPartida(sock, msg, from, sender) {
  // Buscar partida pendiente donde el usuario sea el jugador2
  let partidaAceptar = null;
  let partidaId = null;

  for (const [id, partida] of partidasCaramelo) {
    if (partida.jugador2 === sender && partida.estado === 'pendiente') {
      partidaAceptar = partida;
      partidaId = id;
      break;
    }
  }

  if (!partidaAceptar) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes desafíos pendientes para aceptar.'
    }, { quoted: msg });
  }

  const db = cargarDatabase();
  inicializarUsuario(sender, db);

  const jugador2 = db.users[sender];

  // Congelar apuesta del jugador 2
  if (jugador2.pandacoins < partidaAceptar.apuesta) {
    return await sock.sendMessage(from, {
      text: `❌ Ya no tienes suficientes pandacoins para la apuesta.\n💰 Necesitas: ${partidaAceptar.apuesta}\n💳 Tienes: ${jugador2.pandacoins}`
    }, { quoted: msg });
  }

  jugador2.pandacoins -= partidaAceptar.apuesta;
  guardarDatabase(db);

  // Actualizar estado de la partida
  partidaAceptar.estado = 'colocando';
  partidaAceptar.fase = 'colocacion';
  partidasCaramelo.set(partidaId, partidaAceptar);

  // Enviar mensajes PRIVADOS para colocar caramelos
  await enviarInstruccionesPrivadas(sock, partidaAceptar);

  // Mensaje de inicio en el grupo
  const mensajeInicio = `🎮 *¡PARTIDA INICIADA!* 🚀

👤 *Jugador 1:* @${partidaAceptar.jugador1.split('@')[0]}
👤 *Jugador 2:* @${partidaAceptar.jugador2.split('@')[0]}
💰 *Apuesta:* ${partidaAceptar.apuesta.toLocaleString()} pandacoins

📢 *AMBOS JUGADORES:*
📩 Revisen sus *MENSAJES PRIVADOS* con el bot
🔒 Coloquen SECRETAMENTE su caramelo envenenado

⚡ *Instrucciones en privado:*
1. Usa \`.caramelo posicion <1-25>\`
2. Elige dónde esconder tu caramelo venenoso
3. ¡No le digas a nadie!

⏰ *Tiempo para colocar:* 1 minuto`;

  await sock.sendMessage(from, {
    text: mensajeInicio,
    mentions: [partidaAceptar.jugador1, partidaAceptar.jugador2]
  });

  // Timer para colocar caramelos
  setTimeout(() => {
    verificarColocacion(sock, partidaId);
  }, 60 * 1000);
}

async function enviarInstruccionesPrivadas(sock, partida) {
  const instrucciones = `🔒 *COLOCA TU CARAMELO ENVENENADO* ☠️

📊 *TABLERO DE POSICIONES:*
 1  2  3  4  5
 6  7  8  9  10
11 12 13 14 15
16 17 18 19 20
21 22 23 24 25

🎯 *INSTRUCCIONES:*
1. Elige un número del 1 al 25
2. Tu caramelo envenenado estará OCULTO allí
3. ¡Memoriza bien tu posición!
4. Evita elegir tu propio veneno durante el juego

📝 *Para colocar tu caramelo:*
\.caramelo posicion <número>

⏰ *Tienes 1 minuto para colocar tu caramelo.*
⚡ *¡Buena suerte!*`;

  const failed = [];


  try {
    await sock.sendMessage(partida.jugador1, { text: instrucciones });
    mensajesPrivados.set(partida.jugador1, partida.id);
  } catch (e) {
    console.error('❌ Error enviando mensaje privado a jugador 1:', e);
    failed.push(partida.jugador1);
  }


  try {
    await sock.sendMessage(partida.jugador2, { text: instrucciones });
    mensajesPrivados.set(partida.jugador2, partida.id);
  } catch (e) {
    console.error('❌ Error enviando mensaje privado a jugador 2:', e);
    failed.push(partida.jugador2);
  }

  
  if (failed.length > 0) {
    const faltaron = failed.map(j => `@${j.split('@')[0]}`).join(', ');
    const aviso = `⚠️ No pude enviar mensaje privado a: ${faltaron}.

Por favor, *abrid un chat privado con el bot* y enviad:
.caramelo posicion <número>

⏰ Tenéis 1 minuto para colocar vuestro caramelo en privado.`;

    await sock.sendMessage(partida.grupo, {
      text: aviso,
      mentions: [partida.jugador1, partida.jugador2]
    });
  }
}

async function colocarCaramelo(sock, msg, from, sender, args) {
  // Verificar si es un mensaje privado y si el usuario tiene partida
  const partidaId = mensajesPrivados.get(sender);
  
  if (!partidaId || !from.endsWith('@s.whatsapp.net')) {
    return await sock.sendMessage(from, {
      text: '❌ Este comando solo funciona en mensajes privados durante una partida.'
    }, { quoted: msg });
  }

  const partida = partidasCaramelo.get(partidaId);
  
  if (!partida || partida.estado !== 'colocando') {
    return await sock.sendMessage(from, {
      text: '❌ No tienes una partida activa para colocar caramelos.'
    }, { quoted: msg });
  }

  // Verificar que sea jugador de la partida
  if (partida.jugador1 !== sender && partida.jugador2 !== sender) {
    return await sock.sendMessage(from, {
      text: '❌ No eres jugador de esta partida.'
    }, { quoted: msg });
  }

  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Especifica la posición (1-25).\n💡 Ejemplo: .caramelo posicion 13'
    }, { quoted: msg });
  }

  const posicion = parseInt(args[0]);

  if (isNaN(posicion) || posicion < 1 || posicion > 25) {
    return await sock.sendMessage(from, {
      text: '❌ Posición inválida. Usa un número del 1 al 25.'
    }, { quoted: msg });
  }

  // Verificar si ya colocó su caramelo
  if (partida.caramelosEnvenenados[sender] !== null) {
    return await sock.sendMessage(from, {
      text: '❌ Ya colocaste tu caramelo envenenado.'
    }, { quoted: msg });
  }

  // Convertir posición a coordenadas
  const [fila, columna] = POSICIONES[posicion];
  
  // Verificar si la posición ya está ocupada por el otro jugador
  const otroJugador = sender === partida.jugador1 ? partida.jugador2 : partida.jugador1;
  const otroCaramelo = partida.caramelosEnvenenados[otroJugador];
  
  if (otroCaramelo !== null) {
    const [otroFila, otroColumna] = POSICIONES[otroCaramelo];
    if (fila === otroFila && columna === otroColumna) {
      return await sock.sendMessage(from, {
        text: `❌ El otro jugador ya colocó su caramelo en esa posición.\n💡 Elige otra posición (1-25).`
      }, { quoted: msg });
    }
  }

  // Colocar caramelo
  partida.caramelosEnvenenados[sender] = posicion;
  partidasCaramelo.set(partidaId, partida);

  await sock.sendMessage(from, {
    text: `✅ *CARAMELO COLOCADO* 🍭\n\n📌 Posición: ${posicion}\n🔒 Este es tu caramelo envenenado SECRETO\n💡 ¡Memorízalo bien!\n\n🎯 Ahora espera a que ambos terminen de colocar...`
  }, { quoted: msg });

  // Verificar si ambos ya colocaron
  if (partida.caramelosEnvenenados[partida.jugador1] !== null && 
      partida.caramelosEnvenenados[partida.jugador2] !== null) {
    
    partida.estado = 'jugando';
    partida.fase = 'eleccion';
    partidasCaramelo.set(partidaId, partida);
    
    // Iniciar juego
    await iniciarJuego(sock, partida);
  }
}

async function verificarColocacion(sock, partidaId) {
  const partida = partidasCaramelo.get(partidaId);
  
  if (!partida || partida.estado !== 'colocando') return;

  // Verificar si ambos colocaron
  const j1Coloco = partida.caramelosEnvenenados[partida.jugador1] !== null;
  const j2Coloco = partida.caramelosEnvenenados[partida.jugador2] !== null;

  if (!j1Coloco || !j2Coloco) {
    // Alguien no colocó, partida cancelada
    const db = cargarDatabase();
    
    // Devolver apuestas
    const jugador1 = db.users[partida.jugador1];
    const jugador2 = db.users[partida.jugador2];
    
    if (jugador1) jugador1.pandacoins += partida.apuesta;
    if (jugador2) jugador2.pandacoins += partida.apuesta;
    
    guardarDatabase(db);
    partidasCaramelo.delete(partidaId);
    
    let mensaje = `❌ *PARTIDA CANCELADA* ⏰\n\n`;
    
    if (!j1Coloco && !j2Coloco) {
      mensaje += `Ambos jugadores no colocaron su caramelo a tiempo.\n`;
    } else if (!j1Coloco) {
      mensaje += `@${partida.jugador1.split('@')[0]} no colocó su caramelo a tiempo.\n`;
    } else {
      mensaje += `@${partida.jugador2.split('@')[0]} no colocó su caramelo a tiempo.\n`;
    }
    
    mensaje += `💰 Apuestas devueltas a ambos jugadores.`;
    
    await sock.sendMessage(partida.grupo, {
      text: mensaje,
      mentions: [partida.jugador1, partida.jugador2]
    });
  }
}

async function iniciarJuego(sock, partida) {
  // Mensaje de inicio del juego
  const mensajeJuego = `🎮 *¡QUE COMIENCE EL JUEGO!* 🍬

👤 *Jugador 1:* @${partida.jugador1.split('@')[0]}
👤 *Jugador 2:* @${partida.jugador2.split('@')[0]}
💰 *Apuesta:* ${partida.apuesta.toLocaleString()} pandacoins

🎯 *REGLAS:*
• Turnos alternados para elegir caramelos
• ¡Evita tu propio caramelo envenenado!
• Quien elija veneno PIERDE
• Empate si ambos eligen veneno

🍭 *TABLERO ACTUAL:*
${generarTableroVisual(partida.tablero, partida.caramelosElegidos)}

🎲 *Turno actual:* @${partida.turno.split('@')[0]}

📝 *Para elegir un caramelo:*
\`.caramelo elegir <posición>\`

⏰ *Tiempo por turno:* 1 minuto`;

  await sock.sendMessage(partida.grupo, {
    text: mensajeJuego,
    mentions: [partida.jugador1, partida.jugador2]
  });

  // Timer para turno
  iniciarTimerTurno(sock, partida.id);
}

async function elegirCaramelo(sock, msg, from, sender, args) {
  if (args.length < 1) {
    return await sock.sendMessage(from, {
      text: '❌ Especifica la posición (1-25).\n💡 Ejemplo: .caramelo elegir 13'
    }, { quoted: msg });
  }

  const posicion = parseInt(args[0]);

  if (isNaN(posicion) || posicion < 1 || posicion > 25) {
    return await sock.sendMessage(from, {
      text: '❌ Posición inválida. Usa un número del 1 al 25.'
    }, { quoted: msg });
  }

  // Buscar partida activa del jugador en este grupo
  let partidaJugador = null;
  let partidaId = null;

  for (const [id, partida] of partidasCaramelo) {
    if (partida.grupo === from && 
        (partida.jugador1 === sender || partida.jugador2 === sender) && 
        partida.estado === 'jugando') {
      partidaJugador = partida;
      partidaId = id;
      break;
    }
  }

  if (!partidaJugador) {
    return await sock.sendMessage(from, {
      text: '❌ No estás en una partida activa en este grupo.'
    }, { quoted: msg });
  }

  if (partidaJugador.turno !== sender) {
    return await sock.sendMessage(from, {
      text: '❌ No es tu turno.'
    }, { quoted: msg });
  }

  // Verificar si la posición ya fue elegida
  const [fila, columna] = POSICIONES[posicion];
  
  if (partidaJugador.tablero[fila][columna] !== null) {
    return await sock.sendMessage(from, {
      text: '❌ Esa posición ya fue elegida.'
    }, { quoted: msg });
  }

  // Marcar posición como elegida
  partidaJugador.tablero[fila][columna] = sender;
  partidaJugador.caramelosElegidos.push({
    jugador: sender,
    posicion: posicion,
    tiempo: Date.now()
  });

  // Verificar si eligió un caramelo envenenado
  const carameloEnvenenado = partidaJugador.caramelosEnvenenados[sender];
  let resultado = null;

  if (posicion === carameloEnvenenado) {
    // ¡Encontró su propio veneno! Pierde
    resultado = 'perdio';
  } else {
    // Verificar si el otro jugador ya perdió
    const otroJugador = sender === partidaJugador.jugador1 ? partidaJugador.jugador2 : partidaJugador.jugador1;
    const otroPerdio = partidaJugador.caramelosElegidos.some(e => 
      e.jugador === otroJugador && e.posicion === partidaJugador.caramelosEnvenenados[otroJugador]
    );

    if (otroPerdio) {
      // El otro ya perdió, este gana
      resultado = 'gano';
    }
  }

  if (resultado) {
    // Fin de la partida
    await finalizarPartida(sock, partidaJugador, partidaId, resultado, sender, posicion);
    return;
  }

  // Cambiar turno
  partidaJugador.turno = partidaJugador.turno === partidaJugador.jugador1 
    ? partidaJugador.jugador2 
    : partidaJugador.jugador1;
  
  partidasCaramelo.set(partidaId, partidaJugador);

  // Mostrar resultado del turno
  const emojiCaramelo = posicion === carameloEnvenenado ? '☠️' : '🍬';
  const mensajeTurno = `🎲 *TURNO COMPLETADO* ✅

@${sender.split('@')[0]} eligió posición ${posicion} ${emojiCaramelo}

🍭 *Tablero actual:*
${generarTableroVisual(partidaJugador.tablero, partidaJugador.caramelosElegidos)}

🎯 *Siguiente turno:* @${partidaJugador.turno.split('@')[0]}

📝 *Para elegir:*
\`.caramelo elegir <posición>\`

⏰ *Tiempo restante:* 1 minuto`;

  await sock.sendMessage(from, {
    text: mensajeTurno,
    mentions: [partidaJugador.jugador1, partidaJugador.jugador2]
  });

  // Reiniciar timer
  clearTimeout(partidaJugador.timer);
  iniciarTimerTurno(sock, partidaId);
}

async function finalizarPartida(sock, partida, partidaId, resultado, jugadorAccion, posicion) {
  const db = cargarDatabase();
  
  let ganador = null;
  let perdedor = null;
  let mensajeFinal = '';
  let esEmpate = false;

  // Determinar resultado
  if (resultado === 'perdio') {
    // El jugador que actuó perdió
    perdedor = jugadorAccion;
    ganador = jugadorAccion === partida.jugador1 ? partida.jugador2 : partida.jugador1;
    
    mensajeFinal = `☠️ *¡CARAMELO ENVENENADO ENCONTRADO!* 💀\n\n` +
                   `@${perdedor.split('@')[0]} eligió su PROPIO caramelo envenenado en posición ${posicion}!\n\n` +
                   `👑 *GANADOR:* @${ganador.split('@')[0]}\n` +
                   `💔 *PERDEDOR:* @${perdedor.split('@')[0]}\n`;
  } else if (resultado === 'gano') {
    // El otro jugador ya había perdido
    ganador = jugadorAccion;
    perdedor = jugadorAccion === partida.jugador1 ? partida.jugador2 : partida.jugador1;
    
    mensajeFinal = `🎉 *¡VICTORIA POR ABANDONO!* 🏆\n\n` +
                   `@${perdedor.split('@')[0]} ya había encontrado su veneno anteriormente.\n\n` +
                   `👑 *GANADOR:* @${ganador.split('@')[0]}\n` +
                   `💔 *PERDEDOR:* @${perdedor.split('@')[0]}\n`;
  }

  // Verificar empate (ambos encontraron su veneno)
  const j1Perdio = partida.caramelosElegidos.some(e => 
    e.jugador === partida.jugador1 && e.posicion === partida.caramelosEnvenenados[partida.jugador1]
  );
  const j2Perdio = partida.caramelosElegidos.some(e => 
    e.jugador === partida.jugador2 && e.posicion === partida.caramelosEnvenenados[partida.jugador2]
  );

  if (j1Perdio && j2Perdio) {
    esEmpate = true;
    mensajeFinal = `🤝 *¡EMPATE!* 🤝\n\n` +
                   `¡AMBOS jugadores encontraron su propio caramelo envenenado!\n\n` +
                   `👤 @${partida.jugador1.split('@')[0]}\n` +
                   `👤 @${partida.jugador2.split('@')[0]}\n`;
  }

  // Mostrar caramelos envenenados
  mensajeFinal += `\n🔍 *CARAMELOS ENVENENADOS REVELADOS:*\n`;
  mensajeFinal += `@${partida.jugador1.split('@')[0]}: Posición ${partida.caramelosEnvenenados[partida.jugador1]}\n`;
  mensajeFinal += `@${partida.jugador2.split('@')[0]}: Posición ${partida.caramelosEnvenenados[partida.jugador2]}\n\n`;

  mensajeFinal += `🍭 *Tablero final:*\n`;
  mensajeFinal += `${generarTableroVisual(partida.tablero, partida.caramelosElegidos, true)}\n`;

  // Distribuir premios y actualizar estadísticas
  if (esEmpate) {
    // Devolver apuestas
    const jugador1 = db.users[partida.jugador1];
    const jugador2 = db.users[partida.jugador2];
    
    if (jugador1) jugador1.pandacoins += partida.apuesta;
    if (jugador2) jugador2.pandacoins += partida.apuesta;
    
    mensajeFinal += `💰 *Resultado:* Empate\n`;
    mensajeFinal += `💸 *Premio:* Cada jugador recupera ${partida.apuesta.toLocaleString()} pandacoins`;
  } else {
    // Ganador se lleva el pozo
    const ganadorUser = db.users[ganador];
    const perdedorUser = db.users[perdedor];
    
    const pozoTotal = partida.apuesta * 2;
    ganadorUser.pandacoins += pozoTotal;
    
    // Calcular bonificación por racha
    const statsGanador = ganadorUser.stats || {};
    const rachaActual = statsGanador.caramelo_racha || 0;
    const nuevaRacha = rachaActual + 1;
    
    let bonificacion = 0;
    let mensajeBonificacion = '';
    
    if (nuevaRacha >= 3) {
      bonificacion = Math.floor(pozoTotal * 0.1); // 10% extra por racha de 3+
      ganadorUser.pandacoins += bonificacion;
      mensajeBonificacion = `\n🔥 *BONUS RACHA ${nuevaRacha}:* +${bonificacion.toLocaleString()} pandacoins`;
    }
    
    mensajeFinal += `💰 *Apuesta:* ${partida.apuesta.toLocaleString()} pandacoins\n`;
    mensajeFinal += `🏆 *Premio:* ${pozoTotal.toLocaleString()} pandacoins${mensajeBonificacion}\n`;
    mensajeFinal += `💳 *Saldo de @${ganador.split('@')[0]}:* ${ganadorUser.pandacoins.toLocaleString()} pandacoins`;
    
    // Actualizar estadísticas
    ganadorUser.stats = ganadorUser.stats || {};
    ganadorUser.stats.caramelo_ganadas = (ganadorUser.stats.caramelo_ganadas || 0) + 1;
    ganadorUser.stats.caramelo_ganancias = (ganadorUser.stats.caramelo_ganancias || 0) + pozoTotal + bonificacion;
    ganadorUser.stats.caramelo_racha = nuevaRacha;
    ganadorUser.stats.caramelo_mejor_racha = Math.max(
      ganadorUser.stats.caramelo_mejor_racha || 0,
      nuevaRacha
    );
    
    perdedorUser.stats = perdedorUser.stats || {};
    perdedorUser.stats.caramelo_perdidas = (perdedorUser.stats.caramelo_perdidas || 0) + 1;
    perdedorUser.stats.caramelo_racha = 0;
  }

  // Actualizar estadísticas generales
  [partida.jugador1, partida.jugador2].forEach(jugadorId => {
    const user = db.users[jugadorId];
    if (user) {
      user.stats = user.stats || {};
      user.stats.caramelo_jugadas = (user.stats.caramelo_jugadas || 0) + 1;
    }
  });

  guardarDatabase(db);

  // Enviar mensaje final
  await sock.sendMessage(partida.grupo, {
    text: mensajeFinal,
    mentions: [partida.jugador1, partida.jugador2]
  });

  // Eliminar partida
  partidasCaramelo.delete(partidaId);
  mensajesPrivados.delete(partida.jugador1);
  mensajesPrivados.delete(partida.jugador2);
}

async function rechazarPartida(sock, msg, from, sender) {
  // Buscar partida pendiente
  let partidaRechazar = null;
  let partidaId = null;

  for (const [id, partida] of partidasCaramelo) {
    if (partida.jugador2 === sender && partida.estado === 'pendiente') {
      partidaRechazar = partida;
      partidaId = id;
      break;
    }
  }

  if (!partidaRechazar) {
    return await sock.sendMessage(from, {
      text: '❌ No tienes desafíos pendientes para rechazar.'
    }, { quoted: msg });
  }

  // Devolver apuesta al jugador 1
  const db = cargarDatabase();
  const jugador1 = db.users[partidaRechazar.jugador1];
  
  if (jugador1) {
    jugador1.pandacoins += partidaRechazar.apuesta;
    guardarDatabase(db);
  }

  // Eliminar partida
  partidasCaramelo.delete(partidaId);

  await sock.sendMessage(from, {
    text: `❌ *DESAFÍO RECHAZADO*\n\n@${sender.split('@')[0]} ha rechazado el desafío de @${partidaRechazar.jugador1.split('@')[0]}.\n💰 ${partidaRechazar.apuesta.toLocaleString()} pandacoins devueltos a @${partidaRechazar.jugador1.split('@')[0]}.`,
    mentions: [sender, partidaRechazar.jugador1]
  });
}

async function rendirsePartida(sock, msg, from, sender) {
  let partidaRendirse = null;
  let partidaId = null;

  for (const [id, partida] of partidasCaramelo) {
    if ((partida.jugador1 === sender || partida.jugador2 === sender) && 
        partida.estado === 'jugando' && partida.grupo === from) {
      partidaRendirse = partida;
      partidaId = id;
      break;
    }
  }

  if (!partidaRendirse) {
    return await sock.sendMessage(from, {
      text: '❌ No estás en una partida activa para rendirte.'
    }, { quoted: msg });
  }

  const ganador = partidaRendirse.jugador1 === sender 
    ? partidaRendirse.jugador2 
    : partidaRendirse.jugador1;

  const db = cargarDatabase();
  
  const ganadorUser = db.users[ganador];
  ganadorUser.pandacoins += partidaRendirse.apuesta * 2;
  
  ganadorUser.stats = ganadorUser.stats || {};
  ganadorUser.stats.caramelo_ganadas = (ganadorUser.stats.caramelo_ganadas || 0) + 1;
  ganadorUser.stats.caramelo_ganancias = (ganadorUser.stats.caramelo_ganancias || 0) + (partidaRendirse.apuesta * 2);
  ganadorUser.stats.caramelo_racha = (ganadorUser.stats.caramelo_racha || 0) + 1;
  
  const perdedorUser = db.users[sender];
  perdedorUser.stats = perdedorUser.stats || {};
  perdedorUser.stats.caramelo_perdidas = (perdedorUser.stats.caramelo_perdidas || 0) + 1;
  perdedorUser.stats.caramelo_racha = 0;
  
  guardarDatabase(db);

  const mensajeRendicion = `🏳️ *¡RENDICIÓN!* 🏳️

👤 *Rendido:* @${sender.split('@')[0]}
👑 *Ganador:* @${ganador.split('@')[0]}
💰 *Apuesta:* ${partidaRendirse.apuesta.toLocaleString()} pandacoins

🔍 *Caramelos envenenados:*
@${partidaRendirse.jugador1.split('@')[0]}: Posición ${partidaRendirse.caramelosEnvenenados[partidaRendirse.jugador1]}
@${partidaRendirse.jugador2.split('@')[0]}: Posición ${partidaRendirse.caramelosEnvenenados[partidaRendirse.jugador2]}

🎮 *Resultado:* Rendición
💸 *Premio:* @${ganador.split('@')[0]} gana ${(partidaRendirse.apuesta * 2).toLocaleString()} pandacoins

💔 *¡Mejor suerte la próxima vez!*`;

  await sock.sendMessage(from, {
    text: mensajeRendicion,
    mentions: [sender, ganador]
  });
  partidasCaramelo.delete(partidaId);
  mensajesPrivados.delete(partidaRendirse.jugador1);
  mensajesPrivados.delete(partidaRendirse.jugador2);
}

async function mostrarTablero(sock, msg, from, sender) {
  let partida = null;

  for (const [_, p] of partidasCaramelo) {
    if (p.grupo === from && (p.jugador1 === sender || p.jugador2 === sender)) {
      partida = p;
      break;
    }
  }

  if (!partida) {
    return await sock.sendMessage(from, {
      text: '❌ No estás en una partida activa en este grupo.'
    }, { quoted: msg });
  }

  const estadoTexto = partida.estado === 'colocando' 
    ? '🔒 *Estado:* Colocando caramelos (en privado)'
    : partida.estado === 'jugando'
    ? '🎮 *Estado:* En juego'
    : '⏳ *Estado:* Pendiente';

  const turnoTexto = partida.estado === 'jugando'
    ? `🎯 *Turno:* @${partida.turno.split('@')[0]}`
    : '';

  const mensaje = `🍭 *TABLERO DE CARAMELO ENVENENADO* ☠️

${estadoTexto}
👤 *Jugador 1:* @${partida.jugador1.split('@')[0]}
👤 *Jugador 2:* @${partida.jugador2.split('@')[0]}
💰 *Apuesta:* ${partida.apuesta.toLocaleString()} pandacoins
${turnoTexto}

${generarTableroVisual(partida.tablero, partida.caramelosElegidos)}

${partida.estado === 'jugando' 
  ? `📝 *Para elegir:* \`.caramelo elegir <posición>\``
  : partida.estado === 'colocando'
  ? `🔒 *Coloca tu caramelo en PRIVADO con el bot*`
  : `✅ *Para aceptar:* \`.caramelo aceptar\``}`;

  await sock.sendMessage(from, {
    text: mensaje,
    mentions: [partida.jugador1, partida.jugador2]
  }, { quoted: msg });
}

async function mostrarRanking(sock, from, msg) {
  const db = cargarDatabase();
  
  if (!db.users) {
    return await sock.sendMessage(from, {
      text: '🏆 *RANKING DE CARAMELO ENVENENADO*\n\n📭 Aún no hay jugadores con estadísticas.'
    }, { quoted: msg });
  }
  
  const usuariosConStats = Object.entries(db.users)
    .filter(([_, user]) => user.stats?.caramelo_jugadas)
    .map(([id, user]) => ({
      id,
      nombre: `@${id.split('@')[0]}`,
      jugadas: user.stats.caramelo_jugadas || 0,
      ganadas: user.stats.caramelo_ganadas || 0,
      perdidas: user.stats.caramelo_perdidas || 0,
      ganancias: user.stats.caramelo_ganancias || 0,
      rachaActual: user.stats.caramelo_racha || 0,
      mejorRacha: user.stats.caramelo_mejor_racha || 0
    }));
  
  usuariosConStats.sort((a, b) => b.ganancias - a.ganancias);
  
  let rankingTexto = `🏆 *TOP 10 CARAMELO ENVENENADO* 🍭\n\n`;
  
  if (usuariosConStats.length === 0) {
    rankingTexto += `📭 Aún no hay jugadores con estadísticas.\n💡 ¡Sé el primero en jugar!`;
  } else {
    const top10 = usuariosConStats.slice(0, 10);
    
    top10.forEach((usuario, index) => {
      const emoji = index === 0 ? '👑' : 
                   index === 1 ? '🥈' : 
                   index === 2 ? '🥉' : '🏅';
      
      const winRate = usuario.jugadas > 0 ? Math.round((usuario.ganadas / usuario.jugadas) * 100) : 0;
      
      rankingTexto += `${emoji} ${usuario.nombre}\n`;
      rankingTexto += `   📊 ${usuario.jugadas} partidas | ${winRate}% victorias\n`;
      rankingTexto += `   💰 ${usuario.ganancias.toLocaleString()} coins ganados\n`;
      if (usuario.rachaActual >= 3) {
        rankingTexto += `   🔥 Racha actual: ${usuario.rachaActual} victorias\n`;
      }
      if (usuario.mejorRacha >= 5) {
        rankingTexto += `   ⭐ Mejor racha: ${usuario.mejorRacha}\n`;
      }
      rankingTexto += '\n';
    });
  }
  
  rankingTexto += `\n🎮 *Para jugar:* .caramelo jugar @usuario <apuesta>\n`;
  rankingTexto += `📊 *Tu racha:* .caramelo racha`;
  
  await sock.sendMessage(from, { text: rankingTexto }, { quoted: msg });
}

async function mostrarRacha(sock, from, sender, msg) {
  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  
  const user = db.users[sender];
  const stats = user.stats || {};
  
  const jugadas = stats.caramelo_jugadas || 0;
  const ganadas = stats.caramelo_ganadas || 0;
  const perdidas = stats.caramelo_perdidas || 0;
  const ganancias = stats.caramelo_ganancias || 0;
  const rachaActual = stats.caramelo_racha || 0;
  const mejorRacha = stats.caramelo_mejor_racha || 0;
  
  const winRate = jugadas > 0 ? Math.round((ganadas / jugadas) * 100) : 0;
  const promedioGanancia = ganadas > 0 ? Math.floor(ganancias / ganadas) : 0;
  
  let rachaTexto = '';
  if (rachaActual >= 3) {
    rachaTexto = `🔥 *RACHA ACTUAL:* ${rachaActual} victorias consecutivas!\n`;
    if (rachaActual >= 5) {
      rachaTexto += `⚡ ¡Estás en llamas! Sigue así.\n`;
    }
  }
  
  if (mejorRacha >= 5) {
    rachaTexto += `⭐ *MEJOR RACHA:* ${mejorRacha} victorias\n`;
  }
  
  let estadisticasTexto = `📊 *TUS ESTADÍSTICAS DE CARAMELO ENVENENADO* 🍭\n\n`;
  estadisticasTexto += `👤 *Jugador:* @${sender.split('@')[0]}\n\n`;
  
  estadisticasTexto += `🎮 *RESUMEN:*\n`;
  estadisticasTexto += `📈 Partidas jugadas: ${jugadas}\n`;
  estadisticasTexto += `🏆 Victorias: ${ganadas}\n`;
  estadisticasTexto += `💔 Derrotas: ${perdidas}\n`;
  estadisticasTexto += `📊 Win Rate: ${winRate}%\n\n`;
  
  estadisticasTexto += `💰 *GANANCIAS:*\n`;
  estadisticasTexto += `💸 Total ganado: ${ganancias.toLocaleString()} coins\n`;
  estadisticasTexto += `📈 Promedio por victoria: ${promedioGanancia.toLocaleString()} coins\n\n`;
  
  if (rachaTexto) {
    estadisticasTexto += `⚡ *RACHAS:*\n${rachaTexto}\n`;
  }
  
  let consejo = '';
  if (jugadas === 0) {
    consejo = '💡 ¡Juega tu primera partida con .caramelo jugar @usuario 100!';
  } else if (winRate < 40) {
    consejo = '🎯 *Consejo:* Intenta memorizar mejor tu posición. ¡La memoria es clave!';
  } else if (winRate > 60) {
    consejo = '🌟 ¡Excelente memoria! Sigue desafiando a otros jugadores.';
  } else {
    consejo = '📝 *Consejo:* Mantén un registro mental de las posiciones ya elegidas.';
  }
  
  estadisticasTexto += consejo;
  
  await sock.sendMessage(from, {
    text: estadisticasTexto,
    mentions: [sender]
  }, { quoted: msg });
}

function generarTableroVisual(tablero, caramelosElegidos, mostrarTodo = false) {
  let visual = '';
  const emojisBase = ['🍭', '🍬', '🍫', '🍬', '🍭'];
  
  for (let fila = 0; fila < 5; fila++) {
    for (let columna = 0; columna < 5; columna++) {
      const posicion = Object.keys(POSICIONES).find(key => {
        const [f, c] = POSICIONES[key];
        return f === fila && c === columna;
      });
      
      if (tablero[fila][columna] !== null) {
        const jugador = tablero[fila][columna];
        const carameloElegido = caramelosElegidos.find(c => 
          c.jugador === jugador && c.posicion === parseInt(posicion)
        );
        
        if (carameloElegido) {
          visual += '❌ ';
        } else {
          visual += '✅ ';
        }
      } else {
        if (mostrarTodo) {
          visual += `${emojisBase[columna]} `;
        } else {
          visual += '⬜ ';
        }
      }
    }
    visual += '\n';
  }
  
  if (!mostrarTodo) {
    visual += '\n📌 *Posiciones disponibles:* ';
    const disponibles = [];
    
    for (let i = 1; i <= 25; i++) {
      const [fila, columna] = POSICIONES[i];
      if (tablero[fila][columna] === null) {
        disponibles.push(i);
      }
    }
    
    if (disponibles.length > 0) {
      visual += disponibles.slice(0, 10).join(', ');
      if (disponibles.length > 10) {
        visual += `... (${disponibles.length} disponibles)`;
      }
    } else {
      visual += 'Ninguna';
    }
  }
  
  return visual;
}

function iniciarTimerTurno(sock, partidaId) {
  const partida = partidasCaramelo.get(partidaId);
  
  if (!partida || partida.estado !== 'jugando') return;
  
  if (partida.timer) clearTimeout(partida.timer);
  
  partida.timer = setTimeout(async () => {
    const partidaActual = partidasCaramelo.get(partidaId);
    
    if (partidaActual && partidaActual.estado === 'jugando') {
 
      const perdedor = partidaActual.turno;
      const ganador = partidaActual.turno === partidaActual.jugador1 
        ? partidaActual.jugador2 
        : partidaActual.jugador1;
      
      const db = cargarDatabase();
      
      const ganadorUser = db.users[ganador];
      ganadorUser.pandacoins += partidaActual.apuesta * 2;
      
      ganadorUser.stats = ganadorUser.stats || {};
      ganadorUser.stats.caramelo_ganadas = (ganadorUser.stats.caramelo_ganadas || 0) + 1;
      ganadorUser.stats.caramelo_racha = (ganadorUser.stats.caramelo_racha || 0) + 1;
      
      const perdedorUser = db.users[perdedor];
      perdedorUser.stats = perdedorUser.stats || {};
      perdedorUser.stats.caramelo_perdidas = (perdedorUser.stats.caramelo_perdidas || 0) + 1;
      perdedorUser.stats.caramelo_racha = 0;
      
      guardarDatabase(db);
      
      const mensajeTimeout = `⏰ *¡TIEMPO AGOTADO!* ⏰

@${perdedor.split('@')[0]} se quedó sin tiempo.
👑 *Ganador automático:* @${ganador.split('@')[0]}
💰 *Apuesta:* ${partidaActual.apuesta.toLocaleString()} pandacoins

🔍 *Caramelos envenenados:*
@${partidaActual.jugador1.split('@')[0]}: Posición ${partidaActual.caramelosEnvenenados[partidaActual.jugador1]}
@${partidaActual.jugador2.split('@')[0]}: Posición ${partidaActual.caramelosEnvenenados[partidaActual.jugador2]}

🎮 *Resultado:* Victoria por tiempo
💸 *Premio:* @${ganador.split('@')[0]} gana ${(partidaActual.apuesta * 2).toLocaleString()} pandacoins

⚡ *¡Sé más rápido en tu próximo turno!*`;
      
      await sock.sendMessage(partidaActual.grupo, {
        text: mensajeTimeout,
        mentions: [perdedor, ganador]
      });
       partidasCaramelo.delete(partidaId);
      mensajesPrivados.delete(partidaActual.jugador1);
      mensajesPrivados.delete(partidaActual.jugador2);
    }
  }, 60 * 1000);
  
  partida.timer = partida.timer;
  partidasCaramelo.set(partidaId, partida);
}

setInterval(() => {
  const ahora = Date.now();
  
  for (const [partidaId, partida] of partidasCaramelo) {

    if (partida.estado === 'pendiente' && (ahora - partida.creado) > 5 * 60 * 1000) {
      partidasCaramelo.delete(partidaId);
      
      const db = cargarDatabase();
      const jugador1 = db.users[partida.jugador1];
      
      if (jugador1) {
        jugador1.pandacoins += partida.apuesta;
        guardarDatabase(db);
      }
    }
   
    if (partida.estado === 'terminada' && (ahora - partida.creado) > 10 * 60 * 1000) {
      partidasCaramelo.delete(partidaId);
      mensajesPrivados.delete(partida.jugador1);
      mensajesPrivados.delete(partida.jugador2);
    }
  }
}, 60 * 1000);