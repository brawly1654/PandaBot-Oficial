const posicionesPorFormacion = {
  '4-3-3': ['POR','LD','LI','DFC1','DFC2','MC1','MC2','MCO','ED','EI','DC'],
  '4-4-2': ['POR','LD','LI','DFC1','DFC2','MC1','MC2','MCO','EI','DC','ED'],
  '3-5-2': ['POR','DFC1','DFC2','DFC3','MC1','MC2','MCO','EI','ED','DC','DC2'],
  '5-3-2': ['POR','LD','LI','DFC1','DFC2','DFC3','MC1','MC2','MCO','DC','DC2'],
  '3-4-3': ['POR','DFC1','DFC2','DFC3','MC1','MC2','MC3','ED','DC','EI']
};

import { cargarDatabase, guardarDatabase } from '../data/database.js';
export const command = 'equipo';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[sender] = db.users[sender] || {};

  if (!user.alineacion || !user.alineacion.formacion) {
    await sock.sendMessage(from, { text: '❌ No tienes una formación activa. Usa *.formacion 4-3-3* primero.' });
    return;
  }

  const pos = user.alineacion.posiciones || {};
  const f = user.alineacion.formacion;

  let plantilla = `⚽️ *Tu equipo (${f})*\n\n`;

  plantilla += `        🧤 POR: ${pos.POR || '—'}\n`;

  if (f === '4-3-3') {
    plantilla += `LD: ${pos.LD || '—'}     DFC1: ${pos.DFC1 || '—'}     DFC2: ${pos.DFC2 || '—'}     LI: ${pos.LI || '—'}\n\n`;
    plantilla += `MC1: ${pos.MC1 || '—'}     MC2: ${pos.MC2 || '—'}     MCO: ${pos.MCO || '—'}\n\n`;
    plantilla += `ED: ${pos.ED || '—'}     DC: ${pos.DC || '—'}     EI: ${pos.EI || '—'}\n`;
  } else if (f === '4-4-2') {
    plantilla += `LD: ${pos.LD || '—'}     DFC1: ${pos.DFC1 || '—'}     DFC2: ${pos.DFC2 || '—'}     LI: ${pos.LI || '—'}\n\n`;
    plantilla += `MC1: ${pos.MC1 || '—'}     MC2: ${pos.MC2 || '—'}     MCO: ${pos.MCO || '—'}     EI: ${pos.EI || '—'}\n\n`;
    plantilla += `DC: ${pos.DC || '—'}     ED: ${pos.ED || '—'}\n`;
  } else if (f === '3-5-2') {
    plantilla += `DFC1: ${pos.DFC1 || '—'}     DFC2: ${pos.DFC2 || '—'}     DFC3: ${pos.DFC3 || '—'}\n\n`;
    plantilla += `MC1: ${pos.MC1 || '—'}     MC2: ${pos.MC2 || '—'}     MCO: ${pos.MCO || '—'}     EI: ${pos.EI || '—'}     ED: ${pos.ED || '—'}\n\n`;
    plantilla += `DC: ${pos.DC || '—'}     DC2: ${pos.DC2 || '—'}\n`;
  } else if (f === '5-3-2') {
    plantilla += `LD: ${pos.LD || '—'}     DFC1: ${pos.DFC1 || '—'}     DFC2: ${pos.DFC2 || '—'}     DFC3: ${pos.DFC3 || '—'}     LI: ${pos.LI || '—'}\n\n`;
    plantilla += `MC1: ${pos.MC1 || '—'}     MC2: ${pos.MC2 || '—'}     MCO: ${pos.MCO || '—'}\n\n`;
    plantilla += `DC: ${pos.DC || '—'}     DC2: ${pos.DC2 || '—'}\n`;
  } else if (f === '3-4-3') {
    plantilla += `DFC1: ${pos.DFC1 || '—'}     DFC2: ${pos.DFC2 || '—'}     DFC3: ${pos.DFC3 || '—'}\n\n`;
    plantilla += `MC1: ${pos.MC1 || '—'}     MC2: ${pos.MC2 || '—'}     MC3: ${pos.MC3 || '—'}\n\n`;
    plantilla += `ED: ${pos.ED || '—'}     DC: ${pos.DC || '—'}     EI: ${pos.EI || '—'}\n`;
  } else {
    plantilla += `❌ Formación no soportada aún.\n`;
  }

  await sock.sendMessage(from, { text: plantilla });
}
