import { obtenerPizzeria } from '../PandaLove/pizzeria.js';
import { unlockAchievement } from '../data/achievementsDB.js';
import { cargarDatabase } from '../data/database.js';

export async function checkPizzeriaRegistered(sender, sock, from) {
  const db = cargarDatabase();
  const user = db.users?.[sender];

  if (!user) return;
  if (user.achievements?.unlocked?.includes('pizzero_1')) return;

  try {
    const pizzeria = await obtenerPizzeria(sender);

    if (pizzeria && !pizzeria.error && pizzeria.id) {
      unlockAchievement(sender, 'pizzero_1', sock, from);
    }
  } catch (e) {
    console.error('[PIZZERIA_REGISTERED]', e);
  }
}

export function checkPizzeriaLevel(sender, level, sock, from) {
  if (!level) return;

  if (level >= 5) {
    unlockAchievement(sender, 'pizzero_2', sock, from);
  }

  if (level >= 10) {
    unlockAchievement(sender, 'pizzero_3', sock, from);
  }
}
