import { cargarDatabase, guardarDatabase } from '../data/database.js';
export const command = 'formacion';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[sender] = db.users[sender] || {};

  const posicionesPorFormacion = {
    '4-3-3': ['POR','LD','LI','DFC1','DFC2','MC1','MC2','MCO','ED','EI','DC'],
    '4-4-2': ['POR','LD','LI','DFC1','DFC2','MC1','MC2','MCO','EI','DC','ED'],
    '3-5-2': ['POR','DFC1','DFC2','DFC3','MC1','MC2','MCO','EI','ED','DC','DC2'],
    '5-3-2': ['POR','LD','LI','DFC1','DFC2','DFC3','MC1','MC2','MCO','DC','DC2'],
    '3-4-3': ['POR','DFC1','DFC2','DFC3','MC1','MC2','MC3','ED','DC','EI']
  };

  const formacionesValidas = Object.keys(posicionesPorFormacion);
  const seleccionada = args[0];

  if (!seleccionada || !formacionesValidas.includes(seleccionada)) {
    const texto = `⚽️ *Formaciones disponibles:*\n\n` +
      formacionesValidas.map(f => {
        const posiciones = posicionesPorFormacion[f].join(', ');
        return `• ${f}: ${posiciones}`;
      }).join('\n') +
      `\n\nUsa: *.formacion 4-3-3* para comenzar.`;

    await sock.sendMessage(from, { text: texto });
    return;
  }

  user.alineacion = {
    formacion: seleccionada,
    posiciones: {}
  };

  guardarDatabase(db);

  await sock.sendMessage(from, {
    text: `✅ Formación *${seleccionada}* seleccionada.\nPosiciones válidas: ${posicionesPorFormacion[seleccionada].join(', ')}\nUsa *.alinear <posición> <personaje>* para empezar.`
  });
}
