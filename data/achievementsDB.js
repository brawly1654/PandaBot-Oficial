import fs from 'fs';
import { cargarDatabase, guardarDatabase } from './database.js';

const achievementsFile = './data/achievements.json';

// Cargar definiciones de logros
let achievementsData = null;

function loadAchievements() {
  if (!achievementsData) {
    try {
      achievementsData = JSON.parse(fs.readFileSync(achievementsFile, 'utf8'));
    } catch (error) {
      console.error('Error cargando achievements.json:', error);
      // Datos por defecto para evitar crash
      achievementsData = { categories: {}, achievements: [] };
    }
  }
  return achievementsData;
}

/**
 * Inicializar sistema de logros para un usuario
 */
export function initializeAchievements(userJid) {
  const db = cargarDatabase();
  db.users = db.users || {};
  
  if (!db.users[userJid]) {
    db.users[userJid] = {};
  }
  
  if (!db.users[userJid].achievements) {
    db.users[userJid].achievements = {
      unlocked: [],
      progress: {},
      points: 0,
      titles: [],
      selectedTitle: null,
      stats: {
        minar_count: 0,
        trabajar_count: 0,
        buy_count: 0,
        apostar_count: 0,
        robos_exitosos: 0,
        robos_fallidos: 0,
        commands_used: 0,
        cm_tiradas: 0,
        cm_ataques: 0,
        registered_date: Date.now(),
        was_broke: false,
        comeback: false,
        spotify_count: 0
      }
    };
    guardarDatabase(db);
  }
  
  return db.users[userJid].achievements;
}

/**
 * Obtener todos los logros disponibles
 */
export function getAllAchievements() {
  const data = loadAchievements();
  return data.achievements;
}

/**
 * Obtener logros por categoría
 */
export function getAchievementsByCategory(category) {
  const achievements = getAllAchievements();
  return achievements.filter(a => a.category === category);
}

/**
 * Obtener un logro específico
 */
export function getAchievement(achievementId) {
  const achievements = getAllAchievements();
  return achievements.find(a => a.id === achievementId);
}

/**
 * Verificar si un usuario tiene un logro
 */
export function hasAchievement(userJid, achievementId) {
  const db = cargarDatabase();
  const achievements = db.users[userJid]?.achievements;
  
  if (!achievements) return false;
  
  return achievements.unlocked.includes(achievementId);
}

/**
 * Desbloquear un logro para un usuario
 */
export function unlockAchievement(userJid, achievementId, sock = null, from = null) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user || !user.achievements) {
    initializeAchievements(userJid);
    // Recargar después de inicializar
    const dbUpdated = cargarDatabase();
    user.achievements = dbUpdated.users[userJid].achievements;
  }

  // Verificar si ya tiene el logro
  if (hasAchievement(userJid, achievementId)) {
    return { success: false, reason: 'already_unlocked' };
  }

  const achievement = getAchievement(achievementId);
  
  if (!achievement) {
    return { success: false, reason: 'not_found' };
  }

  // Desbloquear logro
  user.achievements.unlocked.push(achievementId);
  user.achievements.points += achievement.points;

  // Añadir título si tiene
  if (achievement.reward?.title) {
    if (!user.achievements.titles.includes(achievement.reward.title)) {
      user.achievements.titles.push(achievement.reward.title);
    }
  }

  // Dar recompensas
  if (achievement.reward?.coins) {
    user.pandacoins = (user.pandacoins || 0) + achievement.reward.coins;
  }

  guardarDatabase(db);

  // Enviar notificación si sock está disponible
  if (sock && from) {
    sendAchievementNotification(sock, from, userJid, achievement);
  }

  return {
    success: true,
    achievement,
    reward: achievement.reward
  };
}

/**
 * Enviar notificación de logro desbloqueado
 */
async function sendAchievementNotification(sock, from, userJid, achievement) {
  const mensaje = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
│   🏆 ¡LOGRO DESBLOQUEADO! 🏆   │
╰━━━━━━━━━━━━━━━━━━━━━━╯

${achievement.icon} *${achievement.name}*
📝 _${achievement.description}_

🎁 *RECOMPENSAS:*
${achievement.reward?.coins ? `💰 +${achievement.reward.coins.toLocaleString()} pandacoins` : ''}
${achievement.reward?.title ? `👑 Título: "${achievement.reward.title}"` : ''}
⭐ +${achievement.points} puntos de logro

━━━━━━━━━━━━━━━━━━━━━━
`.trim();

  try {
    await sock.sendMessage(from, {
      text: mensaje,
      mentions: [userJid]
    });
  } catch (error) {
    console.error('Error enviando notificación de logro:', error);
  }
}

/**
 * Actualizar progreso y verificar logros
 */
export function trackProgress(userJid, actionType, value = 1, sock = null, from = null) {
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[userJid];

  if (!user) {
    console.log(`Usuario ${userJid} no encontrado al trackear progreso`);
    return;
  }

  // ✅ INICIALIZAR ACHIEVEMENTS SI NO EXISTEN
  if (!user.achievements) {
    initializeAchievements(userJid);
    // Recargar el usuario después de inicializar
    const dbUpdated = cargarDatabase();
    user.achievements = dbUpdated.users[userJid].achievements;
  }

  const stats = user.achievements.stats;

  // Actualizar estadística
  if (stats[actionType] !== undefined) {
    stats[actionType] += value;
  }

  guardarDatabase(db);

  // Verificar logros que se puedan haber completado
  checkAchievements(userJid, sock, from);
}

/**
 * Verificar todos los logros de un usuario
 */
export function checkAchievements(userJid, sock = null, from = null) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user) {
    console.log(`Usuario ${userJid} no encontrado al verificar logros`);
    return [];
  }

  // ✅ Asegurar que achievements esté inicializado
  if (!user.achievements) {
    initializeAchievements(userJid);
    // Recargar después de inicializar
    const dbUpdated = cargarDatabase();
    user.achievements = dbUpdated.users[userJid].achievements;
  }

  const stats = user.achievements.stats;
  const achievements = getAllAchievements();
  const unlocked = [];

  for (const achievement of achievements) {
    // Si ya está desbloqueado, skip
    if (hasAchievement(userJid, achievement.id)) continue;

    const req = achievement.requirement;
    let completed = false;

    switch (req.type) {
      case 'register':
        completed = true; // Si existe el usuario, está registrado
        break;

      case 'total_coins':
        completed = (user.pandacoins || 0) >= req.value;
        break;

      case 'personajes_count':
        completed = (user.personajes?.length || 0) >= req.value;
        break;

      case 'minar_count':
      case 'trabajar_count':
      case 'buy_count':
      case 'apostar_count':
      case 'robos_exitosos':
      case 'commands_used':
      case 'cm_tiradas':
      case 'cm_ataques':
        completed = (stats[req.type] || 0) >= req.value;
        break;

      case 'married':
        let parejas = {};
        try {
          parejas = JSON.parse(fs.readFileSync('./data/parejas.json', 'utf8'));
        } catch (error) {
          console.log('Archivo parejas.json no encontrado, usando objeto vacío');
        }
        completed = !!parejas[userJid];
        break;

      case 'hermanos_count':
        let hermandad = {};
        try {
          hermandad = JSON.parse(fs.readFileSync('./data/hermandad.json', 'utf8'));
        } catch (error) {
          console.log('Archivo hermandad.json no encontrado, usando objeto vacío');
        }
        completed = (hermandad[userJid]?.length || 0) >= req.value;
        break;

      case 'pizzeria_registered':
        // Verificar si tiene pizzería
        completed = !!user.pizzeria;
        break;

      case 'pizzeria_level':
        completed = (user.pizzeria?.level || 0) >= req.value;
        break;

      case 'days_registered':
        const days = Math.floor((Date.now() - stats.registered_date) / (1000 * 60 * 60 * 24));
        completed = days >= req.value;
        break;

      case 'has_rainbow_effect':
        completed = user.personajes?.some(p => p.includes('🌈')) || false;
        break;

      case 'has_toilet_effect':
        completed = user.personajes?.some(p => p.includes('🚽')) || false;
        break;

      case 'broke':
        completed = stats.was_broke || false;
        break;

      case 'comeback':
        completed = stats.comeback || false;
        break;

      case 'spotify_count':
  completed = (stats[req.type] || 0) >= req.value;
  break;
    }

    if (completed) {
      const result = unlockAchievement(userJid, achievement.id, sock, from);
      if (result.success) {
        unlocked.push(achievement);
      }
    }
  }

  return unlocked;
}

/**
 * Obtener estadísticas de logros de un usuario
 */
export function getUserAchievementStats(userJid) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user || !user.achievements) {
    initializeAchievements(userJid);
    return getUserAchievementStats(userJid);
  }

  const allAchievements = getAllAchievements();
  const unlockedCount = user.achievements.unlocked.length;
  const totalCount = allAchievements.length;
  const percentage = Math.floor((unlockedCount / totalCount) * 100);

  return {
    unlocked: unlockedCount,
    total: totalCount,
    percentage,
    points: user.achievements.points,
    titles: user.achievements.titles,
    selectedTitle: user.achievements.selectedTitle
  };
}

/**
 * Obtener progreso de un logro específico
 */
export function getAchievementProgress(userJid, achievementId) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  const achievement = getAchievement(achievementId);
  
  if (!user || !achievement) return null;

  const stats = user.achievements?.stats || {};
  const req = achievement.requirement;

  let current = 0;
  let target = req.value;

  switch (req.type) {
    case 'total_coins':
      current = user.pandacoins || 0;
      break;

    case 'personajes_count':
      current = user.personajes?.length || 0;
      break;

    default:
      current = stats[req.type] || 0;
      break;
  }

  const percentage = Math.min(Math.floor((current / target) * 100), 100);

  return {
    current,
    target,
    percentage,
    completed: current >= target
  };
}

/**
 * Seleccionar título
 */
export function selectTitle(userJid, title) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user || !user.achievements) {
    return { success: false, reason: 'not_initialized' };
  }

  if (!user.achievements.titles.includes(title)) {
    return { success: false, reason: 'title_not_owned' };
  }

  user.achievements.selectedTitle = title;
  guardarDatabase(db);

  return { success: true };
}
