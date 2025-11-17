import { isVip } from '../utils/vip.js';
import ytSearch from 'yt-search';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { trackSpotify, checkSpecialAchievements } from '../middleware/trackAchievements.js';
import { initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatabase } from '../data/database.js';

export const command = 'spotify';

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const songQuery = args.join(' ');
  const sender = msg.key.participant || msg.key.remoteJid;

  console.log(`🎵 Iniciando comando spotify para: ${sender.split('@')[0]}`);

  // ✅ INICIALIZAR ACHIEVEMENTS SI NO EXISTEN
  const db = cargarDatabase();
  if (!db.users[sender]?.achievements) {
    console.log(`🎯 Inicializando achievements para: ${sender.split('@')[0]}`);
    initializeAchievements(sender);
  }

  // Verificar estado actual ANTES de ejecutar
  const dbBefore = cargarDatabase();
  const userBefore = dbBefore.users[sender];
  console.log(`📊 Estado INICIAL - spotify_count: ${userBefore?.achievements?.stats?.spotify_count || 0}`);
  console.log(`📊 Logros desbloqueados: ${userBefore?.achievements?.unlocked?.length || 0}`);

  if (!songQuery) {
    return sock.sendMessage(from, {
      text: `
〔 *⛔ FALTA NOMBRE DE LA CANCIÓN* 〕
📀 *Usa el comando así:*
⚙️ .spotify <nombre de la canción>
🧪 *Ejemplo:* .spotify Enemy - Imagine Dragons
      `.trim()
    }, { quoted: msg });
  }

  await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
  await sock.sendMessage(from, {
    text: `🔍 Buscando audio para "*${songQuery}*" en Spotify...`
  }, { quoted: msg });

  try {
    const searchResults = await ytSearch(songQuery);
    const video = searchResults.videos[0];

    if (!video) {
      return sock.sendMessage(from, {
        text: '⚠️ No se encontró ningún video relevante.'
      }, { quoted: msg });
    }

    const videoUrl = video.url;
    const fileName = `spotify_${Date.now()}.m4a`;
    const filePath = path.join('./temp', fileName);

    if (!fs.existsSync('./temp')) fs.mkdirSync('./temp');

    console.log(`🎵 Descargando audio: ${video.title}`);

    // 👇 Vamos a usar una Promise para manejar mejor el async/await
    await new Promise((resolve, reject) => {
      exec(
        `yt-dlp -f bestaudio --add-header "User-Agent: Mozilla/5.0" -o "${filePath}" "${videoUrl}"`,
        async (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Error al ejecutar yt-dlp:', error);
            await sock.sendMessage(from, {
              text: '⚠️ Error al descargar el audio. Intenta con otra canción.'
            }, { quoted: msg });
            reject(error);
            return;
          }

          try {
            console.log(`✅ Audio descargado: ${filePath}`);
            const audioBuffer = fs.readFileSync(filePath);

            await sock.sendMessage(from, {
              audio: audioBuffer,
              mimetype: 'audio/mpeg',
              fileName: `${video.title}.m4a`,
              caption: `🎵 ${video.title} - ${video.author.name}`
            }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: '🎶', key: msg.key } });

            fs.unlinkSync(filePath);
            console.log(`🗑️ Archivo temporal eliminado: ${filePath}`);

            // ✅ TRACKEAR USO DE SPOTIFY (SOLO SI SE DESCARGÓ Y ENVIÓ EXITOSAMENTE)
            console.log(`🎯 Ejecutando trackSpotify para: ${sender.split('@')[0]}`);
            
            // Verificar estado ANTES del tracking
            const dbMid = cargarDatabase();
            const userMid = dbMid.users[sender];
            console.log(`📊 Estado MEDIO - spotify_count: ${userMid?.achievements?.stats?.spotify_count || 0}`);

            trackSpotify(sender, sock, from);
            checkSpecialAchievements(sender, sock, from);

            // Verificar estado DESPUÉS del tracking
            const dbAfter = cargarDatabase();
            const userAfter = dbAfter.users[sender];
            console.log(`📊 Estado FINAL - spotify_count: ${userAfter?.achievements?.stats?.spotify_count || 0}`);
            console.log(`📊 Logros desbloqueados después: ${userAfter?.achievements?.unlocked?.length || 0}`);

            // Verificar específicamente el logro de música
            const unlockedAchievements = userAfter?.achievements?.unlocked || [];
            const musicAchievements = ['music_starter', 'music_lover', 'music_master'];
            const musicUnlocked = unlockedAchievements.filter(id => musicAchievements.includes(id));
            console.log(`🎵 Logros de música desbloqueados: ${musicUnlocked.join(', ') || 'Ninguno'}`);

            resolve();

          } catch (err) {
            console.error('❌ Error al leer o enviar el archivo:', err);
            await sock.sendMessage(from, {
              text: '⚠️ El audio fue descargado pero no se pudo enviar.'
            }, { quoted: msg });
            reject(err);
          }
        }
      );
    });

  } catch (err) {
    console.error('❌ Error general en .spotify:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Error inesperado: ${err.message}`
    }, { quoted: msg });
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
  }
}
