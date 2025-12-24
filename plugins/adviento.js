import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { ownerNumber } from '../config.js';
import fs from 'fs';

const premiosAdviento = {
  1: { tipo: 'pandacoins', cantidad: 30000, mensaje: "🎄 ¡Primer día de Adviento! 🎁 10,000,000,000 pandacoins" },
  2: { tipo: 'titulo', titulo: "🍀 Suertudo", mensaje: "🎄 Día 2 - Título especial: 🍀 Suertudo" },
  3: { tipo: 'vip', duracion: 24, mensaje: "🎄 Día 3 - 24 horas de VIP ⭐" },
  4: { tipo: 'pandacoins', cantidad: 30000, mensaje: "🎄 Día 4 - 20,000,000,000 pandacoins" },
  5: { tipo: 'personaje', personaje: "Santa PandaBot", mensaje: "🎄 Día 5 - Personaje exclusivo: usa .misps para ver qué te tocó" },
  6: { tipo: 'giros', cantidad: 500, mensaje: "🎄 Día 6 - 500 tiros en Coin Master System 🎯" },
  7: { tipo: 'creditos', cantidad: 2000, mensaje: "🎄 Día 7 - 2,000 créditos en Coin Master System 💰" },
  8: { tipo: 'vip', duracion: 24, mensaje: "🎄 Día 8 - 24 horas de VIP ⭐" },
  9: { tipo: 'pandacoins', cantidad: 30000, mensaje: "🎄 Día 9 - 30,000,000,000 Pandacoins" },
  10: { tipo: 'diamantes', cantidad: 30, mensaje: "🎄 Día 10 - 30 diamantes 💎" },
  11: { tipo: 'titulo', titulo: "🤡 Payaso", mensaje: "🎄 Día 11 - Título especial: 🤡 Payaso" },
  12: { tipo: 'nada', mensaje: "🎄 Día 12 - Encontraste un chocolate con hongos 🍫🍄\n(No ganaste nada, mejor suerte mañana)" },
  13: { tipo: 'pandacoins', cantidad: 30000, mensaje: "🎄 Día 13 - 20,000,000,000 Pandacoins" },
  14: { tipo: 'personaje', personaje: "Nyan Cat", mensaje: "🎄 Día 14 - Personaje: usa .misps para ver qué te tocó." },
  15: { tipo: 'giros', cantidad: 500, mensaje: "🎄 Día 15 - 500 tiros en Coin Master System 🎯" },
  16: { tipo: 'pandacoins', cantidad: 30000, mensaje: "🎄 Día 16 - 15,000,000,000 Pandacoins" },
  17: { tipo: 'vip', duracion: 48, mensaje: "🎄 Día 17 - 48 horas de VIP ⭐" },
  18: { tipo: 'titulo', titulo: "🎁 Regalero", mensaje: "🎄 Día 18 - Título especial: 🎁 Regalero" },
  19: { tipo: 'personaje', personaje: "Smurf Cat", mensaje: "🎄 Día 19 - Personaje festivo: usa .misps para ver qué te tocó." },
  20: { tipo: 'nada', mensaje: "🎄 Día 20 - El Grinch visitó tu calendario... ¡No ganaste nada! 🎄" },
  21: { tipo: 'diamantes', cantidad: 50, mensaje: "🎄 Día 21 - 50 diamantes 💎" },
  22: { tipo: 'pandacoins', cantidad: 30000, mensaje: "🎄 Día 22 - 30,000 Pandacoins" },
  23: { tipo: 'giros', cantidad: 1000, mensaje: "🎄 Día 23 - 1,000 tiros en Coin Master System 🎯" },
  24: { tipo: 'premio_especial', mensaje: "🎄 ¡FELIZ NAVIDAD! 🎅 - Premio Especial Navideño: 30,000 Pandacoins + 100 diamantes + Título 🎄 Navideño ✨" }
};

export const command = 'adviento';
export const aliases = ['calendario', 'navidad'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];

  const db = cargarDatabase();

  if (!db.adviento) {
    db.adviento = {
      activo: true,
      año: new Date().getFullYear(),
      usuarios: {}
    };
  }

  // Obtener fecha actual
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1; // 1-12
  const diaActual = ahora.getDate(); // 1-31

  // Verificar que sea diciembre
  if (mesActual !== 12) {
    await sock.sendMessage(from, {
      text: '🎄 El calendario de adviento solo está disponible en *Diciembre*.\n\n¡Vuelve en Navidad! 🎅'
    }, { quoted: msg });
    return;
  }

  // Verificar que no sea diciembre del próximo año
  if (db.adviento.año !== ahora.getFullYear()) {
    // Reiniciar sistema para nuevo año
    db.adviento = {
      activo: true,
      año: ahora.getFullYear(),
      usuarios: {}
    };
    guardarDatabase(db);
  }

  if (!args[0]) {
    await mostrarInfoAdviento(sock, from, sender, db, diaActual);
    return;
  }

  const diaSolicitado = parseInt(args[0]);

  if (isNaN(diaSolicitado) || diaSolicitado < 1 || diaSolicitado > 24) {
    await sock.sendMessage(from, {
      text: '❌ Día inválido. Usa: *.adviento <1-24>*\nEjemplo: *.adviento 5*'
    }, { quoted: msg });
    return;
  }

  // Verificar fecha del día solicitado
  if (diaSolicitado > diaActual) {
    await sock.sendMessage(from, {
      text: `❌ ¡Todavía no es el día ${diaSolicitado}!\n\n📅 Hoy es *${diaActual} de Diciembre*.\n🎁 Vuelve el día ${diaSolicitado} para reclamar tu premio.`
    }, { quoted: msg });
    return;
  }

  await reclamarDiaAdviento(sock, from, sender, db, diaSolicitado, diaActual, msg);
}

async function mostrarInfoAdviento(sock, from, sender, db, diaActual) {
  const usuario = db.adviento.usuarios[sender] || { diasReclamados: [] };
  const diasReclamados = usuario.diasReclamados || [];

  let texto = `🎄 *CALENDARIO DE ADVIENTO NAVIDEÑO ${new Date().getFullYear()}* 🎅\n\n`;
  texto += `📅 Hoy es: *${diaActual} de Diciembre*\n`;
  texto += `🎁 Días reclamados: *${diasReclamados.length}/24*\n\n`;

  texto += `📋 *Cómo funciona:*\n`;
  texto += `• Usa *.adviento <día>* para reclamar premios\n`;
  texto += `• Solo puedes reclamar días que ya hayan pasado\n`;
  texto += `• ¡Cada día tiene una sorpresa diferente!\n\n`;

  if (diasReclamados.length > 0) {
    texto += `✅ *Días reclamados:* ${diasReclamados.sort((a, b) => a - b).join(', ')}\n\n`;
  }

  // Mostrar próximos días disponibles
  const diasDisponibles = [];
  for (let i = 1; i <= diaActual; i++) {
    if (!diasReclamados.includes(i)) {
      diasDisponibles.push(i);
    }
  }

  if (diasDisponibles.length > 0) {
    texto += `🎯 *Días disponibles para reclamar:* ${diasDisponibles.join(', ')}\n\n`;
  }

  texto += `⚡ *Comando:* .adviento <1-24>\n`;
  texto += `Ejemplo: .adviento ${Math.min(diaActual, 24)}`;

  await sock.sendMessage(from, { text: texto });
}

async function reclamarDiaAdviento(sock, from, sender, db, diaSolicitado, diaActual, msg) {
  if (!db.adviento.usuarios[sender]) {
    db.adviento.usuarios[sender] = {
      diasReclamados: [],
      primerReclamo: new Date().toISOString(),
      ultimoReclamo: new Date().toISOString()
    };
  }

  const usuario = db.adviento.usuarios[sender];
  const diasReclamados = usuario.diasReclamados || [];

  if (diasReclamados.includes(diaSolicitado)) {
    const premio = premiosAdviento[diaSolicitado];
    await sock.sendMessage(from, {
      text: `✅ Ya reclamaste el premio del día *${diaSolicitado}*:\n${premio.mensaje}`
    }, { quoted: msg });
    return;
  }

  const premio = premiosAdviento[diaSolicitado];
  if (!premio) {
    await sock.sendMessage(from, {
      text: `❌ No hay premio configurado para el día ${diaSolicitado}.`
    }, { quoted: msg });
    return;
  }

  if (!db.users) db.users = {};
  if (!db.users[sender]) {
    db.users[sender] = {
      pandacoins: 0,
      inventory: {},
      achievements: {
        titles: [],
        selectedTitle: null
      },
      personajes: []
    };
  }

  const user = db.users[sender];

  let mensajePremio = '';
  let recompensaAplicada = false;

  try {
    switch (premio.tipo) {
      case 'pandacoins':
        user.pandacoins = (user.pandacoins || 0) + premio.cantidad;
        mensajePremio = `💰 +${premio.cantidad.toLocaleString()} pandacoins`;
        recompensaAplicada = true;
        break;

      case 'titulo':
        if (!user.achievements) user.achievements = { titles: [], selectedTitle: null };
        if (!user.achievements.titles.includes(premio.titulo)) {
          user.achievements.titles.push(premio.titulo);
          mensajePremio = `👑 Título: "${premio.titulo}"`;
          recompensaAplicada = true;
        } else {
          mensajePremio = `⚠️ Ya tenías el título "${premio.titulo}"`;
        }
        break;

      case 'vip':
        const expirationTime = Date.now() + (premio.duracion * 60 * 60 * 1000);
        user.vip = true;
        user.vipExpiration = expirationTime;
        const expirationDate = new Date(expirationTime).toLocaleString();
        mensajePremio = `⭐ VIP por ${premio.duracion} horas (hasta ${expirationDate})`;
        recompensaAplicada = true;
        break;

      case 'personaje':
        if (!user.personajes) user.personajes = [];
        if (!user.personajes.includes(premio.personaje)) {
          user.personajes.push(premio.personaje);
          mensajePremio = `🎭 Personaje: "${premio.personaje}"`;
          recompensaAplicada = true;
        } else {
          mensajePremio = `⚠️ Ya tenías el personaje "${premio.personaje}"`;
        }
        break;

      case 'giros':
        if (!global.cmDB) global.cmDB = {};
        const userId = sender.split('@')[0];
        if (!global.cmDB[userId]) {
          global.cmDB[userId] = { spins: 0, coins: 0 };
        }
        global.cmDB[userId].spins = (global.cmDB[userId].spins || 0) + premio.cantidad;
        global.guardarCM();
        mensajePremio = `🎯 +${premio.cantidad} tiros en Coin Master`;
        recompensaAplicada = true;
        break;

      case 'creditos':
        if (!global.cmDB) global.cmDB = {};
        const cmUserId = sender.split('@')[0];
        if (!global.cmDB[cmUserId]) {
          global.cmDB[cmUserId] = { spins: 0, coins: 0 };
        }
        global.cmDB[cmUserId].coins = (global.cmDB[cmUserId].coins || 0) + premio.cantidad;
        global.guardarCM();
        mensajePremio = `💳 +${premio.cantidad} créditos en Coin Master`;
        recompensaAplicada = true;
        break;

      case 'diamantes':
        user.diamantes = (user.diamantes || 0) + premio.cantidad;
        mensajePremio = `💎 +${premio.cantidad} diamantes`;
        recompensaAplicada = true;
        break;

      case 'nada':
        mensajePremio = `🍫 Chocolate con hongos - No ganaste nada`;
        recompensaAplicada = true;
        break;

      case 'premio_especial':
        user.pandacoins = (user.pandacoins || 0) + 30000;
        user.diamantes = (user.diamantes || 0) + 100;
        if (!user.achievements) user.achievements = { titles: [], selectedTitle: null };
        const tituloNavidad = "🎄 Navideño";
        if (!user.achievements.titles.includes(tituloNavidad)) {
          user.achievements.titles.push(tituloNavidad);
        }
        mensajePremio = `✨ PREMIO ESPECIAL: 30k pandacoins + 100 diamantes + Título "🎄 Navideño"`;
        recompensaAplicada = true;
        break;
    }

    if (recompensaAplicada) {
      diasReclamados.push(diaSolicitado);
      usuario.diasReclamados = diasReclamados;
      usuario.ultimoReclamo = new Date().toISOString();

      guardarDatabase(db);

      let texto = `🎄 *¡Premio de Adviento Reclamado!* 🎁\n\n`;
      texto += `📅 Día: *${diaSolicitado} de Diciembre*\n`;
      texto += `${premio.mensaje}\n`;
      texto += `📦 Recompensa: ${mensajePremio}\n\n`;

      const totalReclamados = diasReclamados.length;
      texto += `📊 Progreso: ${totalReclamados}/24 días\n`;

      // Mostrar días pendientes
      const diasPendientes = [];
      for (let i = 1; i <= 24; i++) {
        if (i <= diaActual && !diasReclamados.includes(i)) {
          diasPendientes.push(i);
        }
      }

      if (diasPendientes.length > 0) {
        texto += `⏰ Días pendientes: ${diasPendientes.join(', ')}\n`;
      }

      if (totalReclamados === 24) {
        texto += `\n🎉 ¡FELICIDADES! Has completado todo el calendario de adviento! ✨`;
      } else if (totalReclamados === diaActual) {
        texto += `\n✅ ¡Has reclamado todos los premios disponibles hasta hoy!`;
      }

      await sock.sendMessage(from, { text: texto });
    } else {
      await sock.sendMessage(from, {
        text: `❌ Error al aplicar la recompensa del día ${diaSolicitado}.`
      });
    }

  } catch (error) {
    console.error('Error aplicando premio de adviento:', error);
    await sock.sendMessage(from, {
      text: `❌ Error técnico al procesar el premio del día ${diaSolicitado}.`
    });
  }
}

export async function adminAdviento(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];

  const isOwner = ownerNumber.includes('+' + senderNumber);

  if (!isOwner) {
    await sock.sendMessage(from, {
      text: '❌ Solo los administradores pueden usar este comando.'
    }, { quoted: msg });
    return;
  }

  const db = cargarDatabase();

  if (!db.adviento) {
    await sock.sendMessage(from, {
      text: '❌ El sistema de adviento no está inicializado.'
    });
    return;
  }

  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const diaActual = ahora.getDate();

  const usuarios = Object.keys(db.adviento.usuarios);
  const totalUsuarios = usuarios.length;
  let totalReclamaciones = 0;

  usuarios.forEach(userId => {
    totalReclamaciones += db.adviento.usuarios[userId].diasReclamados.length;
  });

  let texto = `📊 *ESTADÍSTICAS ADVIENTO ${new Date().getFullYear()}* 🎄\n\n`;
  texto += `📅 Hoy: ${diaActual} de Diciembre\n`;
  texto += `👥 Usuarios participantes: ${totalUsuarios}\n`;
  texto += `🎁 Total reclamaciones: ${totalReclamaciones}\n`;
  texto += `📈 Promedio por usuario: ${totalUsuarios > 0 ? (totalReclamaciones / totalUsuarios).toFixed(1) : 0}\n\n`;

  texto += `🏆 Top participantes:\n`;

  const topUsuarios = usuarios
    .map(userId => ({
      userId,
      dias: db.adviento.usuarios[userId].diasReclamados.length
    }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5);

  if (topUsuarios.length > 0) {
    topUsuarios.forEach((user, index) => {
      const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
      texto += `${emoji} ${user.dias} días - @${user.userId.split('@')[0]}\n`;
    });
  } else {
    texto += `📝 Aún no hay participantes\n`;
  }

  await sock.sendMessage(from, {
    text: texto,
    mentions: topUsuarios.map(user => user.userId)
  });
}
