import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { isVip } from '../utils/vip.js';
import { trackRoboExitoso, trackRoboFallido } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';
import { ownerNumber } from '../config.js';
import { puedeRobar, puedeSerRobado, registrarRoboPrevenido } from '../plugins/afk.js';

const cooldowns = {};

export const command = 'robar';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];
  const now = Date.now();
  const COOLDOWN_MS = 5 * 60 * 1000;

  const esOwner = ownerNumber.includes('+' + senderNumber);

  /* =======================
     DETECTAR VÍCTIMA (FIX)
  ======================= */
  let mencionado = null;
  const ctx = msg.message?.extendedTextMessage?.contextInfo;

  if (ctx?.mentionedJid?.length) {
    mencionado = ctx.mentionedJid[0];
  } else if (ctx?.participant) {
    mencionado = ctx.participant;
  }

  if (!mencionado || mencionado === sender) {
    return await sock.sendMessage(from, {
      text: `❌ Debes mencionar o responder al mensaje de alguien para robarle.\n\n` +
            `💡 *Ejemplos:*\n` +
            `• .robar @usuario\n` +
            `• Responder un mensaje + .robar`
    }, { quoted: msg });
  }

  const victimaNumber = mencionado.split('@')[0];
  const victimaEsOwner = ownerNumber.includes('+' + victimaNumber);

  /* =======================
     BLOQUEOS OWNER
  ======================= */
  if (esOwner) {
    return await sock.sendMessage(from, {
      text: `👑 *Eres Owner de PandaBot*\n\n` +
            `No debes abusar de tu poder usando el comando *robar*.\n` +
            `⚖️ Los Owners no pueden participar en robos para mantener la economía justa.`
    }, { quoted: msg });
  }

  if (victimaEsOwner) {
    return await sock.sendMessage(from, {
      text: `🛑 *Acción no permitida*\n\n` +
            `No está permitido robar a los desarrolladores de PandaBot.\n` +
            `⚙️ Esta protección es permanente.`
    }, { quoted: msg });
  }

  /* =======================
     COOLDOWN
  ======================= */
  if (cooldowns[sender] && now - cooldowns[sender] < COOLDOWN_MS) {
    const restante = COOLDOWN_MS - (now - cooldowns[sender]);
    const m = Math.floor(restante / 60000);
    const s = Math.floor((restante % 60000) / 1000);
    return await sock.sendMessage(from, {
      text: `⏳ Debes esperar *${m}m ${s}s* para volver a robar.`
    }, { quoted: msg });
  }

  /* =======================
     AFK
  ======================= */
  if (!puedeRobar(sender)) {
    return await sock.sendMessage(from, {
      text: `❌ No puedes robar mientras estás en modo AFK.\n\n💎 Desactívalo con: *.afk off*`
    }, { quoted: msg });
  }

  if (!puedeSerRobado(mencionado)) {
    registrarRoboPrevenido(mencionado);
    return await sock.sendMessage(from, {
      text: `🛡️ @${victimaNumber} está protegido por AFK.\n\n💎 Protección VIP activa.`,
      mentions: [mencionado]
    }, { quoted: msg });
  }

  /* =======================
     DATABASE
  ======================= */
  const db = cargarDatabase();
  db.users ??= {};

  db.users[sender] ??= { pandacoins: 0, robos: { exitosos: 0, fallidos: 0 }, achievements: {} };
  db.users[mencionado] ??= { pandacoins: 0 };

  if (!db.users[sender].achievements) {
    initializeAchievements(sender);
  }

  const atacante = db.users[sender];
  const victima = db.users[mencionado];

  /* =======================
     PROBABILIDAD
  ======================= */
  const vip = isVip(sender);
  const probabilidad = vip ? 0.7 : 0.5;
  const exito = Math.random() < probabilidad;

  const maxRobo = Math.floor(victima.pandacoins * 0.1);
  if (maxRobo <= 0) {
    return await sock.sendMessage(from, {
      text: `❌ @${victimaNumber} no tiene pandacoins suficientes.`,
      mentions: [mencionado]
    }, { quoted: msg });
  }

  let texto = '';

  if (exito) {
    const robado = Math.floor(Math.random() * maxRobo) + 1;
    atacante.pandacoins += robado;
    victima.pandacoins -= robado;
    atacante.robos.exitosos++;

    texto =
      `🕵️‍♂️ *Robo exitoso*\n\n` +
      `@${senderNumber} robó *${robado.toLocaleString()}* pandacoins a @${victimaNumber}.\n` +
      `📊 Robos exitosos: ${atacante.robos.exitosos}`;

    trackRoboExitoso(sender, sock, from, atacante.robos.exitosos);
  } else {
    const multa = Math.min(
      Math.floor(Math.random() * Math.floor(atacante.pandacoins * 0.1)) + 1,
      atacante.pandacoins
    );

    atacante.pandacoins -= multa;
    atacante.robos.fallidos++;

    texto =
      `🚨 *Robo fallido*\n\n` +
      `@${senderNumber} fue atrapado intentando robar a @${victimaNumber}.\n` +
      `💸 Multa: ${multa.toLocaleString()} pandacoins\n` +
      `📊 Robos fallidos: ${atacante.robos.fallidos}`;

    trackRoboFallido(sender, sock, from, atacante.robos.fallidos);
  }

  guardarDatabase(db);
  cooldowns[sender] = now;

  await sock.sendMessage(from, {
    text: texto,
    mentions: [sender, mencionado]
  }, { quoted: msg });
}