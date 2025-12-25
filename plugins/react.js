import fs from 'fs';
import path from 'path';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

const REACTS_FILE = path.join(process.cwd(), 'data', 'reacts.json');

function loadAvailable() {
  if (!fs.existsSync(REACTS_FILE)) return { reactions: [] };
  try {
    return JSON.parse(fs.readFileSync(REACTS_FILE, 'utf8'));
  } catch (e) {
    return { reactions: [] };
  }
}

function saveAvailable(data) {
  fs.writeFileSync(REACTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export const command = 'react';
export const aliases = ['reaccion','reaction'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || from;
  const db = cargarDatabase();
  db.reactions ??= { users: {} };
  const userData = db.reactions.users[sender] ??= { owned: [], selected: null };

  const sub = args[0]?.toLowerCase() || 'help';

  if (sub === 'buy') {
    const emoji = args[1];
    if (!emoji) return sock.sendMessage(from, { text: '❌ Usa: .react buy <emoji>' }, { quoted: msg });

    const available = loadAvailable();
    const item = available.reactions.find(r => r.emoji === emoji);
    if (!item) return sock.sendMessage(from, { text: '❌ Reacción no disponible.' }, { quoted: msg });
    if (item.stock <= 0) return sock.sendMessage(from, { text: '❌ Sin stock para esa reacción.' }, { quoted: msg });

    db.users ??= {};
    db.users[sender] ??= { pandacoins: 0 };
    const user = db.users[sender];
    if (user.pandacoins < item.price) {
      return sock.sendMessage(from, { text: `❌ No tienes suficientes pandacoins. Precio: ${item.price.toLocaleString()} 🐼` }, { quoted: msg });
    }

    user.pandacoins -= item.price;
    item.stock -= 1;
    if (!userData.owned.includes(emoji)) userData.owned.push(emoji);

    saveAvailable(available);
    guardarDatabase(db);

    return sock.sendMessage(from, { text: `✅ Has comprado ${emoji} por ${item.price.toLocaleString()} 🐼\nUsa: .react select ${emoji} para equiparla.` }, { quoted: msg });
  }

  if (sub === 'select') {
    const emoji = args[1];
    if (!emoji) return sock.sendMessage(from, { text: '❌ Usa: .react select <emoji>' }, { quoted: msg });
    if (!userData.owned.includes(emoji)) return sock.sendMessage(from, { text: '❌ No posees esa reacción.' }, { quoted: msg });
    userData.selected = emoji;
    guardarDatabase(db);
    return sock.sendMessage(from, { text: `✨ Reacción seleccionada: ${emoji}` }, { quoted: msg });
  }

  if (sub === 'my') {
    const owned = userData.owned.length ? userData.owned.join(' ') : '— Ninguna';
    const selected = userData.selected || '— Ninguna';
    return sock.sendMessage(from, { text: `🎯 Tus reacciones:\nOwned: ${owned}\nSelected: ${selected}` }, { quoted: msg });
  }

  if (sub === 'list') {
    const available = loadAvailable();
    if (!available.reactions.length) return sock.sendMessage(from, { text: '📭 No hay reacciones definidas.' }, { quoted: msg });
    let text = '🛒 Reacciones disponibles:\n\n';
    for (const it of available.reactions) {
      text += `${it.emoji} — Precio: ${it.price.toLocaleString()} 🐼 — Stock: ${it.stock} — ${it.description || ''}\n`;
    }
    return sock.sendMessage(from, { text }, { quoted: msg });
  }

  // help
  const help = `🎯 Comandos de reacciones:\n+.react buy <emoji> - Comprar reacción (no se puede vender)\n+.react select <emoji> - Equipar reacción para que el bot reaccione a tus mensajes\n+.react list - Ver reacciones disponibles\n+.react my - Ver tus reacciones y la seleccionada`;
  return sock.sendMessage(from, { text: help }, { quoted: msg });
}
