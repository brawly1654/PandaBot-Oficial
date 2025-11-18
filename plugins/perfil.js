import fs from 'fs';
import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { obtenerPizzeria } from '../PandaLove/pizzeria.js';
import { isVip } from '../utils/vip.js';
import { getUserAchievementStats, initializeAchievements } from '../data/achievementsDB.js';

const parejasFile = './data/parejas.json';

function cargarParejas() {
  if (!fs.existsSync(parejasFile)) fs.writeFileSync(parejasFile, '{}');
  return JSON.parse(fs.readFileSync(parejasFile));
}

function generarBloqueIdentidad(user, targetUserJid, pareja, userRank, totalUsers, achievementStats) {
  let estadoPareja = '💔 *Soltero/a*';
  let mentions = [targetUserJid];

  if (pareja) {
    estadoPareja = `💖 *Casado/a con:* @${pareja.split('@')[0]}`;
    mentions.push(pareja);
  }

  mentions = [...new Set(mentions)];

  // Añadir título si existe
  let tituloTexto = '';
  if (achievementStats.selectedTitle) {
    tituloTexto = `\n│👑 *Título:* ${achievementStats.selectedTitle}`;
  }

  return {
    texto: `│✨ *Usuario:* @${targetUserJid.split('@')[0]}${tituloTexto}
│🆔 *ID de Usuario:* ${user.id || 'N/A'}
│🗓️ *Antigüedad:* Usuario #${userRank} de ${totalUsers}
│💍 *Estado Civil:* ${estadoPareja}`,
    mentions
  };
}

function generarBloqueVIP(user, now) {
  let vipStatus = '❌ *No es VIP*';

  if (user.vip && now < user.vipExpiration) {
    const timeLeft = user.vipExpiration - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    vipStatus = `✅ *VIP* (Tiempo restante: ${hours}h ${minutes}m)`;

    if (user.vipInicio) {
      const totalVip = user.vipExpiration - user.vipInicio;
      const restante = user.vipExpiration - now;
      const porcentaje = Math.floor((restante / totalVip) * 100);
      const barra = '█'.repeat(porcentaje / 10) + '░'.repeat(10 - porcentaje / 10);
      vipStatus += `\n│📊 *Progreso VIP:* [${barra}] ${porcentaje}%`;
    }
  }

  return `│👑 *VIP:* ${vipStatus}`;
}

function generarBloqueRPG(user, users) {
  const allUsers = Object.keys(users);
  const totalCoins = allUsers.reduce((acc, jid) => acc + (users[jid]?.pandacoins || 0), 0);
  const promedio = totalCoins / allUsers.length;
  const robos = user.robos || { exitosos: 0, fallidos: 0 };

  const tieneFavorito = user.favorito && user.personajes?.includes(user.favorito);
  const favoritoTexto = tieneFavorito ? user.favorito : 'No definido';

  return `│💰 *Pandacoins:* ${Number(user.pandacoins).toLocaleString()}
│🌟 *Experiencia:* ${user.exp || 0}
│🛡️ *Personajes:* ${user.personajes?.length || 0}
│❤️ *Personaje Favorito:* ${favoritoTexto}
│📊 *Promedio global:* ${promedio.toFixed(2)}
│👀 *Anuncios Vistos:* ${user.adCount || 0}
│🕵️ *Robos exitosos:* ${robos.exitosos}
│🚨 *Robos fallidos:* ${robos.fallidos}`;
}

function generarBloqueCoinMaster(cmData) {
  return `│🎰 *Tiros:* ${cmData.spins}
│🪙 *Coins CM:* ${cmData.coins}
│💳 *Créditos:* ${cmData.creditos}`;
}

function generarBloquePizzeria(pizzeriaData, pizzeriaError) {
  if (pizzeriaData) {
    return `│✨ *Nombre:* ${pizzeriaData.nombre_pizzeria}
│📈 *Nivel:* ${pizzeriaData.local_level}
│💸 *PizzaCoins:* ${Number(pizzeriaData.coins).toFixed(2)}`;
  } else {
    return `│❌ ${pizzeriaError || 'No tienes una pizzería registrada.'}`;
  }
}

function generarBloqueLogros(achievementStats) {
  const barLength = 15;
  const filled = Math.floor((achievementStats.percentage / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  return `│🏆 *Logros:* ${achievementStats.unlocked}/${achievementStats.total} (${achievementStats.percentage}%)
│📊 [${bar}]
│⭐ *Puntos:* ${achievementStats.points}
│👑 *Títulos:* ${achievementStats.titles.length}`;
}

export const command = 'perfil';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const targetUserJid = mentionedJid || sender;

  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[targetUserJid];

  if (!user) {
    await sock.sendMessage(from, { text: '❌ El usuario no está registrado en el bot.' });
    return;
  }

  // Inicializar logros si no existen
  initializeAchievements(targetUserJid);

  const parejas = cargarParejas();
  const pareja = parejas[targetUserJid];

  const targetUserId = targetUserJid.split('@')[0];
  global.cmDB = global.cmDB || {};
  global.cmDB[targetUserId] = global.cmDB[targetUserId] || { spins: 0, coins: 0, creditos: 0 };
  const cmData = global.cmDB[targetUserId];

  const allUsers = Object.keys(db.users);
  const userRank = allUsers.indexOf(targetUserJid) + 1;
  const totalUsers = allUsers.length;
  const now = Date.now();

  if (user.vip && user.vipExpiration && now > user.vipExpiration) {
    user.vip = false;
    delete user.vipExpiration;
    guardarDatabase(db);
  }

  let pizzeriaData = null;
  let pizzeriaError = null;
  try {
    const response = await obtenerPizzeria(targetUserJid);
    if (response.detail) {
      pizzeriaError = response.detail;
    } else {
      pizzeriaData = response;
    }
  } catch {
    pizzeriaError = 'Error de conexión con la API.';
  }

  // Obtener stats de logros
  const achievementStats = getUserAchievementStats(targetUserJid);

  const identidad = generarBloqueIdentidad(user, targetUserJid, pareja, userRank, totalUsers, achievementStats);
  const vip = generarBloqueVIP(user, now);
  const rpg = generarBloqueRPG(user, db.users);
  const cm = generarBloqueCoinMaster(cmData);
  const pizzeria = generarBloquePizzeria(pizzeriaData, pizzeriaError);
  const logros = generarBloqueLogros(achievementStats);

  const header = `╭───${isVip(sender) || isVip(targetUserJid) ? ' 👑 Perfil VIP' : '👤 Tu Perfil'} ───`;
  const footer = '╰───────────────────';

  const mensaje = `${header}
${identidad.texto}
${vip}
${footer}

╭───🐼 *PandaBot RPG* ───
${rpg}
╰───────────────────

╭───🏆 *Logros* ───
${logros}
╰───────────────────

╭───🎲 *Coin Master Stats* ───
${cm}
╰───────────────────────

╭───🍕 *Pizzería PandaLove* ───
${pizzeria}
╰───────────────────────

💡 Usa \`.logros\` para ver tus logros detallados`;

  await sock.sendMessage(from, {
    text: mensaje.trim(),
    mentions: identidad.mentions
  });
}
