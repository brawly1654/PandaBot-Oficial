import { ownerNumber } from '../config.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'reputacion';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];

  const isOwner = ownerNumber.includes(`+${senderNumber}`);
  if (!isOwner) {
    await sock.sendMessage(from, { text: '❌ Solo los Owners pueden modificar la reputación.' });
    return;
  }

  const accion = args[0];
  if (!['aumentar', 'restar'].includes(accion)) {
    await sock.sendMessage(from, {
      text: '⚠️ Uso correcto:\n.reputacion aumentar/restar ⭐️⭐️⭐️ @usuario'
    });
    return;
  }

  const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mention) {
    await sock.sendMessage(from, { text: '⚠️ Debes mencionar a un usuario.' });
    return;
  }

  const textoCompleto =
  msg.message?.conversation ||
  msg.message?.extendedTextMessage?.text ||
  '';

const cantidad = (textoCompleto.match(/⭐/g) || []).length;

  if (cantidad <= 0) {
    await sock.sendMessage(from, { text: '⚠️ Debes usar estrellitas ⭐️ para indicar la cantidad.' });
    return;
  }

  const db = cargarDatabase();
  db.users = db.users || {};
  db.users[mention] = db.users[mention] || {};

  const user = db.users[mention];
  user.reputacion = user.reputacion || 0;

  if (accion === 'aumentar') {
    user.reputacion += cantidad;
  } else {
    user.reputacion = Math.max(0, user.reputacion - cantidad);
  }

  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `⭐ *Reputación actual de* @${mention.split('@')[0]}:\n⭐️ ${user.reputacion} estrellitas ⭐️`,
    mentions: [mention]
  });
}