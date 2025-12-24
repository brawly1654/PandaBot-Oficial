import fs from 'fs';
import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { obtenerPizzeria } from '../PandaLove/pizzeria.js';
import { isVip } from '../utils/vip.js';

export const command = 'perfil';

const parejasFile = './data/parejas.json';

function cargarParejas() {
  if (!fs.existsSync(parejasFile)) fs.writeFileSync(parejasFile, '{}');
  return JSON.parse(fs.readFileSync(parejasFile));
}

function generarBloqueIdentidad(user, targetUserJid, pareja, userRank, totalUsers) {
  let estadoPareja = '💔 *Soltero/a*';
  let mentions = [targetUserJid];

  if (pareja) {
    estadoPareja = `💖 *Casado/a con:* @${pareja.split('@')[0]}`;
    mentions.push(pareja);
  }

  mentions = [...new Set(mentions)];

  return {
    texto: `│✨ *Usuario:* @${targetUserJid.split('@')[0]}
│🆔 *ID de Usuario:* ${user.id || 'N/A'}
│🗓️ *Antigüedad:* Usuario #${userRank} de ${totalUsers}
│💍 *Estado Civil:* ${estadoPareja}
│⭐ *Reputación:* ${user.reputacion || 0} estrellitas ⭐️`,
    mentions
  };
}

function generarBloqueVIP(user, now) {
  let vipStatus = '❌ *No es VIP*';

  if (user.vip && user.vipExpiration && now < user.vipExpiration) {
    const timeLeft = user.vipExpiration - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    vipStatus = `✅ *VIP* (${hours}h ${minutes}m restantes)`;
  }

  return `│👑 *VIP:* ${vipStatus}`;
}

function generarBloqueRPG(user, users) {
  const allUsers = Object.keys(users);
  const totalCoins = allUsers.reduce((acc, jid) => acc + (users[jid]?.pandacoins || 0), 0);
  const promedio = allUsers.length ? totalCoins / allUsers.length : 0;

  const robos = user.robos || { exitosos: 0, fallidos: 0 };
  const favorito = user.favorito && user.personajes?.includes(user.favorito)
    ? user.favorito
    : 'No definido';

  return `│💰 *Pandacoins:* ${Number(user.pandacoins || 0).toLocaleString()}
│🌟 *Experiencia:* ${user.exp || 0}
│🛡️ *Personajes:* ${user.personajes?.length || 0}
│❤️ *Favorito:* ${favorito}
│📊 *Promedio global:* ${promedio.toFixed(2)}
│👀 *Anuncios vistos:* ${user.adCount || 0}
│🕵️ *Robos exitosos:* ${robos.exitosos}
│🚨 *Robos fallidos:* ${robos.fallidos}`;
}

function generarBloqueCoinMaster(cmData) {
  return `│🎰 *Tiros:* ${cmData.spins}
│🪙 *Coins CM:* ${cmData.coins}
│💳 *Créditos:* ${cmData.creditos}`;
}

function generarBloquePizzeria(pizzeriaData, error) {
  if (!pizzeriaData) {
    return `│❌ ${error || 'No tienes pizzería registrada.'}`;
  }

  return `│✨ *Nombre:* ${pizzeriaData.nombre_pizzeria}
│📈 *Nivel:* ${pizzeriaData.local_level}
│💸 *PizzaCoins:* ${Number(pizzeriaData.coins).toFixed(2)}`;
}

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const targetUserJid = mentionedJid || sender;

  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[targetUserJid];

  if (!user) {
    return sock.sendMessage(from, {
      text: '❌ El usuario no está registrado en el bot.'
    });
  }

  const parejas = cargarParejas();
  const pareja = parejas[targetUserJid];

  const allUsers = Object.keys(db.users);
  const userRank = allUsers.indexOf(targetUserJid) + 1;
  const totalUsers = allUsers.length;
  const now = Date.now();

  if (user.vip && user.vipExpiration && now > user.vipExpiration) {
    user.vip = false;
    delete user.vipExpiration;
    guardarDatabase(db);
  }

  // CoinMaster
  const uid = targetUserJid.split('@')[0];
  global.cmDB = global.cmDB || {};
  global.cmDB[uid] = global.cmDB[uid] || { spins: 0, coins: 0, creditos: 0 };

  let pizzeriaData = null;
  let pizzeriaError = null;

  try {
    const res = await obtenerPizzeria(targetUserJid);
    if (res?.detail) pizzeriaError = res.detail;
    else pizzeriaData = res;
  } catch {
    pizzeriaError = 'Error de conexión con la API.';
  }

  const identidad = generarBloqueIdentidad(user, targetUserJid, pareja, userRank, totalUsers);
  const vip = generarBloqueVIP(user, now);
  const rpg = generarBloqueRPG(user, db.users);
  const cm = generarBloqueCoinMaster(global.cmDB[uid]);
  const pizzeria = generarBloquePizzeria(pizzeriaData, pizzeriaError);

  const header = `╭───${isVip(sender) || isVip(targetUserJid) ? ' 👑 Perfil VIP' : '👤 Perfil'} ───`;
  const footer = '╰───────────────────';

  const mensaje = `${header}
${identidad.texto}
${vip}
${footer}

╭───🐼 *PandaBot RPG* ───
${rpg}
╰───────────────────

╭───🎲 *Coin Master* ───
${cm}
╰───────────────────

╭───🍕 *Pizzería PandaLove* ───
${pizzeria}
╰───────────────────`;

  await sock.sendMessage(from, {
    text: mensaje.trim(),
    mentions: identidad.mentions
  });
}