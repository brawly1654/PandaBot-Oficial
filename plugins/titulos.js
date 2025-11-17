import { getUserAchievementStats, selectTitle } from '../data/achievementsDB.js';

export const command = 'titulos';
export const aliases = ['titulo', 'titles'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;

  const subcommand = args[0]?.toLowerCase();

  // .titulos equipar <titulo>
  if (subcommand === 'equipar' || subcommand === 'usar') {
    const titulo = args.slice(1).join(' ');
    
    if (!titulo) {
      await sock.sendMessage(from, {
        text: '❌ Debes especificar un título.\n\n💡 Ejemplo: `.titulos equipar Millonario`'
      }, { quoted: msg });
      return;
    }

    const result = selectTitle(sender, titulo);

    if (!result.success) {
      if (result.reason === 'title_not_owned') {
        await sock.sendMessage(from, {
          text: `❌ No posees el título "${titulo}".\n\n💡 Usa \`.logros titulos\` para ver tus títulos disponibles.`
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, {
          text: '❌ Error al equipar el título. Intenta de nuevo.'
        }, { quoted: msg });
      }
      return;
    }

    await sock.sendMessage(from, {
      text: `✅ ¡Título equipado!\n\n👑 Ahora eres: *${titulo}*`
    }, { quoted: msg });
    return;
  }

  // .titulos quitar
  if (subcommand === 'quitar' || subcommand === 'remover') {
    const result = selectTitle(sender, null);

    if (!result.success) {
      await sock.sendMessage(from, {
        text: '❌ Error al quitar el título.'
      }, { quoted: msg });
      return;
    }

    await sock.sendMessage(from, {
      text: '✅ Título removido correctamente.'
    }, { quoted: msg });
    return;
  }

  // .titulos (listar)
  const stats = getUserAchievementStats(sender);

  if (stats.titles.length === 0) {
    await sock.sendMessage(from, {
      text: '❌ No tienes títulos desbloqueados aún.\n\n💡 Desbloquea logros para obtener títulos.'
    }, { quoted: msg });
    return;
  }

  let texto = '╭━━━━━ 👑 TUS TÍTULOS ━━━━━╮\n\n';

  for (const title of stats.titles) {
    const isSelected = title === stats.selectedTitle;
    texto += `${isSelected ? '✅' : '⬜'} *${title}*\n`;
  }

  texto += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `💡 Comandos disponibles:\n`;
  texto += `│ \`.titulos equipar <título>\`\n`;
  texto += `│ \`.titulos quitar\`\n`;
  texto += `╰━━━━━━━━━━━━━━━━━━━━`;

  await sock.sendMessage(from, { text: texto }, { quoted: msg });
}
