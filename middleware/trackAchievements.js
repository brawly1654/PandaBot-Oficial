import { trackProgress, checkAchievements, initializeAchievements } from '../data/achievementsDB.js';
import { cargarDatabase, guardarDatabase } from '../data/database.js';

/**
 * Middleware para trackear acciones automáticamente
 * Debe llamarse DESPUÉS de que se ejecute exitosamente un comando
 */

export function trackMinar(userJid, sock, from) {
  trackProgress(userJid, 'minar_count', 1, sock, from);
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
/**
 * Verificar logros especiales que dependen de estados
 */
export function checkSpecialAchievements(userJid, sock, from) {
  const db = cargarDatabase();
  const user = db.users[userJid];
  
  if (!user) return;
  
  if (!user.achievements) {
    initializeAchievements(userJid);
  }
  
  const stats = user.achievements.stats;
  
  // Verificar bancarrota
  if (user.pandacoins <= 0 && !stats.was_broke) {
    stats.was_broke = true;
    guardarDatabase(db);
    checkAchievements(userJid, sock, from);
  }
  
  // Verificar comeback (volver a 1M después de estar en bancarrota)
  if (stats.was_broke && user.pandacoins >= 1000000 && !stats.comeback) {
    stats.comeback = true;
    guardarDatabase(db);
    checkAchievements(userJid, sock, from);
  }
  
  // Verificar efectos especiales en personajes
  const hasRainbow = user.personajes?.some(p => p.includes('🌈'));
  const hasToilet = user.personajes?.some(p => p.includes('🚽'));
  
  if (hasRainbow || hasToilet) {
    checkAchievements(userJid, sock, from);
  }
}
