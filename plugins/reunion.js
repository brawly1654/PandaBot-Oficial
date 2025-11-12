// codigo por miangeldev
// reunion.js
import { ownerNumber } from '../config.js';
export const command = 'reunion';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const GROUP_ID = "120363420237055271@g.us";
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.split('@')[0];
  const metadata_ses = await sock.groupMetadata(from);
  const isOwner = ownerNumber.includes(`+${senderNumber}`);

  if (!isOwner) {
    await sock.sendMessage(from, { text: '❌ Solo los Owners pueden usar este comando.' });
    return;
  }

  // Texto enviado después del comando
  const texto = args.join(" ") || "📢 *Se les convoca a reunión.*";

  // 1. Obtener info del grupo
  let metadata;
  try {
    metadata = await sock.groupMetadata(GROUP_ID);
  } catch (e) {
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ No pude obtener la info del grupo." }, { quoted: msg });
    return;
  }

  const participantes = metadata.participants; // Lista de participantes

  // 2. Crear lista de menciones
  const menciones = participantes.map(p => p.id);

  // 3. Enviar mensaje al grupo etiquetándolos a todos
  await sock.sendMessage(GROUP_ID, {
    text: `📢 *ATENCIÓN A TODOS*\n\n${texto}`,
    mentions: menciones
  });

  // 4. Enviar mensaje privado a cada usuario
  for (const p of participantes) {
    const jid = p.id;

    // Evitar enviar al bot
    if (jid.endsWith("@g.us")) continue;

    // Enviar el mensaje privado
    await sock.sendMessage(jid, {
      text: `📢 Hola! Se te notifica:\n\n${texto}`
    });

    await new Promise(res => setTimeout(res, 500)); // Anti-ban, evita spam
  }

  // 5. Confirmación al que ejecutó el comando
  await sock.sendMessage(msg.key.remoteJid, {
    text: `✅ Mensaje enviado en el grupo y a todos los usuarios por privado.\nTotal: ${participantes.length} miembros.`
  }, { quoted: msg });
}
