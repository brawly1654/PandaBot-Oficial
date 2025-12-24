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
      dildear_count: 0
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

const db = cargarDatabase();

for (const jid in db.users) {
  ensureAchievementStats(db.users[jid]);
}

guardarDatabase(db);
console.log('✅ Database reparada correctamente');
