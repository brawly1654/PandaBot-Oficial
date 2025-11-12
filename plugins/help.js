import fs from 'fs';
import path from 'path';

export const command = 'help';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const pluginsDir = path.join(process.cwd(), 'plugins');

  let comandos = [];

  try {
    const archivos = fs.readdirSync(pluginsDir);

    comandos = archivos
      .filter(file => file.endsWith('.js'))
      .map(file => `.${path.basename(file, '.js')}`)
      .sort();
  } catch (err) {
    await sock.sendMessage(from, {
      text: '❌ Error al leer los comandos disponibles.',
    }, { quoted: msg });
    return;
  }

  const mensaje = `📜 *Lista de comandos disponibles:*\n\n${comandos.join('\n')}`;

  await sock.sendMessage(from, {
    text: mensaje.trim(),
  }, { quoted: msg });
}
