import fs from 'fs';
import { ownerNumber } from '../config.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export const command = 'resetuser';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  // Solo grupos
  if (!from.endsWith('@g.us')) {
    await sock.sendMessage(from, { text: '❌ Este comando solo se puede usar en grupos.' });
    return;
  }

  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];
  const isOwner = ownerNumber.includes(`+${senderNumber}`);

  if (!isOwner) {
    await sock.sendMessage(from, { text: '❌ Solo los *Owners* pueden usar este comando.' });
    return;
  }

  const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mention) {
    await sock.sendMessage(from, {
      text: '⚠️ Debes mencionar al usuario que deseas resetear.\nEj: *.resetuser @usuario*'
    });
    return;
  }

  const db = cargarDatabase();
  db.users = db.users || {};

  if (!db.users[mention]) {
    await sock.sendMessage(from, {
      text: '⚠️ Ese usuario no existe en la base de datos.',
      mentions: [mention]
    });
    return;
  }

  // 🧨 BORRADO TOTAL
  delete db.users[mention];
  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `🧹 *Usuario reseteado correctamente*\n\n@${mention.split('@')[0]} deberá registrarse nuevamente y empezará desde *0*.`,
    mentions: [mention]
  });

  console.log(`🧨 Usuario ${mention} fue eliminado completamente de la DB`);
}