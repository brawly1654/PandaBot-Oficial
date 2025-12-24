import { cargarDatabase, guardarDatabase } from '../data/database.js';
import { addCoins } from "../PandaLove/pizzeria.js";

const ownersPermitidos = [
  '56953508566',
  '5219513164242',
  '50589329325',
  '5215538830665',
  '166164298780822',
  '230004726169681'
];

const recursosValidos = [
  'pandacoins',
  'exp',
  'piedra',
  'diamantes',
  'creditos',
  'giros',
  'coins',
  'pizzacoins'
];

function esOwner(userId) {
  return ownersPermitidos.includes(userId);
}

export const command = 'add';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];

  if (!esOwner(sender)) {
    await sock.sendMessage(from, {
      text: '❌ No tienes permisos para usar este comando.'
    }, { quoted: msg });
    return;
  }

  if (args.length < 3) {
    await sock.sendMessage(from, {
      text: '📌 Uso correcto:\n.add <recurso> <cantidad> @usuario'
    }, { quoted: msg });
    return;
  }

  const recurso = args[0].toLowerCase();
  const cantidad = parseInt(args[1]);

  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const receptor = msg.mentionedJid?.[0] || contextInfo?.mentionedJid?.[0];

  if (!recursosValidos.includes(recurso)) {
    await sock.sendMessage(from, {
      text: `❌ Recurso no válido.\nDisponibles: ${recursosValidos.join(', ')}`
    }, { quoted: msg });
    return;
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    await sock.sendMessage(from, {
      text: '❌ La cantidad debe ser un número mayor a 0.'
    }, { quoted: msg });
    return;
  }

  if (!receptor) {
    await sock.sendMessage(from, {
      text: '❌ Debes mencionar a un usuario válido.'
    }, { quoted: msg });
    return;
  }

  try {
    let mensajeFinal = '';

    // 🍕 PizzaCoins (API externa)
    if (recurso === 'pizzacoins') {
      const response = await addCoins(receptor, cantidad);

      if (response?.detail) {
        throw new Error(response.detail);
      }

      mensajeFinal = `🍕 Se añadieron *${cantidad} PizzaCoins* a @${receptor.split('@')[0]}`;
    }

    // 🎰 Giros / Coins globales
    else if (recurso === 'giros' || recurso === 'coins') {
      global.cmDB = global.cmDB || {};
      global.cmDB[receptor] = global.cmDB[receptor] || { giros: 0, coins: 0 };

      global.cmDB[receptor][recurso] =
        (global.cmDB[receptor][recurso] || 0) + cantidad;

      global.guardarCM?.();

      mensajeFinal = `✅ Se añadieron *${cantidad} ${recurso}* a @${receptor.split('@')[0]}`;
    }

    // 💰 Recursos normales (DB principal)
    else {
      const db = cargarDatabase();
      db.users = db.users || {};
      db.users[receptor] = db.users[receptor] || {
        pandacoins: 0,
        exp: 0,
        piedra: 0,
        diamantes: 0,
        creditos: 0,
        personajes: []
      };

      db.users[receptor][recurso] =
        (db.users[receptor][recurso] || 0) + cantidad;

      guardarDatabase(db);

      mensajeFinal = `✅ Se añadieron *${cantidad} ${recurso}* a @${receptor.split('@')[0]}`;
    }

    await sock.sendMessage(from, {
      text: mensajeFinal,
      mentions: [receptor]
    }, { quoted: msg });

  } catch (error) {
    console.error('❌ Error en .add:', error);
    await sock.sendMessage(from, {
      text: '❌ Ocurrió un error al añadir el recurso.'
    }, { quoted: msg });
  }
}