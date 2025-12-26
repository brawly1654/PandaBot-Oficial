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

export function trackGranjaLevel(userJid, level = 1, sock, from) {
  trackProgress(userJid, 'granja_level', level, sock, from);
}

export function trackGranjaCount(userJid, sock, from) {
  trackProgress(userJid, 'granja_count', 1, sock, from);
}

export function trackInstagram(userJid, sock, from) {
  trackProgress(userJid, 'instagram_count', 1, sock, from);
}

export function trackYtmp4(userJid, sock, from) {
  trackProgress(userJid, 'ytmp4_count', 1, sock, from);
}

export function trackTiktok(userJid, sock, from) {
  trackProgress(userJid, 'tiktok_count', 1, sock, from);
}

export function trackBeso(userJid, sock, from) {
  trackProgress(userJid, 'beso_count', 1, sock, from);
}

export function trackSugerencia(userJid, sock, from) {
  trackProgress(userJid, 'sugerencia_count', 1, sock, from);
}

export function trackPregunta(userJid, sock, from) {
  trackProgress(userJid, 'pregunta_count', 1, sock, from);
}

export function trackReporte(userJid, sock, from) {
  trackProgress(userJid, 'reporte_count', 1, sock, from);
}

export function trackCodeClaim(userJid, sock, from) {
  trackProgress(userJid, 'code_claims', 1, sock, from);
}

export function trackHola(userJid, sock, from) {
  trackProgress(userJid, 'hola_count', 1, sock, from);
}

export function trackImpostorPlay(userJid, sock, from) {
  trackProgress(userJid, 'impostor_games', 1, sock, from);
}

export function trackImpostorWin(userJid, sock, from) {
  trackProgress(userJid, 'impostor_wins', 1, sock, from);
}

export function trackInvertir(userJid, sock, from) {
  trackProgress(userJid, 'invertir_count', 1, sock, from);
}

export function trackMercado(userJid, sock, from) {
  trackProgress(userJid, 'inversiones_count', 1, sock, from);
}

export function trackMiInversion(userJid, sock, from) {
  trackProgress(userJid, 'miinversion_count', 1, sock, from);
}

export function trackRetirar(userJid, sock, from) {
  trackProgress(userJid, 'retirar_count', 1, sock, from);
}

export function trackKick(userJid, sock, from) {
  trackProgress(userJid, 'kick_count', 1, sock, from);
}

export function trackPokedex(userJid, sock, from) {
  trackProgress(userJid, 'pokedex_count', 1, sock, from);
}

export function trackPozoDonate(userJid, amount = 0, sock, from) {
  trackProgress(userJid, 'pozo_donated', amount, sock, from);
}

export function trackAdivinaBanderaWin(userJid, sock, from) {
  trackProgress(userJid, 'adivinabandera_wins', 1, sock, from);
}

export function trackStickersCreated(userJid, sock, from) {
  trackProgress(userJid, 'stickers_created', 1, sock, from);
}

export function trackExpedicionSent(userJid, sock, from) {
  trackProgress(userJid, 'expediciones_sent', 1, sock, from);
}

export function trackDownloadsTotal(userJid, sock, from) {
  trackProgress(userJid, 'downloads_total', 1, sock, from);
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
