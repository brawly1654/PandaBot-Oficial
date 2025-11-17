import {
  getAllAchievements,
  getUserAchievementStats,
  hasAchievement,
  getAchievementProgress,
  getAchievementsByCategory,
  selectTitle,
  initializeAchievements
} from '../data/achievementsDB.js';
import fs from 'fs';

const achievementsData = JSON.parse(fs.readFileSync('./data/achievements.json', 'utf8'));
const categories = achievementsData.categories;

export const command = 'logros';
export const aliases = ['achievements', 'logro'];

export async function run(sock, msg, args) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  const targetUserJid = mentionedJid || sender;

  // Inicializar logros si no existen
  initializeAchievements(targetUserJid);

  const subcommand = args[0]?.toLowerCase();

  // .logros categorias
  if (subcommand === 'categorias' || subcommand === 'cats') {
    let texto = '╭━━━━━ 📚 CATEGORÍAS ━━━━━╮\n\n';
    
    for (const [key, cat] of Object.entries(categories)) {
      const categoryAchievements = getAchievementsByCategory(key);
      const unlockedInCategory = categoryAchievements.filter(a => 
        hasAchievement(targetUserJid, a.id)
      ).length;
      
      texto += `${cat.icon} *${cat.name}*\n`;
      texto += `└─ ${unlockedInCategory}/${categoryAchievements.length} desbloqueados\n\n`;
    }
    
    texto += `💡 Usa \`.logros <categoría>\` para ver logros específicos\n`;
    texto += `Ejemplo: \`.logros economia\``;
    
    await sock.sendMessage(from, { text: texto }, { quoted: msg });
    return;
  }

  // .logros <categoria>
  if (subcommand && categories[subcommand]) {
    const categoryAchievements = getAchievementsByCategory(subcommand);
    const categoryInfo = categories[subcommand];
    
    let texto = `╭━━━ ${categoryInfo.icon} ${categoryInfo.name.toUpperCase()} ━━━╮\n\n`;
    
    for (const achievement of categoryAchievements) {
      const unlocked = hasAchievement(targetUserJid, achievement.id);
      const progress = getAchievementProgress(targetUserJid, achievement.id);
      
      // No mostrar logros ocultos si no están desbloqueados
      if (achievement.hidden && !unlocked) continue;
      
      texto += `${unlocked ? '✅' : '⬜'} ${achievement.icon} *${achievement.name}*\n`;
      texto += `│ ${achievement.description}\n`;
      
      if (!unlocked && progress) {
        const barLength = 10;
        const filled = Math.floor((progress.percentage / 100) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        texto += `│ ${bar} ${progress.current}/${progress.target}\n`;
      }
      
      if (unlocked) {
        texto += `│ ⭐ ${achievement.points} puntos\n`;
      } else {
        texto += `│ 🎁 Recompensa: ${achievement.reward?.coins?.toLocaleString() || 0} 🐼`;
        if (achievement.reward?.title) {
          texto += ` + Título "${achievement.reward.title}"`;
        }
        texto += `\n`;
      }
      
      texto += `╰────────────────\n\n`;
    }
    
    await sock.sendMessage(from, { text: texto }, { quoted: msg });
    return;
  }

  // .logros titulos
  if (subcommand === 'titulos' || subcommand === 'titles') {
    const stats = getUserAchievementStats(targetUserJid);
    
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
    
    texto += `\n💡 Usa \`.titulos equipar <título>\` para equipar\n`;
    texto += `Ejemplo: \`.titulos equipar Millonario\``;
    
    await sock.sendMessage(from, { text: texto }, { quoted: msg });
    return;
  }

  // .logros secretos
  if (subcommand === 'secretos' || subcommand === 'hidden') {
    const allAchievements = getAllAchievements();
    const hiddenAchievements = allAchievements.filter(a => a.hidden);
    
    let texto = '╭━━━━ 🔐 LOGROS SECRETOS ━━━━╮\n\n';
    
    for (const achievement of hiddenAchievements) {
      const unlocked = hasAchievement(targetUserJid, achievement.id);
      
      if (unlocked) {
        texto += `✅ ${achievement.icon} *${achievement.name}*\n`;
        texto += `│ ${achievement.description}\n`;
        texto += `│ ⭐ ${achievement.points} puntos\n`;
        texto += `╰────────────────\n\n`;
      } else {
        texto += `🔒 *???*\n`;
        texto += `│ Logro secreto sin desbloquear\n`;
        texto += `│ ⭐ ??? puntos\n`;
        texto += `╰────────────────\n\n`;
      }
    }
    
    await sock.sendMessage(from, { text: texto }, { quoted: msg });
    return;
  }

  // .logros (resumen general)
  const stats = getUserAchievementStats(targetUserJid);
  const allAchievements = getAllAchievements();
  
  // Últimos 3 logros desbloqueados
  const db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
  const user = db.users[targetUserJid];
  const recentUnlocked = user.achievements?.unlocked.slice(-3).reverse() || [];
  
  let texto = `╭━━━━━ 🏆 LOGROS ━━━━━╮\n\n`;
  texto += `👤 Usuario: @${targetUserJid.split('@')[0]}\n`;
  texto += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Progreso general
  const barLength = 20;
  const filled = Math.floor((stats.percentage / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  
  texto += `📊 *PROGRESO GENERAL*\n`;
  texto += `${bar} ${stats.percentage}%\n`;
  texto += `${stats.unlocked}/${stats.total} logros completados\n\n`;
  
  // Puntos
  texto += `⭐ *PUNTOS DE LOGRO:* ${stats.points}\n\n`;
  
  // Título actual
  if (stats.selectedTitle) {
    texto += `👑 *TÍTULO ACTUAL:* ${stats.selectedTitle}\n\n`;
  }
  
  // Últimos desbloqueados
  if (recentUnlocked.length > 0) {
    texto += `🎉 *ÚLTIMOS DESBLOQUEADOS*\n`;
    for (const achievementId of recentUnlocked) {
      const achievement = allAchievements.find(a => a.id === achievementId);
      if (achievement) {
        texto += `│ ${achievement.icon} ${achievement.name}\n`;
      }
    }
    texto += `\n`;
  }
  
  // Próximos logros (cercanos a completar)
  const nearCompletion = allAchievements
    .filter(a => !hasAchievement(targetUserJid, a.id) && !a.hidden)
    .map(a => {
      const progress = getAchievementProgress(targetUserJid, a.id);
      return { ...a, progress };
    })
    .filter(a => a.progress && a.progress.percentage > 0)
    .sort((a, b) => b.progress.percentage - a.progress.percentage)
    .slice(0, 3);
  
  if (nearCompletion.length > 0) {
    texto += `🎯 *PRÓXIMOS A COMPLETAR*\n`;
    for (const achievement of nearCompletion) {
      texto += `│ ${achievement.icon} ${achievement.name}\n`;
      texto += `│ └─ ${achievement.progress.current}/${achievement.progress.target} (${achievement.progress.percentage}%)\n`;
    }
    texto += `\n`;
  }
  
  texto += `━━━━━━━━━━━━━━━━━━━━\n`;
  texto += `💡 Comandos disponibles:\n`;
  texto += `│ \`.logros categorias\` - Ver por categoría\n`;
  texto += `│ \`.logros titulos\` - Ver tus títulos\n`;
  texto += `│ \`.logros secretos\` - Logros ocultos\n`;
  texto += `╰━━━━━━━━━━━━━━━━━━━━`;
  texto += `
· .logros economia - Muestra todos los logros de economía
· .logros personajes - Logros de coleccionista
· .logros social - Logros sociales
· .logros juegos - Logros de juegos
· .logros pizzeria - Logros de pizzería
· .logros coinmaster - Logros de Coin Master
· .logros especial - Logros especiales
· .logros musica - Logros de Música
`
;

  await sock.sendMessage(from, {
    text: texto,
    mentions: [targetUserJid]
  }, { quoted: msg });
}
