import { cargarDatabase } from '../data/database.js';

export const command = 'menufutbol';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;

  const texto = `
🏟️ *Menú de Fútbol 11 — PandaBot* ⚽️

📐 *Formación y Alineación*
• *.formacion <táctica>* — Elige tu formación (4-3-3, 4-4-2, 3-5-2)
• *.alinear <posición> <personaje>* — Coloca un personaje en tu equipo
• *.equipo* — Muestra tu plantilla actual en formato cancha
• *.remover <posición>* — Quita un jugador de una posición
• *.resetalineacion* — Limpia toda tu alineación

🎮 *Próximamente*
• *.jugarpartido <@usuario>* — Enfrenta a otro equipo en un partido

📌 *Posiciones válidas*
POR, LD, LI, DFC1, DFC2, DFC3, MC1, MC2, MCO, EI, ED, DC, DC2

────────────────────
Usa *.formacion* para comenzar tu equipo.
`;

  await sock.sendMessage(from, { text: texto });
}
