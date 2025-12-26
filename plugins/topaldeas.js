import { ensureCMUser } from '../lib/cmManager.js';
export const command = 'topaldeas';

export async function run(sock, msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const uid = sender.split('@')[0];

  const datosUsuario = ensureCMUser(uid);

  // Validación: ¿Está registrado?
  if (!datosUsuario || !(datosUsuario.name || datosUsuario.nombre)) {
    await sock.sendMessage(from, {
      text: '❗ Primero debes registrarte usando el comando:\n.registrarCM <tu nombre>',
    }, { quoted: msg });
    return;
  }

  // Validación: ¿Tiene aldea con nivel mayor a 0?
  if (!Number(datosUsuario.villageLevel) || Number(datosUsuario.villageLevel) === 0) {
    await sock.sendMessage(from, {
      text: '❗ Aún no tienes una aldea. Usa el comando `.construiraldea` para empezar.',
    }, { quoted: msg });
    return;
  }

  // Obtenemos y ordenamos los datos por nivel de aldea (keys son UIDs)
  const ordenados = Object.entries(global.cmDB)
    .map(([k, v]) => [k, ensureCMUser(k)])
    .filter(([_, data]) => Number(data.villageLevel) && Number(data.villageLevel) > 0)
    .sort((a, b) => Number(b[1].villageLevel) - Number(a[1].villageLevel));

  // Buscamos la posición real del usuario
  const posicionUsuario = ordenados.findIndex(([id]) => id === uid);

  const topUsuarios = ordenados.slice(0, 5);

  // Mensaje base
  let mensaje = '🏆 *TOP 5 ALDEAS POR NIVEL* 🏆\n\n';
  topUsuarios.forEach(([id, data], index) => {
    const nombre = data.name || data.nombre || 'Usuario';
    mensaje += `*${index + 1}.* ${nombre} – 🏘️ Nivel ${data.villageLevel}\n`;
  });

  // Agregamos la posición personal solo si el usuario aparece en el ranking
  if (posicionUsuario !== -1) {
    const miNombre = datosUsuario.name || datosUsuario.nombre;
    const miNivel = datosUsuario.villageLevel;
    mensaje += `\n📍 *Tu posición:* ${posicionUsuario + 1} – ${miNombre} (Nivel ${miNivel})`;
  }

  await sock.sendMessage(from, { text: mensaje }, { quoted: msg });
}
