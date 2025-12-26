import fs from 'fs';
import { cargarDatabase, guardarDatabase, clearParejaDB } from '../data/database.js';
const parejasFile = './data/parejas.json';

export const command = 'divorcio';

export async function run(sock, msg, args) {
  const sender = msg.key.participant || msg.key.remoteJid;


  if (!fs.existsSync(parejasFile)) fs.writeFileSync(parejasFile, '{}');
  const parejas = JSON.parse(fs.readFileSync(parejasFile));


  if (!parejas[sender]) {
    await sock.sendMessage(msg.key.remoteJid, { text: '❌ No estás casado con nadie.' }, { quoted: msg });
    return;
  }

  const pareja = parejas[sender];
  delete parejas[sender];
  delete parejas[pareja];

  fs.writeFileSync(parejasFile, JSON.stringify(parejas, null, 2));


  try {
    const db = cargarDatabase();
    if (db) {
      clearParejaDB(db, sender);
      guardarDatabase(db);
    }
  } catch (e) {

  }

  await sock.sendMessage(msg.key.remoteJid, {
    text: `💔 Has divorciado de @${pareja.split('@')[0]}.`,
    mentions: [pareja]
  }, { quoted: msg });
}
