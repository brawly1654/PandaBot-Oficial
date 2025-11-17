const posicionesPorFormacion = {
  '4-3-3': ['POR','LD','LI','DFC1','DFC2','MC1','MC2','MCO','ED','EI','DC'],
  '4-4-2': ['POR','LD','LI','DFC1','DFC2','MC1','MC2','MCO','EI','DC','ED'],
  '3-5-2': ['POR','DFC1','DFC2','DFC3','MC1','MC2','MCO','EI','ED','DC','DC2'],
  '5-3-2': ['POR','LD','LI','DFC1','DFC2','DFC3','MC1','MC2','MCO','DC','DC2'],
  '3-4-3': ['POR','DFC1','DFC2','DFC3','MC1','MC2','MC3','ED','DC','EI']
};

import { cargarDatabase, guardarDatabase } from '../data/database.js';
export const command = 'alinear';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[sender] = db.users[sender] || {};

  if (!user.alineacion) {
    await sock.sendMessage(from, { text: '❌ Primero elige una formación con *.formacion*' });
    return;
  }

  const [pos, ...nombreParts] = args;
  const nombre = nombreParts.join(' ').trim();
  const formacion = user.alineacion.formacion;
  const posicionesValidas = posicionesPorFormacion[formacion] || [];

  if (!pos || !nombre || !posicionesValidas.includes(pos)) {
    await sock.sendMessage(from, {
      text: `❌ Posición inválida para la formación *${formacion}*.\nPosiciones válidas:\n${posicionesValidas.join(', ')}`
    });
    return;
  }

  if (!pos || !nombre || !posicionesValidas.includes(pos)) {
    await sock.sendMessage(from, {
      text: `❌ Usa: .alinear <posición> <personaje>\nEj: .alinear DC Tom Ass\n\nPosiciones válidas:\n${posicionesValidas.join(', ')}`
    });
    return;
  }

  const cantidadInventario = user.personajes?.filter(p => p === nombre).length || 0;
  if (cantidadInventario === 0) {
    await sock.sendMessage(from, { text: `❌ No tienes a *${nombre}* en tu inventario.` });
    return;
  }

  const cantidadAlineado = Object.values(user.alineacion.posiciones || {}).filter(p => p === nombre).length;

  if (cantidadAlineado >= cantidadInventario) {
    await sock.sendMessage(from, {
      text: `⚠️ Ya has alineado a *${nombre}* en ${cantidadAlineado} posición(es), y solo tienes ${cantidadInventario} copia(s).`
    });
    return;
  }

  user.alineacion.posiciones[pos] = nombre;
  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `✅ *${nombre}* alineado como *${pos}*. Usa *.equipo* para ver tu plantilla.`
  });
}
