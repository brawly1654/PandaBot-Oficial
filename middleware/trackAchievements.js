import { trackProgress, checkAchievements, initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

export function trackMinar(userJid, sock, from) {
  trackProgress(userJid, 'minar_count', 1, sock, from);
}

export function trackPaja(userJid, sock, from) {
  console.log(`✊ trackPaja llamado para: ${userJid}`);
  trackProgress(userJid, 'paja_count', 1, sock, from);
}

export function trackSexo(userJid, sock, from) {
  console.log(`😏 trackSexo llamado para: ${userJid}`);
  trackProgress(userJid, 'sexo_count', 1, sock, from);
}

export function trackDildear(userJid, sock, from) {
  console.log(`🦄 trackDildear llamado para: ${userJid}`);
  trackProgress(userJid, 'dildear_count', 1, sock, from);
}

export function trackTrabajar(userJid, sock, from) {
  trackProgress(userJid, 'trabajar_count', 1, sock, from);
}

export function trackBuy(userJid, sock, from) {
  trackProgress(userJid, 'buy_count', 1, sock, from);
}

export function trackApostar(userJid, sock, from) {
  trackProgress(userJid, 'apostar_count', 1, sock, from);
}

export function trackRoboExitoso(userJid, sock, from) {
  trackProgress(userJid, 'robos_exitosos', 1, sock, from);
}

export function trackRoboFallido(userJid, sock, from) {
  trackProgress(userJid, 'robos_fallidos', 1, sock, from);
}

export function trackCommand(userJid, sock, from) {
  trackProgress(userJid, 'commands_used', 1, sock, from);
}

export function trackCMTirada(userJid, sock, from) {
  trackProgress(userJid, 'cm_tiradas', 1, sock, from);
}

export function trackCMAtaque(userJid, sock, from) {
  trackProgress(userJid, 'cm_ataques', 1, sock, from);
}

export function trackSpotify(userJid, sock, from) {
  console.log(`🎵 trackSpotify llamado para: ${userJid.split('@')[0]}`);
  trackProgress(userJid, 'spotify_count', 1, sock, from);
}

export function checkSpecialAchievements(userJid, sock, from) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user) return;
  
  if (!user.achievements) {
    initializeAchievements(userJid);
  }
  
  const stats = user.achievements.stats;
  
  if (user.pandacoins <= 0 && !stats.was_broke) {
    stats.was_broke = true;
    guardarDatabase(db);
    checkAchievements(userJid, sock, from);
  }
  
  if (stats.was_broke && user.pandacoins >= 1000000 && !stats.comeback) {
    stats.comeback = true;
    guardarDatabase(db);
    checkAchievements(userJid, sock, from);
  }
  
  const hasRainbow = user.personajes?.some(p => p.includes('🌈'));
  const hasToilet = user.personajes?.some(p => p.includes('🚽'));
  
  if (hasRainbow || hasToilet) {
    checkAchievements(userJid, sock, from);
  }
}
