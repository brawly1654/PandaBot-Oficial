import fetch from 'node-fetch';

export const command = 'cat';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const nombre = msg.pushName || 'Usuario';
  await sock.sendMessage(from, { text: `🐾 ${nombre} está buscando una imagen de gato aleatorio...` });

  try {
    const res = await fetch('https://api.thecatapi.com/v1/images/search');
    const data = await res.json();

    if (!data || data.length === 0 || !data[0].url) {
      await sock.sendMessage(from, { text: '❌ No se pudo obtener una imagen de gato.' });
      return;
    }

    const catUrl = data[0].url;

    await sock.sendMessage(from, {
      image: { url: catUrl },
      caption: `🐱 ¡Aquí tienes un gato aleatorio, ${nombre}!`
    });
  } catch (error) {
    console.error('Error al obtener imagen de gato:', error);
    await sock.sendMessage(from, { text: '❌ Ocurrió un error al obtener la imagen. Intenta más tarde.' });
  }
}
