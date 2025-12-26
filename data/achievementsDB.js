import fs from 'fs';
import { cargarDatabase, guardarDatabase } from './database.js';

function ensureAchievementStats(user) {
  if (!user.achievements) user.achievements = {};

  if (!user.achievements.stats) {
    user.achievements.stats = {
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
      spotify_count: 0,
      paja_count: 0,
      sexo_count: 0,
      dildear_count: 0,
      granja_count: 0,
      granja_level: 0,
      instagram_count: 0,
      ytmp4_count: 0,
      tiktok_count: 0,
      beso_count: 0,
      sugerencia_count: 0,
      pregunta_count: 0,
      reporte_count: 0,
      contribuciones_count: 0,
      code_claims: 0,
      hola_count: 0,
      impostor_games: 0,
      impostor_wins: 0,
      invertir_count: 0,
      inversiones_count: 0,
      miinversion_count: 0,
      retirar_count: 0,
      kick_count: 0,
      pokedex_count: 0,
      pozo_donated: 0,
      adivinabandera_wins: 0,
      stickers_created: 0,
      expediciones_sent: 0,
      downloads_total: 0,
      inversion_amount: 0
    };
  }


  const defaults = {
    paja_count: 0,
    sexo_count: 0,
    dildear_count: 0
  };

  for (const k in defaults) {
    if (user.achievements.stats[k] === undefined) {
      user.achievements.stats[k] = defaults[k];
    }
  }
}


const achievementsFile = './data/achievements.json';

let achievementsData = null;

function loadAchievements() {
  if (!achievementsData) {
    try {
      achievementsData = JSON.parse(fs.readFileSync(achievementsFile, 'utf8'));
    } catch (error) {
      console.error('Error cargando achievements.json:', error);
      achievementsData = { categories: {}, achievements: [] };
    }
  }
  return achievementsData;
}

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
        spotify_count: 0,
        paja_count: 0,
        sexo_count: 0,
        dildear_count: 0,
        granja_count: 0,
        granja_level: 0,
        instagram_count: 0,
        ytmp4_count: 0,
        tiktok_count: 0,
        beso_count: 0,
        sugerencia_count: 0,
        pregunta_count: 0,
        reporte_count: 0,
        contribuciones_count: 0,
        code_claims: 0,
        hola_count: 0,
        impostor_games: 0,
        impostor_wins: 0,
        invertir_count: 0,
        inversiones_count: 0,
        miinversion_count: 0,
        retirar_count: 0,
        kick_count: 0,
        pokedex_count: 0,
        pozo_donated: 0,
        adivinabandera_wins: 0,
        stickers_created: 0,
        expediciones_sent: 0,
        downloads_total: 0,
        inversion_amount: 0
      }
    };
    console.log(`✅ Achievements creados para usuario nuevo: ${userJid}`);
  } else {
    const stats = db.users[userJid].achievements.stats;
    const newStats = {
      paja_count: 0,
      sexo_count: 0,
      dildear_count: 0,
      granja_count: 0,
      granja_level: 0,
      instagram_count: 0,
      ytmp4_count: 0,
      tiktok_count: 0,
      beso_count: 0,
      sugerencia_count: 0,
      pregunta_count: 0,
      reporte_count: 0,
      contribuciones_count: 0,
      code_claims: 0,
      hola_count: 0,
      impostor_games: 0,
      impostor_wins: 0,
      invertir_count: 0,
      inversiones_count: 0,
      miinversion_count: 0,
      retirar_count: 0,
      kick_count: 0,
        pokedex_count: 0,
      pozo_donated: 0,
      adivinabandera_wins: 0,
      stickers_created: 0,
      expediciones_sent: 0,
      downloads_total: 0,
      inversion_amount: 0
    };
    
    let updated = false;
    for (const [key, defaultValue] of Object.entries(newStats)) {
      if (stats[key] === undefined) {
        stats[key] = defaultValue;
        console.log(`✅ Añadido ${key} a usuario existente: ${userJid}`);
        updated = true;
      }
    }
    
    if (updated) {
      console.log(`📝 Usuario actualizado: ${userJid}`);
    }
  }

  guardarDatabase(db);
  return db.users[userJid].achievements;
}

export function getAllAchievements() {
  const data = loadAchievements();
  return data.achievements;
}


export function getAchievementsByCategory(category) {
  const achievements = getAllAchievements();
  return achievements.filter(a => a.category === category);
}


export function getAchievement(achievementId) {
  const achievements = getAllAchievements();
  return achievements.find(a => a.id === achievementId);
}


export function hasAchievement(userJid, achievementId) {
  const db = cargarDatabase();
  const achievements = db.users[userJid]?.achievements;
  
  if (!achievements) return false;
  
  return achievements.unlocked.includes(achievementId);
}


export function unlockAchievement(userJid, achievementId, sock = null, from = null) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user || !user.achievements) {
    initializeAchievements(userJid);

    const dbUpdated = cargarDatabase();
    user.achievements = dbUpdated.users[userJid].achievements;
  }


  if (hasAchievement(userJid, achievementId)) {
    return { success: false, reason: 'already_unlocked' };
  }

  const achievement = getAchievement(achievementId);
  
  if (!achievement) {
    return { success: false, reason: 'not_found' };
  }


  user.achievements.unlocked.push(achievementId);
  user.achievements.points += achievement.points;


  if (achievement.reward?.title) {
    if (!user.achievements.titles.includes(achievement.reward.title)) {
      user.achievements.titles.push(achievement.reward.title);
    }
  }


  if (achievement.reward?.coins) {
    user.pandacoins = (user.pandacoins || 0) + achievement.reward.coins;
  }

  guardarDatabase(db);


  if (sock && from) {
    sendAchievementNotification(sock, from, userJid, achievement);
  }

  return {
    success: true,
    achievement,
    reward: achievement.reward
  };
}


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


export function trackProgress(userJid, actionType, value = 1, sock = null, from = null) {
  const db = cargarDatabase();
  db.users = db.users || {};
  const user = db.users[userJid];

  if (!user) {
    console.log(`Usuario ${userJid} no encontrado al trackear progreso`);
    return;
  }


  if (!user.achievements) {
    initializeAchievements(userJid);
    // recargar user
    const dbUpdated = cargarDatabase();
    user.achievements = dbUpdated.users[userJid].achievements;
  }

  ensureAchievementStats(user);
  const stats = user.achievements.stats;

  const maxKeys = ['granja_level', 'pizzeria_level'];
  const sumKeys = ['pozo_donated', 'inversion_amount'];

  if (stats[actionType] !== undefined) {
    if (maxKeys.includes(actionType)) {
      stats[actionType] = Math.max(stats[actionType] || 0, value);
    } else if (sumKeys.includes(actionType)) {
      stats[actionType] = (stats[actionType] || 0) + value;
    } else {
      stats[actionType] = (stats[actionType] || 0) + value;
    }


    if (['sugerencia_count', 'pregunta_count', 'reporte_count'].includes(actionType)) {
      stats.contribuciones_count = (stats.contribuciones_count || 0) + value;
    }

    if (['instagram_count', 'ytmp4_count', 'tiktok_count'].includes(actionType)) {
      stats.downloads_total = (stats.downloads_total || 0) + value;
    }
  } else {
    console.log(`❌ ${actionType} no existe en stats`);
  }

  guardarDatabase(db);


  checkAchievements(userJid, sock, from);
}


export function checkAchievements(userJid, sock = null, from = null) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user) {
    console.log(`Usuario ${userJid} no encontrado al verificar logros`);
    return [];
  }


  if (!user.achievements) {
    initializeAchievements(userJid);

    const dbUpdated = cargarDatabase();
    user.achievements = dbUpdated.users[userJid].achievements;
  }

  ensureAchievementStats(user);
  const stats = user.achievements.stats;
  const achievements = getAllAchievements();
  const unlocked = [];

  for (const achievement of achievements) {

    if (hasAchievement(userJid, achievement.id)) continue;

    const req = achievement.requirement;
    let completed = false;

    switch (req.type) {
      case 'register':
        completed = true;
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


      case 'granja_count':
        try {
          const granjas = JSON.parse(fs.readFileSync('./data/database.json', 'utf8')).granjas || {};
          completed = (granjas.usuarios?.[userJid]?.length || 0) >= req.value;
        } catch (e) {
          completed = (stats.granja_count || 0) >= req.value;
        }
        break;

      case 'granja_level':

        try {
          const granjas = JSON.parse(fs.readFileSync('./data/database.json', 'utf8')).granjas || {};
          const userGr = granjas.usuarios?.[userJid] || [];
          completed = userGr.some(g => (g.nivel || 0) >= req.value) || (stats.granja_level || 0) >= req.value;
        } catch (e) {
          completed = (stats.granja_level || 0) >= req.value;
        }
        break;

      case 'instagram_count':
      case 'ytmp4_count':
      case 'tiktok_count':
      case 'beso_count':
      case 'sugerencia_count':
      case 'pregunta_count':
      case 'reporte_count':
      case 'contribuciones_count':
      case 'code_claims':
      case 'hola_count':
      case 'impostor_games':
      case 'impostor_wins':
      case 'invertir_count':
      case 'inversiones_count':
      case 'miinversion_count':
      case 'retirar_count':
      case 'kick_count':
      case 'pokedex_count':
      case 'adivinabandera_wins':
      case 'stickers_created':
      case 'expediciones_sent':
      case 'downloads_total':
        completed = (stats[req.type] || 0) >= req.value;
        break;

      case 'pozo_donated':
        completed = (stats.pozo_donated || 0) >= req.value;
        break;

      case 'inversion_amount':
        completed = (stats.inversion_amount || 0) >= req.value;
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

  case 'paja_count':
  case 'sexo_count': 
  case 'dildear_count':
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
