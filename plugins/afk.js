import { cargarDatabase, guardarDatabase, inicializarUsuario } from '../data/database.js';
import { isVip } from '../utils/vip.js';
import { ownerNumber } from '../config.js';

const afkUsuarios = new Map();

function esOwner(sender) {
  const senderNumber = sender.split('@')[0];
  return ownerNumber.includes('+' + senderNumber);
}

export function puedeSerRobado(usuarioId) {
  const usuarioAFK = afkUsuarios.get(usuarioId);

  if (!usuarioAFK) return true;

  if (usuarioAFK.estado === 'activo') {
    return false;
  }

  return true;
}

export function puedeRobar(usuarioId) {
  const usuarioAFK = afkUsuarios.get(usuarioId);

  if (!usuarioAFK) return true;

  if (usuarioAFK.estado === 'activo') {
    return false;
  }

  return true;
}

export function cargarAFKDesdeDB() {
  const db = cargarDatabase();

  if (!db.afk) {
    db.afk = {
      usuarios: {},
      estadisticas: {}
    };
    guardarDatabase(db);
    return;
  }

  Object.entries(db.afk.usuarios).forEach(([usuarioId, datosAFK]) => {
    if (datosAFK.estado === 'activo') {
      afkUsuarios.set(usuarioId, {
        ...datosAFK,
        inicio: datosAFK.inicio || Date.now()
      });
    }
  });

  console.log(`✅ Cargados ${afkUsuarios.size} usuarios AFK activos desde la base de datos`);
}


export async function desactivarAFKAutomatico(sender, from, sock = null) {
  const usuarioAFK = afkUsuarios.get(sender);
  
  if (!usuarioAFK || usuarioAFK.estado !== 'activo') {
    return false;
  }

  const ahora = Date.now();
  const tiempoAFK = ahora - usuarioAFK.inicio;


  const db = cargarDatabase();
  inicializarUsuario(sender, db);
  const user = db.users[sender];

  if (!user.afkStats) {
    user.afkStats = {
      totalTiempo: 0,
      totalSesiones: 0,
      robosPrevenidos: 0,
      mejorRacha: 0
    };
  }

  user.afkStats.totalTiempo += tiempoAFK;
  user.afkStats.totalSesiones += 1;
  user.afkStats.robosPrevenidos += usuarioAFK.robosPrevenidos || 0;

  const horasAFK = Math.floor(tiempoAFK / 3600000);
  if (horasAFK > user.afkStats.mejorRacha) {
    user.afkStats.mejorRacha = horasAFK;
  }


  if (!db.afk) {
    db.afk = {
      usuarios: {},
      estadisticas: {}
    };
  }

  if (!db.afk.estadisticas[sender]) {
    db.afk.estadisticas[sender] = {
      totalTiempo: 0,
      sesiones: 0,
      robosPrevenidos: 0
    };
  }

  db.afk.estadisticas[sender].totalTiempo += tiempoAFK;
  db.afk.estadisticas[sender].sesiones += 1;
  db.afk.estadisticas[sender].robosPrevenidos += usuarioAFK.robosPrevenidos || 0;


  afkUsuarios.delete(sender);
  

  if (db.afk.usuarios && db.afk.usuarios[sender]) {
    delete db.afk.usuarios[sender];
  }


  user.afkCooldown = ahora;

  guardarDatabase(db);


  const minutosAFK = Math.floor(tiempoAFK / 60000);
  
  if (minutosAFK >= 1 && sock && from) {
    try {
      const horas = Math.floor(tiempoAFK / 3600000);
      const minutos = Math.floor((tiempoAFK % 3600000) / 60000);
      
      const mensaje = `🔄 *AFK DESACTIVADO AUTOMÁTICAMENTE*\n\n` +
                     `👤 *Usuario:* Tú` +
                     `⏱️ *Tiempo en AFK:* ${horas}h ${minutos}m\n` +
                     `🛡️ *Robos prevenidos:* ${usuarioAFK.robosPrevenidos || 0}\n\n` +
                     `💡 *El AFK se desactiva automáticamente cuando envías mensajes.*\n` +
                     `🎮 *Ahora puedes:* robar a otros usuarios y jugar normalmente.\n` +
                     `⏰ *Cooldown:* 5 minutos antes de reactivar AFK`;
      
      await sock.sendMessage(from, {
        text: mensaje,
        mentions: [sender]
      });
    } catch (error) {
      console.log('Error notificando desactivación automática de AFK');
    }
  }

  return true;
}

export const command = 'afk';
export const aliases = ['away', 'ausente'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const subcomando = args[0]?.toLowerCase() || 'estado';

  switch (subcomando) {
    case 'on':
    case 'activar':
    case 'enable':
      await activarAFK(sock, msg, from, sender);
      break;

    case 'off':
    case 'desactivar':
    case 'disable':
      await desactivarAFK(sock, msg, from, sender);
      break;

    case 'estado':
    case 'status':
      await estadoAFK(sock, msg, from, sender);
      break;

    case 'ranking':
    case 'top':
      await mostrarRankingAFK(sock, from, msg);
      break;

    case 'quitar':
    case 'remove':                                                                                                                                                                     
      await quitarAFK(sock, msg, from, sender, args.slice(1));
      break;

    case 'ayuda':
    case 'help':
    default:
      await mostrarAyudaAFK(sock, from, msg);
  }
}

async function mostrarAyudaAFK(sock, from, msg) {
  const ayuda = `🛡️ *SISTEMA DE PROTECCIÓN AFK* ⏰

🎮 *COMANDOS DISPONIBLES:*
• .afk on - Activar modo AFK (solo VIP)
• .afk off - Desactivar modo AFK
• .afk estado - Ver tu estado AFK
• .afk ranking - Ranking de protección AFK
• .afk quitar @usuario - Quitar AFK de usuario (Owner)
• .afk ayuda - Esta ayuda

🎯 *¿QUÉ ES EL MODO AFK?*
• Protección contra robos de pandacoins y personajes
• Solo disponible para usuarios VIP
• Mientras estés AFK, nadie puede robarte
• Tampoco puedes robar a otros mientras estés AFK

⚡ *NUEVO - NERFEO IMPORTANTE:*
• El AFK se desactiva AUTOMÁTICAMENTE cuando envías cualquier mensaje
• Ya no puedes estar AFK y seguir chateando normalmente
• El AFK ahora es solo para cuando realmente estás "Ausente"

⏰ *RESTRICCIONES:*
• Cooldown de 5 minutos entre activaciones
• Máximo 24 horas continuas en AFK
• Se desactiva automáticamente al enviar mensajes
• Se registra automáticamente al salir

💰 *BENEFICIOS VIP:*
• Protección completa contra robos
• Estadísticas de tiempo protegido
• Ranking de mejores protectores
• Sin límite de uso (solo cooldown)

⚠️ *IMPORTANTE:* El modo AFK es solo para protección REAL cuando estás ausente.`;

  await sock.sendMessage(from, { text: ayuda }, { quoted: msg });
}

async function activarAFK(sock, msg, from, sender) {
  const db = cargarDatabase();
  inicializarUsuario(sender, db);

  const user = db.users[sender];

  if (!isVip(sender)) {
    return await sock.sendMessage(from, {
      text: `❌ *SOLO PARA USUARIOS VIP*\n\n` +
            `El modo AFK es una protección exclusiva para usuarios VIP.\n\n` +
            `💎 *Para ser VIP:*\n` +
            `• Compra acceso VIP con el creador del bot\n` +
            `• Participa en eventos especiales\n` +
            `• Sé un usuario destacado\n\n` +
            `🔒 *Beneficios VIP incluyen:*\n` +
            `🛡️ Protección AFK contra robos\n` +
            `⭐ Probabilidades mejoradas en .robar\n` +
            `🎁 Recompensas exclusivas\n` +
            `👑 Prioridad en soporte`
    }, { quoted: msg });
  }

  const ahora = Date.now();
  const cooldownAFK = 5 * 60 * 1000;

  if (user.afkCooldown && (ahora - user.afkCooldown) < cooldownAFK) {
    const tiempoRestante = cooldownAFK - (ahora - user.afkCooldown);
    const minutos = Math.floor(tiempoRestante / 60000);
    const segundos = Math.floor((tiempoRestante % 60000) / 1000);

    return await sock.sendMessage(from, {
      text: `⏰ *COOLDOWN ACTIVO*\n\n` +
            `Debes esperar *${minutos}m ${segundos}s* antes de activar el AFK nuevamente.\n\n` +
            `💡 Esto evita el abuso del sistema de protección.\n` +
            `🎯 Puedes ver tu estado actual con: .afk estado`
    }, { quoted: msg });
  }

  const usuarioAFK = afkUsuarios.get(sender);
  if (usuarioAFK && usuarioAFK.estado === 'activo') {
    const tiempoAFK = ahora - usuarioAFK.inicio;
    const horas = Math.floor(tiempoAFK / 3600000);
    const minutos = Math.floor((tiempoAFK % 3600000) / 60000);

    return await sock.sendMessage(from, {
      text: `⚠️ *YA ESTÁS EN MODO AFK*\n\n` +
            `Tiempo en AFK: *${horas}h ${minutos}m*\n` +
            `Inicio: ${new Date(usuarioAFK.inicio).toLocaleTimeString()}\n\n` +
            `🔒 Estás protegido contra robos.\n` +
            `🎮 Para desactivar: .afk off\n` +
            `⚡ *Nota:* El AFK se desactiva automáticamente al enviar mensajes`
    }, { quoted: msg });
  }

  const datosAFK = {
    usuario: sender,
    inicio: ahora,
    estado: 'activo',
    grupo: from,
    robosPrevenidos: 0,
    ultimaActualizacion: ahora
  };

  afkUsuarios.set(sender, datosAFK);

  if (!db.afk) {
    db.afk = {
      usuarios: {},
      estadisticas: {}
    };
  }

  db.afk.usuarios[sender] = datosAFK;

  user.afkCooldown = ahora;

  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `✅ *MODO AFK ACTIVADO* 🛡️\n\n` +
          `👤 *Usuario:* @${sender.split('@')[0]}\n` +
          `⏰ *Activado:* ${new Date(ahora).toLocaleTimeString()}\n` +
          `⭐ *Estado:* VIP - Protección completa\n\n` +
          `🔒 *PROTECCIONES ACTIVAS:*\n` +
          `💰 Robo de pandacoins (comando .robar)\n` +
          `🎭 Robo de personajes (comando .robarps)\n` +
          `⚠️ Otros comandos de robo\n\n` +
          `⚡ *NUEVAS REGLAS (NERFEO):*\n` +
          `❌ Se desactiva automáticamente al enviar cualquier mensaje\n` +
          `❌ No puedes robar a otros usuarios\n` +
          `⏰ Máximo 24 horas continuas\n` +
          `⚡ Si chateas, pierdes la protección AFK\n\n` +
          `💡 Para desactivar manualmente: .afk off\n` +
          `📊 Ver estado: .afk estado\n` +
          `⚠️ *Recuerda:* El AFK ahora es solo para cuando REALMENTE estás ausente`
  }, { quoted: msg });

  try {
    await sock.sendMessage(sender, {
      text: `🔔 *RECORDATORIO AFK ACTIVADO*\n\n` +
            `Has activado el modo AFK en el grupo.\n` +
            `🛡️ Estás protegido contra robos.\n\n` +
            `⚡ *IMPORTANTE - NERFEO APLICADO:*\n` +
            `• El AFK se desactiva AUTOMÁTICAMENTE cuando envías mensajes\n` +
            `• Ya no puedes estar AFK y chatear al mismo tiempo\n` +
            `• Se desactiva después de 24h máximo\n\n` +
            `⏰ *Cooldown después de desactivar:* 5 minutos\n` +
            `🎯 ¡Usa el AFK solo cuando realmente estés ausente!`
    });
  } catch (error) {
    console.log(`⚠️ No se pudo enviar mensaje privado de AFK a ${sender}`);
  }
}

async function desactivarAFK(sock, msg, from, sender) {
  const usuarioAFK = afkUsuarios.get(sender);

  if (!usuarioAFK || usuarioAFK.estado !== 'activo') {
    return await sock.sendMessage(from, {
      text: '❌ No tienes el modo AFK activado.'
    }, { quoted: msg });
  }

  const ahora = Date.now();
  const tiempoAFK = ahora - usuarioAFK.inicio;

  const horas = Math.floor(tiempoAFK / 3600000);
  const minutos = Math.floor((tiempoAFK % 3600000) / 60000);
  const segundos = Math.floor((tiempoAFK % 60000) / 1000);

  const db = cargarDatabase();
  inicializarUsuario(sender, db);

  const user = db.users[sender];

  if (!user.afkStats) {
    user.afkStats = {
      totalTiempo: 0,
      totalSesiones: 0,
      robosPrevenidos: 0,
      mejorRacha: 0
    };
  }

  user.afkStats.totalTiempo += tiempoAFK;
  user.afkStats.totalSesiones += 1;
  user.afkStats.robosPrevenidos += usuarioAFK.robosPrevenidos || 0;

  if (horas > user.afkStats.mejorRacha) {
    user.afkStats.mejorRacha = horas;
  }

  if (!db.afk) {
    db.afk = {
      usuarios: {},
      estadisticas: {}
    };
  }

  if (!db.afk.estadisticas[sender]) {
    db.afk.estadisticas[sender] = {
      totalTiempo: 0,
      sesiones: 0,
      robosPrevenidos: 0
    };
  }

  db.afk.estadisticas[sender].totalTiempo += tiempoAFK;
  db.afk.estadisticas[sender].sesiones += 1;
  db.afk.estadisticas[sender].robosPrevenidos += usuarioAFK.robosPrevenidos || 0;

  afkUsuarios.delete(sender);
  delete db.afk.usuarios[sender];

  user.afkCooldown = ahora;

  guardarDatabase(db);

  let mensaje = `✅ *MODO AFK DESACTIVADO* 🔓\n\n`;
  mensaje += `👤 *Usuario:* Tú\n`;
  mensaje += `⏱️ *Tiempo en AFK:* ${horas}h ${minutos}m ${segundos}s\n`;
  mensaje += `🛡️ *Robos prevenidos:* ${usuarioAFK.robosPrevenidos || 0}\n\n`;

  mensaje += `📊 *ESTADÍSTICAS DE ESTA SESIÓN:*\n`;
  mensaje += `• Tiempo total: ${horas}h ${minutos}m\n`;
  mensaje += `• Protección activa: ${usuarioAFK.robosPrevenidos || 0} robos prevenidos\n\n`;

  mensaje += `📈 *ESTADÍSTICAS TOTALES:*\n`;
  mensaje += `• Sesiones AFK: ${user.afkStats.totalSesiones}\n`;
  mensaje += `• Tiempo total protegido: ${Math.floor(user.afkStats.totalTiempo / 3600000)}h\n`;
  mensaje += `• Robos prevenidos total: ${user.afkStats.robosPrevenidos}\n`;
  mensaje += `• Mejor racha: ${user.afkStats.mejorRacha}h\n\n`;

  mensaje += `⏰ *Cooldown:* 5 minutos antes de poder activar AFK nuevamente\n`;
  mensaje += `🎮 *Ahora puedes:*\n`;
  mensaje += `✅ Robar a otros usuarios\n`;
  mensaje += `✅ Participar en todos los juegos\n`;
  mensaje += `✅ Usar comandos normalmente\n\n`;
  mensaje += `⚡ *Recuerda:* El AFK se desactiva automáticamente al enviar mensajes`;

  await sock.sendMessage(from, {
    text: mensaje,
    mentions: [sender]
  }, { quoted: msg });
}

async function estadoAFK(sock, msg, from, sender) {
  const db = cargarDatabase();
  inicializarUsuario(sender, db);

  const user = db.users[sender];
  const usuarioAFK = afkUsuarios.get(sender);

  let mensaje = `📊 *ESTADO DE PROTECCIÓN AFK* 🛡️\n\n`;
  mensaje += `👤 *Usuario:* Tú\n`;

  if (!isVip(sender)) {
    mensaje += `⭐ *Estado VIP:* ❌ No eres VIP\n\n`;
    mensaje += `💎 *Para acceder al AFK necesitas ser VIP*\n`;
    mensaje += `🔒 El modo AFK es una protección exclusiva para usuarios VIP.\n\n`;
    mensaje += `🎯 *Beneficios VIP:*\n`;
    mensaje += `• Protección contra robos\n`;
    mensaje += `• Mejores probabilidades en robos\n`;
    mensaje += `• Recompensas exclusivas\n`;
    mensaje += `• Soporte prioritario\n\n`;
    mensaje += `📞 Contacta a un Owner para más información.`;

    return await sock.sendMessage(from, {
      text: mensaje,
      mentions: [sender]
    }, { quoted: msg });
  }

  mensaje += `⭐ *Estado VIP:* ✅ Eres usuario VIP\n`;

  if (usuarioAFK && usuarioAFK.estado === 'activo') {
    const ahora = Date.now();
    const tiempoAFK = ahora - usuarioAFK.inicio;
    const horas = Math.floor(tiempoAFK / 3600000);
    const minutos = Math.floor((tiempoAFK % 3600000) / 60000);

    mensaje += `🔒 *Modo AFK:* ✅ ACTIVO\n`;
    mensaje += `⏰ *Tiempo activo:* ${horas}h ${minutos}m\n`;
    mensaje += `🛡️ *Robos prevenidos:* ${usuarioAFK.robosPrevenidos || 0}\n`;
    mensaje += `📅 *Activado:* ${new Date(usuarioAFK.inicio).toLocaleTimeString()}\n\n`;

    const tiempoMaximo = 24 * 3600000;
    const tiempoRestante = tiempoMaximo - tiempoAFK;

    if (tiempoRestante > 0) {
      const horasRestantes = Math.floor(tiempoRestante / 3600000);
      const minutosRestantes = Math.floor((tiempoRestante % 3600000) / 60000);
      mensaje += `⏳ *Tiempo restante máximo:* ${horasRestantes}h ${minutosRestantes}m\n`;
    } else {
      mensaje += `⚠️ *AFK expirará pronto* (máximo 24h alcanzado)\n`;
    }

    mensaje += `\n🔒 *PROTECCIONES ACTIVAS:*\n`;
    mensaje += `✅ Robo de pandacoins (.robar)\n`;
    mensaje += `✅ Robo de personajes (.robarps)\n`;
    mensaje += `✅ Otros comandos de robo\n\n`;

    mensaje += `⚡ *NUEVAS REGLAS (NERFEO):*\n`;
    mensaje += `❌ Se desactiva automáticamente al enviar mensajes\n`;
    mensaje += `❌ No puedes robar a otros\n`;
    mensaje += `✅ Puedes jugar normalmente\n\n`;

    mensaje += `⚠️ *El AFK se desactiva automáticamente si envías mensajes*`;

  } else {
    mensaje += `🔒 *Modo AFK:* ❌ INACTIVO\n\n`;

    if (user.afkStats) {
      const totalHoras = Math.floor(user.afkStats.totalTiempo / 3600000);
      const totalMinutos = Math.floor((user.afkStats.totalTiempo % 3600000) / 60000);

      mensaje += `📈 *ESTADÍSTICAS HISTÓRICAS:*\n`;
      mensaje += `• Sesiones AFK: ${user.afkStats.totalSesiones}\n`;
      mensaje += `• Tiempo total: ${totalHoras}h ${totalMinutos}m\n`;
      mensaje += `• Robos prevenidos: ${user.afkStats.robosPrevenidos}\n`;
      mensaje += `• Mejor racha: ${user.afkStats.mejorRacha}h\n\n`;
    }

   
    const ahora = Date.now();
    const cooldownAFK = 5 * 60 * 1000;

    if (user.afkCooldown && (ahora - user.afkCooldown) < cooldownAFK) {
      const tiempoRestante = cooldownAFK - (ahora - user.afkCooldown);
      const minutos = Math.floor(tiempoRestante / 60000);
      const segundos = Math.floor((tiempoRestante % 60000) / 1000);

      mensaje += `⏰ *Cooldown activo:* ${minutos}m ${segundos}s restantes\n`;
      mensaje += `💡 Puedes activar AFK nuevamente después del cooldown.\n\n`;
    } else {
      mensaje += `✅ *Puedes activar AFK ahora*\n`;
      mensaje += `🎯 Usa: .afk on\n\n`;
    }

    mensaje += `⚡ *Recuerda:* El AFK se desactiva automáticamente al enviar mensajes`;
  }

  await sock.sendMessage(from, {
    text: mensaje,
    mentions: [sender]
  }, { quoted: msg });
}

async function mostrarRankingAFK(sock, from, msg) {
  const db = cargarDatabase();

  if (!db.afk || !db.afk.estadisticas) {
    return await sock.sendMessage(from, {
      text: `🏆 *RANKING DE PROTECCIÓN AFK*\n\n` +
            `📭 Aún no hay estadísticas de AFK.\n\n` +
            `💎 *Sé el primero en activar AFK!*\n` +
            `🔒 Solo para usuarios VIP\n` +
            `🎮 Actívalo con: .afk on`
    }, { quoted: msg });
  }

  const estadisticasArray = Object.entries(db.afk.estadisticas)
    .map(([usuarioId, stats]) => ({
      usuarioId,
      nombre: `@${usuarioId.split('@')[0]}`,
      totalTiempo: stats.totalTiempo || 0,
      sesiones: stats.sesiones || 0,
      robosPrevenidos: stats.robosPrevenidos || 0
    }))
    .filter(stats => stats.totalTiempo > 0);

  if (estadisticasArray.length === 0) {
    return await sock.sendMessage(from, {
      text: `🏆 *RANKING DE PROTECCIÓN AFK*\n\n` +
            `📭 Aún no hay estadísticas de AFK.\n\n` +
            `💎 *Sé el primero en activar AFK!*\n` +
            `🔒 Solo para usuarios VIP\n` +
            `🎮 Actívalo con: .afk on`
    }, { quoted: msg });
  }

  const rankingTiempo = [...estadisticasArray]
    .sort((a, b) => b.totalTiempo - a.totalTiempo)
    .slice(0, 5);

  const rankingRobosPrevenidos = [...estadisticasArray]
    .sort((a, b) => b.robosPrevenidos - a.robosPrevenidos)
    .slice(0, 5);

  const rankingSesiones = [...estadisticasArray]
    .sort((a, b) => b.sesiones - a.sesiones)
    .slice(0, 5);

  let mensaje = `🏆 *RANKING DE PROTECCIÓN AFK* 🛡️\n\n`;

  mensaje += `⏰ *TOP 5 - MÁS TIEMPO PROTEGIDO:*\n`;
  rankingTiempo.forEach((usuario, index) => {
    const horas = Math.floor(usuario.totalTiempo / 3600000);
    const minutos = Math.floor((usuario.totalTiempo % 3600000) / 60000);
    const emoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';

    mensaje += `${emoji} ${usuario.nombre}\n`;
    mensaje += `   ⏱️ ${horas}h ${minutos}m | 🛡️ ${usuario.robosPrevenidos} robos prevenidos\n\n`;
  });

  mensaje += `🛡️ *TOP 5 - MÁS ROBOS PREVENIDOS:*\n`;
  rankingRobosPrevenidos.forEach((usuario, index) => {
    const emoji = index === 0 ? '🛡️' : index === 1 ? '⚔️' : index === 2 ? '🎯' : '⭐';
    const horas = Math.floor(usuario.totalTiempo / 3600000);

    mensaje += `${emoji} ${usuario.nombre}\n`;
    mensaje += `   🛡️ ${usuario.robosPrevenidos} robos | ⏱️ ${horas}h total\n\n`;
  });

  mensaje += `📊 *TOP 5 - MÁS SESIONES AFK:*\n`;
  rankingSesiones.forEach((usuario, index) => {
    const emoji = index === 0 ? '📈' : index === 1 ? '📊' : index === 2 ? '📋' : '🎪';

    mensaje += `${emoji} ${usuario.nombre}\n`;
    mensaje += `   🎪 ${usuario.sesiones} sesiones | ⏱️ ${Math.floor(usuario.totalTiempo / 3600000)}h\n\n`;
  });

  const usuariosActivos = Array.from(afkUsuarios.values())
    .filter(afk => afk.estado === 'activo');

  if (usuariosActivos.length > 0) {
    mensaje += `🔒 *USUARIOS ACTUALMENTE EN AFK:*\n`;
    usuariosActivos.forEach((afk, index) => {
      if (index < 5) {
        const tiempoAFK = Date.now() - afk.inicio;
        const horas = Math.floor(tiempoAFK / 3600000);
        const minutos = Math.floor((tiempoAFK % 3600000) / 60000);

        mensaje += `• @${afk.usuario.split('@')[0]} - ${horas}h ${minutos}m\n`;
      }
    });

    if (usuariosActivos.length > 5) {
      mensaje += `... y ${usuariosActivos.length - 5} más\n`;
    }
    mensaje += `\n`;
  }

  mensaje += `💎 *El AFK es exclusivo para usuarios VIP*\n`;
  mensaje += `🎮 Para activar: .afk on\n`;
  mensaje += `📊 Tu estado: .afk estado`;

  const menciones = [...rankingTiempo, ...rankingRobosPrevenidos, ...rankingSesiones]
    .slice(0, 5)
    .map(u => u.usuarioId);

  await sock.sendMessage(from, {
    text: mensaje,
    mentions: menciones
  }, { quoted: msg });
}

async function quitarAFK(sock, msg, from, sender, args) {
  if (!esOwner(sender)) {
    return await sock.sendMessage(from, {
      text: '❌ Este comando es solo para administradores del bot.'
    }, { quoted: msg });
  }

  const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (!mencionado) {
    return await sock.sendMessage(from, {
      text: '❌ Debes mencionar al usuario al que quieres quitarle el AFK.\n💡 Ejemplo: .afk quitar @usuario'
    }, { quoted: msg });
  }

  const usuarioAFK = afkUsuarios.get(mencionado);

  if (!usuarioAFK || usuarioAFK.estado !== 'activo') {
    return await sock.sendMessage(from, {
      text: `❌ @${mencionado.split('@')[0]} no tiene el modo AFK activado.`,
      mentions: [mencionado]
    }, { quoted: msg });
  }

  const ahora = Date.now();
  const tiempoAFK = ahora - usuarioAFK.inicio;
  const horas = Math.floor(tiempoAFK / 3600000);
  const minutos = Math.floor((tiempoAFK % 3600000) / 60000);

  const db = cargarDatabase();
  inicializarUsuario(mencionado, db);

  const user = db.users[mencionado];

  if (user.afkStats) {
    user.afkStats.totalTiempo += tiempoAFK;
    user.afkStats.totalSesiones += 1;
    user.afkStats.robosPrevenidos += usuarioAFK.robosPrevenidos || 0;
  }

  afkUsuarios.delete(mencionado);

  if (db.afk && db.afk.usuarios) {
    delete db.afk.usuarios[mencionado];
  }

  user.afkCooldown = ahora;

  guardarDatabase(db);

  const mensaje = `⚙️ *AFK REMOVIDO POR ADMINISTRADOR*\n\n` +
                  `👤 *Usuario afectado:* Usuario\n` +
                  `👑 *Removido por:* Owner\n` +
                  `⏱️ *Tiempo en AFK:* ${horas}h ${minutos}m\n` +
                  `🛡️ *Robos prevenidos:* ${usuarioAFK.robosPrevenidos || 0}\n\n` +
                  `🔓 *El usuario ya no está protegido*\n` +
                  `⏰ *Cooldown aplicado:* 5 minutos\n\n` +
                  `⚠️ *Razón:* Remoción administrativa`;

  await sock.sendMessage(from, {
    text: mensaje,
    mentions: [mencionado, sender]
  }, { quoted: msg });

  try {
    await sock.sendMessage(mencionado, {
      text: `⚠️ *TU MODO AFK HA SIDO DESACTIVADO*\n\n` +
            `👑 *Owner:* Probablemente Lukas\n` +
            `⏱️ *Tiempo en AFK:* ${horas}h ${minutos}m\n` +
            `🛡️ *Robos prevenidos:* ${usuarioAFK.robosPrevenidos || 0}\n\n` +
            `🔓 *Tu protección AFK ha sido removida*\n` +
            `⏰ *Cooldown:* 5 minutos antes de poder activar AFK nuevamente\n\n` +
            `📞 Contacta a un Owner si crees que esto es un error.`
    });
  } catch (error) {
    console.log(`⚠️ No se pudo notificar por privado a ${mencionado}`);
  }
}

export function registrarRoboPrevenido(usuarioId) {
  const usuarioAFK = afkUsuarios.get(usuarioId);

  if (usuarioAFK && usuarioAFK.estado === 'activo') {
    usuarioAFK.robosPrevenidos = (usuarioAFK.robosPrevenidos || 0) + 1;
    usuarioAFK.ultimaActualizacion = Date.now();
    afkUsuarios.set(usuarioId, usuarioAFK);

    const db = cargarDatabase();

    if (db.afk && db.afk.usuarios && db.afk.usuarios[usuarioId]) {
      db.afk.usuarios[usuarioId].robosPrevenidos = usuarioAFK.robosPrevenidos;
      db.afk.usuarios[usuarioId].ultimaActualizacion = usuarioAFK.ultimaActualizacion;
      guardarDatabase(db);
    }

    return true;
  }

  return false;
}

function verificarAFKExpirado() {
  const ahora = Date.now();
  const tiempoMaximo = 24 * 3600000;

  for (const [usuarioId, datosAFK] of afkUsuarios.entries()) {
    if (datosAFK.estado === 'activo' && (ahora - datosAFK.inicio) > tiempoMaximo) {
      datosAFK.estado = 'expirado';
      afkUsuarios.delete(usuarioId);

      const db = cargarDatabase();

      if (db.afk && db.afk.usuarios) {
        delete db.afk.usuarios[usuarioId];
      }

      inicializarUsuario(usuarioId, db);
      const user = db.users[usuarioId];

      if (user && user.afkStats) {
        const tiempoAFK = tiempoMaximo;
        user.afkStats.totalTiempo += tiempoAFK;
        user.afkStats.totalSesiones += 1;
        user.afkStats.robosPrevenidos += datosAFK.robosPrevenidos || 0;
      }

      if (user) {
        user.afkCooldown = ahora;
      }

      guardarDatabase(db);

      console.log(`🔄 AFK expirado automáticamente para ${usuarioId.split('@')[0]}`);

    }
  }
}

cargarAFKDesdeDB();

setInterval(verificarAFKExpirado, 60 * 60 * 1000);
