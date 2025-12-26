import ytSearch from 'yt-search';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ensureCMUser, saveCM } from '../lib/cmManager.js';

export const command = 'play';

function formatViews(views) {
  return views >= 1000
    ? (views / 1000).toFixed(1) + 'k (' + views.toLocaleString() + ')'
    : views.toString();
}

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const userId = sender.split('@')[0];
  const songQuery = args.join(' ');

  if (!songQuery) {
    await sock.sendMessage(from, {
      text: '⚔️ Ingresa el nombre de la música o video a buscar.'
    });
    return;
  }

  const creditosCosto = 50;

  const userData = ensureCMUser(userId);
  const userCreditos = userData.creditos;
  if (userCreditos < creditosCosto) {
    await sock.sendMessage(from, {
      text: `❌ No tienes suficientes créditos para usar este comando. Cuesta *${creditosCosto} créditos* y tienes *${userCreditos}*.`
    }, { quoted: msg });
    return;
  }

  await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
  await sock.sendMessage(from, {
    text: `🔍 Buscando audio para "*${songQuery}*" en YouTube...`
  }, { quoted: msg });

  try {
    const searchResults = await ytSearch(songQuery);
    const video = searchResults.videos.find(v => v.videoId);

    if (!video) {
      await sock.sendMessage(from, {
        text: '⚠️ No se encontró ningún video relevante.'
      }, { quoted: msg });
      return;
    }

    const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    const fileName = `play_${Date.now()}.m4a`;
    const filePath = path.join('./temp', fileName);

    if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');

    const infoMessage = `
🎵 *${video.title}*
👀 *Vistas:* ${formatViews(video.views)}
⏱️ *Duración:* ${video.timestamp}
📅 *Publicado:* ${video.ago}
🔗 *URL:* ${videoUrl}

_🪙 Se han descontado *${creditosCosto} créditos* de tu cuenta._
_🐼 Enviando audio, espere un momento..._
`;

    await sock.sendMessage(from, {
      image: { url: video.thumbnail },
      caption: infoMessage
    });

    exec(
      `yt-dlp -f bestaudio --add-header "User-Agent: Mozilla/5.0" -o "${filePath}" "${videoUrl}"`,
      async (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Error al ejecutar yt-dlp:', error);
          return sock.sendMessage(from, {
            text: '⚠️ Error al descargar el audio. Intenta con otra canción.'
          }, { quoted: msg });
        }

        try {
          const audioBuffer = fs.readFileSync(filePath);

          await sock.sendMessage(from, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.m4a`,
            caption: `🎵 ${video.title} - ${video.author.name}`
          }, { quoted: msg });

          await sock.sendMessage(from, { react: { text: '🎶', key: msg.key } });

          fs.unlinkSync(filePath);

          userData.creditos -= creditosCosto;
          saveCM();

        } catch (err) {
          console.error('❌ Error al leer o enviar el archivo:', err);
          await sock.sendMessage(from, {
            text: '⚠️ El audio fue descargado pero no se pudo enviar.'
          }, { quoted: msg });
        }
      }
    );

  } catch (err) {
    console.error('❌ Error general en .play:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Error inesperado: ${err.message}`
    }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
  }
}
