import fs from 'fs';
import { ensureCMUser, saveCM } from '../lib/cmManager.js';

export const command = 'registrarcm';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const nombre = args.join(' ');

  if (!nombre) {
    await sock.sendMessage(from, {
      text: `❗ Usa el comando así:\n.registrarCM <tu nombre>\n\nEjemplo:\n.registrarCM Juanito`
    }, { quoted: msg });
    return;
  }

  const uid = sender.split('@')[0];
  const user = ensureCMUser(uid);
  user.name = nombre;
  saveCM();

  await sock.sendMessage(from, {
    text: `✅ Te has registrado exitosamente como *${nombre}* para el modo Coin Master.`,
  }, { quoted: msg });
}
